class FoodSegmenter {
    constructor(nutritionDB) {
        this.nutritionDB = nutritionDB;
        this.useColorBased = true;
        this.modelLoaded = false;
    }

    async loadModel(modelPath = null) {
        if (!modelPath) {
            console.log('[Segmenter] 使用基于颜色的简单分割方法');
            this.useColorBased = true;
            this.modelLoaded = true;
            return;
        }

        try {
            console.log('[Segmenter] 正在加载分割模型...');
            this.model = await tf.loadLayersModel(modelPath);
            this.useColorBased = false;
            this.modelLoaded = true;
            console.log('[Segmenter] 模型加载成功');
        } catch (error) {
            console.warn('[Segmenter] 模型加载失败，回退到颜色分割:', error.message);
            this.useColorBased = true;
            this.modelLoaded = true;
        }
    }

    async segment(imageData) {
        if (!this.modelLoaded) {
            await this.loadModel();
        }

        if (this.useColorBased || !this.model) {
            return this.segmentByColor(imageData);
        }

        return this.segmentByModel(imageData);
    }

    segmentByColor(imageData) {
        console.log('[Segmenter] 开始简单颜色分割...');
        
        try {
            const width = imageData.width;
            const height = imageData.height;
            const data = imageData.data;
            const totalPixels = width * height;

            console.log(`[Segmenter] 图片尺寸: ${width}x${height} = ${totalPixels} 像素`);

            const result = this.simpleColorAnalysis(imageData);

            console.log('[Segmenter] 颜色分割完成，识别到:', Object.keys(result.foodRegions));

            return result;

        } catch (error) {
            console.error('[Segmenter] 颜色分割失败:', error);
            return this.createFallbackSegmentation(imageData);
        }
    }

    simpleColorAnalysis(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const totalPixels = width * height;

        const foodRegions = {};
        const colorHistogram = {
            white: 0,
            red: 0,
            green: 0,
            yellow: 0,
            orange: 0,
            brown: 0,
            dark: 0,
            light: 0,
            background: 0
        };

        const sampleStep = Math.max(1, Math.floor(totalPixels / 10000));
        let sampledPixels = 0;

        for (let i = 0; i < totalPixels; i += sampleStep) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const colorCategory = this.classifyPixelColor(r, g, b);
            if (colorCategory) {
                colorHistogram[colorCategory]++;
            }
            sampledPixels++;
        }

        console.log('[Segmenter] 颜色直方图:', colorHistogram);

        const foodPixels = totalPixels - colorHistogram.background;
        const perFood = Math.floor(foodPixels / 3);

        const sortedColors = Object.entries(colorHistogram)
            .filter(([key]) => key !== 'background')
            .sort((a, b) => b[1] - a[1]);

        if (sortedColors.length > 0 && sortedColors[0][1] > sampledPixels * 0.1) {
            const dominantColor = sortedColors[0][0];
            const foodType = this.mapColorToFoodType(dominantColor);
            foodRegions[foodType] = perFood;
        }

        if (sortedColors.length > 1 && sortedColors[1][1] > sampledPixels * 0.05) {
            const secondColor = sortedColors[1][0];
            const foodType = this.mapColorToFoodType(secondColor);
            if (!foodRegions[foodType]) {
                foodRegions[foodType] = perFood;
            } else {
                foodRegions[foodType] += perFood;
            }
        }

        if (Object.keys(foodRegions).length === 0) {
            foodRegions['mixedDish'] = Math.floor(foodPixels * 0.8);
        }

        return {
            foodRegions: foodRegions,
            foodColors: {},
            regionPixels: {},
            segmentationMask: new Uint8ClampedArray(width * height),
            coloredMask: null,
            method: 'simple_color'
        };
    }

    classifyPixelColor(r, g, b) {
        const maxVal = Math.max(r, g, b);
        const minVal = Math.min(r, g, b);
        const brightness = (r + g + b) / 3;
        const saturation = maxVal > 0 ? (maxVal - minVal) / maxVal : 0;

        if (brightness > 240 && saturation < 0.15) {
            return 'background';
        }
        if (brightness < 30) {
            return 'background';
        }

        if (brightness > 200 && saturation < 0.2) {
            return 'white';
        }

        if (r > g + 30 && r > b + 30 && saturation > 0.3) {
            return 'red';
        }

        if (g > r + 20 && g > b + 20 && saturation > 0.2) {
            return 'green';
        }

        if (r > 150 && g > 150 && b < 120 && saturation > 0.2) {
            return 'yellow';
        }

        if (r > 150 && g > 80 && b < 100 && saturation > 0.2) {
            return 'orange';
        }

        if (r > 80 && g > 40 && b < 80 && r > g * 1.2 && saturation > 0.15) {
            return 'brown';
        }

        if (saturation < 0.15) {
            if (brightness > 180) {
                return 'light';
            }
            if (brightness < 80) {
                return 'dark';
            }
        }

        return 'light';
    }

    mapColorToFoodType(colorCategory) {
        const mapping = {
            white: 'rice',
            red: 'beef',
            green: 'vegetables',
            yellow: 'mango',
            orange: 'chicken',
            brown: 'chocolate',
            dark: 'beef',
            light: 'iceCream'
        };
        return mapping[colorCategory] || 'mixedDish';
    }

    createFallbackSegmentation(imageData) {
        console.warn('[Segmenter] 使用备用分割方案...');
        return {
            foodRegions: {
                mixedDish: Math.floor(imageData.width * imageData.height * 0.5)
            },
            foodColors: {},
            regionPixels: {},
            segmentationMask: new Uint8ClampedArray(imageData.width * imageData.height),
            coloredMask: null,
            method: 'fallback'
        };
    }

    async segmentByModel(imageData) {
        try {
            const width = imageData.width;
            const height = imageData.height;

            const inputTensor = tf.browser.fromPixels(imageData)
                .resizeBilinear([256, 256])
                .toFloat()
                .div(tf.scalar(255))
                .expandDims(0);

            const prediction = this.model.predict(inputTensor);
            const segmentation = prediction.squeeze(0).argMax(-1);
            
            const segmentationData = await segmentation.data();
            
            const foodRegions = {};
            for (let i = 0; i < segmentationData.length; i++) {
                const classId = segmentationData[i];
                const foodType = this.mapClassToFoodType(classId);
                if (foodType !== 'background') {
                    foodRegions[foodType] = (foodRegions[foodType] || 0) + 1;
                }
            }

            const scaleX = width / 256;
            const scaleY = height / 256;
            const scaledRegions = {};
            for (const [type, count] of Object.entries(foodRegions)) {
                scaledRegions[type] = Math.floor(count * scaleX * scaleY);
            }

            inputTensor.dispose();
            prediction.dispose();
            segmentation.dispose();

            return {
                foodRegions: scaledRegions,
                method: 'deep_learning'
            };
        } catch (error) {
            console.warn('[Segmenter] 深度学习分割失败，回退到颜色分割:', error.message);
            return this.segmentByColor(imageData);
        }
    }

    mapClassToFoodType(classId) {
        const classMap = {
            0: 'background',
            1: 'rice',
            2: 'beef',
            3: 'vegetables',
            4: 'chicken',
            5: 'iceCream',
            6: 'cake',
            7: 'fruit',
            8: 'mixedDish'
        };
        return classMap[classId] || 'background';
    }
}

window.FoodSegmenter = FoodSegmenter;

class ImagePreprocessor {
    constructor(options = {}) {
        this.options = {
            adaptiveWindowSize: options.adaptiveWindowSize || 31,
            adaptiveConstant: options.adaptiveConstant || 15,
            noiseRemovalIterations: options.noiseRemovalIterations || 2,
            minConnectedComponentSize: options.minConnectedComponentSize || 4
        };
    }

    process(imageData) {
        console.log('[ImagePreprocessor] 开始图像处理...');
        
        const width = imageData.width;
        const height = imageData.height;
        
        const grayscale = this.toGrayscale(imageData);
        console.log('[ImagePreprocessor] 灰度化完成');
        
        const inverted = this.invert(grayscale, width, height);
        console.log('[ImagePreprocessor] 反转完成');
        
        const denoised = this.medianFilter(inverted, width, height, 3);
        console.log('[ImagePreprocessor] 中值滤波降噪完成');
        
        const binary = this.adaptiveThreshold(
            denoised, 
            width, 
            height,
            this.options.adaptiveWindowSize,
            this.options.adaptiveConstant
        );
        console.log('[ImagePreprocessor] 自适应二值化完成');
        
        const cleaned = this.removeNoiseComponents(binary, width, height, this.options.minConnectedComponentSize);
        console.log('[ImagePreprocessor] 小连通区域去除完成');
        
        return {
            grayscale: grayscale,
            inverted: inverted,
            denoised: denoised,
            binary: cleaned,
            width: width,
            height: height
        };
    }

    toGrayscale(imageData) {
        const grayscale = new Uint8ClampedArray(imageData.width * imageData.height);
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            grayscale[i / 4] = gray;
        }
        
        return grayscale;
    }

    invert(data, width, height) {
        const inverted = new Uint8ClampedArray(width * height);
        
        for (let i = 0; i < data.length; i++) {
            inverted[i] = 255 - data[i];
        }
        
        return inverted;
    }

    medianFilter(data, width, height, kernelSize) {
        const output = new Uint8ClampedArray(width * height);
        const half = Math.floor(kernelSize / 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const values = [];
                
                for (let ky = -half; ky <= half; ky++) {
                    for (let kx = -half; kx <= half; kx++) {
                        const px = Math.max(0, Math.min(width - 1, x + kx));
                        const py = Math.max(0, Math.min(height - 1, y + ky));
                        values.push(data[py * width + px]);
                    }
                }
                
                values.sort((a, b) => a - b);
                const median = values[Math.floor(values.length / 2)];
                output[y * width + x] = median;
            }
        }
        
        return output;
    }

    adaptiveThreshold(data, width, height, windowSize, constant) {
        const binary = new Uint8ClampedArray(width * height);
        const half = Math.floor(windowSize / 2);
        
        const integral = this.calculateIntegralImage(data, width, height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const x1 = Math.max(0, x - half);
                const y1 = Math.max(0, y - half);
                const x2 = Math.min(width - 1, x + half);
                const y2 = Math.min(height - 1, y + half);
                
                const count = (x2 - x1 + 1) * (y2 - y1 + 1);
                const sum = this.getIntegralSum(integral, width, x1, y1, x2, y2);
                
                const threshold = sum / count - constant;
                
                if (data[y * width + x] >= threshold) {
                    binary[y * width + x] = 0;
                } else {
                    binary[y * width + x] = 255;
                }
            }
        }
        
        return binary;
    }

    calculateIntegralImage(data, width, height) {
        const integral = new Uint32Array(width * height);
        
        integral[0] = data[0];
        
        for (let x = 1; x < width; x++) {
            integral[x] = integral[x - 1] + data[x];
        }
        
        for (let y = 1; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                rowSum += data[y * width + x];
                integral[y * width + x] = integral[(y - 1) * width + x] + rowSum;
            }
        }
        
        return integral;
    }

    getIntegralSum(integral, width, x1, y1, x2, y2) {
        const A = (y1 > 0 && x1 > 0) ? integral[(y1 - 1) * width + (x1 - 1)] : 0;
        const B = (y1 > 0) ? integral[(y1 - 1) * width + x2] : 0;
        const C = (x1 > 0) ? integral[y2 * width + (x1 - 1)] : 0;
        const D = integral[y2 * width + x2];
        
        return D - B - C + A;
    }

    removeNoiseComponents(binary, width, height, minSize) {
        const cleaned = new Uint8ClampedArray(binary.length);
        cleaned.fill(255);
        
        const visited = new Set();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (binary[idx] === 0 && !visited.has(idx)) {
                    const component = this.floodFill(binary, width, height, x, y, visited);
                    
                    if (component.pixelCount >= minSize) {
                        for (const pixel of component.pixels) {
                            cleaned[pixel.y * width + pixel.x] = 0;
                        }
                    }
                }
            }
        }
        
        return cleaned;
    }

    floodFill(binary, width, height, startX, startY, visited) {
        const stack = [{x: startX, y: startY}];
        const pixels = [];
        let minX = startX, maxX = startX;
        let minY = startY, maxY = startY;
        
        while (stack.length > 0) {
            const {x, y} = stack.pop();
            const idx = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited.has(idx)) continue;
            if (binary[idx] !== 0) continue;
            
            visited.add(idx);
            pixels.push({x, y});
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            
            stack.push({x: x + 1, y});
            stack.push({x: x - 1, y});
            stack.push({x, y: y + 1});
            stack.push({x, y: y - 1});
        }
        
        return {
            pixels: pixels,
            pixelCount: pixels.length,
            minX, maxX, minY, maxY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    toImageDataArray(binaryData, width, height) {
        const imageData = new Uint8ClampedArray(width * height * 4);
        
        for (let i = 0; i < binaryData.length; i++) {
            const value = binaryData[i] === 0 ? 0 : 255;
            const idx = i * 4;
            imageData[idx] = value;
            imageData[idx + 1] = value;
            imageData[idx + 2] = value;
            imageData[idx + 3] = 255;
        }
        
        return imageData;
    }
}

export { ImagePreprocessor };

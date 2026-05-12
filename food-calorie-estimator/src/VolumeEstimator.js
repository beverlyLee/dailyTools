class VolumeEstimator {
    constructor(plateDiameterCm = 26, foodThicknessCm = 3) {
        this.plateDiameterCm = plateDiameterCm;
        this.foodThicknessCm = foodThicknessCm;
    }

    setPlateDiameter(diameterCm) {
        this.plateDiameterCm = diameterCm;
    }

    setFoodThickness(thicknessCm) {
        this.foodThicknessCm = thicknessCm;
    }

    getPlateAreaCm2() {
        const radius = this.plateDiameterCm / 2;
        return Math.PI * radius * radius;
    }

    getPixelToCmRatio(platePixelRadius) {
        if (platePixelRadius <= 0) {
            return 0;
        }
        const plateCmRadius = this.plateDiameterCm / 2;
        return plateCmRadius / platePixelRadius;
    }

    estimatePlateCenterAndRadius(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        let minX = width, maxX = 0, minY = height, maxY = 0;
        let nonBackgroundPixels = 0;
        
        const threshold = this.detectBackgroundThreshold(data);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                const brightness = (r + g + b) / 3;
                
                if (!this.isBackground(brightness, threshold)) {
                    nonBackgroundPixels++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        
        if (nonBackgroundPixels < width * height * 0.1) {
            return {
                centerX: width / 2,
                centerY: height / 2,
                radius: Math.min(width, height) / 2 * 0.8
            };
        }
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        const widthRadius = (maxX - minX) / 2;
        const heightRadius = (maxY - minY) / 2;
        const radius = Math.max(widthRadius, heightRadius);
        
        return {
            centerX: centerX,
            centerY: centerY,
            radius: radius
        };
    }

    detectBackgroundThreshold(data) {
        const brightnessValues = [];
        const sampleStep = Math.max(1, Math.floor(data.length / 4 / 1000));
        
        for (let i = 0; i < data.length; i += 4 * sampleStep) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            brightnessValues.push(brightness);
        }
        
        brightnessValues.sort((a, b) => a - b);
        const median = brightnessValues[Math.floor(brightnessValues.length / 2)];
        
        return median * 0.7;
    }

    isBackground(brightness, threshold) {
        return brightness < threshold || brightness > 250;
    }

    calculateAreaPixels(maskPixels, width, height) {
        let count = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (maskPixels[idx]) {
                    count++;
                }
            }
        }
        return count;
    }

    estimateVolume(foodRegionPixels, plateInfo, totalImagePixels) {
        const { centerX, centerY, radius: platePixelRadius } = plateInfo;
        
        const pixelToCmRatio = this.getPixelToCmRatio(platePixelRadius);
        
        if (pixelToCmRatio <= 0) {
            return {
                volumeCm3: 0,
                areaCm2: 0,
                areaPixels: foodRegionPixels,
                platePixelRadius: platePixelRadius
            };
        }
        
        const pixelAreaCm2 = pixelToCmRatio * pixelToCmRatio;
        const foodAreaCm2 = foodRegionPixels * pixelAreaCm2;
        
        const volumeCm3 = foodAreaCm2 * this.foodThicknessCm;
        
        return {
            volumeCm3: volumeCm3,
            areaCm2: foodAreaCm2,
            areaPixels: foodRegionPixels,
            platePixelRadius: platePixelRadius,
            pixelToCmRatio: pixelToCmRatio
        };
    }

    estimateVolumesFromRegions(foodRegions, plateInfo, totalImagePixels) {
        const volumes = {};
        
        for (const [foodType, pixels] of Object.entries(foodRegions)) {
            volumes[foodType] = this.estimateVolume(pixels, plateInfo, totalImagePixels);
        }
        
        return volumes;
    }
}

window.VolumeEstimator = VolumeEstimator;

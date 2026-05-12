export class ShadowMask {
    constructor(options = {}) {
        this.sensitivity = options.sensitivity || 50;
        this.dilationIterations = options.dilationIterations || 2;
    }

    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;

        let h = 0;
        let s = 0;
        const v = max;

        if (diff !== 0) {
            if (max === r) {
                h = 60 * ((g - b) / diff + (g < b ? 6 : 0));
            } else if (max === g) {
                h = 60 * ((b - r) / diff + 2);
            } else {
                h = 60 * ((r - g) / diff + 4);
            }
            s = diff / max;
        }

        return { h, s, v };
    }

    hsvToRgb(h, s, v) {
        let r, g, b;
        const c = v * s;
        const hh = h / 60;
        const x = c * (1 - Math.abs(hh % 2 - 1));
        const m = v - c;

        if (hh >= 0 && hh < 1) { r = c; g = x; b = 0; }
        else if (hh >= 1 && hh < 2) { r = x; g = c; b = 0; }
        else if (hh >= 2 && hh < 3) { r = 0; g = c; b = x; }
        else if (hh >= 3 && hh < 4) { r = 0; g = x; b = c; }
        else if (hh >= 4 && hh < 5) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    extractValueChannel(imageData) {
        const { data, width, height } = imageData;
        const valueChannel = new Float32Array(width * height);

        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const idx = (i * width + j) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                valueChannel[i * width + j] = Math.max(r, g, b) / 255;
            }
        }

        return valueChannel;
    }

    convertToGrayscale(data, width, height) {
        const grayscale = new Float32Array(width * height);
        
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const idx = (i * width + j) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                grayscale[i * width + j] = 0.299 * r + 0.587 * g + 0.114 * b;
            }
        }
        
        return grayscale;
    }

    boxBlur(channel, width, height, radius) {
        const result = new Float32Array(channel);
        
        for (let pass = 0; pass < 2; pass++) {
            const temp = new Float32Array(result);
            
            for (let y = 0; y < height; y++) {
                let sum = 0;
                for (let x = -radius; x <= radius; x++) {
                    const px = Math.max(0, Math.min(width - 1, x));
                    sum += temp[y * width + px];
                }
                
                for (let x = 0; x < width; x++) {
                    result[y * width + x] = sum / (2 * radius + 1);
                    
                    const removeX = Math.max(0, x - radius);
                    const addX = Math.min(width - 1, x + radius + 1);
                    sum += temp[y * width + addX] - temp[y * width + removeX];
                }
            }
            
            for (let x = 0; x < width; x++) {
                let sum = 0;
                for (let y = -radius; y <= radius; y++) {
                    const py = Math.max(0, Math.min(height - 1, y));
                    sum += result[py * width + x];
                }
                
                for (let y = 0; y < height; y++) {
                    const tempValue = result[y * width + x];
                    result[y * width + x] = sum / (2 * radius + 1);
                    
                    const removeY = Math.max(0, y - radius);
                    const addY = Math.min(height - 1, y + radius + 1);
                    sum += result[addY * width + x] - tempValue;
                }
            }
        }
        
        return result;
    }

    detectGlobalShadowRegion(valueChannel, width, height) {
        const largeBlurRadius = Math.max(15, Math.floor(Math.min(width, height) * 0.07));
        const backgroundEstimate = this.boxBlur(valueChannel, width, height, largeBlurRadius);
        
        const shadowMask = new Float32Array(width * height);
        const sensitivityFactor = this.sensitivity / 100;
        
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const idx = i * width + j;
                const currentV = valueChannel[idx];
                const bgV = backgroundEstimate[idx];
                
                const ratio = currentV / bgV;
                const threshold = 1 - 0.25 * sensitivityFactor;
                
                if (ratio < threshold) {
                    const darkness = (threshold - ratio) / (0.35 + 0.15 * sensitivityFactor);
                    shadowMask[idx] = Math.min(1, Math.max(0, darkness));
                } else {
                    shadowMask[idx] = 0;
                }
            }
        }
        
        return { shadowMask, backgroundEstimate };
    }

    createLocalBackgroundEstimate(grayscale, width, height, windowSize = 21) {
        const halfWindow = Math.floor(windowSize / 2);
        const localBackground = new Float32Array(width * height);
        
        const integral = new Float32Array(width * height);
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                rowSum += grayscale[y * width + x];
                integral[y * width + x] = rowSum + (y > 0 ? integral[(y - 1) * width + x] : 0);
            }
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const x1 = Math.max(0, x - halfWindow);
                const y1 = Math.max(0, y - halfWindow);
                const x2 = Math.min(width - 1, x + halfWindow);
                const y2 = Math.min(height - 1, y + halfWindow);
                
                const count = (x2 - x1 + 1) * (y2 - y1 + 1);
                
                let sum = integral[y2 * width + x2];
                if (y1 > 0) sum -= integral[(y1 - 1) * width + x2];
                if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)];
                if (y1 > 0 && x1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)];
                
                localBackground[y * width + x] = sum / count;
            }
        }
        
        return localBackground;
    }

    separateTextAndBackgroundInShadow(grayscale, width, height, shadowMask, globalBackground) {
        const smallWindowSize = 15;
        const localBackground = this.createLocalBackgroundEstimate(grayscale, width, height, smallWindowSize);
        
        const textMask = new Float32Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (shadowMask[idx] < 0.05) {
                    textMask[idx] = 0;
                    continue;
                }
                
                const currentGray = grayscale[idx];
                const localBg = localBackground[idx];
                const globalBg = globalBackground[idx] * 255;
                
                const localDiff = localBg - currentGray;
                const globalDiff = globalBg - currentGray;
                
                if (localDiff > 12 && globalDiff > 20) {
                    textMask[idx] = 1;
                } else if (localDiff > 8) {
                    textMask[idx] = Math.min(1, (localDiff - 8) / 10);
                } else {
                    textMask[idx] = 0;
                }
            }
        }
        
        return textMask;
    }

    dilateMask(mask, width, height, iterations) {
        let currentMask = new Float32Array(mask);
        
        for (let iter = 0; iter < iterations; iter++) {
            const dilatedMask = new Float32Array(width * height);
            
            for (let i = 0; i < height; i++) {
                for (let j = 0; j < width; j++) {
                    const idx = i * width + j;
                    let maxValue = currentMask[idx];
                    
                    for (let di = -2; di <= 2; di++) {
                        for (let dj = -2; dj <= 2; dj++) {
                            const ni = Math.max(0, Math.min(height - 1, i + di));
                            const nj = Math.max(0, Math.min(width - 1, j + dj));
                            maxValue = Math.max(maxValue, currentMask[ni * width + nj]);
                        }
                    }
                    
                    dilatedMask[idx] = maxValue;
                }
            }
            
            currentMask = dilatedMask;
        }
        
        return currentMask;
    }

    erodeMask(mask, width, height, iterations) {
        let currentMask = new Float32Array(mask);
        
        for (let iter = 0; iter < iterations; iter++) {
            const erodedMask = new Float32Array(width * height);
            
            for (let i = 0; i < height; i++) {
                for (let j = 0; j < width; j++) {
                    const idx = i * width + j;
                    let minValue = currentMask[idx];
                    
                    for (let di = -1; di <= 1; di++) {
                        for (let dj = -1; dj <= 1; dj++) {
                            const ni = Math.max(0, Math.min(height - 1, i + di));
                            const nj = Math.max(0, Math.min(width - 1, j + dj));
                            minValue = Math.min(minValue, currentMask[ni * width + nj]);
                        }
                    }
                    
                    erodedMask[idx] = minValue;
                }
            }
            
            currentMask = erodedMask;
        }
        
        return currentMask;
    }

    gaussianBlurMask(mask, width, height, sigma = 2) {
        const blurredMask = new Float32Array(mask);
        const kernelSize = Math.max(3, Math.ceil(sigma * 3) * 2 + 1);
        const halfKernel = Math.floor(kernelSize / 2);
        const kernel = new Float32Array(kernelSize * kernelSize);
        
        let kernelSum = 0;
        for (let i = 0; i < kernelSize; i++) {
            for (let j = 0; j < kernelSize; j++) {
                const x = i - halfKernel;
                const y = j - halfKernel;
                const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
                kernel[i * kernelSize + j] = value;
                kernelSum += value;
            }
        }
        
        const tempMask = new Float32Array(mask);
        
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                let sum = 0;
                let weightSum = 0;
                
                for (let di = -halfKernel; di <= halfKernel; di++) {
                    for (let dj = -halfKernel; dj <= halfKernel; dj++) {
                        const ni = Math.max(0, Math.min(height - 1, i + di));
                        const nj = Math.max(0, Math.min(width - 1, j + dj));
                        const kernelIdx = (di + halfKernel) * kernelSize + (dj + halfKernel);
                        sum += mask[ni * width + nj] * kernel[kernelIdx];
                        weightSum += kernel[kernelIdx];
                    }
                }
                
                tempMask[i * width + j] = sum / weightSum;
            }
        }
        
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                blurredMask[i * width + j] = tempMask[i * width + j];
            }
        }
        
        return blurredMask;
    }

    generateShadowBackgroundMask(imageData) {
        const { width, height, data } = imageData;
        const valueChannel = this.extractValueChannel(imageData);
        const grayscale = this.convertToGrayscale(data, width, height);
        
        const { shadowMask: globalShadowMask, backgroundEstimate } = 
            this.detectGlobalShadowRegion(valueChannel, width, height);
        
        const textMaskInShadow = this.separateTextAndBackgroundInShadow(
            grayscale, width, height, globalShadowMask, backgroundEstimate
        );
        
        const dilatedTextMask = this.dilateMask(textMaskInShadow, width, height, 2);
        
        const backgroundOnlyMask = new Float32Array(width * height);
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const idx = i * width + j;
                const isText = dilatedTextMask[idx] > 0.3;
                backgroundOnlyMask[idx] = isText ? 0 : globalShadowMask[idx];
            }
        }
        
        const smoothMask = this.gaussianBlurMask(backgroundOnlyMask, width, height, 1);
        
        return {
            mask: smoothMask,
            width,
            height,
            textMask: dilatedTextMask,
            globalShadowMask: globalShadowMask
        };
    }

    generateShadowMask(imageData) {
        return this.generateShadowBackgroundMask(imageData);
    }

    visualizeMask(maskData, canvas) {
        const { mask, width, height } = maskData;
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;
        
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const idx = (i * width + j) * 4;
                const maskValue = Math.floor(mask[i * width + j] * 255);
                
                data[idx] = maskValue;
                data[idx + 1] = maskValue;
                data[idx + 2] = maskValue;
                data[idx + 3] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
}

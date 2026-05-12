export class ImprovedSauvola {
    constructor(options = {}) {
        this.windowSize = options.windowSize || 31;
        this.k = options.k || 0.35;
        this.R = options.R || 128;
        this.textProtection = options.textProtection !== undefined ? options.textProtection : 0.85;
    }

    setWindowSize(size) {
        this.windowSize = size;
    }

    setK(k) {
        this.k = k;
    }

    setTextProtection(protection) {
        this.textProtection = protection;
    }

    apply(imageData) {
        const { width, height, data } = imageData;
        const grayData = this.toGrayscale(data);
        
        const integral = this.computeIntegral(grayData, width, height);
        const integralSq = this.computeIntegralSq(grayData, width, height);
        
        const result = new Uint8ClampedArray(width * height * 4);
        const halfWindow = Math.floor(this.windowSize / 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const x1 = Math.max(0, x - halfWindow);
                const y1 = Math.max(0, y - halfWindow);
                const x2 = Math.min(width - 1, x + halfWindow);
                const y2 = Math.min(height - 1, y + halfWindow);
                
                const count = (x2 - x1 + 1) * (y2 - y1 + 1);
                const sum = this.getIntegralSum(integral, width, x1, y1, x2, y2);
                const sumSq = this.getIntegralSum(integralSq, width, x1, y1, x2, y2);
                
                const mean = sum / count;
                const variance = (sumSq / count) - (mean * mean);
                const stdDev = Math.sqrt(Math.max(0, variance));
                
                const pixelValue = grayData[y * width + x];
                
                let adaptiveK = this.k;
                if (stdDev > 30) {
                    adaptiveK = this.k * 0.7;
                } else if (stdDev < 15) {
                    adaptiveK = this.k * 1.3;
                }
                
                const threshold = mean * (1 + adaptiveK * ((stdDev / this.R) - 1));
                
                const localContrast = this.calculateLocalContrast(grayData, width, x, y, 2);
                
                let binValue;
                if (localContrast > 15) {
                    if (pixelValue < threshold * this.textProtection) {
                        binValue = 0;
                    } else {
                        binValue = 255;
                    }
                } else {
                    binValue = pixelValue >= threshold ? 255 : 0;
                }
                
                const outIdx = (y * width + x) * 4;
                result[outIdx] = binValue;
                result[outIdx + 1] = binValue;
                result[outIdx + 2] = binValue;
                result[outIdx + 3] = 255;
            }
        }
        
        return { imageData: { width, height, data: result } };
    }

    toGrayscale(data) {
        const length = data.length / 4;
        const gray = new Uint32Array(length);
        
        for (let i = 0; i < length; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }
        
        return gray;
    }

    calculateLocalContrast(grayData, width, x, y, size) {
        let min = 255;
        let max = 0;
        
        for (let dy = -size; dy <= size; dy++) {
            for (let dx = -size; dx <= size; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const val = grayData[ny * width + nx];
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            }
        }
        
        return max - min;
    }

    computeIntegral(data, width, height) {
        const integral = new Float64Array(width * height);
        
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                rowSum = rowSum + data[idx];
                integral[idx] = rowSum + (y > 0 ? integral[idx - width] : 0);
            }
        }
        
        return integral;
    }

    computeIntegralSq(data, width, height) {
        const integral = new Float64Array(width * height);
        
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const val = data[idx];
                rowSum = rowSum + val * val;
                integral[idx] = rowSum + (y > 0 ? integral[idx - width] : 0);
            }
        }
        
        return integral;
    }

    getIntegralSum(integral, width, x1, y1, x2, y2) {
        const idx = (y, x) => y * width + x;
        
        let sum = integral[idx(y2, x2)];
        if (y1 > 0) sum = sum - integral[idx(y1 - 1, x2)];
        if (x1 > 0) sum = sum - integral[idx(y2, x1 - 1)];
        if (y1 > 0 && x1 > 0) sum = sum + integral[idx(y1 - 1, x1 - 1)];
        
        return sum;
    }
}

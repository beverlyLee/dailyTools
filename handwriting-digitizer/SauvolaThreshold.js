export class SauvolaThreshold {
    constructor(options = {}) {
        this.windowSize = options.windowSize || 31;
        this.k = options.k || 0.35;
        this.R = options.R || 128;
    }

    setWindowSize(size) {
        this.windowSize = size;
    }

    setK(k) {
        this.k = k;
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
                
                const threshold = mean * (1 + this.k * ((stdDev / this.R) - 1));
                const pixelValue = grayData[y * width + x];
                
                const binValue = pixelValue >= threshold ? 255 : 0;
                const idx = (y * width + x) * 4;
                result[idx] = binValue;
                result[idx + 1] = binValue;
                result[idx + 2] = binValue;
                result[idx + 3] = 255;
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

    computeIntegral(data, width, height) {
        const integral = new Float64Array(width * height);
        
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                rowSum += data[idx];
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
                rowSum += val * val;
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

export class SkewCorrector {
    constructor(options = {}) {
        this.angleRange = options.angleRange || 15;
        this.angleStep = options.angleStep || 0.5;
        this.maxAngleToCorrect = options.maxAngleToCorrect || 15;
    }

    setAngleRange(range) {
        this.angleRange = range;
    }

    setAngleStep(step) {
        this.angleStep = step;
    }

    apply(imageData) {
        const { width, height, data } = imageData;
        const binaryData = this.extractBinaryImage(data, width, height);
        
        const hasForeground = binaryData.some(v => v === 1);
        if (!hasForeground) {
            return { imageData, angle: 0, corrected: false };
        }
        
        const angle = this.detectSkew(binaryData, width, height);
        
        if (Math.abs(angle) > this.maxAngleToCorrect || Math.abs(angle) < 0.1) {
            return { imageData, angle, corrected: false };
        }
        
        const result = this.rotateImage(imageData, angle);
        
        return { imageData: result, angle, corrected: true };
    }

    extractBinaryImage(data, width, height) {
        const binary = new Uint8Array(width * height);
        
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            binary[i] = data[idx] > 127 ? 0 : 1;
        }
        
        return binary;
    }

    detectSkew(binary, width, height) {
        let bestAngle = 0;
        let bestScore = -Infinity;
        
        const startAngle = -this.angleRange;
        const endAngle = this.angleRange;
        
        for (let angle = startAngle; angle <= endAngle + this.angleStep / 2; angle += this.angleStep) {
            const score = this.evaluateAngle(binary, width, height, angle);
            if (score > bestScore && isFinite(score)) {
                bestScore = score;
                bestAngle = angle;
            }
        }
        
        return bestAngle;
    }

    evaluateAngle(binary, width, height, angle) {
        const radians = angle * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        const rotatedHeights = [];
        const sampleRate = 5;
        
        for (let x = 0; x < width; x += sampleRate) {
            let minY = height;
            let maxY = -1;
            
            for (let y = 0; y < height; y += sampleRate) {
                const idx = y * width + x;
                if (binary[idx] === 1) {
                    const relX = x - centerX;
                    const relY = y - centerY;
                    
                    const rotatedX = relX * cos - relY * sin;
                    const rotatedY = relX * sin + relY * cos;
                    
                    const newX = Math.round(rotatedX + centerX);
                    const newY = Math.round(rotatedY + centerY);
                    
                    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                        if (newY < minY) minY = newY;
                        if (newY > maxY) maxY = newY;
                    }
                }
            }
            
            if (minY <= maxY) {
                rotatedHeights.push(maxY - minY);
            }
        }
        
        if (rotatedHeights.length === 0) return -Infinity;
        
        const avgHeight = rotatedHeights.reduce((a, b) => a + b, 0) / rotatedHeights.length;
        return -avgHeight;
    }

    rotateImage(imageData, angle) {
        const { width, height } = imageData;
        
        if (Math.abs(angle) < 0.1) {
            return { width, height, data: new Uint8ClampedArray(imageData.data) };
        }
        
        const radians = angle * Math.PI / 180;
        
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        const corners = [
            [0, 0],
            [width, 0],
            [width, height],
            [0, height]
        ];
        
        const rotatedCorners = corners.map(([x, y]) => {
            const newX = x * cos - y * sin;
            const newY = x * sin + y * cos;
            return [newX, newY];
        });
        
        const minX = Math.min(...rotatedCorners.map(c => c[0]));
        const maxX = Math.max(...rotatedCorners.map(c => c[0]));
        const minY = Math.min(...rotatedCorners.map(c => c[1]));
        const maxY = Math.max(...rotatedCorners.map(c => c[1]));
        
        const newWidth = Math.max(1, Math.ceil(maxX - minX));
        const newHeight = Math.max(1, Math.ceil(maxY - minY));
        
        const result = new Uint8ClampedArray(newWidth * newHeight * 4);
        result.fill(255);
        
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                const dstX = x + minX;
                const dstY = y + minY;
                
                const srcX = dstX * cos + dstY * sin;
                const srcY = -dstX * sin + dstY * cos;
                
                const srcXInt = Math.floor(srcX);
                const srcYInt = Math.floor(srcY);
                
                if (srcXInt >= 0 && srcXInt < width && srcYInt >= 0 && srcYInt < height) {
                    const idx = (y * newWidth + x) * 4;
                    const srcIdx = (srcYInt * width + srcXInt) * 4;
                    
                    result[idx] = imageData.data[srcIdx];
                    result[idx + 1] = imageData.data[srcIdx + 1];
                    result[idx + 2] = imageData.data[srcIdx + 2];
                    result[idx + 3] = 255;
                }
            }
        }
        
        return { width: newWidth, height: newHeight, data: result };
    }
}

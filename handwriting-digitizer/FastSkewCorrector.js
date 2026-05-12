export class FastSkewCorrector {
    constructor(options = {}) {
        this.angleRange = options.angleRange || 20;
        this.angleStep = options.angleStep || 1;
        this.maxAngleToCorrect = options.maxAngleToCorrect || 15;
    }

    setAngleRange(range) {
        this.angleRange = range;
    }

    setAngleStep(step) {
        this.angleStep = step;
    }

    apply(imageData) {
        const inputWidth = imageData.width;
        const inputHeight = imageData.height;
        const inputData = imageData.data;
        
        const grayData = this.toGrayscale(inputData, inputWidth, inputHeight);
        const angle = this.detectSkew(grayData, inputWidth, inputHeight);
        
        if (Math.abs(angle) > this.maxAngleToCorrect) {
            return { 
                imageData: { width: inputWidth, height: inputHeight, data: inputData }, 
                angle, 
                corrected: false 
            };
        }
        
        if (Math.abs(angle) < 0.3) {
            return { 
                imageData: { width: inputWidth, height: inputHeight, data: new Uint8ClampedArray(inputData) }, 
                angle, 
                corrected: false 
            };
        }
        
        const result = this.rotateImage(imageData, angle);
        
        return { imageData: result, angle, corrected: true };
    }

    toGrayscale(data, width, height) {
        const gray = new Uint8Array(width * height);
        
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }
        
        return gray;
    }

    detectSkew(grayData, imgWidth, imgHeight) {
        if (imgHeight < 20) {
            return 0;
        }
        
        const centerX = imgWidth / 2;
        const centerY = imgHeight / 2;
        
        const sampleY = Math.max(1, Math.floor(imgHeight / 10));
        const sampledHeight = Math.max(1, Math.floor(imgHeight / sampleY));
        
        let bestAngle = 0;
        let bestScore = -Infinity;
        
        const startAngle = -this.angleRange;
        const endAngle = this.angleRange;
        
        for (let angle = startAngle; angle <= endAngle; angle += this.angleStep) {
            const radians = angle * Math.PI / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);
            
            const rowSums = new Array(sampledHeight).fill(0);
            const rowCounts = new Array(sampledHeight).fill(0);
            
            for (let sy = 0; sy < sampledHeight; sy++) {
                const y = sy * sampleY;
                
                for (let x = 0; x < imgWidth; x += 2) {
                    const idx = y * imgWidth + x;
                    if (grayData[idx] < 180) {
                        const relX = x - centerX;
                        const relY = y - centerY;
                        
                        const rotatedY = relX * sin + relY * cos;
                        const newY = Math.floor(rotatedY + centerY);
                        
                        const rowIdx = Math.floor(newY / sampleY);
                        if (rowIdx >= 0 && rowIdx < sampledHeight) {
                            rowSums[rowIdx]++;
                            rowCounts[rowIdx]++;
                        }
                    }
                }
            }
            
            let score = 0;
            for (let i = 0; i < sampledHeight; i++) {
                if (rowCounts[i] > 0) {
                    score += rowSums[i] * rowSums[i];
                }
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestAngle = angle;
            }
        }
        
        const fineStart = bestAngle - this.angleStep;
        const fineEnd = bestAngle + this.angleStep;
        const fineStep = 0.2;
        
        for (let angle = fineStart; angle <= fineEnd; angle += fineStep) {
            const radians = angle * Math.PI / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);
            
            const rowSums = new Array(sampledHeight).fill(0);
            const rowCounts = new Array(sampledHeight).fill(0);
            
            for (let sy = 0; sy < sampledHeight; sy++) {
                const y = sy * sampleY;
                
                for (let x = 0; x < imgWidth; x += 2) {
                    const idx = y * imgWidth + x;
                    if (grayData[idx] < 180) {
                        const relX = x - centerX;
                        const relY = y - centerY;
                        
                        const rotatedY = relX * sin + relY * cos;
                        const newY = Math.floor(rotatedY + centerY);
                        
                        const rowIdx = Math.floor(newY / sampleY);
                        if (rowIdx >= 0 && rowIdx < sampledHeight) {
                            rowSums[rowIdx]++;
                            rowCounts[rowIdx]++;
                        }
                    }
                }
            }
            
            let score = 0;
            for (let i = 0; i < sampledHeight; i++) {
                if (rowCounts[i] > 0) {
                    score += rowSums[i] * rowSums[i];
                }
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestAngle = angle;
            }
        }
        
        return bestAngle;
    }

    rotateImage(imageData, angle) {
        const srcWidth = imageData.width;
        const srcHeight = imageData.height;
        const srcData = imageData.data;
        
        if (Math.abs(angle) < 0.3) {
            return { width: srcWidth, height: srcHeight, data: new Uint8ClampedArray(srcData) };
        }
        
        const radians = angle * Math.PI / 180;
        
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        const corners = [
            [0, 0],
            [srcWidth, 0],
            [srcWidth, srcHeight],
            [0, srcHeight]
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
                
                if (srcXInt >= 0 && srcXInt < srcWidth && srcYInt >= 0 && srcYInt < srcHeight) {
                    const idx = (y * newWidth + x) * 4;
                    const srcIdx = (srcYInt * srcWidth + srcXInt) * 4;
                    
                    result[idx] = srcData[srcIdx];
                    result[idx + 1] = srcData[srcIdx + 1];
                    result[idx + 2] = srcData[srcIdx + 2];
                    result[idx + 3] = 255;
                }
            }
        }
        
        return { width: newWidth, height: newHeight, data: result };
    }
}

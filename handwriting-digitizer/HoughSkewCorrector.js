export class HoughSkewCorrector {
    constructor(options = {}) {
        this.angleRange = options.angleRange || 30;
        this.angleStep = options.angleStep || 0.2;
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
        
        const grayData = this.toGrayscale(data, width, height);
        const edges = this.detectEdges(grayData, width, height);
        
        const angle = this.detectSkew(edges, width, height);
        
        if (Math.abs(angle) > this.maxAngleToCorrect) {
            return { imageData, angle, corrected: false };
        }
        
        if (Math.abs(angle) < 0.15) {
            return { imageData, angle, corrected: false };
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

    detectEdges(grayData, width, height) {
        const edges = new Uint8Array(width * height);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                const gx = -grayData[idx - width - 1] - 2 * grayData[idx - 1] - grayData[idx + width - 1]
                          + grayData[idx - width + 1] + 2 * grayData[idx + 1] + grayData[idx + width + 1];
                
                const gy = -grayData[idx - width - 1] - 2 * grayData[idx - width] - grayData[idx - width + 1]
                          + grayData[idx + width - 1] + 2 * grayData[idx + width] + grayData[idx + width + 1];
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                
                edges[idx] = magnitude > 30 ? 1 : 0;
            }
        }
        
        return edges;
    }

    detectSkew(edges, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
        
        let bestAngle = 0;
        let bestScore = 0;
        
        const startAngle = -this.angleRange;
        const endAngle = this.angleRange;
        
        const scores = {};
        
        const sampleRate = 2;
        
        for (let y = 0; y < height; y += sampleRate) {
            for (let x = 0; x < width; x += sampleRate) {
                const idx = y * width + x;
                if (edges[idx] !== 1) continue;
                
                for (let angle = startAngle; angle <= endAngle + this.angleStep / 2; angle += this.angleStep) {
                    const radians = angle * Math.PI / 180;
                    const rho = (x - centerX) * Math.cos(radians) + (y - centerY) * Math.sin(radians);
                    
                    const rhoKey = Math.round(rho / 2);
                    const angleKey = Math.round(angle * 100) / 100;
                    const key = `${angleKey}_${rhoKey}`;
                    
                    scores[key] = (scores[key] || 0) + 1;
                    
                    if (scores[key] > bestScore) {
                        bestScore = scores[key];
                        bestAngle = angle;
                    }
                }
            }
        }
        
        return bestAngle;
    }

    rotateImage(imageData, angle) {
        const { width, height } = imageData;
        
        if (Math.abs(angle) < 0.15) {
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
                
                const srcX0 = Math.floor(srcX);
                const srcY0 = Math.floor(srcY);
                const srcX1 = srcX0 + 1;
                const srcY1 = srcY0 + 1;
                
                if (srcX0 >= 0 && srcX1 < width && srcY0 >= 0 && srcY1 < height) {
                    const fx = srcX - srcX0;
                    const fy = srcY - srcY0;
                    
                    const idx = (y * newWidth + x) * 4;
                    
                    for (let c = 0; c < 3; c++) {
                        const v00 = imageData.data[(srcY0 * width + srcX0) * 4 + c];
                        const v10 = imageData.data[(srcY0 * width + srcX1) * 4 + c];
                        const v01 = imageData.data[(srcY1 * width + srcX0) * 4 + c];
                        const v11 = imageData.data[(srcY1 * width + srcX1) * 4 + c];
                        
                        const v0 = v00 * (1 - fx) + v10 * fx;
                        const v1 = v01 * (1 - fx) + v11 * fx;
                        const v = v0 * (1 - fy) + v1 * fy;
                        
                        result[idx + c] = Math.round(v);
                    }
                    result[idx + 3] = 255;
                }
            }
        }
        
        return { width: newWidth, height: newHeight, data: result };
    }
}

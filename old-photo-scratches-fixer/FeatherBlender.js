export class FeatherBlender {
    constructor(options = {}) {
        this.featherRadius = options.featherRadius || 8;
        this.blendStrength = options.blendStrength || 0.4;
        this.colorCorrection = options.colorCorrection !== false;
    }

    blend(originalImage, synthesizedImage, binaryMask) {
        const width = originalImage.width;
        const height = originalImage.height;
        
        console.log('=== 开始羽化融合 ===');
        console.log('羽化半径:', this.featherRadius);
        
        const originalData = originalImage.data;
        const synthData = synthesizedImage.data;
        const resultData = new Uint8ClampedArray(originalData.length);
        
        const dilatedMask = this.dilateMask(binaryMask, width, height, this.featherRadius);
        
        const blendWeights = this.calculateBlendWeights(binaryMask, dilatedMask, width, height);
        
        let blendedCount = 0;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const dataIdx = idx * 4;
                const weight = blendWeights[idx];
                
                if (weight === 0) {
                    resultData[dataIdx] = originalData[dataIdx];
                    resultData[dataIdx + 1] = originalData[dataIdx + 1];
                    resultData[dataIdx + 2] = originalData[dataIdx + 2];
                    resultData[dataIdx + 3] = originalData[dataIdx + 3];
                } else if (weight === 1) {
                    resultData[dataIdx] = synthData[dataIdx];
                    resultData[dataIdx + 1] = synthData[dataIdx + 1];
                    resultData[dataIdx + 2] = synthData[dataIdx + 2];
                    resultData[dataIdx + 3] = synthData[dataIdx + 3];
                    blendedCount++;
                } else {
                    const effectiveWeight = weight * this.blendStrength + weight * (1 - this.blendStrength);
                    resultData[dataIdx] = Math.round(
                        originalData[dataIdx] * (1 - effectiveWeight) + synthData[dataIdx] * effectiveWeight
                    );
                    resultData[dataIdx + 1] = Math.round(
                        originalData[dataIdx + 1] * (1 - effectiveWeight) + synthData[dataIdx + 1] * effectiveWeight
                    );
                    resultData[dataIdx + 2] = Math.round(
                        originalData[dataIdx + 2] * (1 - effectiveWeight) + synthData[dataIdx + 2] * effectiveWeight
                    );
                    resultData[dataIdx + 3] = 255;
                    blendedCount++;
                }
            }
        }
        
        console.log('融合像素数:', blendedCount);
        
        if (this.colorCorrection) {
            this.applyLocalColorCorrection(resultData, originalData, binaryMask, dilatedMask, width, height);
        }
        
        return new ImageData(resultData, width, height);
    }

    dilateMask(binaryMask, width, height, radius) {
        const dilated = new Uint8Array(binaryMask);
        
        for (let iter = 0; iter < radius; iter++) {
            const temp = new Uint8Array(dilated);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (temp[y * width + x]) {
                        const neighbors = [
                            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
                        ];
                        
                        for (const [nx, ny] of neighbors) {
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                dilated[ny * width + nx] = 1;
                            }
                        }
                    }
                }
            }
        }
        
        return dilated;
    }

    calculateBlendWeights(originalMask, dilatedMask, width, height) {
        const weights = new Float32Array(width * height);
        const distanceTransform = this.distanceTransform(originalMask, width, height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (originalMask[idx]) {
                    weights[idx] = 1.0;
                } else if (dilatedMask[idx]) {
                    const dist = distanceTransform[idx];
                    const normalizedDist = Math.min(dist / this.featherRadius, 1.0);
                    weights[idx] = 1.0 - normalizedDist;
                } else {
                    weights[idx] = 0.0;
                }
            }
        }
        
        return weights;
    }

    distanceTransform(mask, width, height) {
        const distances = new Float32Array(width * height);
        const maxDist = this.featherRadius + 1;
        
        const boundaryPoints = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (mask[idx]) {
                    boundaryPoints.push([x, y]);
                }
            }
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (mask[idx]) {
                    distances[idx] = 0;
                    continue;
                }
                
                let minDist = maxDist;
                
                for (const [bx, by] of boundaryPoints) {
                    const dx = x - bx;
                    const dy = y - by;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < minDist) {
                        minDist = dist;
                        if (minDist < 1) break;
                    }
                }
                
                distances[idx] = minDist;
            }
        }
        
        return distances;
    }

    applyLocalColorCorrection(resultData, originalData, originalMask, dilatedMask, width, height) {
        const edgePixels = [];
        const sampleRadius = 5;
        
        for (let y = sampleRadius; y < height - sampleRadius; y++) {
            for (let x = sampleRadius; x < width - sampleRadius; x++) {
                const idx = y * width + x;
                if (originalMask[idx]) {
                    const hasOutsideNeighbor = this.checkOutsideNeighbor(originalMask, x, y, width, height, 3);
                    if (hasOutsideNeighbor) {
                        edgePixels.push([x, y]);
                    }
                }
            }
        }
        
        if (edgePixels.length < 5) {
            console.log('边缘像素不足，跳过颜色校正');
            return;
        }
        
        console.log('边缘像素数:', edgePixels.length);
        
        let totalOrigR = 0, totalOrigG = 0, totalOrigB = 0;
        let totalSynthR = 0, totalSynthG = 0, totalSynthB = 0;
        let sampleCount = 0;
        
        const step = Math.max(1, Math.floor(edgePixels.length / 50));
        
        for (let i = 0; i < edgePixels.length; i += step) {
            const [cx, cy] = edgePixels[i];
            
            const origAvg = this.sampleNeighborhood(originalData, originalMask, cx, cy, width, height, sampleRadius, false);
            const synthAvg = this.sampleNeighborhood(resultData, originalMask, cx, cy, width, height, sampleRadius, true);
            
            if (origAvg && synthAvg) {
                totalOrigR += origAvg.r;
                totalOrigG += origAvg.g;
                totalOrigB += origAvg.b;
                totalSynthR += synthAvg.r;
                totalSynthG += synthAvg.g;
                totalSynthB += synthAvg.b;
                sampleCount++;
            }
        }
        
        if (sampleCount > 0) {
            const origAvgR = totalOrigR / sampleCount;
            const origAvgG = totalOrigG / sampleCount;
            const origAvgB = totalOrigB / sampleCount;
            const synthAvgR = totalSynthR / sampleCount;
            const synthAvgG = totalSynthG / sampleCount;
            const synthAvgB = totalSynthB / sampleCount;
            
            const diffR = (origAvgR - synthAvgR) * this.blendStrength;
            const diffG = (origAvgG - synthAvgG) * this.blendStrength;
            const diffB = (origAvgB - synthAvgB) * this.blendStrength;
            
            console.log('颜色校正:', { diffR: diffR.toFixed(1), diffG: diffG.toFixed(1), diffB: diffB.toFixed(1) });
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = y * width + x;
                    if (originalMask[idx] || dilatedMask[idx]) {
                        const dataIdx = idx * 4;
                        resultData[dataIdx] = Math.max(0, Math.min(255, Math.round(resultData[dataIdx] + diffR)));
                        resultData[dataIdx + 1] = Math.max(0, Math.min(255, Math.round(resultData[dataIdx + 1] + diffG)));
                        resultData[dataIdx + 2] = Math.max(0, Math.min(255, Math.round(resultData[dataIdx + 2] + diffB)));
                    }
                }
            }
        }
    }

    checkOutsideNeighbor(mask, x, y, width, height, distance) {
        for (let dy = -distance; dy <= distance; dy++) {
            for (let dx = -distance; dx <= distance; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                
                if (!mask[ny * width + nx]) {
                    return true;
                }
            }
        }
        
        return false;
    }

    sampleNeighborhood(data, mask, cx, cy, width, height, radius, includeMasked) {
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const idx = y * width + x;
                const isMasked = mask[idx];
                
                if (includeMasked) {
                    if (!isMasked) continue;
                } else {
                    if (isMasked) continue;
                }
                
                const dataIdx = idx * 4;
                r += data[dataIdx];
                g += data[dataIdx + 1];
                b += data[dataIdx + 2];
                count++;
            }
        }
        
        if (count === 0) return null;
        
        return {
            r: r / count,
            g: g / count,
            b: b / count
        };
    }

    smooth(imageData, binaryMask, radius = 3) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const result = new Uint8ClampedArray(data);
        
        const dilated = this.dilateMask(binaryMask, width, height, radius);
        
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                const idx = y * width + x;
                if (dilated[idx]) {
                    const avg = this.blurNeighborhood(data, x, y, width, height, radius);
                    if (avg) {
                        const dataIdx = idx * 4;
                        result[dataIdx] = avg.r;
                        result[dataIdx + 1] = avg.g;
                        result[dataIdx + 2] = avg.b;
                    }
                }
            }
        }
        
        return new ImageData(result, width, height);
    }

    blurNeighborhood(data, cx, cy, width, height, radius) {
        let r = 0, g = 0, b = 0, totalWeight = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const dist = Math.sqrt(dx * dx + dy * dy);
                const weight = Math.exp(-dist / radius);
                
                const dataIdx = (y * width + x) * 4;
                r += data[dataIdx] * weight;
                g += data[dataIdx + 1] * weight;
                b += data[dataIdx + 2] * weight;
                totalWeight += weight;
            }
        }
        
        if (totalWeight === 0) return null;
        
        return {
            r: Math.round(r / totalWeight),
            g: Math.round(g / totalWeight),
            b: Math.round(b / totalWeight)
        };
    }
}

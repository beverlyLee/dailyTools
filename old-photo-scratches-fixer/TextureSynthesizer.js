export class TextureSynthesizer {
    constructor(options = {}) {
        this.patchSize = options.patchSize || 15;
        this.sampleRadius = options.sampleRadius || 80;
        this.maxIterations = options.maxIterations || 3;
    }

    inpaint(imageData, binaryMask) {
        const width = imageData.width;
        const height = imageData.height;
        const data = new Uint8ClampedArray(imageData.data);
        
        console.log('=== 开始纹理填充 ===');
        console.log('待修复像素数:', binaryMask.reduce((a, b) => a + b, 0));
        
        const workingMask = new Uint8Array(binaryMask);
        
        for (let iter = 0; iter < this.maxIterations; iter++) {
            const defectCount = workingMask.reduce((a, b) => a + b, 0);
            if (defectCount === 0) break;
            
            console.log(`迭代 ${iter + 1}: 剩余 ${defectCount} 像素待修复`);
            
            const boundaryPixels = this.findBoundaryPixels(workingMask, width, height);
            
            if (boundaryPixels.length === 0) {
                break;
            }
            
            console.log(`  边界像素数: ${boundaryPixels.length}`);
            
            for (const pixel of boundaryPixels) {
                const bestSample = this.findBestSample(data, workingMask, pixel.x, pixel.y, width, height);
                
                if (bestSample) {
                    this.copyPixel(data, bestSample.x, bestSample.y, pixel.x, pixel.y, width, height);
                    workingMask[pixel.y * width + pixel.x] = 0;
                }
            }
            
            this.fillRemainingIsolatedPixels(data, workingMask, width, height);
        }
        
        const remaining = workingMask.reduce((a, b) => a + b, 0);
        if (remaining > 0) {
            console.log(`使用平均填充剩余 ${remaining} 像素`);
            this.averageFillRemaining(data, workingMask, width, height);
        }
        
        console.log('纹理填充完成');
        return new ImageData(data, width, height);
    }

    findBoundaryPixels(mask, width, height) {
        const boundary = [];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (!mask[idx]) continue;
                
                if (this.hasValidNeighbor(mask, x, y, width, height)) {
                    let knownCount = 0;
                    const neighbors = [
                        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
                        [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
                    ];
                    
                    for (const [nx, ny] of neighbors) {
                        if (!mask[ny * width + nx]) knownCount++;
                    }
                    
                    boundary.push({ x, y, knownCount });
                }
            }
        }
        
        boundary.sort((a, b) => b.knownCount - a.knownCount);
        return boundary;
    }

    hasValidNeighbor(mask, x, y, width, height) {
        const neighbors = [
            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
        ];
        
        for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (!mask[ny * width + nx]) return true;
            }
        }
        
        return false;
    }

    findBestSample(data, mask, targetX, targetY, width, height) {
        const halfPatch = Math.floor(this.patchSize / 2);
        
        let bestSample = null;
        let bestError = Infinity;
        let candidatesChecked = 0;
        
        const searchRadius = this.sampleRadius;
        const step = 5;
        
        const startX = Math.max(halfPatch, targetX - searchRadius);
        const endX = Math.min(width - halfPatch - 1, targetX + searchRadius);
        const startY = Math.max(halfPatch, targetY - searchRadius);
        const endY = Math.min(height - halfPatch - 1, targetY + searchRadius);
        
        for (let sy = startY; sy <= endY; sy += step) {
            for (let sx = startX; sx <= endX; sx += step) {
                if (this.isSampleValid(mask, sx, sy, width, height, halfPatch)) {
                    const error = this.calculatePatchError(data, mask, targetX, targetY, 
                                                          sx, sy, width, height, halfPatch);
                    
                    if (error !== null && error < bestError) {
                        bestError = error;
                        bestSample = { x: sx, y: sy };
                    }
                    candidatesChecked++;
                }
            }
        }
        
        if (!bestSample) {
            for (let sy = halfPatch; sy < height - halfPatch; sy += step * 2) {
                for (let sx = halfPatch; sx < width - halfPatch; sx += step * 2) {
                    if (this.isSampleValid(mask, sx, sy, width, height, halfPatch)) {
                        const error = this.calculatePatchError(data, mask, targetX, targetY, 
                                                              sx, sy, width, height, halfPatch);
                        
                        if (error !== null && error < bestError) {
                            bestError = error;
                            bestSample = { x: sx, y: sy };
                        }
                    }
                }
            }
        }
        
        return bestSample;
    }

    isSampleValid(mask, cx, cy, width, height, halfPatch) {
        for (let dy = -halfPatch; dy <= halfPatch; dy++) {
            for (let dx = -halfPatch; dx <= halfPatch; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                
                if (x < 0 || x >= width || y < 0 || y >= height) return false;
                if (mask[y * width + x]) return false;
            }
        }
        
        return true;
    }

    calculatePatchError(data, mask, tx, ty, sx, sy, width, height, halfPatch) {
        let totalError = 0;
        let validPixels = 0;
        
        for (let dy = -halfPatch; dy <= halfPatch; dy++) {
            for (let dx = -halfPatch; dx <= halfPatch; dx++) {
                const tpx = tx + dx;
                const tpy = ty + dy;
                const spx = sx + dx;
                const spy = sy + dy;
                
                if (tpx < 0 || tpx >= width || tpy < 0 || tpy >= height ||
                    spx < 0 || spx >= width || spy < 0 || spy >= height) {
                    continue;
                }
                
                const targetIdx = tpy * width + tpx;
                if (mask[targetIdx]) continue;
                
                const tDataIdx = targetIdx * 4;
                const sDataIdx = (spy * width + spx) * 4;
                
                const dr = data[tDataIdx] - data[sDataIdx];
                const dg = data[tDataIdx + 1] - data[sDataIdx + 1];
                const db = data[tDataIdx + 2] - data[sDataIdx + 2];
                
                totalError += dr * dr + dg * dg + db * db;
                validPixels++;
            }
        }
        
        if (validPixels < halfPatch) return null;
        
        return totalError / validPixels;
    }

    copyPixel(data, srcX, srcY, dstX, dstY, width, height) {
        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (dstY * width + dstX) * 4;
        
        data[dstIdx] = data[srcIdx];
        data[dstIdx + 1] = data[srcIdx + 1];
        data[dstIdx + 2] = data[srcIdx + 2];
        data[dstIdx + 3] = data[srcIdx + 3];
    }

    fillRemainingIsolatedPixels(data, mask, width, height) {
        const smallHalfPatch = Math.floor(this.patchSize / 3);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (!mask[idx]) continue;
                
                const avg = this.averageValidNeighbors(data, mask, x, y, width, height, 3);
                if (avg !== null) {
                    const dataIdx = idx * 4;
                    data[dataIdx] = avg.r;
                    data[dataIdx + 1] = avg.g;
                    data[dataIdx + 2] = avg.b;
                    data[dataIdx + 3] = 255;
                    mask[idx] = 0;
                }
            }
        }
    }

    averageValidNeighbors(data, mask, cx, cy, width, height, radius) {
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const idx = y * width + x;
                if (mask[idx]) continue;
                
                const dataIdx = idx * 4;
                r += data[dataIdx];
                g += data[dataIdx + 1];
                b += data[dataIdx + 2];
                count++;
            }
        }
        
        if (count < 4) return null;
        
        return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count)
        };
    }

    averageFillRemaining(data, mask, width, height) {
        const maxRadius = 15;
        
        for (let radius = 1; radius <= maxRadius; radius++) {
            let changed = true;
            while (changed) {
                changed = false;
                
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = y * width + x;
                        if (!mask[idx]) continue;
                        
                        const avg = this.averageValidNeighbors(data, mask, x, y, width, height, radius);
                        if (avg !== null) {
                            const dataIdx = idx * 4;
                            data[dataIdx] = avg.r;
                            data[dataIdx + 1] = avg.g;
                            data[dataIdx + 2] = avg.b;
                            data[dataIdx + 3] = 255;
                            mask[idx] = 0;
                            changed = true;
                        }
                    }
                }
            }
        }
    }

    smoothEdges(imageData, binaryMask, radius = 2) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const result = new Uint8ClampedArray(data);
        
        const dilatedMask = this.dilateMask(binaryMask, width, height, radius);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (dilatedMask[idx] && !binaryMask[idx]) {
                    const avg = this.averageAllNeighbors(data, x, y, width, height, radius);
                    if (avg !== null) {
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

    dilateMask(mask, width, height, radius) {
        const dilated = new Uint8Array(mask);
        
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

    averageAllNeighbors(data, cx, cy, width, height, radius) {
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                
                if (x < 0 || x >= width || y < 0 || y >= height) continue;
                
                const dataIdx = (y * width + x) * 4;
                r += data[dataIdx];
                g += data[dataIdx + 1];
                b += data[dataIdx + 2];
                count++;
            }
        }
        
        if (count === 0) return null;
        
        return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count)
        };
    }
}

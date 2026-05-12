class RegionMerger {
    constructor(options = {}) {
        this.horizontalGap = options.horizontalGap || 60;
        this.verticalGap = options.verticalGap || 40;
        this.sameLineTolerance = options.sameLineTolerance || 0.6;
        this.paragraphGap = options.paragraphGap || 80;
        
        console.log('RegionMerger 初始化完成');
    }

    merge(regions) {
        if (regions.length === 0) return [];
        
        console.log('区域合并前数量:', regions.length);
        
        let merged = [...regions];
        
        merged = this.mergeHorizontalRegions(merged);
        console.log('水平合并后数量:', merged.length);
        
        merged = this.mergeVerticalRegions(merged);
        console.log('垂直合并后数量:', merged.length);
        
        merged = this.mergeParagraphs(merged);
        console.log('段落合并后数量:', merged.length);
        
        merged = this.removeNestedRegions(merged);
        console.log('移除嵌套后数量:', merged.length);
        
        return merged;
    }

    mergeHorizontalRegions(regions) {
        if (regions.length === 0) return [];
        
        const sorted = [...regions].sort((a, b) => {
            if (Math.abs(a.y - b.y) < Math.max(a.height, b.height) * this.sameLineTolerance) {
                return a.x - b.x;
            }
            return a.y - b.y;
        });
        
        const merged = [];
        let currentLine = [sorted[0]];
        
        for (let i = 1; i < sorted.length; i++) {
            const region = sorted[i];
            const lastRegion = currentLine[currentLine.length - 1];
            
            if (this.isSameLine(region, lastRegion)) {
                if (this.areCloseHorizontally(region, lastRegion)) {
                    currentLine.push(region);
                } else {
                    merged.push(this.mergeRegions(currentLine));
                    currentLine = [region];
                }
            } else {
                merged.push(this.mergeRegions(currentLine));
                currentLine = [region];
            }
        }
        
        merged.push(this.mergeRegions(currentLine));
        
        return merged;
    }

    mergeVerticalRegions(regions) {
        if (regions.length === 0) return [];
        
        let merged = [...regions];
        let changed = true;
        let iterations = 0;
        
        while (changed && iterations < 20) {
            changed = false;
            iterations++;
            
            for (let i = 0; i < merged.length; i++) {
                for (let j = i + 1; j < merged.length; j++) {
                    const r1 = merged[i];
                    const r2 = merged[j];
                    
                    if (this.shouldMergeVertically(r1, r2)) {
                        merged[i] = this.mergeTwoRegions(r1, r2);
                        merged.splice(j, 1);
                        changed = true;
                        j--;
                    }
                }
            }
        }
        
        return merged;
    }

    mergeParagraphs(regions) {
        if (regions.length === 0) return [];
        
        let merged = [...regions];
        let changed = true;
        let iterations = 0;
        
        while (changed && iterations < 10) {
            changed = false;
            iterations++;
            
            for (let i = 0; i < merged.length; i++) {
                for (let j = i + 1; j < merged.length; j++) {
                    const r1 = merged[i];
                    const r2 = merged[j];
                    
                    if (this.shouldMergeParagraph(r1, r2)) {
                        merged[i] = this.mergeTwoRegions(r1, r2);
                        merged.splice(j, 1);
                        changed = true;
                        j--;
                    }
                }
            }
        }
        
        return merged;
    }

    isSameLine(r1, r2) {
        const centerY1 = r1.y + r1.height / 2;
        const centerY2 = r2.y + r2.height / 2;
        
        const maxHeight = Math.max(r1.height, r2.height);
        
        return Math.abs(centerY1 - centerY2) < maxHeight * this.sameLineTolerance;
    }

    areCloseHorizontally(r1, r2) {
        const gap = Math.abs(r1.x + r1.width - r2.x);
        
        const avgHeight = (r1.height + r2.height) / 2;
        
        return gap < this.horizontalGap || gap < avgHeight * 2.5;
    }

    shouldMergeVertically(r1, r2) {
        const overlapX = this.getHorizontalOverlap(r1, r2);
        
        if (overlapX < 0.2) return false;
        
        const gap = this.getVerticalGap(r1, r2);
        
        const avgHeight = (r1.height + r2.height) / 2;
        
        return gap < this.verticalGap || gap < avgHeight * 1.5;
    }

    shouldMergeParagraph(r1, r2) {
        const overlapX = this.getHorizontalOverlap(r1, r2);
        
        if (overlapX < 0.4) return false;
        
        const gap = this.getVerticalGap(r1, r2);
        
        if (gap > this.paragraphGap) return false;
        
        const maxHeight = Math.max(r1.height, r2.height);
        const centerY1 = r1.y + r1.height / 2;
        const centerY2 = r2.y + r2.height / 2;
        
        if (Math.abs(centerY1 - centerY2) > maxHeight * 6) return false;
        
        return true;
    }

    getHorizontalOverlap(r1, r2) {
        const x1 = Math.max(r1.x, r2.x);
        const x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
        
        if (x2 <= x1) return 0;
        
        const overlapWidth = x2 - x1;
        const minWidth = Math.min(r1.width, r2.width);
        
        return overlapWidth / minWidth;
    }

    getVerticalGap(r1, r2) {
        const bottom1 = r1.y + r1.height;
        const top2 = r2.y;
        const gap1 = Math.abs(bottom1 - top2);
        
        const bottom2 = r2.y + r2.height;
        const top1 = r1.y;
        const gap2 = Math.abs(bottom2 - top1);
        
        return Math.min(gap1, gap2);
    }

    mergeRegions(regions) {
        if (regions.length === 1) return regions[0];
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const r of regions) {
            minX = Math.min(minX, r.x);
            maxX = Math.max(maxX, r.x + r.width);
            minY = Math.min(minY, r.y);
            maxY = Math.max(maxY, r.y + r.height);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            area: (maxX - minX) * (maxY - minY)
        };
    }

    mergeTwoRegions(r1, r2) {
        const newX = Math.min(r1.x, r2.x);
        const newY = Math.min(r1.y, r2.y);
        const newWidth = Math.max(r1.x + r1.width, r2.x + r2.width) - newX;
        const newHeight = Math.max(r1.y + r1.height, r2.y + r2.height) - newY;
        
        return {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            area: newWidth * newHeight
        };
    }

    removeNestedRegions(regions) {
        if (regions.length === 0) return [];
        
        const sorted = [...regions].sort((a, b) => (b.width * b.height) - (a.width * a.height));
        const result = [];
        
        for (let i = 0; i < sorted.length; i++) {
            const region = sorted[i];
            let isNested = false;
            
            for (let j = 0; j < result.length; j++) {
                const other = result[j];
                
                if (this.isInside(region, other, 10)) {
                    isNested = true;
                    break;
                }
            }
            
            if (!isNested) {
                result.push(region);
            }
        }
        
        return result;
    }

    isInside(inner, outer, padding = 5) {
        return (
            inner.x >= outer.x - padding &&
            inner.y >= outer.y - padding &&
            inner.x + inner.width <= outer.x + outer.width + padding &&
            inner.y + inner.height <= outer.y + outer.height + padding
        );
    }

    cropRegions(imageData, regions) {
        const { width, height, data } = imageData;
        const crops = [];
        
        console.log('裁剪区域数:', regions.length);
        
        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            const cropData = this.cropSingleRegion(data, width, height, region);
            
            if (cropData && cropData.width > 0 && cropData.height > 0) {
                crops.push({
                    region,
                    imageData: cropData
                });
            } else {
                console.warn('区域', i, '裁剪失败:', region);
            }
        }
        
        console.log('成功裁剪数:', crops.length);
        return crops;
    }

    cropSingleRegion(data, imageWidth, imageHeight, region) {
        let { x, y, width, height } = region;
        
        const padding = 6;
        
        x = Math.max(0, x - padding);
        y = Math.max(0, y - padding);
        width = Math.min(width + padding * 2, imageWidth - x);
        height = Math.min(height + padding * 2, imageHeight - y);
        
        if (width <= 0 || height <= 0) {
            return null;
        }
        
        x = Math.floor(x);
        y = Math.floor(y);
        width = Math.floor(width);
        height = Math.floor(height);
        
        const cropData = new Uint8ClampedArray(width * height * 4);
        
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const srcIdx = ((y + i) * imageWidth + (x + j)) * 4;
                const destIdx = (i * width + j) * 4;
                
                if (srcIdx >= 0 && srcIdx < data.length) {
                    cropData[destIdx] = data[srcIdx];
                    cropData[destIdx + 1] = data[srcIdx + 1];
                    cropData[destIdx + 2] = data[srcIdx + 2];
                    cropData[destIdx + 3] = data[srcIdx + 3];
                } else {
                    cropData[destIdx] = 255;
                    cropData[destIdx + 1] = 255;
                    cropData[destIdx + 2] = 255;
                    cropData[destIdx + 3] = 255;
                }
            }
        }
        
        return {
            width,
            height,
            data: cropData
        };
    }
}

export { RegionMerger };

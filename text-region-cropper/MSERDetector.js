class TextRegionDetector {
    constructor(options = {}) {
        this.minArea = options.minArea || 10;
        this.maxArea = options.maxArea || 100000;
        this.minWidth = options.minWidth || 6;
        this.minHeight = options.minHeight || 6;
        
        console.log('TextRegionDetector 初始化完成');
    }

    detect(imageData) {
        const { width, height, data } = imageData;
        console.log('开始文字检测，图像尺寸:', width, 'x', height);
        
        const grayImage = this.convertToGrayscale(data, width, height);
        
        const regions = [];
        
        const allThresholdRegions = this.scanAllThresholds(grayImage, width, height);
        console.log('全阈值扫描检测到:', allThresholdRegions.length, '个区域');
        regions.push(...allThresholdRegions);
        
        const edgeRegions = this.detectByEdge(grayImage, width, height);
        console.log('边缘检测到:', edgeRegions.length, '个区域');
        regions.push(...edgeRegions);
        
        console.log('总区域数:', regions.length);
        
        if (regions.length === 0) {
            console.warn('检测阶段没有找到任何区域！');
            return [];
        }
        
        const merged = this.mergeOverlappingRegions(regions);
        console.log('合并重叠后:', merged.length, '个区域');
        
        const filtered = this.filterBySize(merged, width, height);
        console.log('尺寸过滤后:', filtered.length, '个区域');
        
        return filtered;
    }

    convertToGrayscale(data, width, height) {
        const gray = new Uint8ClampedArray(width * height);
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const idx = (i * width + j) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                gray[i * width + j] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            }
        }
        return gray;
    }

    scanAllThresholds(gray, width, height) {
        const regions = [];
        
        const thresholds = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240];
        console.log('使用阈值:', thresholds);
        
        for (const threshold of thresholds) {
            const darkRegions = this.findConnectedRegions(
                gray, width, height,
                (v) => v <= threshold
            );
            regions.push(...darkRegions);
            
            const brightRegions = this.findConnectedRegions(
                gray, width, height,
                (v) => v >= threshold
            );
            regions.push(...brightRegions);
        }
        
        return regions;
    }

    detectByEdge(gray, width, height) {
        const edges = this.computeEdges(gray, width, height);
        
        return this.findConnectedRegions(
            edges, width, height,
            (v) => v > 15
        );
    }

    computeEdges(gray, width, height) {
        const edges = new Uint8ClampedArray(width * height);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                const gx = -gray[idx - width - 1] - 2 * gray[idx - 1] - gray[idx + width - 1]
                          + gray[idx - width + 1] + 2 * gray[idx + 1] + gray[idx + width + 1];
                
                const gy = -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1]
                          + gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];
                
                edges[idx] = Math.min(255, Math.abs(gx) + Math.abs(gy));
            }
        }
        
        return edges;
    }

    findConnectedRegions(image, width, height, condition) {
        const visited = new Array(width * height).fill(false);
        const regions = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (visited[idx]) continue;
                
                if (condition(image[idx])) {
                    const region = this.floodFill(image, width, height, x, y, condition, visited);
                    if (region.area >= this.minArea) {
                        if (region.width >= this.minWidth && region.height >= this.minHeight) {
                            regions.push(region);
                        }
                    }
                }
            }
        }
        
        return regions;
    }

    floodFill(image, width, height, startX, startY, condition, visited) {
        const stack = [[startX, startY]];
        let minX = startX, maxX = startX;
        let minY = startY, maxY = startY;
        let area = 0;
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const idx = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited[idx]) continue;
            if (!condition(image[idx])) continue;
            
            visited[idx] = true;
            area++;
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            
            if (x + 1 < width) stack.push([x + 1, y]);
            if (x - 1 >= 0) stack.push([x - 1, y]);
            if (y + 1 < height) stack.push([x, y + 1]);
            if (y - 1 >= 0) stack.push([x, y - 1]);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            area
        };
    }

    mergeOverlappingRegions(regions) {
        if (regions.length === 0) return [];
        
        let merged = [...regions];
        let changed = true;
        let iterations = 0;
        const maxIterations = 30;
        
        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;
            
            for (let i = 0; i < merged.length; i++) {
                for (let j = i + 1; j < merged.length; j++) {
                    const r1 = merged[i];
                    const r2 = merged[j];
                    
                    if (this.shouldMerge(r1, r2)) {
                        merged[i] = this.mergeTwo(r1, r2);
                        merged.splice(j, 1);
                        changed = true;
                        j--;
                    }
                }
            }
        }
        
        console.log('合并迭代次数:', iterations);
        return merged;
    }

    shouldMerge(r1, r2) {
        const overlap = this.calculateOverlap(r1, r2);
        if (overlap > 0.1) return true;
        
        const gap = this.calculateGap(r1, r2);
        const avgSize = Math.sqrt((r1.width * r1.height + r2.width * r2.height) / 2);
        
        if (gap < avgSize * 0.6) {
            const overlapX = this.calculateHorizontalOverlap(r1, r2);
            const overlapY = this.calculateVerticalOverlap(r1, r2);
            
            if (overlapX > 0.25 || overlapY > 0.25) {
                return true;
            }
        }
        
        return false;
    }

    calculateOverlap(r1, r2) {
        const x1 = Math.max(r1.x, r2.x);
        const y1 = Math.max(r1.y, r2.y);
        const x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
        const y2 = Math.min(r1.y + r1.height, r2.y + r2.height);
        
        if (x2 <= x1 || y2 <= y1) return 0;
        
        const overlapArea = (x2 - x1) * (y2 - y1);
        const area1 = r1.width * r1.height;
        const area2 = r2.width * r2.height;
        const minArea = Math.min(area1, area2);
        
        return overlapArea / minArea;
    }

    calculateGap(r1, r2) {
        const x1 = Math.max(r1.x, r2.x);
        const y1 = Math.max(r1.y, r2.y);
        const x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
        const y2 = Math.min(r1.y + r1.height, r2.y + r2.height);
        
        let gapX = 0;
        let gapY = 0;
        
        if (x2 <= x1) gapX = x1 - x2;
        if (y2 <= y1) gapY = y1 - y2;
        
        return Math.max(gapX, gapY);
    }

    calculateHorizontalOverlap(r1, r2) {
        const x1 = Math.max(r1.x, r2.x);
        const x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
        
        if (x2 <= x1) return 0;
        
        const overlapWidth = x2 - x1;
        const minWidth = Math.min(r1.width, r2.width);
        
        return overlapWidth / minWidth;
    }

    calculateVerticalOverlap(r1, r2) {
        const y1 = Math.max(r1.y, r2.y);
        const y2 = Math.min(r1.y + r1.height, r2.y + r2.height);
        
        if (y2 <= y1) return 0;
        
        const overlapHeight = y2 - y1;
        const minHeight = Math.min(r1.height, r2.height);
        
        return overlapHeight / minHeight;
    }

    mergeTwo(r1, r2) {
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

    filterBySize(regions, imageWidth, imageHeight) {
        return regions.filter(region => {
            if (region.width <= 0 || region.height <= 0) return false;
            if (region.area < this.minArea) return false;
            if (region.area > this.maxArea) return false;
            if (region.width < this.minWidth || region.height < this.minHeight) return false;
            if (region.x < 0 || region.y < 0) return false;
            if (region.x + region.width > imageWidth) return false;
            if (region.y + region.height > imageHeight) return false;
            return true;
        });
    }
}

export { TextRegionDetector };

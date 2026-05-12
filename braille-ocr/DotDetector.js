class DotDetector {
    constructor(options = {}) {
        this.minDotSize = options.minDotSize || 4;
        this.maxDotSize = options.maxDotSize || 150;
    }

    setMinDotSize(s) { this.minDotSize = s; }
    setMaxDotSize(s) { this.maxDotSize = s; }

    toGray(imageData) {
        const { width, height, data } = imageData;
        const gray = new Uint8ClampedArray(width * height);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            gray[j] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }
        return { width, height, data: gray };
    }

    enhanceContrast(gray) {
        const { width, height, data } = gray;
        const out = new Uint8ClampedArray(width * height);
        let min = 255, max = 0;
        for (let i = 0; i < data.length; i++) {
            if (data[i] < min) min = data[i];
            if (data[i] > max) max = data[i];
        }
        const range = max - min || 1;
        for (let i = 0; i < data.length; i++) {
            out[i] = Math.round((data[i] - min) / range * 255);
        }
        return { width, height, data: out };
    }

    adaptiveThreshold(gray, blockSize = 31, C = 12) {
        const { width, height, data } = gray;
        const bin = new Uint8ClampedArray(width * height);
        const half = Math.floor(blockSize / 2);
        
        const integral = new Int32Array(width * height);
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                rowSum += data[y * width + x];
                integral[y * width + x] = rowSum + (y > 0 ? integral[(y - 1) * width + x] : 0);
            }
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const x1 = Math.max(0, x - half);
                const x2 = Math.min(width - 1, x + half);
                const y1 = Math.max(0, y - half);
                const y2 = Math.min(height - 1, y + half);
                
                const count = (x2 - x1 + 1) * (y2 - y1 + 1);
                let sum = integral[y2 * width + x2];
                if (y1 > 0) sum -= integral[(y1 - 1) * width + x2];
                if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)];
                if (y1 > 0 && x1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)];
                
                const mean = sum / count;
                bin[y * width + x] = data[y * width + x] < (mean - C) ? 0 : 255;
            }
        }
        
        return { width, height, data: bin };
    }

    invert(bin) {
        const { width, height, data } = bin;
        const out = new Uint8ClampedArray(width * height);
        for (let i = 0; i < data.length; i++) {
            out[i] = 255 - data[i];
        }
        return { width, height, data: out };
    }

    erode(bin, k = 2) {
        const { width, height, data } = bin;
        const out = new Uint8ClampedArray(width * height);
        const half = Math.floor(k / 2);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let min = 255;
                for (let dy = -half; dy <= half; dy++) {
                    for (let dx = -half; dx <= half; dx++) {
                        const ny = y + dy, nx = x + dx;
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            if (data[ny * width + nx] < min) min = data[ny * width + nx];
                        }
                    }
                }
                out[y * width + x] = min;
            }
        }
        return { width, height, data: out };
    }

    dilate(bin, k = 2) {
        const { width, height, data } = bin;
        const out = new Uint8ClampedArray(width * height);
        const half = Math.floor(k / 2);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let max = 0;
                for (let dy = -half; dy <= half; dy++) {
                    for (let dx = -half; dx <= half; dx++) {
                        const ny = y + dy, nx = x + dx;
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            if (data[ny * width + nx] > max) max = data[ny * width + nx];
                        }
                    }
                }
                out[y * width + x] = max;
            }
        }
        return { width, height, data: out };
    }

    open(bin, k = 2) {
        return this.dilate(this.erode(bin, k), k);
    }

    _floodFill(startX, startY, width, height, data, labels, label) {
        const stack = [[startX, startY]];
        let minX = startX, maxX = startX, minY = startY, maxY = startY;
        let sumX = 0, sumY = 0, area = 0;
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const idx = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (data[idx] !== 255 || labels[idx] !== 0) continue;
            
            labels[idx] = label;
            area++;
            sumX += x; sumY += y;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        
        return {
            id: label, area,
            centerX: sumX / area, centerY: sumY / area,
            minX, maxX, minY, maxY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        };
    }

    findComponents(bin) {
        const { width, height, data } = bin;
        const labels = new Array(width * height).fill(0);
        const comps = [];
        let label = 0;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (data[idx] === 255 && labels[idx] === 0) {
                    label++;
                    const c = this._floodFill(x, y, width, height, data, labels, label);
                    if (c.area >= this.minDotSize && c.area <= this.maxDotSize) {
                        const aspect = c.width / c.height;
                        if (aspect > 0.3 && aspect < 4.0) {
                            comps.push(c);
                        }
                    }
                }
            }
        }
        return comps;
    }

    _filterDots(dots) {
        if (dots.length < 3) return dots;
        
        const areas = dots.map(d => d.area).sort((a, b) => a - b);
        const q1 = areas[Math.floor(areas.length * 0.25)];
        const q3 = areas[Math.floor(areas.length * 0.75)];
        const iqr = q3 - q1;
        const lower = Math.max(this.minDotSize, q1 - 1.5 * iqr);
        const upper = Math.min(this.maxDotSize, q3 + 1.5 * iqr);
        
        return dots.filter(d => d.area >= lower && d.area <= upper);
    }

    analyzeDots(imageData) {
        console.log('[DotDetector] ====== 开始 ======');
        
        const gray = this.toGray(imageData);
        console.log('[DotDetector] 灰度转换完成');
        
        const enhanced = this.enhanceContrast(gray);
        console.log('[DotDetector] 对比度增强完成');
        
        let bestResult = { dots: [], bin: null, dark: true };
        const configs = [
            { blockSize: 25, C: 8 },
            { blockSize: 35, C: 10 },
            { blockSize: 45, C: 12 }
        ];
        
        for (const cfg of configs) {
            try {
                const bin = this.adaptiveThreshold(enhanced, cfg.blockSize, cfg.C);
                const light = this.invert(bin);
                
                const darkProc = this.open(bin, 2);
                const lightProc = this.open(light, 2);
                
                const darkDots = this.findComponents(darkProc);
                const lightDots = this.findComponents(lightProc);
                
                console.log(`[DotDetector] 配置(${cfg.blockSize},${cfg.C}) 暗点:${darkDots.length} 亮点:${lightDots.length}`);
                
                if (darkDots.length > bestResult.dots.length) {
                    bestResult = { dots: darkDots, bin: darkProc, dark: true };
                }
                if (lightDots.length > bestResult.dots.length) {
                    bestResult = { dots: lightDots, bin: lightProc, dark: false };
                }
            } catch (e) {
                console.warn('[DotDetector] 配置失败:', e.message);
            }
        }
        
        console.log('[DotDetector] 最佳原始结果:', bestResult.dots.length, '个点,', bestResult.dark ? '暗点' : '亮点');
        
        const filtered = this._filterDots(bestResult.dots);
        console.log('[DotDetector] 过滤后:', filtered.length, '个点');
        
        return {
            gray: enhanced,
            processedImage: bestResult.bin,
            dots: filtered,
            isDarkDots: bestResult.dark
        };
    }

    toImageData(bin, ctx) {
        const { width, height, data } = bin;
        const imgData = ctx.createImageData(width, height);
        for (let i = 0, j = 0; i < data.length; i++, j += 4) {
            const v = data[i];
            imgData.data[j] = v;
            imgData.data[j + 1] = v;
            imgData.data[j + 2] = v;
            imgData.data[j + 3] = 255;
        }
        return imgData;
    }
}

export { DotDetector };

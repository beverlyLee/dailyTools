export class LeafSegmenter {
    constructor(options = {}) {
        this.k = options.k || 4;
        this.maxIterations = options.maxIterations || 25;
        this.tolerance = options.tolerance || 1.5;
        this.morphologyIterations = options.morphologyIterations || 4;
    }

    segment(imageData) {
        console.log('=== 开始叶片分割（增强版）===');
        console.log('K-Means 聚类数:', this.k);
        
        const { width, height, data } = imageData;
        
        const backgroundMask = this.detectBackground(imageData);
        const foregroundMask = this.detectForeground(imageData, backgroundMask);
        const kmeansMask = this.kMeansSegment(imageData, foregroundMask);
        
        let combinedMask = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
            if (foregroundMask[i] === 1 || kmeansMask[i] === 1) {
                combinedMask[i] = 1;
            }
        }
        
        const edgeMask = this.detectEdges(imageData);
        combinedMask = this.expandWithEdges(combinedMask, edgeMask, width, height);
        
        const filledMask = this.morphologyFill(combinedMask, width, height);
        const cleanedMask = this.keepLargestRegion(filledMask, width, height);
        
        const segmentedImage = this.applyMask(imageData, cleanedMask);
        const leafArea = this.calculateLeafArea(cleanedMask);
        const leafPixels = this.collectLeafPixels(imageData, cleanedMask);
        
        console.log('叶片像素数:', leafArea, '/', (width * height));
        console.log('叶片面积占比:', ((leafArea / (width * height)) * 100).toFixed(2) + '%');
        
        return {
            mask: cleanedMask,
            segmentedImage,
            leafArea,
            leafPixels,
            width,
            height
        };
    }

    detectBackground(imageData) {
        const { width, height, data } = imageData;
        const mask = new Uint8Array(width * height);
        
        const borderSamples = [];
        const borderWidth = Math.max(10, Math.floor(Math.min(width, height) * 0.05));
        
        for (let x = 0; x < width; x++) {
            for (let i = 0; i < borderWidth; i++) {
                borderSamples.push(this.getPixel(data, x, i, width));
                borderSamples.push(this.getPixel(data, x, height - 1 - i, width));
            }
        }
        for (let y = borderWidth; y < height - borderWidth; y++) {
            for (let i = 0; i < borderWidth; i++) {
                borderSamples.push(this.getPixel(data, i, y, width));
                borderSamples.push(this.getPixel(data, width - 1 - i, y, width));
            }
        }
        
        const backgroundModel = this.buildColorModel(borderSamples);
        console.log('背景颜色模型:', 
            `RGB(${Math.round(backgroundModel.mean[0])},${Math.round(backgroundModel.mean[1])},${Math.round(backgroundModel.mean[2])})`);
        
        const hsvBackground = this.rgbToHsv(
            backgroundModel.mean[0],
            backgroundModel.mean[1],
            backgroundModel.mean[2]
        );
        
        const similarityThreshold = Math.max(35, 50 - (backgroundModel.variance * 0.5));
        console.log('背景相似度阈值:', similarityThreshold.toFixed(1));
        
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            const hsv = this.rgbToHsv(r, g, b);
            
            const rgbSimilarity = this.colorSimilarity([r, g, b], backgroundModel.mean);
            const hueDiff = Math.min(
                Math.abs(hsv.h - hsvBackground.h),
                360 - Math.abs(hsv.h - hsvBackground.h)
            );
            
            const isBackground = (rgbSimilarity < similarityThreshold) ||
                                 (hueDiff < 20 && Math.abs(hsv.s - hsvBackground.s) < 20);
            
            if (isBackground) {
                mask[i] = 1;
            }
        }
        
        const backgroundCount = mask.reduce((a, b) => a + b, 0);
        const backgroundRatio = backgroundCount / (width * height);
        console.log('检测到背景区域:', backgroundCount, '像素 (', (backgroundRatio * 100).toFixed(1) + '%)');
        
        if (backgroundRatio > 0.85 || backgroundRatio < 0.15) {
            console.log('背景检测可能不准确，使用保守策略');
            return this.conservativeBackgroundMask(imageData);
        }
        
        return mask;
    }

    conservativeBackgroundMask(imageData) {
        const { width, height, data } = imageData;
        const mask = new Uint8Array(width * height);
        
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const centerRadius = Math.floor(Math.min(width, height) * 0.35);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > centerRadius) {
                    mask[y * width + x] = 1;
                }
            }
        }
        
        return mask;
    }

    detectForeground(imageData, backgroundMask) {
        const { width, height, data } = imageData;
        const mask = new Uint8Array(width * height);
        
        const nonBackgroundPixels = [];
        for (let i = 0; i < backgroundMask.length; i++) {
            if (backgroundMask[i] === 0) {
                const idx = i * 4;
                nonBackgroundPixels.push({
                    index: i,
                    r: data[idx],
                    g: data[idx + 1],
                    b: data[idx + 2]
                });
            }
        }
        
        if (nonBackgroundPixels.length < width * height * 0.1) {
            console.log('非背景区域太少，使用中心区域检测');
            return this.detectCenterForeground(imageData);
        }
        
        const foregroundModel = this.buildColorModel(
            nonBackgroundPixels.map(p => [p.r, p.g, p.b])
        );
        
        const greennessScores = [];
        nonBackgroundPixels.forEach(p => {
            const greenness = this.calculateGreenness(p.r, p.g, p.b);
            greennessScores.push({ index: p.index, greenness });
        });
        
        greennessScores.sort((a, b) => b.greenness - a.greenness);
        
        const topN = Math.max(100, Math.floor(greennessScores.length * 0.3));
        const seedIndices = greennessScores.slice(0, topN).map(s => s.index);
        
        console.log('前景种子点数:', topN);
        
        const visited = new Uint8Array(width * height);
        const stack = [];
        
        seedIndices.forEach(idx => {
            if (!visited[idx]) {
                stack.push(idx);
                mask[idx] = 1;
                visited[idx] = 1;
            }
        });
        
        const growThreshold = 45;
        const seedModel = this.buildColorModelFromSeeds(imageData, seedIndices);
        
        while (stack.length > 0) {
            const idx = stack.pop();
            const x = idx % width;
            const y = Math.floor(idx / width);
            
            const neighbors = [
                [x + 1, y], [x - 1, y],
                [x, y + 1], [x, y - 1],
                [x + 1, y + 1], [x - 1, y + 1],
                [x + 1, y - 1], [x - 1, y - 1]
            ];
            
            neighbors.forEach(([nx, ny]) => {
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
                
                const nIdx = ny * width + nx;
                if (visited[nIdx] || backgroundMask[nIdx] === 1) return;
                
                const dataIdx = nIdx * 4;
                const similarity = this.colorSimilarity(
                    [data[dataIdx], data[dataIdx + 1], data[dataIdx + 2]],
                    seedModel.mean
                );
                
                if (similarity < growThreshold || similarity < seedModel.variance * 1.5) {
                    mask[nIdx] = 1;
                    visited[nIdx] = 1;
                    stack.push(nIdx);
                }
            });
        }
        
        const foregroundCount = mask.reduce((a, b) => a + b, 0);
        console.log('区域生长前景:', foregroundCount, '像素');
        
        return mask;
    }

    detectCenterForeground(imageData) {
        const { width, height, data } = imageData;
        const mask = new Uint8Array(width * height);
        
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        
        const samples = [];
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const idx = y * width + x;
                    samples.push([data[idx * 4], data[idx * 4 + 1], data[idx * 4 + 2]]);
                }
            }
        }
        
        const centerModel = this.buildColorModel(samples);
        const threshold = Math.max(30, centerModel.variance * 2);
        
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            const similarity = this.colorSimilarity(
                [data[idx], data[idx + 1], data[idx + 2]],
                centerModel.mean
            );
            
            if (similarity < threshold) {
                mask[i] = 1;
            }
        }
        
        return this.keepLargestRegion(mask, width, height);
    }

    kMeansSegment(imageData, foregroundHint = null) {
        const { width, height, data } = imageData;
        const pixels = [];
        const indices = [];
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const hsv = this.rgbToHsv(r, g, b);
            const lab = this.rgbToLab(r, g, b);
            const pixelIdx = i / 4;
            
            if (foregroundHint && foregroundHint[pixelIdx] === 1) {
                pixels.push([r, g, b, hsv.h, hsv.s, hsv.v, lab.l, lab.a, lab.b, 1.0]);
            } else {
                pixels.push([r, g, b, hsv.h, hsv.s, hsv.v, lab.l, lab.a, lab.b, 0.0]);
            }
            indices.push(pixelIdx);
        }
        
        const centroids = this.initializeCentroids(pixels, foregroundHint);
        let clusters = new Array(pixels.length);
        let prevCentroids = null;
        
        for (let iter = 0; iter < this.maxIterations; iter++) {
            clusters = this.assignToClustersMulti(pixels, centroids, foregroundHint);
            const newCentroids = this.updateCentroids(pixels, clusters);
            
            const shift = this.calculateCentroidShift(prevCentroids, newCentroids);
            
            if (shift < this.tolerance) {
                console.log('K-Means 迭代', iter + 1, '次后收敛');
                break;
            }
            
            prevCentroids = newCentroids;
            centroids.splice(0, centroids.length, ...newCentroids);
        }
        
        const leafClusters = this.findLeafClustersEnhanced(centroids, pixels, clusters, foregroundHint);
        console.log('叶片相关聚类:', leafClusters);
        
        const mask = new Uint8Array(width * height);
        for (let i = 0; i < clusters.length; i++) {
            if (leafClusters.includes(clusters[i])) {
                mask[indices[i]] = 1;
            }
        }
        
        return mask;
    }

    initializeCentroids(pixels, foregroundHint) {
        if (foregroundHint) {
            const foregroundPixels = [];
            const backgroundPixels = [];
            
            pixels.forEach((p, i) => {
                if (p[9] > 0.5) {
                    foregroundPixels.push(i);
                } else {
                    backgroundPixels.push(i);
                }
            });
            
            const centroids = [];
            const fgCount = Math.ceil(this.k * 0.6);
            const bgCount = this.k - fgCount;
            
            for (let i = 0; i < fgCount && foregroundPixels.length > 0; i++) {
                const rand = foregroundPixels[Math.floor(Math.random() * foregroundPixels.length)];
                centroids.push([...pixels[rand]]);
            }
            
            for (let i = 0; i < bgCount && backgroundPixels.length > 0; i++) {
                const rand = backgroundPixels[Math.floor(Math.random() * backgroundPixels.length)];
                centroids.push([...pixels[rand]]);
            }
            
            while (centroids.length < this.k) {
                const rand = Math.floor(Math.random() * pixels.length);
                centroids.push([...pixels[rand]]);
            }
            
            return centroids;
        }
        
        const indices = [];
        while (indices.length < this.k) {
            const rand = Math.floor(Math.random() * pixels.length);
            if (!indices.includes(rand)) {
                indices.push(rand);
            }
        }
        return indices.map(i => [...pixels[i]]);
    }

    assignToClustersMulti(pixels, centroids, foregroundHint) {
        return pixels.map((pixel, idx) => {
            let minDist = Infinity;
            let clusterIndex = 0;
            const isHintForeground = foregroundHint && foregroundHint[idx] === 1;
            
            centroids.forEach((centroid, cIdx) => {
                let dist = this.multiFeatureDistance(pixel, centroid);
                
                if (isHintForeground && pixel[9] > 0.5) {
                    if (centroid[9] > 0.5) dist *= 0.7;
                    else dist *= 1.5;
                }
                
                if (dist < minDist) {
                    minDist = dist;
                    clusterIndex = cIdx;
                }
            });
            
            return clusterIndex;
        });
    }

    findLeafClustersEnhanced(centroids, pixels, clusters, foregroundHint) {
        const clusterInfo = [];
        
        centroids.forEach((centroid, idx) => {
            const [r, g, b] = centroid;
            const hsv = this.rgbToHsv(r, g, b);
            const clusterCount = clusters.filter(c => c === idx).length;
            const sizeRatio = clusterCount / pixels.length;
            
            let hintForegroundCount = 0;
            clusters.forEach((c, pIdx) => {
                if (c === idx && foregroundHint && foregroundHint[pIdx] === 1) {
                    hintForegroundCount++;
                }
            });
            const hintRatio = clusterCount > 0 ? hintForegroundCount / clusterCount : 0;
            
            const greenness = this.calculateGreenness(r, g, b);
            const isGreenish = hsv.h >= 25 && hsv.h <= 170 && hsv.s > 10;
            const isYellowish = hsv.h >= 20 && hsv.h <= 70 && hsv.s > 15;
            const isBrownish = (r > g && g > b && r > 60) || (hsv.h >= 10 && hsv.h <= 50 && hsv.s > 10);
            
            let score = 0;
            score += greenness * 2;
            if (isGreenish) score += 8;
            if (isYellowish) score += 5;
            if (isBrownish) score += 3;
            score += hintRatio * 15;
            if (sizeRatio > 0.05) score += 5;
            if (sizeRatio > 0.1) score += 3;
            
            console.log(`聚类 ${idx}: RGB(${Math.round(r)},${Math.round(g)},${Math.round(b)}), ` +
                `绿色度: ${greenness.toFixed(2)}, 提示覆盖: ${(hintRatio * 100).toFixed(0)}%, ` +
                `大小: ${(sizeRatio * 100).toFixed(1)}%, 分数: ${score.toFixed(1)}`);
            
            clusterInfo.push({ index: idx, score, sizeRatio });
        });
        
        clusterInfo.sort((a, b) => b.score - a.score);
        
        const leafClusters = [];
        let totalRatio = 0;
        
        for (const info of clusterInfo) {
            if (info.score >= 5 || (leafClusters.length === 0 && info.sizeRatio > 0.1)) {
                leafClusters.push(info.index);
                totalRatio += info.sizeRatio;
            }
            if (totalRatio > 0.7) break;
        }
        
        if (leafClusters.length === 0) {
            leafClusters.push(clusterInfo[0].index);
        }
        
        return leafClusters;
    }

    expandWithEdges(mask, edgeMask, width, height) {
        const result = new Uint8Array(mask);
        const visited = new Uint8Array(width * height);
        const stack = [];
        
        for (let i = 0; i < mask.length; i++) {
            if (mask[i] === 1) {
                stack.push(i);
                visited[i] = 1;
            }
        }
        
        const iterations = 3;
        for (let iter = 0; iter < iterations && stack.length > 0; iter++) {
            const newStack = [];
            
            while (stack.length > 0) {
                const idx = stack.pop();
                const x = idx % width;
                const y = Math.floor(idx / width);
                
                const neighbors = [
                    [x + 1, y], [x - 1, y],
                    [x, y + 1], [x, y - 1]
                ];
                
                neighbors.forEach(([nx, ny]) => {
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
                    
                    const nIdx = ny * width + nx;
                    if (!visited[nIdx] && edgeMask[nIdx] === 1) {
                        result[nIdx] = 1;
                        visited[nIdx] = 1;
                        newStack.push(nIdx);
                    }
                });
            }
            
            stack.splice(0, stack.length, ...newStack);
        }
        
        return result;
    }

    detectEdges(imageData) {
        const { width, height, data } = imageData;
        const mask = new Uint8Array(width * height);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                const center = this.getPixel(data, x, y, width);
                const neighbors = [
                    this.getPixel(data, x - 1, y, width),
                    this.getPixel(data, x + 1, y, width),
                    this.getPixel(data, x, y - 1, width),
                    this.getPixel(data, x, y + 1, width)
                ];
                
                let maxDiff = 0;
                neighbors.forEach(n => {
                    const diff = Math.sqrt(
                        Math.pow(center[0] - n[0], 2) +
                        Math.pow(center[1] - n[1], 2) +
                        Math.pow(center[2] - n[2], 2)
                    );
                    maxDiff = Math.max(maxDiff, diff);
                });
                
                const hsv = this.rgbToHsv(center[0], center[1], center[2]);
                let satDiff = 0;
                neighbors.forEach(n => {
                    const nhsv = this.rgbToHsv(n[0], n[1], n[2]);
                    satDiff = Math.max(satDiff, Math.abs(hsv.s - nhsv.s));
                });
                
                if (maxDiff > 20 || satDiff > 15) {
                    mask[idx] = 1;
                }
            }
        }
        
        return mask;
    }

    getPixel(data, x, y, width) {
        const idx = (y * width + x) * 4;
        return [data[idx], data[idx + 1], data[idx + 2]];
    }

    buildColorModel(samples) {
        if (samples.length === 0) {
            return { mean: [128, 128, 128], variance: 50 };
        }
        
        const mean = [0, 0, 0];
        samples.forEach(s => {
            mean[0] += s[0];
            mean[1] += s[1];
            mean[2] += s[2];
        });
        mean[0] /= samples.length;
        mean[1] /= samples.length;
        mean[2] /= samples.length;
        
        let variance = 0;
        samples.forEach(s => {
            variance += this.colorSimilarity(s, mean);
        });
        variance /= samples.length;
        
        return { mean, variance };
    }

    buildColorModelFromSeeds(imageData, seedIndices) {
        const { data } = imageData;
        const samples = seedIndices.map(idx => {
            const i = idx * 4;
            return [data[i], data[i + 1], data[i + 2]];
        });
        return this.buildColorModel(samples);
    }

    colorSimilarity(a, b) {
        return Math.sqrt(
            Math.pow(a[0] - b[0], 2) +
            Math.pow(a[1] - b[1], 2) +
            Math.pow(a[2] - b[2], 2)
        );
    }

    calculateGreenness(r, g, b) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const greenExcess = (2 * g - r - b);
        const greenRatio = g / (r + g + b + 1);
        
        const greenness = (greenRatio - 0.33) * 3 + (greenExcess / 255);
        return Math.max(-1, Math.min(1, greenness));
    }

    morphologyFill(mask, width, height) {
        const result = new Uint8Array(mask);
        
        for (let iter = 0; iter < this.morphologyIterations; iter++) {
            const dilated = new Uint8Array(result);
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    if (result[idx] === 0) {
                        const neighbors = [
                            result[(y - 1) * width + x],
                            result[(y + 1) * width + x],
                            result[y * width + (x - 1)],
                            result[y * width + (x + 1)],
                            result[(y - 1) * width + (x - 1)],
                            result[(y - 1) * width + (x + 1)],
                            result[(y + 1) * width + (x - 1)],
                            result[(y + 1) * width + (x + 1)]
                        ];
                        
                        const neighborCount = neighbors.reduce((a, b) => a + b, 0);
                        if (neighborCount >= 5) {
                            dilated[idx] = 1;
                        }
                    }
                }
            }
            result.set(dilated);
        }
        
        for (let iter = 0; iter < Math.max(1, this.morphologyIterations - 2); iter++) {
            const eroded = new Uint8Array(result);
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    if (result[idx] === 1) {
                        const neighbors = [
                            result[(y - 1) * width + x],
                            result[(y + 1) * width + x],
                            result[y * width + (x - 1)],
                            result[y * width + (x + 1)]
                        ];
                        
                        const neighborCount = neighbors.reduce((a, b) => a + b, 0);
                        if (neighborCount < 3) {
                            eroded[idx] = 0;
                        }
                    }
                }
            }
            result.set(eroded);
        }
        
        return result;
    }

    keepLargestRegion(mask, width, height) {
        const visited = new Uint8Array(width * height);
        const result = new Uint8Array(width * height);
        
        let largestSize = 0;
        let largestPixels = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (mask[idx] === 1 && !visited[idx]) {
                    const region = this.floodFillRegion(mask, visited, x, y, width, height);
                    if (region.size > largestSize) {
                        largestSize = region.size;
                        largestPixels = region.pixels;
                    }
                }
            }
        }
        
        largestPixels.forEach(p => result[p] = 1);
        
        const secondThreshold = Math.max(100, largestSize * 0.2);
        visited.fill(0);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (mask[idx] === 1 && !visited[idx] && result[idx] === 0) {
                    const region = this.floodFillRegion(mask, visited, x, y, width, height);
                    if (region.size >= secondThreshold) {
                        region.pixels.forEach(p => result[p] = 1);
                    }
                }
            }
        }
        
        return result;
    }

    floodFillRegion(mask, visited, startX, startY, width, height) {
        const pixels = [];
        const stack = [[startX, startY]];
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const idx = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited[idx] || mask[idx] !== 1) continue;
            
            visited[idx] = 1;
            pixels.push(idx);
            
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
        
        return { pixels, size: pixels.length };
    }

    rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, v = max;
        const d = max - min;
        s = max === 0 ? 0 : d / max;
        
        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s: s * 100, v: v * 100 };
    }

    rgbToLab(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        
        let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
        let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
        let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
        
        x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
        y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
        z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
        
        return {
            l: (116 * y) - 16,
            a: 500 * (x - y),
            b: 200 * (y - z)
        };
    }

    multiFeatureDistance(a, b) {
        const rgbDist = Math.sqrt(
            Math.pow(a[0] - b[0], 2) +
            Math.pow(a[1] - b[1], 2) +
            Math.pow(a[2] - b[2], 2)
        ) / 255;
        
        const labDist = Math.sqrt(
            Math.pow(a[6] - b[6], 2) +
            Math.pow(a[7] - b[7], 2) +
            Math.pow(a[8] - b[8], 2)
        ) / 100;
        
        return rgbDist * 0.5 + labDist * 0.5;
    }

    calculateCentroidShift(prev, curr) {
        if (!prev) return Infinity;
        let totalShift = 0;
        for (let i = 0; i < prev.length; i++) {
            totalShift += Math.sqrt(
                Math.pow(prev[i][0] - curr[i][0], 2) +
                Math.pow(prev[i][1] - curr[i][1], 2) +
                Math.pow(prev[i][2] - curr[i][2], 2)
            );
        }
        return totalShift;
    }

    updateCentroids(pixels, clusters) {
        const sums = new Array(this.k).fill(null).map(() => 
            new Array(pixels[0].length).fill(0)
        );
        const counts = new Array(this.k).fill(0);
        
        pixels.forEach((pixel, idx) => {
            const clusterIdx = clusters[idx];
            for (let i = 0; i < pixel.length; i++) {
                sums[clusterIdx][i] += pixel[i];
            }
            counts[clusterIdx]++;
        });
        
        return sums.map((sum, idx) => {
            if (counts[idx] === 0) return sum;
            return sum.map(s => s / counts[idx]);
        });
    }

    applyMask(imageData, mask) {
        const { width, height, data } = imageData;
        const resultData = new Uint8ClampedArray(data.length);
        
        for (let i = 0; i < mask.length; i++) {
            const idx = i * 4;
            if (mask[i] === 1) {
                resultData[idx] = data[idx];
                resultData[idx + 1] = data[idx + 1];
                resultData[idx + 2] = data[idx + 2];
                resultData[idx + 3] = 255;
            } else {
                resultData[idx] = 220;
                resultData[idx + 1] = 220;
                resultData[idx + 2] = 220;
                resultData[idx + 3] = 255;
            }
        }
        
        return new ImageData(resultData, width, height);
    }

    calculateLeafArea(mask) {
        let count = 0;
        for (let i = 0; i < mask.length; i++) {
            if (mask[i] === 1) count++;
        }
        return count;
    }

    collectLeafPixels(imageData, mask) {
        const { data } = imageData;
        const pixels = [];
        
        for (let i = 0; i < mask.length; i++) {
            if (mask[i] === 1) {
                const idx = i * 4;
                pixels.push({
                    index: i,
                    r: data[idx],
                    g: data[idx + 1],
                    b: data[idx + 2]
                });
            }
        }
        
        return pixels;
    }
}

export class DefectScanner {
    constructor(options = {}) {
        this.brightnessThreshold = options.brightnessThreshold || 40;
        this.darkStainThreshold = options.darkStainThreshold || 30;
        this.localContrastThreshold = options.localContrastThreshold || 20;
        this.edgeStrengthThreshold = options.edgeStrengthThreshold || 25;
        this.colorVarianceThreshold = options.colorVarianceThreshold || 25;
        this.minDefectSize = options.minDefectSize || 5;
        this.maxDefectSize = options.maxDefectSize || 20000;
        this.localWindowSize = options.localWindowSize || 31;
        this.detectDarkStains = options.detectDarkStains !== false;
        this.useEdgeValidation = options.useEdgeValidation !== false;
        this.useColorValidation = options.useColorValidation !== false;
        this.useMultiScale = options.useMultiScale !== false;
        this.colorDistanceThreshold = options.colorDistanceThreshold || 35;
    }

    scan(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        console.log('=== 开始高级缺陷检测 ===');
        console.log('图像尺寸:', width, 'x', height);
        console.log('参数:', {
            darkStainThreshold: this.darkStainThreshold,
            colorDistanceThreshold: this.colorDistanceThreshold,
            localWindowSize: this.localWindowSize,
            minDefectSize: this.minDefectSize
        });
        
        const channels = this.extractChannels(data, width, height);
        
        const brightCandidateMask = this.detectBrightCandidates(
            channels.grayscale, channels.r, channels.g, channels.b, width, height
        );
        console.log('亮像素候选数:', brightCandidateMask.reduce((a, b) => a + b, 0));
        
        let darkCandidateMask = new Uint8Array(width * height);
        if (this.detectDarkStains) {
            darkCandidateMask = this.detectDarkStainsAdvanced(
                channels, width, height
            );
            console.log('深色污渍候选数:', darkCandidateMask.reduce((a, b) => a + b, 0));
        }
        
        const contrastCandidateMask = this.detectContrastCandidates(
            channels.grayscale, width, height
        );
        console.log('对比度候选像素数:', contrastCandidateMask.reduce((a, b) => a + b, 0));
        
        let combinedMask = this.combineCandidateMasks(
            brightCandidateMask, darkCandidateMask, contrastCandidateMask, width, height
        );
        console.log('合并候选像素数:', combinedMask.reduce((a, b) => a + b, 0));
        
        if (this.useEdgeValidation) {
            const edgeMask = this.detectEdges(channels.grayscale, width, height);
            combinedMask = this.validateWithEdges(combinedMask, edgeMask, width, height);
            console.log('边缘验证后像素数:', combinedMask.reduce((a, b) => a + b, 0));
        }
        
        if (this.useColorValidation) {
            combinedMask = this.validateWithColorVariance(
                combinedMask, channels.r, channels.g, channels.b, width, height
            );
            console.log('颜色验证后像素数:', combinedMask.reduce((a, b) => a + b, 0));
        }
        
        const regions = this.extractRegions(combinedMask, width, height);
        console.log('初始区域数:', regions.length);
        
        const filteredRegions = this.filterRegions(regions, width, height);
        console.log('筛选后区域数:', filteredRegions.length);
        
        const finalResult = this.createFinalMask(filteredRegions, width, height);
        console.log('最终缺陷像素数:', finalResult.binaryMask.reduce((a, b) => a + b, 0));
        
        return finalResult;
    }

    extractChannels(data, width, height) {
        const grayscale = new Uint8Array(width * height);
        const r = new Uint8Array(width * height);
        const g = new Uint8Array(width * height);
        const b = new Uint8Array(width * height);
        
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            r[i] = data[idx];
            g[i] = data[idx + 1];
            b[i] = data[idx + 2];
            grayscale[i] = Math.round(0.299 * r[i] + 0.587 * g[i] + 0.114 * b[i]);
        }
        
        return { grayscale, r, g, b };
    }

    detectBrightCandidates(grayscale, r, g, b, width, height) {
        const mask = new Uint8Array(width * height);
        
        let minVal = 255, maxVal = 0;
        for (let i = 0; i < width * height; i++) {
            minVal = Math.min(minVal, grayscale[i]);
            maxVal = Math.max(maxVal, grayscale[i]);
        }
        
        const range = maxVal - minVal;
        const adaptiveThreshold = minVal + range * (0.6 + this.brightnessThreshold / 200);
        const minAbsoluteThreshold = 140;
        const threshold = Math.max(adaptiveThreshold, minAbsoluteThreshold);
        
        console.log('亮度阈值:', threshold.toFixed(0), '灰度范围:', minVal, '-', maxVal);
        
        const localMeans = this.calculateLocalStats(grayscale, width, height, this.localWindowSize);
        
        for (let i = 0; i < width * height; i++) {
            const isBright = grayscale[i] > threshold;
            const isBrighterThanLocal = grayscale[i] - localMeans[i] > this.brightnessThreshold;
            const hasLowColorVariance = this.calculateLocalColorVariance(r, g, b, i, width, height, 5) < this.colorVarianceThreshold;
            
            if ((isBright || isBrighterThanLocal) && hasLowColorVariance) {
                mask[i] = 1;
            }
        }
        
        return mask;
    }

    detectDarkStainsAdvanced(channels, width, height) {
        const { grayscale, r, g, b } = channels;
        const mask = new Uint8Array(width * height);
        
        let minGray = 255, maxGray = 0;
        let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
        
        for (let i = 0; i < width * height; i++) {
            minGray = Math.min(minGray, grayscale[i]);
            maxGray = Math.max(maxGray, grayscale[i]);
            minR = Math.min(minR, r[i]);
            maxR = Math.max(maxR, r[i]);
            minG = Math.min(minG, g[i]);
            maxG = Math.max(maxG, g[i]);
            minB = Math.min(minB, b[i]);
            maxB = Math.max(maxB, b[i]);
        }
        
        const grayRange = maxGray - minGray;
        const rRange = maxR - minR;
        const gRange = maxG - minG;
        const bRange = maxB - minB;
        
        const sensitivityFactor = this.darkStainThreshold / 50;
        
        const darkPercentile = minGray + grayRange * (0.15 + sensitivityFactor * 0.1);
        const maxAbsoluteDark = 140;
        const grayDarkThreshold = Math.min(darkPercentile, maxAbsoluteDark);
        
        console.log('深色检测参数:');
        console.log('  灰度阈值:', grayDarkThreshold.toFixed(0));
        console.log('  颜色距离阈值:', this.colorDistanceThreshold);
        
        const localMeans = this.calculateLocalStats(grayscale, width, height, this.localWindowSize);
        const localStdDevs = this.calculateLocalStdDev(grayscale, width, height, this.localWindowSize, localMeans);
        
        const localColorMeans = {
            r: this.calculateLocalStats(r, width, height, this.localWindowSize),
            g: this.calculateLocalStats(g, width, height, this.localWindowSize),
            b: this.calculateLocalStats(b, width, height, this.localWindowSize)
        };
        
        const averageColor = this.calculateAverageColor(r, g, b, width, height);
        console.log('  图像平均颜色:', averageColor.r.toFixed(0), averageColor.g.toFixed(0), averageColor.b.toFixed(0));
        
        let detectedByGray = 0;
        let detectedByLocal = 0;
        let detectedByColor = 0;
        
        for (let i = 0; i < width * height; i++) {
            let isDarkCandidate = false;
            
            const isDark = grayscale[i] < grayDarkThreshold;
            const isDarkerThanLocal = localMeans[i] - grayscale[i] > this.darkStainThreshold * 0.7;
            const normalizedDiff = localStdDevs[i] > 0 ? (localMeans[i] - grayscale[i]) / localStdDevs[i] : 0;
            const isSignificantlyDarker = normalizedDiff > 0.8;
            
            if (isDark || isDarkerThanLocal || isSignificantlyDarker) {
                if (isDark) detectedByGray++;
                if (isDarkerThanLocal) detectedByLocal++;
                
                const colorDistFromAverage = this.colorDistance(
                    r[i], g[i], b[i],
                    averageColor.r, averageColor.g, averageColor.b
                );
                
                const localColorDist = this.colorDistance(
                    r[i], g[i], b[i],
                    localColorMeans.r[i], localColorMeans.g[i], localColorMeans.b[i]
                );
                
                const hasLowColorVariance = this.calculateLocalColorVariance(r, g, b, i, width, height, 4) < this.colorVarianceThreshold * 1.5;
                
                const isDifferentFromAverage = colorDistFromAverage > this.colorDistanceThreshold * 0.5;
                const isDifferentFromLocal = localColorDist > this.colorDistanceThreshold * 0.4;
                
                if (hasLowColorVariance && (isDifferentFromAverage || isDifferentFromLocal)) {
                    isDarkCandidate = true;
                    detectedByColor++;
                } else if (hasLowColorVariance && (isSignificantlyDarker || isDarkerThanLocal)) {
                    isDarkCandidate = true;
                    detectedByColor++;
                }
            }
            
            if (isDarkCandidate) {
                mask[i] = 1;
            }
        }
        
        console.log('  灰度检测数:', detectedByGray);
        console.log('  局部对比检测数:', detectedByLocal);
        console.log('  颜色差异检测数:', detectedByColor);
        
        return mask;
    }

    colorDistance(r1, g1, b1, r2, g2, b2) {
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    calculateAverageColor(r, g, b, width, height) {
        let sumR = 0, sumG = 0, sumB = 0;
        let count = 0;
        
        const step = Math.max(1, Math.floor(width * height / 10000));
        
        for (let i = 0; i < width * height; i += step) {
            sumR += r[i];
            sumG += g[i];
            sumB += b[i];
            count++;
        }
        
        return {
            r: sumR / count,
            g: sumG / count,
            b: sumB / count
        };
    }

    detectContrastCandidates(grayscale, width, height) {
        const mask = new Uint8Array(width * height);
        
        const localMeans = this.calculateLocalStats(grayscale, width, height, this.localWindowSize);
        const localStdDevs = this.calculateLocalStdDev(grayscale, width, height, this.localWindowSize, localMeans);
        
        for (let i = 0; i < width * height; i++) {
            const diffFromMean = Math.abs(grayscale[i] - localMeans[i]);
            const normalizedDiff = localStdDevs[i] > 0 ? diffFromMean / localStdDevs[i] : 0;
            
            if (normalizedDiff > 1.0 && diffFromMean > this.localContrastThreshold) {
                mask[i] = 1;
            }
        }
        
        return mask;
    }

    calculateLocalStats(data, width, height, windowSize) {
        const means = new Float32Array(width * height);
        const halfWindow = Math.floor(windowSize / 2);
        
        const prefixSum = new Float32Array(width * height);
        
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                rowSum += data[y * width + x];
                prefixSum[y * width + x] = rowSum;
                if (y > 0) {
                    prefixSum[y * width + x] += prefixSum[(y - 1) * width + x];
                }
            }
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const x1 = Math.max(0, x - halfWindow);
                const y1 = Math.max(0, y - halfWindow);
                const x2 = Math.min(width - 1, x + halfWindow);
                const y2 = Math.min(height - 1, y + halfWindow);
                
                let sum = prefixSum[y2 * width + x2];
                if (y1 > 0) sum -= prefixSum[(y1 - 1) * width + x2];
                if (x1 > 0) sum -= prefixSum[y2 * width + (x1 - 1)];
                if (y1 > 0 && x1 > 0) sum += prefixSum[(y1 - 1) * width + (x1 - 1)];
                
                const count = (x2 - x1 + 1) * (y2 - y1 + 1);
                means[y * width + x] = sum / count;
            }
        }
        
        return means;
    }

    calculateLocalStdDev(data, width, height, windowSize, means) {
        const stdDevs = new Float32Array(width * height);
        const halfWindow = Math.floor(windowSize / 2);
        
        const squaredPrefixSum = new Float32Array(width * height);
        
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                const val = data[y * width + x];
                rowSum += val * val;
                squaredPrefixSum[y * width + x] = rowSum;
                if (y > 0) {
                    squaredPrefixSum[y * width + x] += squaredPrefixSum[(y - 1) * width + x];
                }
            }
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const x1 = Math.max(0, x - halfWindow);
                const y1 = Math.max(0, y - halfWindow);
                const x2 = Math.min(width - 1, x + halfWindow);
                const y2 = Math.min(height - 1, y + halfWindow);
                
                let sumSq = squaredPrefixSum[y2 * width + x2];
                if (y1 > 0) sumSq -= squaredPrefixSum[(y1 - 1) * width + x2];
                if (x1 > 0) sumSq -= squaredPrefixSum[y2 * width + (x1 - 1)];
                if (y1 > 0 && x1 > 0) sumSq += squaredPrefixSum[(y1 - 1) * width + (x1 - 1)];
                
                const count = (x2 - x1 + 1) * (y2 - y1 + 1);
                const mean = means[y * width + x];
                const variance = (sumSq / count) - mean * mean;
                stdDevs[y * width + x] = Math.sqrt(Math.max(0, variance));
            }
        }
        
        return stdDevs;
    }

    calculateLocalColorVariance(r, g, b, idx, width, height, radius) {
        const x = idx % width;
        const y = Math.floor(idx / width);
        
        let sumR = 0, sumG = 0, sumB = 0;
        let count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                
                const nidx = ny * width + nx;
                sumR += r[nidx];
                sumG += g[nidx];
                sumB += b[nidx];
                count++;
            }
        }
        
        if (count < 2) return 0;
        
        const meanR = sumR / count;
        const meanG = sumG / count;
        const meanB = sumB / count;
        
        let varR = 0, varG = 0, varB = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                
                const nidx = ny * width + nx;
                const dr = r[nidx] - meanR;
                const dg = g[nidx] - meanG;
                const db = b[nidx] - meanB;
                varR += dr * dr;
                varG += dg * dg;
                varB += db * db;
            }
        }
        
        const avgVariance = (varR + varG + varB) / (3 * count);
        return Math.sqrt(avgVariance);
    }

    combineCandidateMasks(brightMask, darkMask, contrastMask, width, height) {
        const combined = new Uint8Array(width * height);
        
        for (let i = 0; i < width * height; i++) {
            if (brightMask[i]) {
                if (contrastMask[i] || this.hasNeighborSupport(brightMask, contrastMask, i, width, height, 2)) {
                    combined[i] = 1;
                }
            } else if (darkMask[i]) {
                combined[i] = 1;
            }
        }
        
        const dilated = this.dilateMask(combined, width, height, 1);
        
        return dilated;
    }

    hasNeighborSupport(mask1, mask2, idx, width, height, radius) {
        const x = idx % width;
        const y = Math.floor(idx / width);
        
        let hasMask1Neighbor = false;
        let hasMask2Neighbor = false;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                
                const nidx = ny * width + nx;
                if (mask1[nidx]) hasMask1Neighbor = true;
                if (mask2[nidx]) hasMask2Neighbor = true;
            }
        }
        
        return hasMask1Neighbor && hasMask2Neighbor;
    }

    dilateMask(mask, width, height, iterations) {
        const result = new Uint8Array(mask);
        
        for (let iter = 0; iter < iterations; iter++) {
            const temp = new Uint8Array(result);
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    if (temp[y * width + x]) {
                        const neighbors = [
                            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
                            [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
                        ];
                        
                        for (const [nx, ny] of neighbors) {
                            result[ny * width + nx] = 1;
                        }
                    }
                }
            }
        }
        
        return result;
    }

    detectEdges(grayscale, width, height) {
        const edges = new Float32Array(width * height);
        
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                let ki = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const val = grayscale[(y + ky) * width + (x + kx)];
                        gx += val * sobelX[ki];
                        gy += val * sobelY[ki];
                        ki++;
                    }
                }
                
                edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
            }
        }
        
        return edges;
    }

    validateWithEdges(candidateMask, edgeMask, width, height) {
        const validated = new Uint8Array(candidateMask);
        
        const localEdgeMeans = this.calculateLocalEdgeStats(edgeMask, width, height, 5);
        
        for (let i = 0; i < width * height; i++) {
            if (!validated[i]) continue;
            
            const edgeStrength = edgeMask[i];
            const localEdgeMean = localEdgeMeans[i];
            
            const hasHighLocalEdge = localEdgeMean > this.edgeStrengthThreshold * 0.3;
            const hasStrongEdge = edgeStrength > this.edgeStrengthThreshold;
            
            if (hasStrongEdge || hasHighLocalEdge) {
                validated[i] = 1;
            } else {
                validated[i] = 0;
            }
        }
        
        return validated;
    }

    calculateLocalEdgeStats(edgeMask, width, height, windowSize) {
        const means = new Float32Array(width * height);
        const halfWindow = Math.floor(windowSize / 2);
        
        const prefixSum = new Float32Array(width * height);
        
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                rowSum += edgeMask[y * width + x];
                prefixSum[y * width + x] = rowSum;
                if (y > 0) {
                    prefixSum[y * width + x] += prefixSum[(y - 1) * width + x];
                }
            }
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const x1 = Math.max(0, x - halfWindow);
                const y1 = Math.max(0, y - halfWindow);
                const x2 = Math.min(width - 1, x + halfWindow);
                const y2 = Math.min(height - 1, y + halfWindow);
                
                let sum = prefixSum[y2 * width + x2];
                if (y1 > 0) sum -= prefixSum[(y1 - 1) * width + x2];
                if (x1 > 0) sum -= prefixSum[y2 * width + (x1 - 1)];
                if (y1 > 0 && x1 > 0) sum += prefixSum[(y1 - 1) * width + (x1 - 1)];
                
                const count = (x2 - x1 + 1) * (y2 - y1 + 1);
                means[y * width + x] = sum / count;
            }
        }
        
        return means;
    }

    validateWithColorVariance(candidateMask, r, g, b, width, height) {
        const validated = new Uint8Array(candidateMask);
        
        for (let i = 0; i < width * height; i++) {
            if (!validated[i]) continue;
            
            const localVariance = this.calculateLocalColorVariance(r, g, b, i, width, height, 3);
            
            if (localVariance > this.colorVarianceThreshold * 2.5) {
                validated[i] = 0;
            }
        }
        
        return validated;
    }

    growRegion(mask, visited, startX, startY, width, height) {
        const region = { pixels: [], minX: startX, maxX: startX, minY: startY, maxY: startY };
        const stack = [[startX, startY]];
        visited[startY * width + startX] = 1;
        
        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            region.pixels.push([cx, cy]);
            region.minX = Math.min(region.minX, cx);
            region.maxX = Math.max(region.maxX, cx);
            region.minY = Math.min(region.minY, cy);
            region.maxY = Math.max(region.maxY, cy);
            
            const neighbors = [
                [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
                [cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx + 1, cy + 1]
            ];
            
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nidx = ny * width + nx;
                    if (mask[nidx] && !visited[nidx]) {
                        visited[nidx] = 1;
                        stack.push([nx, ny]);
                    }
                }
            }
        }
        
        return region;
    }

    extractRegions(mask, width, height) {
        const regions = [];
        const visited = new Uint8Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (mask[idx] && !visited[idx]) {
                    const region = this.growRegion(mask, visited, x, y, width, height);
                    regions.push(region);
                }
            }
        }
        
        return regions;
    }

    filterRegions(regions, width, height) {
        if (regions.length === 0) return [];
        
        const maxArea = Math.max(this.maxDefectSize, width * height * 0.15);
        const minArea = this.minDefectSize;
        
        console.log('区域过滤参数: minArea=', minArea, 'maxArea=', maxArea);
        
        const filtered = regions.filter(region => {
            const area = region.pixels.length;
            const regWidth = region.maxX - region.minX + 1;
            const regHeight = region.maxY - region.minY + 1;
            const aspectRatio = Math.max(regWidth, regHeight) / Math.max(Math.min(regWidth, regHeight), 1);
            const fillRatio = area / (regWidth * regHeight);
            
            const isLargeEnough = area >= minArea;
            const isNotTooLarge = area <= maxArea;
            const hasValidShape = aspectRatio >= 1 && aspectRatio <= 100;
            const hasValidFill = fillRatio > 0.05;
            
            return isLargeEnough && isNotTooLarge && hasValidShape && hasValidFill;
        });
        
        console.log('过滤后区域统计:');
        filtered.forEach((r, i) => {
            const w = r.maxX - r.minX + 1;
            const h = r.maxY - r.minY + 1;
            console.log(`  区域 ${i + 1}: ${r.pixels.length} 像素, ${w}x${h}, 位置 (${r.minX},${r.minY})`);
        });
        
        return filtered;
    }

    createFinalMask(regions, width, height) {
        const maskData = new Uint8ClampedArray(width * height * 4);
        const binaryMask = new Uint8Array(width * height);
        
        for (const region of regions) {
            for (const [px, py] of region.pixels) {
                const idx = py * width + px;
                binaryMask[idx] = 1;
                const maskIdx = idx * 4;
                maskData[maskIdx] = 255;
                maskData[maskIdx + 3] = 255;
            }
        }
        
        return {
            maskData: new ImageData(maskData, width, height),
            binaryMask,
            regions
        };
    }
}

export class SpotExtractor {
    constructor(options = {}) {
        this.yellowThreshold = options.yellowThreshold || 50;
        this.brownThreshold = options.brownThreshold || 40;
        this.redThreshold = options.redThreshold || 30;
        this.whiteThreshold = options.whiteThreshold || 45;
        this.grayThreshold = options.grayThreshold || 50;
        this.minSpotArea = options.minSpotArea || 5;
        this.useRelativeDetection = options.useRelativeDetection !== false;
    }

    extract(imageData, leafMask, leafPixels, segmentationResult) {
        console.log('=== 开始病斑提取（修复版）===');
        
        const { width, height } = imageData;
        const spotMask = new Uint8Array(width * height);
        const spotType = new Array(width * height).fill(0);
        
        const yellowSensitivity = this.yellowThreshold / 100;
        const brownSensitivity = this.brownThreshold / 100;
        const redSensitivity = this.redThreshold / 100;
        const whiteSensitivity = this.whiteThreshold / 100;
        const graySensitivity = this.grayThreshold / 100;
        
        const hsvImage = this.calculateHSVImage(imageData);
        const labImage = this.calculateLabImage(imageData);
        const edgeImage = this.calculateEdgeImage(imageData, leafMask, width, height);
        
        const healthyModel = this.estimateHealthyColorModel(leafPixels, hsvImage, labImage);
        console.log('健康叶片颜色模型:');
        console.log('  平均 Lab a:', healthyModel.avgLabA.toFixed(1), ', b:', healthyModel.avgLabB.toFixed(1));
        
        const sensitivities = {
            yellowSensitivity,
            brownSensitivity,
            redSensitivity,
            whiteSensitivity,
            graySensitivity
        };
        
        leafPixels.forEach(pixel => {
            const idx = pixel.index;
            const { r, g, b } = pixel;
            const hsv = hsvImage[idx];
            const lab = labImage[idx];
            const edgeStrength = edgeImage[idx];
            
            const type = this.classifyPixel(
                r, g, b, hsv, lab, edgeStrength, 
                sensitivities, healthyModel
            );
            
            if (type > 0) {
                spotMask[idx] = 1;
                spotType[idx] = type;
            }
        });
        
        if (this.useRelativeDetection) {
            this.detectWithRelativeDifference(
                spotMask, spotType, leafMask,
                hsvImage, labImage, healthyModel,
                sensitivities, width, height
            );
        }
        
        this.growSpotRegions(
            spotMask, spotType, leafMask, 
            hsvImage, labImage,
            width, height
        );
        
        this.fillLargeHoles(spotMask, spotType, leafMask, width, height);
        
        this.postProcessTypes(spotMask, spotType, width, height);
        
        const cleanedMask = this.removeSmallSpots(spotMask, width, height);
        const spots = this.findConnectedComponents(cleanedMask, spotType, width, height);
        
        console.log('检测到病斑区域数:', spots.length);
        
        const spotImageData = this.createSpotImageData(imageData, cleanedMask, spotType, width, height);
        const totalSpotArea = this.calculateTotalSpotArea(cleanedMask);
        const typeCounts = this.countByType(spotType, cleanedMask);
        
        console.log('=== 病斑统计 ===');
        console.log('总病斑面积:', totalSpotArea);
        console.log('黄色:', typeCounts.yellow, '褐色:', typeCounts.brown, 
                   '红色:', typeCounts.red, '白色:', typeCounts.white, '灰色:', typeCounts.gray);
        
        return {
            spotMask: cleanedMask,
            spotImageData,
            spots,
            totalSpotArea,
            ...typeCounts
        };
    }

    classifyPixel(r, g, b, hsv, lab, edgeStrength, sensitivities, healthyModel) {
        const { yellowSensitivity, brownSensitivity, redSensitivity, whiteSensitivity, graySensitivity } = sensitivities;
        
        const avg = (r + g + b) / 3;
        
        const isDark = avg < 100;
        const isMedium = avg >= 100 && avg < 180;
        const isBright = avg >= 180;
        
        if (isDark) {
            const brownScore = this.calculateBrownScore(r, g, b, hsv, lab, brownSensitivity);
            const grayScore = this.calculateGrayScore(r, g, b, hsv, lab, graySensitivity);
            const redScore = this.calculateRedScore(r, g, b, hsv, lab, redSensitivity);
            
            const scores = [
                { type: 2, score: brownScore },
                { type: 3, score: redScore },
                { type: 5, score: grayScore }
            ];
            scores.sort((a, b) => b.score - a.score);
            
            if (scores[0].score > 0.4) return scores[0].type;
            if (scores[0].score > 0.25) return scores[0].type;
            
            return 0;
        }
        
        if (isBright) {
            const whiteScore = this.calculateWhiteScore(r, g, b, hsv, lab, whiteSensitivity);
            const yellowScore = this.calculateYellowScore(r, g, b, hsv, lab, yellowSensitivity);
            
            if (whiteScore > 0.4) return 4;
            
            const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
            if (maxDiff < 25) return 4;
            
            if (yellowScore > 0.5 && yellowScore > whiteScore + 0.1) return 1;
            
            return 0;
        }
        
        const brownScore = this.calculateBrownScore(r, g, b, hsv, lab, brownSensitivity);
        const yellowScore = this.calculateYellowScore(r, g, b, hsv, lab, yellowSensitivity);
        const redScore = this.calculateRedScore(r, g, b, hsv, lab, redSensitivity);
        const grayScore = this.calculateGrayScore(r, g, b, hsv, lab, graySensitivity);
        
        const scores = [
            { type: 2, score: brownScore },
            { type: 1, score: yellowScore },
            { type: 3, score: redScore },
            { type: 5, score: grayScore }
        ];
        scores.sort((a, b) => b.score - a.score);
        
        const topScore = scores[0];
        const secondScore = scores[1];
        
        if (topScore.score > 0.5) return topScore.type;
        
        if (topScore.score > 0.35) {
            if (topScore.score - secondScore.score > 0.08) return topScore.type;
        }
        
        if (edgeStrength > 0.3) {
            if (brownScore > 0.25 && brownScore > yellowScore) return 2;
            if (redScore > 0.25) return 3;
        }
        
        if (topScore.score > 0.3) return topScore.type;
        
        return 0;
    }

    calculateBrownScore(r, g, b, hsv, lab, sensitivity) {
        let score = 0;
        const avg = (r + g + b) / 3;
        
        if (avg < 40 || avg > 180) return 0;
        
        const rMinusG = r - g;
        const rMinusB = r - b;
        const gMinusB = g - b;
        
        if (r > g && g > b) {
            score += 0.25;
            
            const rgRatio = r / (g + 1);
            if (rgRatio > 1.05) score += 0.1;
            if (rgRatio > 1.1 + 0.2 * (1 - sensitivity)) score += 0.1;
            
            const rbRatio = r / (b + 1);
            if (rbRatio > 1.15) score += 0.1;
            if (rbRatio > 1.3 + 0.2 * (1 - sensitivity)) score += 0.1;
        }
        
        if (r > g * 0.9 && r > b) {
            score += 0.15;
        }
        
        if (hsv.h >= 10 && hsv.h <= 50) {
            score += 0.2;
            if (hsv.h >= 15 && hsv.h <= 40) score += 0.1;
        }
        
        if (hsv.s > 10 + 20 * (1 - sensitivity) && hsv.s < 70) {
            score += 0.1;
        }
        
        if (lab.a > 3 + 10 * (1 - sensitivity)) {
            score += 0.15;
        }
        if (lab.b > 5 + 12 * (1 - sensitivity)) {
            score += 0.15;
        }
        
        if (rMinusG > 2 + 8 * (1 - sensitivity)) {
            score += 0.1;
        }
        
        if (rMinusB > 10) {
            score += 0.1;
        }
        
        return Math.min(1, score);
    }

    calculateYellowScore(r, g, b, hsv, lab, sensitivity) {
        let score = 0;
        const avg = (r + g + b) / 3;
        
        if (avg < 80 || avg > 230) return 0;
        
        const baseYellowScore = Math.min(r, g) - b;
        const yellowRatio = (r + g) / (2 * (b + 1));
        
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        if (maxDiff < 25 && avg > 180) return 0;
        
        if (r > 100 && g > 100 && b < 140) {
            score += 0.2;
            if (r > b * 1.2 && g > b * 1.2) score += 0.15;
        }
        
        if (hsv.h >= 30 && hsv.h <= 70) {
            score += 0.3;
            if (hsv.h >= 35 && hsv.h <= 60) score += 0.1;
        }
        
        if (hsv.s > 20 + 25 * (1 - sensitivity) && hsv.v > 40) {
            score += 0.2;
            if (hsv.s > 30 + 20 * (1 - sensitivity)) score += 0.1;
        }
        
        if (lab.b > 15 + 25 * (1 - sensitivity)) {
            score += 0.2;
        }
        
        if (Math.abs(r - g) > 40) {
            return 0;
        }
        
        if (r > g * 1.15 || g > r * 1.15) {
            score -= 0.15;
        }
        
        if (g < b) return Math.max(0, score - 0.4);
        if (r < b) return Math.max(0, score - 0.4);
        
        if (r < 90 || g < 90) return Math.max(0, score - 0.2);
        
        if (baseYellowScore > 100) {
            score += 0.1;
        }
        if (yellowRatio > 1.6) {
            score += 0.1;
        }
        
        return Math.max(0, Math.min(1, score));
    }

    calculateRedScore(r, g, b, hsv, lab, sensitivity) {
        let score = 0;
        const avg = (r + g + b) / 3;
        
        if (avg < 30 || avg > 200) return 0;
        
        if (r > 70) {
            const rgRatio = r / (g + 1);
            const rbRatio = r / (b + 1);
            
            if (rgRatio > 1.3 + 0.3 * (1 - sensitivity)) score += 0.25;
            if (rbRatio > 1.3 + 0.3 * (1 - sensitivity)) score += 0.25;
            if (rgRatio > 1.5 && rbRatio > 1.5) score += 0.15;
        }
        
        if ((hsv.h >= 0 && hsv.h <= 25) || (hsv.h >= 325 && hsv.h <= 360)) {
            score += 0.2;
            if (hsv.h <= 15 || hsv.h >= 340) score += 0.1;
        }
        
        if (hsv.s > 25 + 20 * (1 - sensitivity)) {
            score += 0.15;
        }
        
        if (lab.a > 15 + 15 * (1 - sensitivity)) {
            score += 0.2;
        }
        
        return Math.min(1, score);
    }

    calculateWhiteScore(r, g, b, hsv, lab, sensitivity) {
        let score = 0;
        const avg = (r + g + b) / 3;
        
        if (avg < 170) return 0;
        
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        
        if (avg > 190) score += 0.35;
        if (avg > 210) score += 0.1;
        
        if (maxDiff < 30) score += 0.35;
        if (maxDiff < 20) score += 0.1;
        
        if (hsv.s < 25) score += 0.2;
        if (hsv.s < 15) score += 0.1;
        
        if (lab.l > 75) score += 0.1;
        
        return Math.min(1, score);
    }

    calculateGrayScore(r, g, b, hsv, lab, sensitivity) {
        let score = 0;
        const avg = (r + g + b) / 3;
        
        if (avg < 50 || avg > 190) return 0;
        
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        
        if (maxDiff < 25) score += 0.4;
        if (maxDiff < 15) score += 0.1;
        
        if (hsv.s < 20) score += 0.3;
        if (hsv.s < 12) score += 0.1;
        
        if (Math.abs(lab.a) < 12 && Math.abs(lab.b) < 12) {
            score += 0.2;
        }
        
        return Math.min(1, score);
    }

    calculateEdgeImage(imageData, leafMask, width, height) {
        const { data } = imageData;
        const edgeImage = new Float32Array(width * height);
        
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (leafMask[idx] === 0) continue;
                
                let gxR = 0, gxG = 0, gxB = 0;
                let gyR = 0, gyG = 0, gyB = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const kidx = (y + ky) * width + (x + kx);
                        const didx = kidx * 4;
                        const kweight = ky * 3 + kx + 4;
                        
                        gxR += data[didx] * sobelX[kweight];
                        gxG += data[didx + 1] * sobelX[kweight];
                        gxB += data[didx + 2] * sobelX[kweight];
                        
                        gyR += data[didx] * sobelY[kweight];
                        gyG += data[didx + 1] * sobelY[kweight];
                        gyB += data[didx + 2] * sobelY[kweight];
                    }
                }
                
                const magnitudeR = Math.sqrt(gxR * gxR + gyR * gyR);
                const magnitudeG = Math.sqrt(gxG * gxG + gyG * gyG);
                const magnitudeB = Math.sqrt(gxB * gxB + gyB * gyB);
                const magnitude = (magnitudeR + magnitudeG + magnitudeB) / 3;
                
                const normalized = Math.min(1, magnitude / 255);
                edgeImage[idx] = normalized;
            }
        }
        
        return edgeImage;
    }

    growSpotRegions(spotMask, spotType, leafMask, hsvImage, labImage, width, height) {
        const visited = new Uint8Array(width * height);
        const stack = [];
        
        for (let i = 0; i < spotMask.length; i++) {
            if (spotMask[i] === 1) {
                stack.push({ index: i, type: spotType[i], layer: 0 });
                visited[i] = 1;
            }
        }
        
        let expanded = 0;
        const maxLayers = 2;
        
        while (stack.length > 0) {
            const { index, type, layer } = stack.shift();
            
            if (layer >= maxLayers) continue;
            
            const x = index % width;
            const y = Math.floor(index / width);
            
            const neighbors = [
                [x + 1, y], [x - 1, y],
                [x, y + 1], [x, y - 1]
            ];
            
            neighbors.forEach(([nx, ny]) => {
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
                
                const nIdx = ny * width + nx;
                if (visited[nIdx] || leafMask[nIdx] === 0 || spotMask[nIdx] === 1) return;
                
                const nHsv = hsvImage[nIdx];
                const nLab = labImage[nIdx];
                
                const isSimilar = this.isSimilarToSpotType(nHsv, nLab, type, 0.9 - layer * 0.1);
                
                if (isSimilar) {
                    spotMask[nIdx] = 1;
                    spotType[nIdx] = type;
                    visited[nIdx] = 1;
                    stack.push({ index: nIdx, type, layer: layer + 1 });
                    expanded++;
                }
            });
        }
        
        console.log('区域生长扩展:', expanded, '像素');
    }

    postProcessTypes(spotMask, spotType, width, height) {
        const visited = new Uint8Array(width * height);
        let totalChanged = 0;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (spotMask[idx] === 0 || visited[idx]) continue;
                
                const region = this.floodFillRegion(spotMask, visited, x, y, width, height);
                
                if (region.size < 20) continue;
                
                const typeStats = this.countTypesInRegion(spotType, region.pixels);
                
                let dominantType = typeStats.dominantType;
                let dominantRatio = typeStats.dominantRatio;
                
                let shouldChange = false;
                let newType = dominantType;
                
                if (dominantType === 1) {
                    const brownRatio = typeStats.counts[2] / region.size;
                    const grayRatio = typeStats.counts[5] / region.size;
                    
                    if (brownRatio + grayRatio > 0.3) {
                        if (brownRatio > grayRatio) {
                            newType = 2;
                            shouldChange = true;
                        } else {
                            newType = 5;
                            shouldChange = true;
                        }
                    }
                    
                    const circularity = this.calculateCircularity(region, width, height);
                    if (circularity > 0.4 && dominantRatio < 0.7) {
                        if (typeStats.counts[2] > 0) {
                            newType = 2;
                            shouldChange = true;
                        }
                    }
                    
                    const avgBrightness = this.calculateRegionBrightness(region, width, height, spotMask);
                    if (avgBrightness < 120) {
                        if (typeStats.counts[2] > 0) {
                            newType = 2;
                            shouldChange = true;
                        }
                        if (typeStats.counts[5] > typeStats.counts[2]) {
                            newType = 5;
                            shouldChange = true;
                        }
                    }
                }
                
                if (shouldChange) {
                    let changed = 0;
                    for (let i = 0; i < region.pixels.length; i++) {
                        const p = region.pixels[i];
                        if (spotType[p] === 1) {
                            spotType[p] = newType;
                            changed++;
                        }
                    }
                    totalChanged += changed;
                    if (changed > 0) {
                        console.log('后处理修正: 区域', region.size, '像素, 将', changed, '个黄色改为', 
                                   newType === 2 ? '褐色' : (newType === 5 ? '灰色' : newType));
                    }
                }
            }
        }
        
        if (totalChanged > 0) {
            console.log('后处理总计修正:', totalChanged, '像素');
        }
    }

    countTypesInRegion(spotType, pixels) {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        pixels.forEach(idx => {
            const type = spotType[idx];
            if (counts[type] !== undefined) {
                counts[type]++;
            }
        });
        
        let dominantType = 1;
        let maxCount = 0;
        
        Object.keys(counts).forEach(type => {
            if (counts[type] > maxCount) {
                maxCount = counts[type];
                dominantType = parseInt(type);
            }
        });
        
        return {
            counts,
            dominantType,
            dominantRatio: maxCount / pixels.length
        };
    }

    calculateRegionBrightness(region, width, height, spotMask) {
        let totalBrightness = 0;
        let count = 0;
        
        region.pixels.forEach(idx => {
            if (spotMask[idx] === 1) {
                totalBrightness += 0.5;
                count++;
            }
        });
        
        return count > 0 ? 100 : 150;
    }

    isSimilarToSpotType(hsv, lab, type, tolerance) {
        const tolFactor = 1 + (1 - tolerance) * 0.3;
        
        switch (type) {
            case 2:
                return (hsv.h >= 8 && hsv.h <= 55) &&
                       (hsv.s > 8 || (lab.a > 2 && lab.b > 5));
            case 1:
                return (hsv.h >= 30 && hsv.h <= 75) &&
                       (hsv.s > 15);
            case 3:
                return ((hsv.h <= 30 || hsv.h >= 320) && hsv.s > 20);
            case 4:
                return hsv.s < 30 && hsv.v > 65;
            case 5:
                return hsv.s < 25 && hsv.v >= 35 && hsv.v <= 85;
            default:
                return false;
        }
    }

    detectWithRelativeDifference(spotMask, spotType, leafMask, hsvImage, labImage, healthyModel, sensitivities, width, height) {
        let newSpotsDetected = 0;
        
        for (let i = 0; i < leafMask.length; i++) {
            if (leafMask[i] === 0 || spotMask[i] === 1) continue;
            
            const hsv = hsvImage[i];
            const lab = labImage[i];
            
            const greennessDiff = healthyModel.healthyGreenness - 
                                  this.calculateGreennessFromHSV(hsv, lab);
            const saturationDiff = healthyModel.avgSaturation - hsv.s;
            const labADiff = lab.a - healthyModel.avgLabA;
            const labBDiff = lab.b - healthyModel.avgLabB;
            
            const isAnomaly = (greennessDiff > 0.35) ||
                             (saturationDiff > 20 && greennessDiff > 0.2) ||
                             (labADiff > 10) ||
                             (Math.abs(labBDiff) > 15);
            
            if (isAnomaly) {
                const inferredType = this.inferSpotTypeFromDifference(
                    hsv, lab, healthyModel, sensitivities
                );
                
                if (inferredType > 0) {
                    spotMask[i] = 1;
                    spotType[i] = inferredType;
                    newSpotsDetected++;
                }
            }
        }
        
        console.log('相对差异检测新增:', newSpotsDetected, '像素');
    }

    inferSpotTypeFromDifference(hsv, lab, healthyModel, sensitivities) {
        const { yellowSensitivity, brownSensitivity, redSensitivity, whiteSensitivity, graySensitivity } = sensitivities;
        
        const isBrownish = (hsv.h >= 10 && hsv.h <= 50) && 
                          (hsv.s > 10 || (lab.a > 5 && lab.b > 8));
        const isYellowish = hsv.h >= 30 && hsv.h <= 70 && hsv.s > 20;
        const isReddish = ((hsv.h <= 20 || hsv.h >= 340) && hsv.s > 22 && lab.a > 10);
        const isWhitish = hsv.s < 25 && hsv.v > 70;
        const isGrayish = hsv.s < 20 && hsv.v >= 35 && hsv.v <= 80;
        
        if (isReddish) return 3;
        if (isBrownish) return 2;
        if (isYellowish) return 1;
        if (isWhitish) return 4;
        if (isGrayish) return 5;
        
        if (lab.a > healthyModel.avgLabA + 8) {
            return 2;
        }
        if (lab.a > healthyModel.avgLabA + 5) {
            return 3;
        }
        if (lab.b > healthyModel.avgLabB + 12) {
            return 1;
        }
        
        if (hsv.s < healthyModel.saturationThreshold - 5) {
            if (hsv.v > 65) return 4;
            return 5;
        }
        
        return 0;
    }

    fillLargeHoles(spotMask, spotType, leafMask, width, height) {
        const visited = new Uint8Array(width * height);
        let filled = 0;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (leafMask[idx] === 0 || spotMask[idx] === 1 || visited[idx]) continue;
                
                const hole = this.floodFillHole(spotMask, leafMask, visited, x, y, width, height);
                
                if (hole.isEnclosed && hole.size <= 400 && hole.size >= 3) {
                    const fillType = this.inferTypeFromNeighbors(
                        spotMask, spotType, hole.pixels, width, height
                    );
                    
                    hole.pixels.forEach(p => {
                        spotMask[p] = 1;
                        spotType[p] = fillType;
                        filled++;
                    });
                }
            }
        }
        
        console.log('填充孔洞:', filled, '像素');
    }

    inferTypeFromNeighbors(spotMask, spotType, holePixels, width, height) {
        const typeCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        holePixels.forEach(idx => {
            const x = idx % width;
            const y = Math.floor(idx / width);
            
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    
                    const nIdx = ny * width + nx;
                    if (spotMask[nIdx] === 1) {
                        const type = spotType[nIdx];
                        if (typeCount[type] !== undefined) {
                            typeCount[type]++;
                        }
                    }
                }
            }
        });
        
        let dominantType = 2;
        let maxCount = 0;
        
        Object.keys(typeCount).forEach(type => {
            if (typeCount[type] > maxCount) {
                maxCount = typeCount[type];
                dominantType = parseInt(type);
            }
        });
        
        if (maxCount === 0) {
            return 2;
        }
        
        return dominantType;
    }

    estimateHealthyColorModel(leafPixels, hsvImage, labImage) {
        let totalGreenness = 0;
        let totalSaturation = 0;
        let totalValue = 0;
        let totalR = 0, totalG = 0, totalB = 0;
        let totalLabA = 0, totalLabB = 0;
        
        const greennessValues = [];
        
        leafPixels.forEach(pixel => {
            const { r, g, b } = pixel;
            const idx = pixel.index;
            const hsv = hsvImage[idx];
            const lab = labImage[idx];
            
            const greenness = this.calculateGreenness(r, g, b);
            greennessValues.push({ index: idx, greenness });
            
            totalGreenness += greenness;
            totalSaturation += hsv.s;
            totalValue += hsv.v;
            totalR += r;
            totalG += g;
            totalB += b;
            totalLabA += lab.a;
            totalLabB += lab.b;
        });
        
        const n = leafPixels.length || 1;
        
        const avgGreenness = totalGreenness / n;
        const avgSaturation = totalSaturation / n;
        const avgLabA = totalLabA / n;
        const avgLabB = totalLabB / n;
        
        greennessValues.sort((a, b) => b.greenness - a.greenness);
        const top25Index = Math.floor(greennessValues.length * 0.75);
        const topGreenness = greennessValues.slice(0, top25Index);
        const healthyGreenness = topGreenness.reduce((a, b) => a + b.greenness, 0) / 
                                Math.max(1, topGreenness.length);
        
        return {
            avgGreenness,
            healthyGreenness,
            avgSaturation,
            avgValue: totalValue / n,
            avgR: totalR / n,
            avgG: totalG / n,
            avgB: totalB / n,
            avgLabA,
            avgLabB,
            greennessThreshold: Math.max(-0.2, avgGreenness - 0.3),
            saturationThreshold: Math.max(10, avgSaturation - 25)
        };
    }

    calculateGreenness(r, g, b) {
        const greenExcess = (2 * g - r - b);
        const greenRatio = g / (r + g + b + 1);
        const greenness = (greenRatio - 0.33) * 3 + (greenExcess / 255);
        return Math.max(-1, Math.min(1, greenness));
    }

    calculateGreennessFromHSV(hsv, lab) {
        const hueGreenness = (hsv.h >= 60 && hsv.h <= 150) ? 
            Math.sin((hsv.h - 60) / 90 * Math.PI) : -Math.abs(90 - hsv.h) / 90;
        
        const labGreenness = -lab.a / 50;
        
        return hueGreenness * 0.6 + labGreenness * 0.4;
    }

    calculateCircularity(region, width, height) {
        const { pixels, size } = region;
        
        let minX = width, maxX = 0, minY = height, maxY = 0;
        
        pixels.forEach(p => {
            const x = p % width;
            const y = Math.floor(p / width);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });
        
        const bboxWidth = maxX - minX + 1;
        const bboxHeight = maxY - minY + 1;
        const bboxArea = bboxWidth * bboxHeight;
        
        const fillRatio = size / bboxArea;
        const aspectRatio = Math.min(bboxWidth / bboxHeight, bboxHeight / bboxWidth);
        
        const shapeScore = fillRatio * 0.6 + aspectRatio * 0.4;
        
        return shapeScore;
    }

    floodFillRegion(spotMask, visited, startX, startY, width, height) {
        const pixels = [];
        const stack = [[startX, startY]];
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const idx = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited[idx] || spotMask[idx] !== 1) continue;
            
            visited[idx] = 1;
            pixels.push(idx);
            
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
        
        return { pixels, size: pixels.length };
    }

    floodFillHole(spotMask, leafMask, visited, startX, startY, width, height) {
        const pixels = [];
        const stack = [[startX, startY]];
        let isEnclosed = true;
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const idx = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height) {
                isEnclosed = false;
                continue;
            }
            if (leafMask[idx] === 0) {
                isEnclosed = false;
                continue;
            }
            if (visited[idx]) continue;
            if (spotMask[idx] === 1) continue;
            
            visited[idx] = 1;
            pixels.push(idx);
            
            const neighbors = [
                [x + 1, y], [x - 1, y],
                [x, y + 1], [x, y - 1]
            ];
            
            neighbors.forEach(([nx, ny]) => {
                const nIdx = ny * width + nx;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    if (spotMask[nIdx] === 1) {
                    } else if (!visited[nIdx] && leafMask[nIdx] === 1) {
                        stack.push([nx, ny]);
                    }
                }
            });
        }
        
        return { pixels, size: pixels.length, isEnclosed, dominantType: 0 };
    }

    calculateHSVImage(imageData) {
        const { data, width, height } = imageData;
        const hsvArray = new Array(width * height);
        
        for (let i = 0; i < data.length; i += 4) {
            const idx = i / 4;
            hsvArray[idx] = this.rgbToHsv(data[i], data[i + 1], data[i + 2]);
        }
        
        return hsvArray;
    }

    calculateLabImage(imageData) {
        const { data, width, height } = imageData;
        const labArray = new Array(width * height);
        
        for (let i = 0; i < data.length; i += 4) {
            const idx = i / 4;
            labArray[idx] = this.rgbToLab(data[i], data[i + 1], data[i + 2]);
        }
        
        return labArray;
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

    removeSmallSpots(mask, width, height) {
        const visited = new Uint8Array(width * height);
        const cleaned = new Uint8Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (mask[idx] === 1 && !visited[idx]) {
                    const component = this.floodFill(mask, visited, x, y, width, height);
                    if (component.size >= this.minSpotArea) {
                        component.pixels.forEach(p => {
                            cleaned[p] = 1;
                        });
                    }
                }
            }
        }
        
        return cleaned;
    }

    floodFill(mask, visited, startX, startY, width, height) {
        const pixels = [];
        const stack = [[startX, startY]];
        let minX = width, maxX = 0, minY = height, maxY = 0;
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const idx = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited[idx] || mask[idx] !== 1) continue;
            
            visited[idx] = 1;
            pixels.push(idx);
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
        
        return {
            pixels,
            size: pixels.length,
            bbox: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
        };
    }

    findConnectedComponents(mask, spotType, width, height) {
        const visited = new Uint8Array(width * height);
        const spots = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (mask[idx] === 1 && !visited[idx]) {
                    const component = this.floodFill(mask, visited, x, y, width, height);
                    const perimeter = this.calculatePerimeter(mask, component.pixels, width, height);
                    const dominantType = this.getDominantType(spotType, component.pixels);
                    
                    spots.push({
                        ...component,
                        perimeter,
                        dominantType,
                        centerX: (component.bbox.x + component.bbox.width / 2),
                        centerY: (component.bbox.y + component.bbox.height / 2)
                    });
                }
            }
        }
        
        return spots;
    }

    getDominantType(spotType, pixels) {
        const typeCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        pixels.forEach(idx => {
            const type = spotType[idx];
            if (typeCount[type] !== undefined) {
                typeCount[type]++;
            }
        });
        
        let dominantType = 2;
        let maxCount = 0;
        
        Object.keys(typeCount).forEach(type => {
            if (typeCount[type] > maxCount) {
                maxCount = typeCount[type];
                dominantType = parseInt(type);
            }
        });
        
        return dominantType;
    }

    calculatePerimeter(mask, pixels, width, height) {
        let perimeter = 0;
        const pixelSet = new Set(pixels);
        
        pixels.forEach(idx => {
            const x = idx % width;
            const y = Math.floor(idx / width);
            
            const neighbors = [
                [x + 1, y], [x - 1, y],
                [x, y + 1], [x, y - 1]
            ];
            
            neighbors.forEach(([nx, ny]) => {
                const nIdx = ny * width + nx;
                if (nx < 0 || nx >= width || ny < 0 || ny >= height || !pixelSet.has(nIdx)) {
                    perimeter++;
                }
            });
        });
        
        return perimeter;
    }

    createSpotImageData(imageData, spotMask, spotType, width, height) {
        const resultData = new Uint8ClampedArray(imageData.data.length);
        
        const typeColors = {
            1: { r: 255, g: 235, b: 0, name: '黄色' },
            2: { r: 139, g: 69, b: 19, name: '褐色' },
            3: { r: 244, g: 67, b: 54, name: '红色' },
            4: { r: 255, g: 255, b: 255, name: '白色' },
            5: { r: 158, g: 158, b: 158, name: '灰色' }
        };
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            const idx = i / 4;
            
            if (spotMask[idx] === 1) {
                const type = spotType[idx] || 2;
                const color = typeColors[type] || typeColors[2];
                resultData[i] = color.r;
                resultData[i + 1] = color.g;
                resultData[i + 2] = color.b;
                resultData[i + 3] = 255;
            } else {
                resultData[i] = imageData.data[i];
                resultData[i + 1] = imageData.data[i + 1];
                resultData[i + 2] = imageData.data[i + 2];
                resultData[i + 3] = 100;
            }
        }
        
        return new ImageData(resultData, width, height);
    }

    calculateTotalSpotArea(spotMask) {
        let count = 0;
        for (let i = 0; i < spotMask.length; i++) {
            if (spotMask[i] === 1) count++;
        }
        return count;
    }

    countByType(spotType, spotMask) {
        const counts = { yellow: 0, brown: 0, red: 0, white: 0, gray: 0 };
        for (let i = 0; i < spotType.length; i++) {
            if (spotMask[i] === 1) {
                switch (spotType[i]) {
                    case 1: counts.yellow++; break;
                    case 2: counts.brown++; break;
                    case 3: counts.red++; break;
                    case 4: counts.white++; break;
                    case 5: counts.gray++; break;
                }
            }
        }
        return counts;
    }
}

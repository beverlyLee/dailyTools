export class TemplateMatcher {
    constructor(options = {}) {
        this.options = {
            matchThreshold: options.matchThreshold || 0.65,
            templateSize: options.templateSize || 64,
            numOctaves: options.numOctaves || 3,
            numAngularBins: options.numAngularBins || 12,
            numRadialBins: options.numRadialBins || 5,
            huWeight: options.huWeight || 0.35,
            contourWeight: options.contourWeight || 0.3,
            shapeContextWeight: options.shapeContextWeight || 0.2,
            chainCodeWeight: options.chainCodeWeight || 0.15
        };
        this.templates = [];
        this.templateFeatures = [];
    }

    async loadTemplates() {
        this.templates = this.createBuiltInTemplates();
        this.templateFeatures = this.templates.map(t => {
            const features = this.extractAllFeatures(t.symbol);
            return {
                ...t,
                features: features,
                aspectRatio: features.contourFeatures.avgAspectRatio || 1,
                areaRatio: features.contourFeatures.avgDensity || 0.5
            };
        });
        return this.templates;
    }

    createBuiltInTemplates() {
        const templates = [];
        
        templates.push({
            name: '电阻',
            category: 'passive',
            symbol: this.createResistorTemplate(),
            description: '标准电阻器，用于限制电流',
            expectedAspectRatio: 2.5,
            expectedAreaRatio: 0.15
        });
        
        templates.push({
            name: '电容',
            category: 'passive',
            symbol: this.createCapacitorTemplate(),
            description: '电容器，用于存储电荷',
            expectedAspectRatio: 2.0,
            expectedAreaRatio: 0.12
        });
        
        templates.push({
            name: 'LED',
            category: 'diode',
            symbol: this.createLedTemplate(),
            description: '发光二极管',
            expectedAspectRatio: 1.8,
            expectedAreaRatio: 0.18
        });
        
        templates.push({
            name: '二极管',
            category: 'diode',
            symbol: this.createDiodeTemplate(),
            description: '普通二极管',
            expectedAspectRatio: 1.5,
            expectedAreaRatio: 0.14
        });
        
        templates.push({
            name: '芯片',
            category: 'ic',
            symbol: this.createChipTemplate(),
            description: '集成电路芯片',
            expectedAspectRatio: 1.3,
            expectedAreaRatio: 0.35
        });
        
        templates.push({
            name: 'Arduino',
            category: 'board',
            symbol: this.createArduinoTemplate(),
            description: 'Arduino 开发板',
            expectedAspectRatio: 1.1,
            expectedAreaRatio: 0.4
        });
        
        return templates;
    }

    createResistorTemplate() {
        const size = this.options.templateSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.4, cy);
        ctx.lineTo(cx - size * 0.15, cy);
        
        ctx.lineTo(cx - size * 0.1, cy - size * 0.15);
        ctx.lineTo(cx + size * 0.1, cy + size * 0.15);
        ctx.lineTo(cx + size * 0.15, cy - size * 0.15);
        ctx.lineTo(cx + size * 0.1, cy + size * 0.15);
        ctx.lineTo(cx + size * 0.15, cy);
        
        ctx.lineTo(cx + size * 0.4, cy);
        ctx.stroke();
        
        return canvas;
    }

    createCapacitorTemplate() {
        const size = this.options.templateSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.35, cy);
        ctx.lineTo(cx - size * 0.12, cy);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.12, cy - size * 0.25);
        ctx.lineTo(cx - size * 0.12, cy + size * 0.25);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx + size * 0.12, cy - size * 0.25);
        ctx.lineTo(cx + size * 0.12, cy + size * 0.25);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx + size * 0.12, cy);
        ctx.lineTo(cx + size * 0.35, cy);
        ctx.stroke();
        
        return canvas;
    }

    createLedTemplate() {
        const size = this.options.templateSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
        ctx.lineWidth = 2;
        
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.35, cy);
        ctx.lineTo(cx - size * 0.15, cy);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.15, cy - size * 0.2);
        ctx.lineTo(cx - size * 0.15, cy + size * 0.2);
        ctx.lineTo(cx + size * 0.15, cy);
        ctx.closePath();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx + size * 0.15, cy - size * 0.2);
        ctx.lineTo(cx + size * 0.15, cy + size * 0.2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx + size * 0.15, cy);
        ctx.lineTo(cx + size * 0.35, cy);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx + size * 0.1, cy - size * 0.3);
        ctx.lineTo(cx + size * 0.25, cy - size * 0.15);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx + size * 0.2, cy - size * 0.35);
        ctx.lineTo(cx + size * 0.35, cy - size * 0.2);
        ctx.stroke();
        
        return canvas;
    }

    createDiodeTemplate() {
        const size = this.options.templateSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
        ctx.lineWidth = 2;
        
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.35, cy);
        ctx.lineTo(cx - size * 0.15, cy);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.15, cy - size * 0.2);
        ctx.lineTo(cx - size * 0.15, cy + size * 0.2);
        ctx.lineTo(cx + size * 0.15, cy);
        ctx.closePath();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx + size * 0.15, cy - size * 0.2);
        ctx.lineTo(cx + size * 0.15, cy + size * 0.2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx + size * 0.15, cy);
        ctx.lineTo(cx + size * 0.0, cy);
        ctx.stroke();
        
        return canvas;
    }

    createChipTemplate() {
        const size = this.options.templateSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        const cx = size / 2;
        const cy = size / 2;
        const w = size * 0.45;
        const h = size * 0.3;
        
        ctx.strokeRect(cx - w, cy - h, w * 2, h * 2);
        
        ctx.beginPath();
        ctx.arc(cx - w + size * 0.05, cy - h + size * 0.05, size * 0.03, 0, Math.PI * 2);
        ctx.stroke();
        
        for (let i = 0; i < 3; i++) {
            const y = cy - h + (h / 2) * (i + 1);
            ctx.beginPath();
            ctx.moveTo(cx - w, y);
            ctx.lineTo(cx - w - size * 0.1, y);
            ctx.stroke();
        }
        
        for (let i = 0; i < 3; i++) {
            const y = cy - h + (h / 2) * (i + 1);
            ctx.beginPath();
            ctx.moveTo(cx + w, y);
            ctx.lineTo(cx + w + size * 0.1, y);
            ctx.stroke();
        }
        
        return canvas;
    }

    createArduinoTemplate() {
        const size = this.options.templateSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        const cx = size / 2;
        const cy = size / 2;
        const w = size * 0.38;
        const h = size * 0.35;
        
        ctx.strokeRect(cx - w, cy - h, w * 2, h * 2);
        
        ctx.beginPath();
        ctx.arc(cx, cy - h + size * 0.08, size * 0.05, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = 'black';
        ctx.font = `bold ${Math.floor(size * 0.1)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Arduino', cx, cy + h + size * 0.12);
        
        return canvas;
    }

    match(componentImage, componentInfo = null) {
        if (this.templates.length === 0) {
            this.createBuiltInTemplates();
        }
        
        if (this.templateFeatures.length === 0) {
            this.templateFeatures = this.templates.map(t => ({
                ...t,
                features: this.extractAllFeatures(t.symbol),
                aspectRatio: t.expectedAspectRatio || 1,
                areaRatio: t.expectedAreaRatio || 0.5
            }));
        }
        
        const inputFeatures = this.extractAllFeatures(componentImage);
        const results = [];
        
        for (const template of this.templateFeatures) {
            let spatialFilterScore = 1.0;
            
            if (componentInfo) {
                const componentAspectRatio = Math.max(componentInfo.width, componentInfo.height) / 
                    Math.min(componentInfo.width, componentInfo.height, 1);
                
                const aspectRatioDiff = Math.abs(componentAspectRatio - (template.aspectRatio || 1));
                const maxAspectDiff = 3.0;
                spatialFilterScore *= Math.max(0.3, 1 - aspectRatioDiff / maxAspectDiff);
            }
            
            if (spatialFilterScore < 0.5) {
                results.push({
                    template: template,
                    score: 0.1,
                    name: template.name,
                    category: template.category,
                    description: template.description,
                    filtered: true,
                    filterScore: spatialFilterScore
                });
                continue;
            }
            
            const featureScore = this.calculateMatchScore(inputFeatures, template.features);
            const finalScore = featureScore * spatialFilterScore;
            
            results.push({
                template: template,
                score: finalScore,
                name: template.name,
                category: template.category,
                description: template.description,
                featureScores: this.calculateIndividualScores(inputFeatures, template.features),
                spatialFilterScore: spatialFilterScore,
                baseScore: featureScore
            });
        }
        
        results.sort((a, b) => b.score - a.score);
        
        const bestMatch = results[0];
        const secondBest = results[1];
        
        let matched = false;
        if (bestMatch && bestMatch.score >= this.options.matchThreshold) {
            if (secondBest) {
                const margin = bestMatch.score - secondBest.score;
                if (margin < 0.1 && bestMatch.score < 0.8) {
                    matched = false;
                } else {
                    matched = true;
                }
            } else {
                matched = true;
            }
        }
        
        return {
            matched: matched,
            bestMatch: bestMatch || null,
            allMatches: results.slice(0, 5),
            inputFeatures: inputFeatures,
            needsReview: bestMatch && bestMatch.score >= 0.5 && bestMatch.score < this.options.matchThreshold
        };
    }

    extractAllFeatures(image) {
        const binary = this.toBinary(image);
        const normalized = this.normalizeBinary(binary, this.options.templateSize);
        
        const contours = this.extractContours(normalized, this.options.templateSize);
        const huMoments = this.calculateHuMoments(normalized, this.options.templateSize);
        const shapeContext = this.calculateShapeContext(contours);
        const chainCode = this.calculateChainCode(contours);
        const contourFeatures = this.calculateContourFeatures(contours);
        
        return {
            binary: normalized,
            contours: contours,
            huMoments: huMoments,
            shapeContext: shapeContext,
            chainCode: chainCode,
            contourFeatures: contourFeatures
        };
    }

    calculateIndividualScores(features1, features2) {
        const huScore = this.compareHuMoments(features1.huMoments, features2.huMoments);
        const contourScore = this.compareContourFeatures(features1.contourFeatures, features2.contourFeatures);
        const shapeContextScore = this.compareShapeContext(features1.shapeContext, features2.shapeContext);
        const chainCodeScore = this.compareChainCode(features1.chainCode, features2.chainCode);
        
        return {
            hu: huScore,
            contour: contourScore,
            shapeContext: shapeContextScore,
            chainCode: chainCodeScore
        };
    }

    calculateMatchScore(features1, features2) {
        const scores = this.calculateIndividualScores(features1, features2);
        
        const combinedScore = 
            scores.hu * this.options.huWeight +
            scores.contour * this.options.contourWeight +
            scores.shapeContext * this.options.shapeContextWeight +
            scores.chainCode * this.options.chainCodeWeight;
        
        return Math.max(0, Math.min(1, combinedScore));
    }

    toBinary(image) {
        const canvas = document.createElement('canvas');
        const size = this.options.templateSize;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        
        ctx.drawImage(image, 0, 0, size, size);
        
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        const binary = new Uint8Array(size * size);
        
        for (let i = 0; i < size * size; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            binary[i] = gray < 150 ? 1 : 0;
        }
        
        return binary;
    }

    normalizeBinary(binary, size) {
        let minX = size, maxX = 0, minY = size, maxY = 0;
        let hasPixel = false;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (binary[y * size + x] === 1) {
                    hasPixel = true;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        if (!hasPixel) return binary;
        
        const bboxWidth = maxX - minX + 1;
        const bboxHeight = maxY - minY + 1;
        
        const normalized = new Uint8Array(size * size);
        const scale = Math.min(size / bboxWidth, size / bboxHeight) * 0.85;
        const newWidth = Math.max(1, Math.floor(bboxWidth * scale));
        const newHeight = Math.max(1, Math.floor(bboxHeight * scale));
        const offsetX = Math.floor((size - newWidth) / 2);
        const offsetY = Math.floor((size - newHeight) / 2);
        
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                const srcX = minX + Math.floor(x / scale);
                const srcY = minY + Math.floor(y / scale);
                if (srcX >= 0 && srcX < size && srcY >= 0 && srcY < size) {
                    normalized[(offsetY + y) * size + (offsetX + x)] = binary[srcY * size + srcX];
                }
            }
        }
        
        return normalized;
    }

    extractContours(binary, size) {
        const contours = [];
        const visited = new Set();
        
        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                if (binary[y * size + x] === 1) {
                    let isContour = false;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (binary[(y + dy) * size + (x + dx)] === 0) {
                                isContour = true;
                                break;
                            }
                        }
                        if (isContour) break;
                    }
                    
                    if (isContour && !visited.has(`${x},${y}`)) {
                        const contour = this.traceContour(binary, size, x, y, visited);
                        if (contour.length > 8) {
                            contours.push(contour);
                        }
                    }
                }
            }
        }
        
        contours.sort((a, b) => b.length - a.length);
        return contours;
    }

    traceContour(binary, size, startX, startY, visited) {
        const contour = [];
        let x = startX;
        let y = startY;
        let dir = 0;
        
        const directions = [
            [1, 0], [1, 1], [0, 1], [-1, 1],
            [-1, 0], [-1, -1], [0, -1], [1, -1]
        ];
        
        const maxSteps = size * size;
        let steps = 0;
        
        while (steps < maxSteps) {
            contour.push({ x, y });
            visited.add(`${x},${y}`);
            
            let found = false;
            for (let i = 0; i < 8; i++) {
                const checkDir = (dir + i + 6) % 8;
                const dx = directions[checkDir][0];
                const dy = directions[checkDir][1];
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                    if (binary[ny * size + nx] === 1) {
                        x = nx;
                        y = ny;
                        dir = checkDir;
                        found = true;
                        break;
                    }
                }
            }
            
            if (!found || (x === startX && y === startY && contour.length > 10)) {
                break;
            }
            
            steps++;
        }
        
        return contour;
    }

    calculateContourFeatures(contours) {
        if (contours.length === 0) {
            return {
                numContours: 0,
                totalLength: 0,
                avgLength: 0,
                maxLength: 0,
                avgCircularity: 0,
                avgAspectRatio: 1,
                avgDensity: 0.5
            };
        }
        
        let totalLength = 0;
        let maxLength = 0;
        let totalCircularity = 0;
        let totalAspectRatio = 0;
        let totalDensity = 0;
        let validCount = 0;
        
        for (const contour of contours) {
            const len = contour.length;
            if (len < 10) continue;
            
            totalLength += len;
            maxLength = Math.max(maxLength, len);
            validCount++;
            
            const bbox = this.getContourBoundingBox(contour);
            const width = bbox.maxX - bbox.minX + 1;
            const height = bbox.maxY - bbox.minY + 1;
            
            const aspectRatio = width > 0 && height > 0 ? 
                Math.max(width, height) / Math.min(width, height) : 1;
            totalAspectRatio += aspectRatio;
            
            const area = this.getContourArea(contour);
            const circularity = len > 0 ? 
                (4 * Math.PI * area) / (len * len) : 0;
            totalCircularity += Math.min(1, circularity);
            
            const bboxArea = width * height;
            const density = bboxArea > 0 ? area / bboxArea : 0;
            totalDensity += density;
        }
        
        if (validCount === 0) {
            return {
                numContours: contours.length,
                totalLength: totalLength,
                avgLength: 0,
                maxLength: maxLength,
                avgCircularity: 0,
                avgAspectRatio: 1,
                avgDensity: 0.5
            };
        }
        
        return {
            numContours: contours.length,
            totalLength: totalLength,
            avgLength: totalLength / validCount,
            maxLength: maxLength,
            avgCircularity: totalCircularity / validCount,
            avgAspectRatio: totalAspectRatio / validCount,
            avgDensity: totalDensity / validCount
        };
    }

    getContourBoundingBox(contour) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const p of contour) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }
        
        return { minX, maxX, minY, maxY };
    }

    getContourArea(contour) {
        if (contour.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < contour.length; i++) {
            const j = (i + 1) % contour.length;
            area += contour[i].x * contour[j].y;
            area -= contour[j].x * contour[i].y;
        }
        
        return Math.abs(area) / 2;
    }

    compareContourFeatures(f1, f2) {
        if (f1.numContours === 0 || f2.numContours === 0) {
            return f1.numContours === f2.numContours ? 0.5 : 0.2;
        }
        
        let score = 0;
        let weights = 0;
        
        const maxLen = Math.max(f1.maxLength, f2.maxLength, 1);
        const lengthScore = 1 - Math.abs(f1.maxLength - f2.maxLength) / maxLen;
        score += lengthScore * 0.3;
        weights += 0.3;
        
        const circularityScore = 1 - Math.abs(f1.avgCircularity - f2.avgCircularity);
        score += circularityScore * 0.25;
        weights += 0.25;
        
        const maxAR = Math.max(f1.avgAspectRatio, f2.avgAspectRatio, 1);
        const aspectRatioScore = 1 - Math.abs(f1.avgAspectRatio - f2.avgAspectRatio) / maxAR;
        score += aspectRatioScore * 0.25;
        weights += 0.25;
        
        const densityScore = 1 - Math.abs(f1.avgDensity - f2.avgDensity);
        score += densityScore * 0.2;
        weights += 0.2;
        
        return Math.max(0, Math.min(1, score / weights));
    }

    calculateShapeContext(contours) {
        if (contours.length === 0) {
            return { histogram: new Float32Array(0), numPoints: 0 };
        }
        
        const allPoints = [];
        for (const contour of contours) {
            const step = Math.max(1, Math.floor(contour.length / 30));
            for (let i = 0; i < contour.length; i += step) {
                allPoints.push(contour[i]);
            }
        }
        
        if (allPoints.length < 3) {
            return { histogram: new Float32Array(0), numPoints: 0 };
        }
        
        const numAngularBins = this.options.numAngularBins;
        const numRadialBins = this.options.numRadialBins;
        const totalBins = numAngularBins * numRadialBins;
        const histogram = new Float32Array(totalBins);
        
        let maxDist = 0;
        for (let i = 0; i < allPoints.length; i++) {
            for (let j = 0; j < allPoints.length; j++) {
                if (i === j) continue;
                const dx = allPoints[j].x - allPoints[i].x;
                const dy = allPoints[j].y - allPoints[i].y;
                maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dy * dy));
            }
        }
        
        if (maxDist === 0) maxDist = 1;
        
        const sampleCount = Math.min(allPoints.length, 50);
        const step = Math.floor(allPoints.length / sampleCount) || 1;
        
        for (let i = 0; i < allPoints.length; i += step) {
            const p1 = allPoints[i];
            
            for (let j = 0; j < allPoints.length; j += step) {
                if (i === j) continue;
                
                const dx = allPoints[j].x - p1.x;
                const dy = allPoints[j].y - p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                
                const radialBin = Math.min(numRadialBins - 1, 
                    Math.floor((dist / maxDist) * numRadialBins));
                let angularBin = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * numAngularBins);
                angularBin = angularBin % numAngularBins;
                if (angularBin < 0) angularBin += numAngularBins;
                
                const binIndex = radialBin * numAngularBins + angularBin;
                histogram[binIndex]++;
            }
        }
        
        const total = histogram.reduce((a, b) => a + b, 0);
        if (total > 0) {
            for (let i = 0; i < histogram.length; i++) {
                histogram[i] /= total;
            }
        }
        
        return { histogram, numPoints: allPoints.length };
    }

    compareShapeContext(sc1, sc2) {
        if (sc1.histogram.length === 0 || sc2.histogram.length === 0) {
            return 0.3;
        }
        
        if (sc1.histogram.length !== sc2.histogram.length) {
            return 0.3;
        }
        
        let chiSquare = 0;
        for (let i = 0; i < sc1.histogram.length; i++) {
            const p = sc1.histogram[i];
            const q = sc2.histogram[i];
            const sum = p + q;
            if (sum > 0) {
                chiSquare += (p - q) * (p - q) / sum;
            }
        }
        
        chiSquare *= 0.5;
        const similarity = Math.exp(-chiSquare * 3);
        
        return Math.max(0.1, Math.min(1, similarity));
    }

    calculateChainCode(contours) {
        if (contours.length === 0) {
            return { histogram: new Float32Array(8), totalLength: 0 };
        }
        
        const directions = [
            [1, 0], [1, 1], [0, 1], [-1, 1],
            [-1, 0], [-1, -1], [0, -1], [1, -1]
        ];
        
        const histogram = new Float32Array(8);
        let totalCodeLength = 0;
        
        for (const contour of contours) {
            if (contour.length < 3) continue;
            
            for (let i = 0; i < contour.length - 1; i++) {
                const dx = contour[i + 1].x - contour[i].x;
                const dy = contour[i + 1].y - contour[i].y;
                
                let bestDir = 0;
                let bestDist = Infinity;
                
                for (let j = 0; j < 8; j++) {
                    const d = (directions[j][0] - dx) * (directions[j][0] - dx) + 
                              (directions[j][1] - dy) * (directions[j][1] - dy);
                    if (d < bestDist) {
                        bestDist = d;
                        bestDir = j;
                    }
                }
                
                histogram[bestDir]++;
                totalCodeLength++;
            }
        }
        
        if (totalCodeLength > 0) {
            for (let i = 0; i < 8; i++) {
                histogram[i] /= totalCodeLength;
            }
        }
        
        return { histogram, totalLength: totalCodeLength };
    }

    compareChainCode(cc1, cc2) {
        if (cc1.totalLength === 0 || cc2.totalLength === 0) {
            return 0.3;
        }
        
        let similarity = 0;
        
        for (let rotation = 0; rotation < 8; rotation++) {
            let dist = 0;
            for (let i = 0; i < 8; i++) {
                const idx = (i + rotation) % 8;
                dist += Math.abs(cc1.histogram[i] - cc2.histogram[idx]);
            }
            const sim = 1 - dist / 2;
            similarity = Math.max(similarity, sim);
        }
        
        return Math.max(0.1, Math.min(1, similarity));
    }

    calculateHuMoments(binary, size) {
        let m00 = 0, m10 = 0, m01 = 0;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const val = binary[y * size + x];
                m00 += val;
                m10 += x * val;
                m01 += y * val;
            }
        }
        
        if (m00 === 0) {
            return [0, 0, 0, 0, 0, 0, 0];
        }
        
        const xBar = m10 / m00;
        const yBar = m01 / m00;
        
        let mu20 = 0, mu02 = 0, mu11 = 0;
        let mu30 = 0, mu03 = 0, mu21 = 0, mu12 = 0;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const val = binary[y * size + x];
                const dx = x - xBar;
                const dy = y - yBar;
                
                mu20 += dx * dx * val;
                mu02 += dy * dy * val;
                mu11 += dx * dy * val;
                mu30 += dx * dx * dx * val;
                mu03 += dy * dy * dy * val;
                mu21 += dx * dx * dy * val;
                mu12 += dx * dy * dy * val;
            }
        }
        
        const m00Sq = m00 * m00;
        const nu20 = mu20 / m00Sq;
        const nu02 = mu02 / m00Sq;
        const nu11 = mu11 / m00Sq;
        
        const m00To2_5 = Math.pow(m00, 2.5);
        const nu30 = mu30 / m00To2_5;
        const nu03 = mu03 / m00To2_5;
        const nu21 = mu21 / m00To2_5;
        const nu12 = mu12 / m00To2_5;
        
        const hu = [];
        hu[0] = nu20 + nu02;
        hu[1] = (nu20 - nu02) * (nu20 - nu02) + 4 * nu11 * nu11;
        hu[2] = (nu30 - 3 * nu12) * (nu30 - 3 * nu12) + (3 * nu21 - nu03) * (3 * nu21 - nu03);
        hu[3] = (nu30 + nu12) * (nu30 + nu12) + (nu21 + nu03) * (nu21 + nu03);
        hu[4] = (nu30 - 3 * nu12) * (nu30 + nu12) * 
                ((nu30 + nu12) * (nu30 + nu12) - 3 * (nu21 + nu03) * (nu21 + nu03)) +
                (3 * nu21 - nu03) * (nu21 + nu03) *
                (3 * (nu30 + nu12) * (nu30 + nu12) - (nu21 + nu03) * (nu21 + nu03));
        hu[5] = (nu20 - nu02) * ((nu30 + nu12) * (nu30 + nu12) - (nu21 + nu03) * (nu21 + nu03)) +
                4 * nu11 * (nu30 + nu12) * (nu21 + nu03);
        hu[6] = (3 * nu21 - nu03) * (nu30 + nu12) *
                ((nu30 + nu12) * (nu30 + nu12) - 3 * (nu21 + nu03) * (nu21 + nu03)) -
                (nu30 - 3 * nu12) * (nu21 + nu03) *
                (3 * (nu30 + nu12) * (nu30 + nu12) - (nu21 + nu03) * (nu21 + nu03));
        
        return hu;
    }

    compareHuMoments(hu1, hu2) {
        let distance = 0;
        let activeMoments = 0;
        
        for (let i = 0; i < 7; i++) {
            if (Math.abs(hu1[i]) < 1e-10 && Math.abs(hu2[i]) < 1e-10) {
                continue;
            }
            
            activeMoments++;
            
            const sign1 = hu1[i] >= 0 ? 1 : -1;
            const sign2 = hu2[i] >= 0 ? 1 : -1;
            
            const log1 = sign1 * Math.log(Math.abs(hu1[i]) + 1e-10);
            const log2 = sign2 * Math.log(Math.abs(hu2[i]) + 1e-10);
            
            const momentDiff = Math.abs(log1 - log2);
            const weight = i < 2 ? 1.5 : 1;
            distance += momentDiff * weight;
        }
        
        if (activeMoments === 0) {
            return 0.5;
        }
        
        const avgDistance = distance / activeMoments;
        const similarity = Math.exp(-avgDistance * 0.3);
        
        return Math.max(0.1, Math.min(1, similarity));
    }

    setMatchThreshold(threshold) {
        this.options.matchThreshold = threshold;
    }

    getTemplates() {
        return this.templates;
    }

    getTemplateFeatures() {
        return this.templateFeatures;
    }
}

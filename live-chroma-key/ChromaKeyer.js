class ChromaKeyer {
    constructor() {
        this.backgroundColors = [{ r: 0, g: 255, b: 0 }];
        this.colorRanges = [];
        this.bgLABCache = [];
        this.bgHSVCache = [];
        this.tolerance = 0.25;
        this.softness = 0.15;
        this.saturationThreshold = 0.3;
        this.edgeProtection = 0.6;
        this.morphologyIterations = 1;
        this.spatialConsistency = 0.3;
        this.skinProtection = 0.7;
        this.humanProtection = 0.5;
        this.downsampleFactor = 1;
        this.frameCount = 0;
        this._updateCache();
    }

    _updateCache() {
        this.bgLABCache = this.backgroundColors.map(c => this.rgbToLab(c.r, c.g, c.b));
        this.bgHSVCache = this.backgroundColors.map(c => this.toHSV(c.r, c.g, c.b));
    }

    setTargetColor(r, g, b) {
        this.backgroundColors = [{ r, g, b }];
        this.colorRanges = [];
        this._updateCache();
    }

    addBackgroundColor(r, g, b) {
        const exists = this.backgroundColors.some(c => 
            Math.abs(c.r - r) < 10 && Math.abs(c.g - g) < 10 && Math.abs(c.b - b) < 10
        );
        if (!exists && this.backgroundColors.length < 10) {
            this.backgroundColors.push({ r, g, b });
            this._updateCache();
        }
    }

    clearBackgroundColors() {
        this.backgroundColors = [];
        this.colorRanges = [];
        this._updateCache();
    }

    removeBackgroundColor(index) {
        if (index >= 0 && index < this.backgroundColors.length) {
            this.backgroundColors.splice(index, 1);
            this._updateCache();
        }
    }

    addColorRangeFromSample(imageData, x, y, width, height) {
        const data = imageData.data;
        const imgWidth = imageData.width;
        
        let minLAB = { l: 100, a: 127, b: 127 };
        let maxLAB = { l: 0, a: -128, b: -128 };
        let minHSV = { h: 1, s: 1, v: 1 };
        let maxHSV = { h: 0, s: 0, v: 0 };
        let count = 0;
        
        const step = Math.max(1, Math.floor(Math.min(width, height) / 30));
        
        for (let py = Math.max(0, y); py < Math.min(imgWidth, y + height); py += step) {
            for (let px = Math.max(0, x); px < Math.min(imgWidth, x + width); px += step) {
                const idx = (py * imgWidth + px) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                const lab = this.rgbToLab(r, g, b);
                const hsv = this.toHSV(r, g, b);
                
                minLAB.l = Math.min(minLAB.l, lab.l);
                minLAB.a = Math.min(minLAB.a, lab.a);
                minLAB.b = Math.min(minLAB.b, lab.b);
                maxLAB.l = Math.max(maxLAB.l, lab.l);
                maxLAB.a = Math.max(maxLAB.a, lab.a);
                maxLAB.b = Math.max(maxLAB.b, lab.b);
                
                minHSV.h = Math.min(minHSV.h, hsv.h);
                minHSV.s = Math.min(minHSV.s, hsv.s);
                minHSV.v = Math.min(minHSV.v, hsv.v);
                maxHSV.h = Math.max(maxHSV.h, hsv.h);
                maxHSV.s = Math.max(maxHSV.s, hsv.s);
                maxHSV.v = Math.max(maxHSV.v, hsv.v);
                
                count++;
            }
        }
        
        if (count > 0) {
            const padding = 0.08;
            const labRange = {
                minL: minLAB.l - (maxLAB.l - minLAB.l) * padding,
                maxL: maxLAB.l + (maxLAB.l - minLAB.l) * padding,
                minA: minLAB.a - (maxLAB.a - minLAB.a) * padding,
                maxA: maxLAB.a + (maxLAB.a - minLAB.a) * padding,
                minB: minLAB.b - (maxLAB.b - minLAB.b) * padding,
                maxB: maxLAB.b + (maxLAB.b - minLAB.b) * padding
            };
            
            const hsvRange = {
                minH: minHSV.h,
                maxH: maxHSV.h,
                minS: Math.max(0, minHSV.s - 0.15),
                maxS: Math.min(1, maxHSV.s + 0.15),
                minV: Math.max(0, minHSV.v - 0.15),
                maxV: Math.min(1, maxHSV.v + 0.15)
            };
            
            this.colorRanges.push({ lab: labRange, hsv: hsvRange });
        }
    }

    clearColorRanges() {
        this.colorRanges = [];
    }

    setTolerance(value) {
        this.tolerance = Math.max(0, Math.min(1, value));
    }

    setSoftness(value) {
        this.softness = Math.max(0, Math.min(1, value));
    }

    setSaturationThreshold(value) {
        this.saturationThreshold = Math.max(0, Math.min(1, value));
    }

    setEdgeProtection(value) {
        this.edgeProtection = Math.max(0, Math.min(1, value));
    }

    setMorphologyIterations(value) {
        this.morphologyIterations = Math.max(0, Math.min(3, Math.round(value)));
    }

    setSpatialConsistency(value) {
        this.spatialConsistency = Math.max(0, Math.min(1, value));
    }

    setSkinProtection(value) {
        this.skinProtection = Math.max(0, Math.min(1, value));
    }

    setHumanProtection(value) {
        this.humanProtection = Math.max(0, Math.min(1, value));
    }

    setDownsampleFactor(value) {
        this.downsampleFactor = Math.max(1, Math.min(4, Math.round(value)));
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
            l: 116 * y - 16,
            a: 500 * (x - y),
            b: 200 * (y - z)
        };
    }

    labDistanceFast(lab1, lab2) {
        const dl = lab1.l - lab2.l;
        const da = lab1.a - lab2.a;
        const db = lab1.b - lab2.b;
        return Math.abs(dl) * 0.4 + Math.abs(da) + Math.abs(db);
    }

    toHSV(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;
        
        if (max !== min) {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h, s, v };
    }

    isSkinColorFast(r, g, b) {
        if (r < 95 || g < 40 || b < 20) return false;
        if (r <= g) return false;
        if (r <= b) return false;
        if (g <= b) return false;
        if (Math.abs(r - g) < 20) return false;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        const s = max === 0 ? 0 : d / max;
        const v = max / 255;
        const h = this._quickHue(r, g, b, max, min, d);
        
        if (h < 0.02 || h > 0.15) return false;
        if (s < 0.2 || s > 0.8) return false;
        if (v < 0.3 || v > 0.95) return false;
        
        if (r - g < 12) return false;
        if (r - b < 10) return false;
        
        return true;
    }

    _quickHue(r, g, b, max, min, d) {
        let h = 0;
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        return h / 6;
    }

    isInColorRange(lab, hsv, range) {
        if (lab.l < range.lab.minL || lab.l > range.lab.maxL) return false;
        if (lab.a < range.lab.minA || lab.a > range.lab.maxA) return false;
        if (lab.b < range.lab.minB || lab.b > range.lab.maxB) return false;
        
        let hIn;
        if (range.hsv.minH <= range.hsv.maxH) {
            hIn = hsv.h >= range.hsv.minH && hsv.h <= range.hsv.maxH;
        } else {
            hIn = hsv.h >= range.hsv.minH || hsv.h <= range.hsv.maxH;
        }
        if (!hIn) return false;
        
        if (hsv.s < range.hsv.minS || hsv.s > range.hsv.maxS) return false;
        if (hsv.v < range.hsv.minV || hsv.v > range.hsv.maxV) return false;
        
        return true;
    }

    fastSobel(data, width, height) {
        const edges = new Uint8Array(width * height);
        const step = 2;
        
        for (let y = step; y < height - step; y += step) {
            for (let x = step; x < width - step; x += step) {
                let sumX = 0, sumY = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        const gx = (kx === -1 ? -1 : kx === 1 ? 1 : 0) * (ky === 0 ? 2 : 1);
                        const gy = (ky === -1 ? -1 : ky === 1 ? 1 : 0) * (kx === 0 ? 2 : 1);
                        sumX += gray * gx;
                        sumY += gray * gy;
                    }
                }
                
                const mag = Math.min(255, Math.abs(sumX) + Math.abs(sumY));
                for (let dy = 0; dy < step; dy++) {
                    for (let dx = 0; dx < step; dx++) {
                        edges[(y + dy) * width + (x + dx)] = mag > 60 ? 1 : 0;
                    }
                }
            }
        }
        return edges;
    }

    erodeFast(alphaMap, width, height) {
        const result = new Float32Array(alphaMap);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                let minVal = 1;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        minVal = Math.min(minVal, alphaMap[(y + ky) * width + (x + kx)]);
                    }
                }
                result[idx] = minVal;
            }
        }
        return result;
    }

    dilateFast(alphaMap, width, height) {
        const result = new Float32Array(alphaMap);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                let maxVal = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        maxVal = Math.max(maxVal, alphaMap[(y + ky) * width + (x + kx)]);
                    }
                }
                result[idx] = maxVal;
            }
        }
        return result;
    }

    _getMinBackgroundDistanceFast(lab, hsv, r, g, b) {
        let minDist = Infinity;
        
        if (this.bgLABCache.length > 0) {
            for (let i = 0; i < this.bgLABCache.length; i++) {
                const bgLAB = this.bgLABCache[i];
                const bgHSV = this.bgHSVCache[i];
                
                let hDistance = Math.abs(hsv.h - bgHSV.h);
                if (hDistance > 0.5) hDistance = 1 - hDistance;
                
                const labDist = this.labDistanceFast(lab, bgLAB) / 150;
                const combinedDist = labDist * 0.7 + hDistance * 0.3;
                
                minDist = Math.min(minDist, combinedDist);
            }
        }
        
        if (this.colorRanges.length > 0) {
            for (const range of this.colorRanges) {
                if (this.isInColorRange(lab, hsv, range)) {
                    return 0;
                }
            }
        }
        
        return minDist;
    }

    process(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const tolerance = this.tolerance;
        const softness = this.softness;
        const satThreshold = this.saturationThreshold;
        const edgeProtect = this.edgeProtection;
        const morphIter = this.morphologyIterations;
        const spatialStrength = this.spatialConsistency;
        const skinProtect = this.skinProtection;
        const humanProtect = this.humanProtection;
        
        const hasBg = this.bgLABCache.length > 0 || this.colorRanges.length > 0;
        if (!hasBg) {
            for (let i = 3; i < data.length; i += 4) {
                data[i] = 255;
            }
            return imageData;
        }
        
        this.frameCount++;
        const doEdge = this.frameCount % 3 === 0 || edgeProtect < 0.3;
        let edges = null;
        if (doEdge && edgeProtect > 0.1) {
            edges = this.fastSobel(data, width, height);
        }
        
        const alphaMap = new Float32Array(width * height);
        const softTolerance = tolerance * (1 - softness);
        const maxTolerance = tolerance;
        
        for (let i = 0, y = 0; y < height; y++) {
            for (let x = 0; x < width; x++, i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                const lab = this.rgbToLab(r, g, b);
                const hsv = this.toHSV(r, g, b);
                
                let distance = this._getMinBackgroundDistanceFast(lab, hsv, r, g, b);
                
                if (hsv.s < satThreshold) {
                    distance *= 0.5;
                }
                
                if (edges && edgeProtect > 0.1) {
                    const edgeValue = edges[y * width + x];
                    if (edgeValue > 0) {
                        distance *= (1 + edgeProtect);
                    }
                }
                
                let alpha = 1;
                if (distance <= softTolerance) {
                    alpha = 0;
                } else if (distance < maxTolerance) {
                    alpha = (distance - softTolerance) / (maxTolerance - softTolerance);
                }
                
                if (skinProtect > 0.1 && alpha > 0.5 && this.isSkinColorFast(r, g, b)) {
                    alpha = Math.max(alpha, 0.85 * skinProtect);
                }
                
                alphaMap[y * width + x] = alpha;
            }
        }
        
        let processedAlpha = alphaMap;
        
        if (morphIter > 0) {
            for (let iter = 0; iter < morphIter; iter++) {
                processedAlpha = this.dilateFast(processedAlpha, width, height);
            }
            for (let iter = 0; iter < morphIter; iter++) {
                processedAlpha = this.erodeFast(processedAlpha, width, height);
            }
        }
        
        if (spatialStrength > 0.1 && this.frameCount % 2 === 0) {
            const temp = new Float32Array(processedAlpha);
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            sum += temp[(y + ky) * width + (x + kx)];
                        }
                    }
                    const avg = sum / 9;
                    processedAlpha[idx] = temp[idx] * (1 - spatialStrength) + avg * spatialStrength;
                }
            }
        }
        
        for (let i = 0; i < alphaMap.length; i++) {
            data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, processedAlpha[i])) * 255);
        }
        
        return imageData;
    }
}

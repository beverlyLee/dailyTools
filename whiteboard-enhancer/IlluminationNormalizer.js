export class IlluminationNormalizer {
    constructor(strength = 70) {
        this.strength = strength / 100;
    }

    setStrength(strength) {
        this.strength = strength / 100;
    }

    preNormalize(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        const outputData = new Uint8ClampedArray(data.length);
        const illuminationMap = this.estimateIllumination(data, width, height);

        const { globalMin, globalMax } = this.analyzeBrightnessRange(illuminationMap);
        const targetBrightness = (globalMin + globalMax) / 2;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const illumIdx = y * width + x;

                const localIllumination = illuminationMap[illumIdx];
                const localCorrection = targetBrightness / Math.max(localIllumination, 1);
                const correctionFactor = localCorrection * this.strength * 0.5 + (1 - this.strength * 0.5);

                let r = data[idx];
                let g = data[idx + 1];
                let b = data[idx + 2];

                r = this.clamp(r * correctionFactor);
                g = this.clamp(g * correctionFactor);
                b = this.clamp(b * correctionFactor);

                outputData[idx] = r;
                outputData[idx + 1] = g;
                outputData[idx + 2] = b;
                outputData[idx + 3] = data[idx + 3];
            }
        }

        return {
            imageData: new ImageData(outputData, width, height),
            illuminationMap: illuminationMap
        };
    }

    normalize(imageData, segmentResult = null) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        const outputData = new Uint8ClampedArray(data.length);

        const illuminationMap = this.estimateIllumination(data, width, height);

        const targetBrightness = this.calculateTargetBrightness(illuminationMap);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const illumIdx = y * width + x;

                const localIllumination = illuminationMap[illumIdx];
                const correctionFactor = (targetBrightness / localIllumination) * this.strength * 0.4 + (1 - this.strength * 0.4);

                let r = data[idx];
                let g = data[idx + 1];
                let b = data[idx + 2];

                if (segmentResult) {
                    const isForeground = segmentResult.mask[illumIdx] === 1;
                    if (isForeground) {
                        const saturation = this.getSaturation([r, g, b]);
                        const brightness = this.getBrightness([r, g, b]);
                        
                        if (saturation > 40) {
                            const hsv = this.rgbToHsv(r, g, b);
                            let { h, s, v } = hsv;
                            
                            if (v < 0.4) {
                                v = Math.min(0.5, v * (1 + this.strength * 0.3));
                            } else if (v > 0.85) {
                                v = Math.max(0.75, v * (1 - this.strength * 0.1));
                            }
                            
                            s = Math.min(1.0, s * (1 + this.strength * 0.2));
                            
                            const rgb = this.hsvToRgb(h, s, v);
                            r = rgb.r;
                            g = rgb.g;
                            b = rgb.b;
                        } else {
                            if (brightness < 80) {
                                const brightenFactor = 1 + (80 - brightness) / 150 * this.strength;
                                r = this.clamp(r * brightenFactor);
                                g = this.clamp(g * brightenFactor);
                                b = this.clamp(b * brightenFactor);
                            } else if (brightness > 200) {
                                const darkenFactor = 1 - (brightness - 200) / 100 * this.strength * 0.3;
                                r = this.clamp(r * darkenFactor);
                                g = this.clamp(g * darkenFactor);
                                b = this.clamp(b * darkenFactor);
                            }
                        }
                    } else {
                        const targetR = 253;
                        const targetG = 253;
                        const targetB = 253;
                        
                        const currentBrightness = this.getBrightness([r, g, b]);
                        let bgStrength = this.strength;
                        
                        if (currentBrightness < 120) {
                            bgStrength = Math.min(1.0, this.strength * 1.4);
                        } else if (currentBrightness > 220) {
                            bgStrength = this.strength * 0.6;
                        }
                        
                        r = this.clamp(r * (1 - bgStrength) + targetR * bgStrength);
                        g = this.clamp(g * (1 - bgStrength) + targetG * bgStrength);
                        b = this.clamp(b * (1 - bgStrength) + targetB * bgStrength);
                    }
                } else {
                    r = this.clamp(r * correctionFactor);
                    g = this.clamp(g * correctionFactor);
                    b = this.clamp(b * correctionFactor);
                }

                outputData[idx] = r;
                outputData[idx + 1] = g;
                outputData[idx + 2] = b;
                outputData[idx + 3] = data[idx + 3];
            }
        }

        return {
            imageData: new ImageData(outputData, width, height),
            illuminationMap: illuminationMap
        };
    }

    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;

        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;

        if (d !== 0) {
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return { h, s, v };
    }

    hsvToRgb(h, s, v) {
        let r, g, b;

        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    getBrightness(pixel) {
        return pixel[0] * 0.299 + pixel[1] * 0.587 + pixel[2] * 0.114;
    }

    getSaturation(pixel) {
        const max = Math.max(pixel[0], pixel[1], pixel[2]);
        const min = Math.min(pixel[0], pixel[1], pixel[2]);
        return max - min;
    }

    analyzeBrightnessRange(illuminationMap) {
        let min = Infinity;
        let max = -Infinity;
        
        for (let i = 0; i < illuminationMap.length; i++) {
            if (illuminationMap[i] < min) min = illuminationMap[i];
            if (illuminationMap[i] > max) max = illuminationMap[i];
        }
        
        return { globalMin: min, globalMax: max };
    }

    estimateIllumination(data, width, height) {
        const illumination = new Float32Array(width * height);

        const intensityMap = new Float32Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                intensityMap[y * width + x] = r * 0.299 + g * 0.587 + b * 0.114;
            }
        }

        const blurRadius = Math.max(3, Math.floor(Math.min(width, height) / 30));
        
        const temp = new Float32Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                    const nx = x + dx;
                    if (nx >= 0 && nx < width) {
                        sum += intensityMap[y * width + nx];
                        count++;
                    }
                }
                temp[y * width + x] = sum / count;
            }
        }

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let sum = 0;
                let count = 0;
                for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                    const ny = y + dy;
                    if (ny >= 0 && ny < height) {
                        sum += temp[ny * width + x];
                        count++;
                    }
                }
                illumination[y * width + x] = Math.max(sum / count, 1);
            }
        }

        return illumination;
    }

    calculateTargetBrightness(illuminationMap) {
        const sorted = [...illuminationMap].sort((a, b) => a - b);
        const medianIdx = Math.floor(sorted.length / 2);
        const median = sorted[medianIdx];
        
        return Math.max(median, 200);
    }

    clamp(value) {
        return Math.max(0, Math.min(255, Math.round(value)));
    }
}

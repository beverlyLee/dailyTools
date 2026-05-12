export class ColorBoost {
    constructor(strength = 60) {
        this.strength = strength / 100;
        this.contrastBoost = 0.5;
    }

    setStrength(strength) {
        this.strength = strength / 100;
    }

    setContrastBoost(contrast) {
        this.contrastBoost = contrast / 100;
    }

    enhance(imageData, segmentResult = null) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        const outputData = new Uint8ClampedArray(data.length);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                let r = data[idx];
                let g = data[idx + 1];
                let b = data[idx + 2];

                if (segmentResult) {
                    const isForeground = segmentResult.mask[y * width + x] === 1;
                    
                    if (isForeground) {
                        const saturation = this.getSaturation([r, g, b]);
                        const brightness = this.getBrightness([r, g, b]);
                        
                        if (saturation > 30) {
                            const hsv = this.rgbToHsv(r, g, b);
                            let { h, s, v } = hsv;
                            
                            s = Math.min(1.0, s * (1 + this.strength * 0.4));
                            
                            if (v < 0.3) {
                                v = Math.min(0.4, v * (1 + this.strength * 0.5));
                            } else if (v > 0.85) {
                                v = Math.max(0.7, v * (1 - this.strength * 0.2));
                            }
                            
                            const rgb = this.hsvToRgb(h, s, v);
                            r = rgb.r;
                            g = rgb.g;
                            b = rgb.b;
                        } else {
                            if (brightness < 60) {
                                const brighten = 1 + this.strength * 0.3;
                                r = this.clamp(r * brighten);
                                g = this.clamp(g * brighten);
                                b = this.clamp(b * brighten);
                            } else if (brightness < 120) {
                                const darken = 1 - this.strength * 0.35;
                                r = this.clamp(r * darken);
                                g = this.clamp(g * darken);
                                b = this.clamp(b * darken);
                            }
                        }
                        
                        const contrastFactor = 1 + this.contrastBoost * 0.6;
                        r = this.applyContrast(r, contrastFactor);
                        g = this.applyContrast(g, contrastFactor);
                        b = this.applyContrast(b, contrastFactor);
                    } else {
                        r = 255;
                        g = 255;
                        b = 255;
                    }
                } else {
                    const brightness = this.getBrightness([r, g, b]);
                    const saturation = this.getSaturation([r, g, b]);
                    
                    if (saturation > 30) {
                        const hsv = this.rgbToHsv(r, g, b);
                        let { h, s, v } = hsv;
                        
                        s = Math.min(1.0, s * (1 + this.strength * 0.3));
                        
                        const rgb = this.hsvToRgb(h, s, v);
                        r = rgb.r;
                        g = rgb.g;
                        b = rgb.b;
                    } else if (brightness < 120) {
                        const darken = 1 - this.strength * 0.2;
                        r = this.clamp(r * darken);
                        g = this.clamp(g * darken);
                        b = this.clamp(b * darken);
                    }

                    const contrastFactor = 1 + this.contrastBoost * 0.4;
                    r = this.applyContrast(r, contrastFactor);
                    g = this.applyContrast(g, contrastFactor);
                    b = this.applyContrast(b, contrastFactor);
                }

                outputData[idx] = r;
                outputData[idx + 1] = g;
                outputData[idx + 2] = b;
                outputData[idx + 3] = data[idx + 3];
            }
        }

        return {
            imageData: new ImageData(outputData, width, height)
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

    applyContrast(value, factor) {
        const normalized = value / 255;
        const adjusted = (normalized - 0.5) * factor + 0.5;
        return this.clamp(adjusted * 255);
    }

    clamp(value) {
        return Math.max(0, Math.min(255, Math.round(value)));
    }
}

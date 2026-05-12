export class ColorInkEnhancer {
    constructor(options = {}) {
        this.saturationBoost = options.saturationBoost || 1.5;
        this.valueBoost = options.valueBoost || 0.8;
    }

    setSaturationBoost(boost) {
        this.saturationBoost = boost;
    }

    setValueBoost(boost) {
        this.valueBoost = boost;
    }

    apply(imageData) {
        const srcWidth = imageData.width;
        const srcHeight = imageData.height;
        const srcData = imageData.data;
        
        const result = new Uint8ClampedArray(srcData.length);
        
        for (let i = 0; i < srcData.length; i += 4) {
            const r = srcData[i];
            const g = srcData[i + 1];
            const b = srcData[i + 2];
            
            const hsv = this.rgbToHsv(r, g, b);
            const h = hsv[0];
            const s = hsv[1];
            const v = hsv[2];
            
            const isInk = this.isLikelyInk(h, s, v);
            
            if (isInk) {
                const newS = Math.min(1, s * this.saturationBoost);
                const newV = Math.max(0, v * this.valueBoost);
                
                const rgb = this.hsvToRgb(h, newS, newV);
                
                result[i] = rgb[0];
                result[i + 1] = rgb[1];
                result[i + 2] = rgb[2];
            } else {
                const whitenFactor = this.calculateWhitenFactor(r, g, b);
                const newR = Math.round(r + (255 - r) * whitenFactor);
                const newG = Math.round(g + (255 - g) * whitenFactor);
                const newB = Math.round(b + (255 - b) * whitenFactor);
                
                result[i] = newR;
                result[i + 1] = newG;
                result[i + 2] = newB;
            }
            
            result[i + 3] = 255;
        }
        
        return { imageData: { width: srcWidth, height: srcHeight, data: result } };
    }

    isLikelyInk(h, s, v) {
        if (v < 0.15) return true;
        
        if (s > 0.3) {
            if (h >= 0 && h <= 15) return true;
            if (h >= 345 && h <= 360) return true;
            if (h >= 200 && h <= 290) return true;
            if (h >= 30 && h <= 70 && s > 0.5) return true;
        }
        
        return false;
    }

    calculateWhitenFactor(r, g, b) {
        const gray = (r + g + b) / 3;
        const avgDev = Math.abs(r - gray) + Math.abs(g - gray) + Math.abs(b - gray);
        
        if (avgDev < 60 && gray > 150) {
            return Math.min(0.95, (gray - 150) / 100);
        }
        return 0;
    }

    rgbToHsv(r, g, b) {
        r = r / 255;
        g = g / 255;
        b = b / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        
        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;
        
        if (max !== min) {
            if (max === r) {
                h = (g - b) / d + (g < b ? 6 : 0);
            } else if (max === g) {
                h = (b - r) / d + 2;
            } else {
                h = (r - g) / d + 4;
            }
            h = h * 60;
        }
        
        return [h, s, v];
    }

    hsvToRgb(h, s, v) {
        let r = 0;
        let g = 0;
        let b = 0;
        
        const i = Math.floor(h / 60) % 6;
        const f = h / 60 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        
        if (i === 0) {
            r = v; g = t; b = p;
        } else if (i === 1) {
            r = q; g = v; b = p;
        } else if (i === 2) {
            r = p; g = v; b = t;
        } else if (i === 3) {
            r = p; g = q; b = v;
        } else if (i === 4) {
            r = t; g = p; b = v;
        } else if (i === 5) {
            r = v; g = p; b = q;
        }
        
        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        ];
    }
}

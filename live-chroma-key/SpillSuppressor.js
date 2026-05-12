class SpillSuppressor {
    constructor() {
        this.intensity = 0.5;
        this.threshold = 0.3;
    }

    setIntensity(value) {
        this.intensity = Math.max(0, Math.min(1, value));
    }

    setThreshold(value) {
        this.threshold = Math.max(0, Math.min(1, value));
    }

    toHSL(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;
        
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h, s, l };
    }

    process(imageData, targetColor) {
        const data = imageData.data;
        const intensity = this.intensity;
        const threshold = this.threshold;
        const targetHSV = this.toHSL(targetColor.r, targetColor.g, targetColor.b);
        
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3] / 255;
            if (alpha === 0) continue;
            
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            const hsl = this.toHSL(r, g, b);
            
            let hDistance = Math.abs(hsl.h - targetHSV.h);
            if (hDistance > 0.5) hDistance = 1 - hDistance;
            
            const spillAmount = Math.max(0, 1 - (hDistance * 2));
            
            if (spillAmount > threshold && alpha > 0.1 && alpha < 0.95) {
                const effect = spillAmount * intensity * alpha;
                
                const minChannel = Math.min(r, g, b);
                const avgNonGreen = (r + b) / 2;
                const greenReduction = g - avgNonGreen;
                
                if (greenReduction > 0) {
                    const reduction = greenReduction * effect;
                    g = Math.max(0, g - reduction);
                    
                    r = Math.min(255, r + reduction * 0.3);
                    b = Math.min(255, b + reduction * 0.3);
                    
                    data[i] = Math.round(r);
                    data[i + 1] = Math.round(g);
                    data[i + 2] = Math.round(b);
                }
            }
        }
        
        return imageData;
    }
}

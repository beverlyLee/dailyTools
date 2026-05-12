export class DynamicBlur {
    constructor(options = {}) {
        this.options = {
            mode: options.mode || 'pixelate',
            strength: options.strength || 25,
            padding: options.padding || 0.3
        };
        
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
    }

    setMode(mode) {
        this.options.mode = mode;
    }

    setStrength(strength) {
        this.options.strength = Math.max(1, Math.min(100, strength));
    }

    setPadding(padding) {
        this.options.padding = padding;
    }

    apply(ctx, imageSource, faceRegions, canvasWidth, canvasHeight) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(imageSource, 0, 0, canvasWidth, canvasHeight);
        
        if (!faceRegions || faceRegions.length === 0) {
            return;
        }
        
        faceRegions.forEach(region => {
            const expandedRegion = this.expandRegion(region, canvasWidth, canvasHeight);
            
            const absX = expandedRegion.x * canvasWidth;
            const absY = expandedRegion.y * canvasHeight;
            const absWidth = expandedRegion.width * canvasWidth;
            const absHeight = expandedRegion.height * canvasHeight;
            
            if (absWidth > 0 && absHeight > 0 && absX < canvasWidth && absY < canvasHeight) {
                this.applyBlurToRegion(ctx, absX, absY, absWidth, absHeight);
            }
        });
    }

    expandRegion(region, canvasWidth, canvasHeight) {
        const padding = this.options.padding;
        const newWidth = region.width * (1 + padding);
        const newHeight = region.height * (1 + padding);
        
        let newX = region.centerX - newWidth / 2;
        let newY = region.centerY - newHeight / 2;
        
        newX = Math.max(0, Math.min(1 - newWidth, newX));
        newY = Math.max(0, Math.min(1 - newHeight, newY));
        
        return {
            x: newX,
            y: newY,
            width: Math.min(newWidth, 1 - newX),
            height: Math.min(newHeight, 1 - newY),
            centerX: region.centerX,
            centerY: region.centerY
        };
    }

    applyBlurToRegion(ctx, x, y, width, height) {
        const mode = this.options.mode;
        const strength = this.options.strength;
        
        switch (mode) {
            case 'pixelate':
                this.applyPixelate(ctx, x, y, width, height, strength);
                break;
            case 'gaussian':
                this.applyGaussian(ctx, x, y, width, height, strength);
                break;
            case 'black':
                this.applyBlackMask(ctx, x, y, width, height);
                break;
            default:
                this.applyPixelate(ctx, x, y, width, height, strength);
        }
    }

    applyPixelate(ctx, x, y, width, height, strength) {
        const pixelSize = Math.max(2, Math.floor(strength / 2));
        
        if (width < pixelSize || height < pixelSize) {
            ctx.fillStyle = '#000';
            ctx.fillRect(x, y, width, height);
            return;
        }
        
        try {
            const imageData = ctx.getImageData(x, y, width, height);
            const data = imageData.data;
            
            const smallWidth = Math.ceil(width / pixelSize);
            const smallHeight = Math.ceil(height / pixelSize);
            
            for (let sy = 0; sy < smallHeight; sy++) {
                for (let sx = 0; sx < smallWidth; sx++) {
                    let r = 0, g = 0, b = 0, count = 0;
                    
                    const startX = sx * pixelSize;
                    const startY = sy * pixelSize;
                    const endX = Math.min(startX + pixelSize, width);
                    const endY = Math.min(startY + pixelSize, height);
                    
                    for (let py = startY; py < endY; py++) {
                        for (let px = startX; px < endX; px++) {
                            const idx = (py * width + px) * 4;
                            r += data[idx];
                            g += data[idx + 1];
                            b += data[idx + 2];
                            count++;
                        }
                    }
                    
                    r = Math.round(r / count);
                    g = Math.round(g / count);
                    b = Math.round(b / count);
                    
                    for (let py = startY; py < endY; py++) {
                        for (let px = startX; px < endX; px++) {
                            const idx = (py * width + px) * 4;
                            data[idx] = r;
                            data[idx + 1] = g;
                            data[idx + 2] = b;
                        }
                    }
                }
            }
            
            ctx.putImageData(imageData, x, y);
        } catch (e) {
            console.warn('像素化处理失败，使用黑色遮罩替代:', e);
            ctx.fillStyle = '#000';
            ctx.fillRect(x, y, width, height);
        }
    }

    applyGaussian(ctx, x, y, width, height, strength) {
        const blurRadius = Math.min(strength / 5, 20);
        
        try {
            ctx.save();
            ctx.filter = `blur(${blurRadius}px)`;
            ctx.drawImage(
                ctx.canvas,
                x, y, width, height,
                x, y, width, height
            );
            ctx.restore();
        } catch (e) {
            console.warn('高斯模糊处理失败，使用像素化替代:', e);
            this.applyPixelate(ctx, x, y, width, height, strength * 2);
        }
    }

    applyBlackMask(ctx, x, y, width, height) {
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, width, height);
    }
}

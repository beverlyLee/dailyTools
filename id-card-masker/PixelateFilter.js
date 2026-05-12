export class PixelateFilter {
    constructor(options = {}) {
        this.pixelSize = options.pixelSize || 20;
        this.blurRadius = options.blurRadius || 20;
    }

    apply(sourceCanvas, regions, options = {}) {
        const mode = options.mode || 'pixelate';
        const strength = options.strength || 20;
        
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = sourceCanvas.width;
        resultCanvas.height = sourceCanvas.height;
        
        const ctx = resultCanvas.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0);

        const maskedRegions = regions.filter(r => r.masked);

        switch (mode) {
            case 'pixelate':
                this.applyPixelate(ctx, maskedRegions, strength);
                break;
            case 'blur':
                this.applyGaussianBlur(ctx, maskedRegions, strength);
                break;
            case 'black':
                this.applyBlackBox(ctx, maskedRegions);
                break;
            default:
                this.applyPixelate(ctx, maskedRegions, strength);
        }

        return resultCanvas;
    }

    applyPixelate(ctx, regions, strength) {
        const sourceCanvas = ctx.canvas;
        const sourceCtx = ctx;
        
        regions.forEach(region => {
            const pixelSize = Math.max(5, Math.min(60, strength));
            const regionData = this.getRegionImageData(sourceCtx, region);
            
            if (!regionData) return;

            const { imageData, sx, sy, sw, sh } = regionData;
            const data = imageData.data;

            const pixelatedCanvas = document.createElement('canvas');
            pixelatedCanvas.width = sw;
            pixelatedCanvas.height = sh;
            const pCtx = pixelatedCanvas.getContext('2d');

            const cols = Math.ceil(sw / pixelSize);
            const rows = Math.ceil(sh / pixelSize);

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const startX = col * pixelSize;
                    const startY = row * pixelSize;
                    const w = Math.min(pixelSize, sw - startX);
                    const h = Math.min(pixelSize, sh - startY);

                    const avgColor = this.getAverageColor(data, sw, sh, startX, startY, w, h);

                    pCtx.fillStyle = `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`;
                    pCtx.fillRect(startX, startY, w, h);
                }
            }

            sourceCtx.drawImage(pixelatedCanvas, sx, sy);
        });
    }

    getAverageColor(data, width, height, startX, startY, w, h) {
        let r = 0, g = 0, b = 0, count = 0;

        for (let y = startY; y < startY + h; y++) {
            for (let x = startX; x < startX + w; x++) {
                if (x >= width || y >= height) continue;
                
                const idx = (y * width + x) * 4;
                r += data[idx];
                g += data[idx + 1];
                b += data[idx + 2];
                count++;
            }
        }

        return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count)
        };
    }

    applyGaussianBlur(ctx, regions, strength) {
        const canvas = ctx.canvas;
        const effectiveRadius = Math.max(5, Math.min(60, strength));

        regions.forEach(region => {
            const sx = Math.round(Math.max(0, region.x));
            const sy = Math.round(Math.max(0, region.y));
            const sw = Math.round(Math.min(canvas.width - sx, region.width));
            const sh = Math.round(Math.min(canvas.height - sy, region.height));

            if (sw <= 0 || sh <= 0) return;

            try {
                const imageData = ctx.getImageData(sx, sy, sw, sh);

                const blurIterations = this.calculateBlurIterations(effectiveRadius);
                let currentImageData = imageData;

                for (let i = 0; i < blurIterations; i++) {
                    const sigma = effectiveRadius / (blurIterations - i + 1);
                    const radius = Math.ceil(sigma * 3);
                    
                    currentImageData = this.applyBoxBlur(currentImageData, radius);
                }

                currentImageData = this.applyStrongBlur(currentImageData, effectiveRadius);

                ctx.putImageData(currentImageData, sx, sy);
            } catch (e) {
                console.error('高斯模糊应用失败:', e);
                this.applyBlackBox(ctx, [region]);
            }
        });
    }

    calculateBlurIterations(strength) {
        if (strength <= 10) return 2;
        if (strength <= 20) return 3;
        if (strength <= 35) return 4;
        return 5;
    }

    applyStrongBlur(imageData, strength) {
        const downscaleFactor = Math.max(3, Math.floor(strength / 8));
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);

        const smallWidth = Math.max(2, Math.floor(imageData.width / downscaleFactor));
        const smallHeight = Math.max(2, Math.floor(imageData.height / downscaleFactor));

        const smallCanvas = document.createElement('canvas');
        smallCanvas.width = smallWidth;
        smallCanvas.height = smallHeight;
        const smallCtx = smallCanvas.getContext('2d');

        smallCtx.imageSmoothingEnabled = true;
        smallCtx.imageSmoothingQuality = 'low';

        smallCtx.drawImage(tempCanvas, 0, 0, imageData.width, imageData.height, 
                            0, 0, smallWidth, smallHeight);

        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = imageData.width;
        resultCanvas.height = imageData.height;
        const resultCtx = resultCanvas.getContext('2d');

        resultCtx.imageSmoothingEnabled = true;
        resultCtx.imageSmoothingQuality = 'low';

        resultCtx.drawImage(smallCanvas, 0, 0, smallWidth, smallHeight,
                           0, 0, imageData.width, imageData.height);

        return resultCtx.getImageData(0, 0, imageData.width, imageData.height);
    }

    applyBoxBlur(imageData, radius) {
        const { data, width, height } = imageData;
        const newData = new Uint8ClampedArray(data);

        new Uint8ClampedArray(data).set(newData);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const ny = Math.min(height - 1, Math.max(0, y + dy));
                        const nx = Math.min(width - 1, Math.max(0, x + dx));
                        const idx = (ny * width + nx) * 4;
                        
                        rSum += data[idx];
                        gSum += data[idx + 1];
                        bSum += data[idx + 2];
                        aSum += data[idx + 3];
                        count++;
                    }
                }

                const idx = (y * width + x) * 4;
                newData[idx] = Math.round(rSum / count);
                newData[idx + 1] = Math.round(gSum / count);
                newData[idx + 2] = Math.round(bSum / count);
                newData[idx + 3] = Math.round(aSum / count);
            }
        }

        return new ImageData(newData, width, height);
    }

    applyBlackBox(ctx, regions) {
        ctx.fillStyle = '#000000';
        
        regions.forEach(region => {
            const x = Math.round(region.x);
            const y = Math.round(region.y);
            const w = Math.round(region.width);
            const h = Math.round(region.height);
            
            ctx.fillRect(x, y, w, h);
        });
    }

    getRegionImageData(ctx, region) {
        const canvas = ctx.canvas;
        const sx = Math.round(Math.max(0, region.x));
        const sy = Math.round(Math.max(0, region.y));
        const sw = Math.round(Math.min(canvas.width - sx, region.width));
        const sh = Math.round(Math.min(canvas.height - sy, region.height));

        if (sw <= 0 || sh <= 0) return null;

        try {
            const imageData = ctx.getImageData(sx, sy, sw, sh);
            return {
                imageData,
                sx,
                sy,
                sw,
                sh
            };
        } catch (e) {
            console.error('获取图像数据失败:', e);
            return null;
        }
    }
}

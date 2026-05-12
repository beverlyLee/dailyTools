class ColorReplacer {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
        
        this.backgroundColors = {
            red: { r: 255, g: 0, b: 0 },
            blue: { r: 67, g: 142, b: 219 },
            white: { r: 255, g: 255, b: 255 },
            lightBlue: { r: 135, g: 206, b: 235 },
            darkBlue: { r: 0, g: 51, b: 102 }
        };
    }
    
    setBackground(colorKey) {
        return this.backgroundColors[colorKey] || this.backgroundColors.blue;
    }
    
    replaceBackground(image, mask, bgColor) {
        const width = image.width;
        const height = image.height;
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.tempCanvas.width = width;
        this.tempCanvas.height = height;
        
        const imageData = image.data;
        const maskData = mask.data;
        
        const ycbcrData = this.convertToYCbCr(imageData, width, height);
        
        const protectedMask = this.buildProtectionMask(
            maskData, imageData, ycbcrData, width, height
        );
        
        const resultData = this.tempCtx.createImageData(width, height);
        const result = resultData.data;
        
        this.ctx.fillStyle = `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`;
        this.ctx.fillRect(0, 0, width, height);
        const bgImageData = this.ctx.getImageData(0, 0, width, height);
        const bgData = bgImageData.data;
        
        for (let i = 0; i < imageData.length; i += 4) {
            const maskAlpha = protectedMask[i] / 255;
            
            if (maskAlpha >= 0.98) {
                result[i] = imageData[i];
                result[i + 1] = imageData[i + 1];
                result[i + 2] = imageData[i + 2];
            } else if (maskAlpha <= 0.02) {
                result[i] = bgData[i];
                result[i + 1] = bgData[i + 1];
                result[i + 2] = bgData[i + 2];
            } else {
                result[i] = this.blend(imageData[i], bgData[i], maskAlpha);
                result[i + 1] = this.blend(imageData[i + 1], bgData[i + 1], maskAlpha);
                result[i + 2] = this.blend(imageData[i + 2], bgData[i + 2], maskAlpha);
            }
            result[i + 3] = 255;
        }
        
        this.tempCtx.putImageData(resultData, 0, 0);
        
        const edgeData = this.processEdgeBlend(
            imageData, result, protectedMask, ycbcrData, width, height, bgColor
        );
        this.tempCtx.putImageData(edgeData, 0, 0);
        
        return this.tempCanvas;
    }
    
    convertToYCbCr(data, width, height) {
        const ycbcr = new Float32Array(width * height * 3);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                const ycbcrIdx = (y * width + x) * 3;
                ycbcr[ycbcrIdx] = 0.299 * r + 0.587 * g + 0.114 * b;
                ycbcr[ycbcrIdx + 1] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                ycbcr[ycbcrIdx + 2] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
            }
        }
        
        return ycbcr;
    }
    
    scoreYCbCrSkin(Y, Cb, Cr) {
        if (Y < 50 || Y > 250) return 0;
        
        let cbScore = 0;
        let crScore = 0;
        
        if (Cb >= 70 && Cb <= 130) {
            if (Cb >= 77 && Cb <= 127) {
                const cbCenter = (Cb - 77) / (127 - 77);
                cbScore = 1 - Math.abs(cbCenter - 0.5) * 2;
            } else {
                cbScore = 0.3;
            }
        } else {
            return 0;
        }
        
        if (Cr >= 125 && Cr <= 180) {
            if (Cr >= 133 && Cr <= 173) {
                const crCenter = (Cr - 133) / (173 - 133);
                crScore = 1 - Math.abs(crCenter - 0.5) * 2;
            } else {
                crScore = 0.3;
            }
        } else {
            return 0;
        }
        
        let score = (cbScore + crScore) / 2;
        
        if (Y > 80 && Y < 220) {
            score *= 1.1;
        }
        
        return Math.min(1, score);
    }
    
    buildProtectionMask(maskData, imageData, ycbcrData, width, height) {
        const protectedMask = new Uint8ClampedArray(maskData.length);
        
        for (let i = 0; i < maskData.length; i++) {
            protectedMask[i] = maskData[i];
        }
        
        const centerX = width / 2;
        const centerY = height * 0.32;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const pixelIdx = y * width + x;
                
                const dx = (x - centerX) / (width / 2);
                const dy = (y - centerY) / (height * 0.42);
                const centerDist = Math.sqrt(dx * dx + dy * dy);
                
                const ycbcrIdx = pixelIdx * 3;
                const Y = ycbcrData[ycbcrIdx];
                const Cb = ycbcrData[ycbcrIdx + 1];
                const Cr = ycbcrData[ycbcrIdx + 2];
                
                const skinScore = this.scoreYCbCrSkin(Y, Cb, Cr);
                
                const r = imageData[idx] / 255;
                const g = imageData[idx + 1] / 255;
                const b = imageData[idx + 2] / 255;
                const brightness = (r + g + b) / 3;
                
                if (centerDist < 0.3) {
                    protectedMask[idx] = 255;
                    protectedMask[idx + 1] = 255;
                    protectedMask[idx + 2] = 255;
                    continue;
                }
                
                if (centerDist < 0.5) {
                    if (skinScore > 0.2) {
                        protectedMask[idx] = 255;
                        protectedMask[idx + 1] = 255;
                        protectedMask[idx + 2] = 255;
                        continue;
                    }
                    if (brightness < 0.45) {
                        protectedMask[idx] = 255;
                        protectedMask[idx + 1] = 255;
                        protectedMask[idx + 2] = 255;
                        continue;
                    }
                    protectedMask[idx] = Math.max(protectedMask[idx], 220);
                    protectedMask[idx + 1] = protectedMask[idx];
                    protectedMask[idx + 2] = protectedMask[idx];
                    continue;
                }
                
                if (centerDist < 0.65) {
                    if (skinScore > 0.3) {
                        protectedMask[idx] = 255;
                        protectedMask[idx + 1] = 255;
                        protectedMask[idx + 2] = 255;
                        continue;
                    }
                    if (brightness < 0.35) {
                        protectedMask[idx] = Math.max(protectedMask[idx], 240);
                        protectedMask[idx + 1] = protectedMask[idx];
                        protectedMask[idx + 2] = protectedMask[idx];
                        continue;
                    }
                    if (skinScore > 0.2 && protectedMask[idx] < 200) {
                        protectedMask[idx] = Math.max(protectedMask[idx], 200);
                        protectedMask[idx + 1] = protectedMask[idx];
                        protectedMask[idx + 2] = protectedMask[idx];
                    }
                    continue;
                }
                
                if (skinScore > 0.4) {
                    protectedMask[idx] = 255;
                    protectedMask[idx + 1] = 255;
                    protectedMask[idx + 2] = 255;
                    continue;
                }
                
                if (skinScore > 0.25 && protectedMask[idx] < 180) {
                    protectedMask[idx] = Math.max(protectedMask[idx], 200);
                    protectedMask[idx + 1] = protectedMask[idx];
                    protectedMask[idx + 2] = protectedMask[idx];
                }
            }
        }
        
        const temp = new Uint8ClampedArray(protectedMask.length);
        
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < protectedMask.length; i++) {
                temp[i] = protectedMask[i];
            }
            
            for (let y = 2; y < height - 2; y++) {
                for (let x = 2; x < width - 2; x++) {
                    const idx = (y * width + x) * 4;
                    
                    if (temp[idx] > 200) {
                        let fgCount = 0;
                        for (let ky = -2; ky <= 2; ky++) {
                            for (let kx = -2; kx <= 2; kx++) {
                                const nidx = ((y + ky) * width + (x + kx)) * 4;
                                if (temp[nidx] > 180) fgCount++;
                            }
                        }
                        if (fgCount > 15) {
                            protectedMask[idx] = 255;
                            protectedMask[idx + 1] = 255;
                            protectedMask[idx + 2] = 255;
                        }
                    }
                }
            }
        }
        
        for (let iter = 0; iter < 2; iter++) {
            for (let i = 0; i < protectedMask.length; i++) {
                temp[i] = protectedMask[i];
            }
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;
                    
                    if (temp[idx] > 150) {
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                const nidx = ((y + ky) * width + (x + kx)) * 4;
                                if (protectedMask[nidx] < temp[idx] * 0.8) {
                                    protectedMask[nidx] = Math.max(protectedMask[nidx], temp[idx] * 0.75);
                                    protectedMask[nidx + 1] = protectedMask[nidx];
                                    protectedMask[nidx + 2] = protectedMask[nidx];
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return protectedMask;
    }
    
    processEdgeBlend(imageData, resultData, maskData, ycbcrData, width, height, bgColor) {
        const edgeImageData = this.tempCtx.createImageData(width, height);
        const edgeResult = edgeImageData.data;
        
        for (let i = 0; i < resultData.length; i++) {
            edgeResult[i] = resultData[i];
        }
        
        const centerX = width / 2;
        const centerY = height * 0.32;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const alpha = maskData[idx] / 255;
                
                if (alpha > 0.05 && alpha < 0.98) {
                    const dx = (x - centerX) / (width / 2);
                    const dy = (y - centerY) / (height * 0.42);
                    const centerDist = Math.sqrt(dx * dx + dy * dy);
                    
                    const pixelIdx = y * width + x;
                    const ycbcrIdx = pixelIdx * 3;
                    const Y = ycbcrData[ycbcrIdx];
                    const Cb = ycbcrData[ycbcrIdx + 1];
                    const Cr = ycbcrData[ycbcrIdx + 2];
                    
                    const skinScore = this.scoreYCbCrSkin(Y, Cb, Cr);
                    
                    const r = imageData[idx] / 255;
                    const g = imageData[idx + 1] / 255;
                    const b = imageData[idx + 2] / 255;
                    const brightness = (r + g + b) / 3;
                    
                    let adjustedAlpha = alpha;
                    
                    if (centerDist < 0.5) {
                        adjustedAlpha = Math.max(alpha, 0.98);
                    } else if (centerDist < 0.7) {
                        adjustedAlpha = Math.max(alpha, 0.92);
                    }
                    
                    if (skinScore > 0.35) {
                        adjustedAlpha = Math.max(adjustedAlpha, 0.95);
                    } else if (skinScore > 0.2) {
                        adjustedAlpha = Math.max(adjustedAlpha, 0.85);
                    }
                    
                    if (brightness < 0.22) {
                        adjustedAlpha = Math.max(adjustedAlpha, 0.92);
                    } else if (brightness < 0.35) {
                        adjustedAlpha = Math.max(adjustedAlpha, 0.85);
                    }
                    
                    const maxC = Math.max(r, g, b);
                    const minC = Math.min(r, g, b);
                    const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
                    
                    if (saturation > 0.5 && brightness < 0.55) {
                        adjustedAlpha = Math.max(adjustedAlpha, 0.8);
                    }
                    
                    if (adjustedAlpha !== alpha) {
                        const blended = this.colorMatting(r, g, b, bgColor, adjustedAlpha);
                        edgeResult[idx] = Math.floor(blended.r * 255);
                        edgeResult[idx + 1] = Math.floor(blended.g * 255);
                        edgeResult[idx + 2] = Math.floor(blended.b * 255);
                    }
                }
            }
        }
        
        return edgeImageData;
    }
    
    colorMatting(fgR, fgG, fgB, bgColor, alpha) {
        const bgR = bgColor.r / 255;
        const bgG = bgColor.g / 255;
        const bgB = bgColor.b / 255;
        
        if (alpha > 0.98) {
            return { r: fgR, g: fgG, b: fgB };
        }
        
        if (alpha < 0.02) {
            return { r: bgR, g: bgG, b: bgB };
        }
        
        const safeAlpha = Math.max(0.1, alpha);
        
        let actualFgR = (fgR - bgR * (1 - safeAlpha)) / safeAlpha;
        let actualFgG = (fgG - bgG * (1 - safeAlpha)) / safeAlpha;
        let actualFgB = (fgB - bgB * (1 - safeAlpha)) / safeAlpha;
        
        actualFgR = Math.max(0, Math.min(1, actualFgR));
        actualFgG = Math.max(0, Math.min(1, actualFgG));
        actualFgB = Math.max(0, Math.min(1, actualFgB));
        
        const brightness = (actualFgR + actualFgG + actualFgB) / 3;
        if (brightness < 0.28) {
            const boostFactor = 1 + (0.28 - brightness) * 0.35;
            actualFgR = Math.min(1, actualFgR * boostFactor);
            actualFgG = Math.min(1, actualFgG * boostFactor);
            actualFgB = Math.min(1, actualFgB * boostFactor);
        }
        
        const resultR = actualFgR * alpha + bgR * (1 - alpha);
        const resultG = actualFgG * alpha + bgG * (1 - alpha);
        const resultB = actualFgB * alpha + bgB * (1 - alpha);
        
        return {
            r: resultR,
            g: resultG,
            b: resultB
        };
    }
    
    blend(fg, bg, alpha) {
        return Math.floor(fg * alpha + bg * (1 - alpha));
    }
}

class SkinSmoothing {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
        
        this.smoothness = 0.5;
        this.edgeThreshold = 30;
        this.brightness = 0;
        this.contrast = 0;
        this.saturation = 0.1;
    }
    
    setSmoothness(value) {
        this.smoothness = value;
    }
    
    setBrightness(value) {
        this.brightness = value;
    }
    
    setContrast(value) {
        this.contrast = value;
    }
    
    setSaturation(value) {
        this.saturation = value;
    }
    
    smooth(imageCanvas) {
        const width = imageCanvas.width;
        const height = imageCanvas.height;
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.tempCanvas.width = width;
        this.tempCanvas.height = height;
        
        this.ctx.drawImage(imageCanvas, 0, 0);
        const imageData = this.ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        const skinMask = this.createSkinMask(data, width, height);
        
        const smoothedData = this.bilateralFilter(data, width, height, skinMask);
        
        const resultData = this.blendWithMask(data, smoothedData, skinMask, width, height);
        
        this.applyColorCorrection(resultData.data, width, height);
        
        this.ctx.putImageData(resultData, 0, 0);
        
        return this.canvas;
    }
    
    createSkinMask(data, width, height) {
        const mask = new Float32Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                mask[y * width + x] = this.isSkin(r, g, b) ? 1 : 0;
            }
        }
        
        return this.expandMask(mask, width, height, 5);
    }
    
    isSkin(r, g, b) {
        const maxVal = Math.max(r, g, b);
        const minVal = Math.min(r, g, b);
        
        if (maxVal < 80 || minVal > 220) return false;
        
        if (r < 95 || g < 40 || b < 20) return false;
        
        const rgDiff = Math.abs(r - g);
        const rbDiff = Math.abs(r - b);
        
        if (r <= g || r <= b) return false;
        if (rgDiff < 10) return false;
        
        if (r > 95 && g > 40 && b > 20 && 
            maxVal - minVal > 15 &&
            rgDiff > 15 && 
            r > g && r > b) {
            return true;
        }
        
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        
        if (y > 60 && cb > 85 && cb < 135 && cr > 135 && cr < 180) {
            return true;
        }
        
        return false;
    }
    
    expandMask(mask, width, height, iterations) {
        const expanded = new Float32Array(mask.length);
        
        for (let iter = 0; iter < iterations; iter++) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = y * width + x;
                    
                    if (mask[idx] > 0.5) {
                        expanded[idx] = 1;
                    } else {
                        let neighborSum = 0;
                        let count = 0;
                        
                        for (let ky = -2; ky <= 2; ky++) {
                            for (let kx = -2; kx <= 2; kx++) {
                                const nx = x + kx;
                                const ny = y + ky;
                                
                                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                    const dist = Math.sqrt(kx * kx + ky * ky);
                                    const weight = Math.max(0, 1 - dist / 3);
                                    neighborSum += mask[ny * width + nx] * weight;
                                    count += weight;
                                }
                            }
                        }
                        
                        expanded[idx] = neighborSum / count;
                    }
                }
            }
            
            for (let i = 0; i < mask.length; i++) {
                mask[i] = expanded[i];
            }
        }
        
        return mask;
    }
    
    bilateralFilter(data, width, height, skinMask) {
        const result = new Uint8ClampedArray(data.length);
        const sigmaSpace = Math.max(3, this.smoothness * 15);
        const sigmaColor = Math.max(20, this.smoothness * 100);
        const radius = Math.ceil(sigmaSpace * 1.5);
        
        const spaceWeights = [];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const dist = dx * dx + dy * dy;
                spaceWeights.push(Math.exp(-dist / (2 * sigmaSpace * sigmaSpace)));
            }
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const maskVal = skinMask[y * width + x];
                
                if (maskVal < 0.1) {
                    result[idx] = data[idx];
                    result[idx + 1] = data[idx + 1];
                    result[idx + 2] = data[idx + 2];
                    result[idx + 3] = data[idx + 3];
                    continue;
                }
                
                const centerR = data[idx];
                const centerG = data[idx + 1];
                const centerB = data[idx + 2];
                
                let sumR = 0, sumG = 0, sumB = 0;
                let weightSum = 0;
                let weightIdx = 0;
                
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const nx = x + kx;
                        const ny = y + ky;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nidx = (ny * width + nx) * 4;
                            const nMaskVal = skinMask[ny * width + nx];
                            
                            if (nMaskVal < 0.1) {
                                weightIdx++;
                                continue;
                            }
                            
                            const r = data[nidx];
                            const g = data[nidx + 1];
                            const b = data[nidx + 2];
                            
                            const colorDiffR = r - centerR;
                            const colorDiffG = g - centerG;
                            const colorDiffB = b - centerB;
                            const colorDist = colorDiffR * colorDiffR + 
                                             colorDiffG * colorDiffG + 
                                             colorDiffB * colorDiffB;
                            
                            const spaceWeight = spaceWeights[weightIdx];
                            const colorWeight = Math.exp(-colorDist / (2 * sigmaColor * sigmaColor));
                            const maskWeight = (maskVal + nMaskVal) / 2;
                            
                            const weight = spaceWeight * colorWeight * maskWeight;
                            
                            sumR += r * weight;
                            sumG += g * weight;
                            sumB += b * weight;
                            weightSum += weight;
                        }
                        weightIdx++;
                    }
                }
                
                if (weightSum > 0) {
                    result[idx] = sumR / weightSum;
                    result[idx + 1] = sumG / weightSum;
                    result[idx + 2] = sumB / weightSum;
                    result[idx + 3] = data[idx + 3];
                } else {
                    result[idx] = data[idx];
                    result[idx + 1] = data[idx + 1];
                    result[idx + 2] = data[idx + 2];
                    result[idx + 3] = data[idx + 3];
                }
            }
        }
        
        return result;
    }
    
    blendWithMask(original, smoothed, mask, width, height) {
        const resultData = this.ctx.createImageData(width, height);
        const result = resultData.data;
        
        const blendAmount = this.smoothness;
        
        for (let i = 0; i < original.length; i += 4) {
            const idx = i / 4;
            const x = idx % width;
            const y = Math.floor(idx / width);
            
            const maskVal = mask[y * width + x] * blendAmount;
            
            result[i] = original[i] * (1 - maskVal) + smoothed[i] * maskVal;
            result[i + 1] = original[i + 1] * (1 - maskVal) + smoothed[i + 1] * maskVal;
            result[i + 2] = original[i + 2] * (1 - maskVal) + smoothed[i + 2] * maskVal;
            result[i + 3] = original[i + 3];
        }
        
        return resultData;
    }
    
    applyColorCorrection(data, width, height) {
        if (this.brightness === 0 && this.contrast === 0 && this.saturation === 0) {
            return;
        }
        
        const contrastFactor = (259 * (this.contrast * 255 + 255)) / 
                              (255 * (259 - this.contrast * 255));
        
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            if (this.brightness !== 0) {
                r = Math.min(255, Math.max(0, r + this.brightness * 255));
                g = Math.min(255, Math.max(0, g + this.brightness * 255));
                b = Math.min(255, Math.max(0, b + this.brightness * 255));
            }
            
            if (this.contrast !== 0) {
                r = contrastFactor * (r - 128) + 128;
                g = contrastFactor * (g - 128) + 128;
                b = contrastFactor * (b - 128) + 128;
                r = Math.min(255, Math.max(0, r));
                g = Math.min(255, Math.max(0, g));
                b = Math.min(255, Math.max(0, b));
            }
            
            if (this.saturation !== 0) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = gray + (r - gray) * (1 + this.saturation);
                g = gray + (g - gray) * (1 + this.saturation);
                b = gray + (b - gray) * (1 + this.saturation);
                r = Math.min(255, Math.max(0, r));
                g = Math.min(255, Math.max(0, g));
                b = Math.min(255, Math.max(0, b));
            }
            
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
    }
    
    enhanceEyesAndLips(canvas) {
        return canvas;
    }
}

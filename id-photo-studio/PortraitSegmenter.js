class PortraitSegmenter {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.maskCanvas = document.createElement('canvas');
        this.maskCtx = this.maskCanvas.getContext('2d');
    }
    
    segment(image) {
        const width = image.width || image.videoWidth;
        const height = image.height || image.videoHeight;
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.maskCanvas.width = width;
        this.maskCanvas.height = height;
        
        this.ctx.drawImage(image, 0, 0, width, height);
        const imageData = this.ctx.getImageData(0, 0, width, height);
        
        const maskData = this.segmentCPU(imageData, width, height);
        
        this.maskCtx.putImageData(maskData, 0, 0);
        
        return {
            mask: maskData,
            maskCanvas: this.maskCanvas,
            width: width,
            height: height
        };
    }
    
    segmentCPU(imageData, width, height) {
        const data = imageData.data;
        const maskData = this.maskCtx.createImageData(width, height);
        const mask = maskData.data;
        
        const ycbcrData = this.convertToYCbCr(data, width, height);
        const edgeMap = this.detectEdges(data, width, height);
        const varianceMap = this.computeColorVariance(data, width, height);
        
        const initialMask = new Uint16Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const pixelIdx = y * width + x;
                
                const r = data[idx] / 255;
                const g = data[idx + 1] / 255;
                const b = data[idx + 2] / 255;
                const brightness = (r + g + b) / 3;
                
                const ycbcrIdx = pixelIdx * 3;
                const Y = ycbcrData[ycbcrIdx];
                const Cb = ycbcrData[ycbcrIdx + 1];
                const Cr = ycbcrData[ycbcrIdx + 2];
                
                const skinScore = this.scoreYCbCrSkin(Y, Cb, Cr);
                const hairScore = this.scoreHairColor(brightness, r, g, b);
                const clothScore = this.scoreClothColor(brightness, r, g, b);
                
                const centerX = width / 2;
                const centerY = height * 0.32;
                const dx = (x - centerX) / (width / 2);
                const dy = (y - centerY) / (height * 0.42);
                const centerDist = Math.sqrt(dx * dx + dy * dy);
                
                let alpha = 0;
                
                if (skinScore > 0.4) {
                    alpha = Math.max(alpha, skinScore * 255);
                }
                if (hairScore > 0.4) {
                    alpha = Math.max(alpha, hairScore * 255);
                }
                if (clothScore > 0.4) {
                    alpha = Math.max(alpha, clothScore * 255);
                }
                
                if (centerDist < 0.3) {
                    alpha = Math.max(alpha, 255);
                } else if (centerDist < 0.5) {
                    alpha = Math.max(alpha, 200);
                } else if (centerDist < 0.7) {
                    alpha = Math.max(alpha, 120);
                }
                
                const edgeVal = edgeMap[pixelIdx];
                if (edgeVal > 0.25 && centerDist < 1.0) {
                    alpha = Math.max(alpha, edgeVal * 150);
                }
                
                const variance = varianceMap[pixelIdx];
                if (variance > 0.025 && centerDist < 1.0) {
                    alpha = Math.max(alpha, 80);
                }
                
                const isBorder = x < 3 || x >= width - 3 || y < 3 || y >= height - 3;
                if (isBorder && centerDist > 0.85) {
                    if (variance < 0.04 && edgeVal < 0.15 && skinScore < 0.2) {
                        alpha = Math.min(alpha, 0);
                    }
                }
                
                if (centerDist > 0.95) {
                    alpha = Math.min(alpha, 20);
                }
                
                initialMask[pixelIdx] = Math.min(255, Math.max(0, alpha));
            }
        }
        
        this.morphologicalCleanup(initialMask, width, height);
        this.gaussianBlurEdges(initialMask, width, height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const alphaByte = initialMask[y * width + x];
                mask[idx] = alphaByte;
                mask[idx + 1] = alphaByte;
                mask[idx + 2] = alphaByte;
                mask[idx + 3] = 255;
            }
        }
        
        return maskData;
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
    
    scoreHairColor(brightness, r, g, b) {
        if (brightness < 0.05) return 1.0;
        if (brightness < 0.12) return 0.98;
        if (brightness < 0.18) return 0.95;
        if (brightness < 0.25) return 0.90;
        if (brightness < 0.32) return 0.82;
        if (brightness < 0.38) return 0.72;
        if (brightness < 0.45) return 0.60;
        if (brightness < 0.52) return 0.45;
        
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const chroma = maxC - minC;
        
        if (brightness < 0.6 && chroma < 0.12) {
            return 0.35;
        }
        
        return 0;
    }
    
    scoreClothColor(brightness, r, g, b) {
        if (brightness < 0.12) return 0.95;
        if (brightness < 0.18) return 0.92;
        if (brightness < 0.25) return 0.88;
        if (brightness < 0.32) return 0.82;
        if (brightness < 0.40) return 0.75;
        
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
        
        if (brightness < 0.55 && saturation > 0.55) return 0.75;
        if (brightness < 0.65 && saturation > 0.65) return 0.65;
        if (saturation > 0.75) return 0.55;
        
        return 0;
    }
    
    detectEdges(data, width, height) {
        const edgeMap = new Float32Array(width * height);
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gxR = 0, gxG = 0, gxB = 0;
                let gyR = 0, gyG = 0, gyB = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        
                        gxR += data[idx] * sobelX[kernelIdx];
                        gxG += data[idx + 1] * sobelX[kernelIdx];
                        gxB += data[idx + 2] * sobelX[kernelIdx];
                        
                        gyR += data[idx] * sobelY[kernelIdx];
                        gyG += data[idx + 1] * sobelY[kernelIdx];
                        gyB += data[idx + 2] * sobelY[kernelIdx];
                    }
                }
                
                const magnitude = Math.sqrt(
                    (gxR * gxR + gxG * gxG + gxB * gxB) +
                    (gyR * gyR + gyG * gyG + gyB * gyB)
                ) / (255 * 3);
                
                edgeMap[y * width + x] = Math.min(1, magnitude * 3);
            }
        }
        
        return edgeMap;
    }
    
    computeColorVariance(data, width, height) {
        const varianceMap = new Float32Array(width * height);
        const radius = 2;
        
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                let sumR = 0, sumG = 0, sumB = 0;
                let sumR2 = 0, sumG2 = 0, sumB2 = 0;
                let count = 0;
                
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const r = data[idx] / 255;
                        const g = data[idx + 1] / 255;
                        const b = data[idx + 2] / 255;
                        
                        sumR += r; sumG += g; sumB += b;
                        sumR2 += r * r; sumG2 += g * g; sumB2 += b * b;
                        count++;
                    }
                }
                
                const avgR = sumR / count;
                const avgG = sumG / count;
                const avgB = sumB / count;
                
                const varR = sumR2 / count - avgR * avgR;
                const varG = sumG2 / count - avgG * avgG;
                const varB = sumB2 / count - avgB * avgB;
                
                varianceMap[y * width + x] = Math.sqrt(varR + varG + varB);
            }
        }
        
        return varianceMap;
    }
    
    morphologicalCleanup(mask, width, height) {
        const temp = new Uint16Array(mask.length);
        
        for (let pass = 0; pass < 3; pass++) {
            for (let i = 0; i < mask.length; i++) {
                temp[i] = mask[i];
            }
            
            for (let y = 2; y < height - 2; y++) {
                for (let x = 2; x < width - 2; x++) {
                    const idx = y * width + x;
                    
                    if (temp[idx] >= 200) {
                        let fgCount = 0;
                        for (let ky = -2; ky <= 2; ky++) {
                            for (let kx = -2; kx <= 2; kx++) {
                                const nidx = (y + ky) * width + (x + kx);
                                if (temp[nidx] > 180) fgCount++;
                            }
                        }
                        if (fgCount > 15) {
                            mask[idx] = 255;
                        }
                    }
                    
                    if (temp[idx] <= 50) {
                        let bgCount = 0;
                        for (let ky = -2; ky <= 2; ky++) {
                            for (let kx = -2; kx <= 2; kx++) {
                                const nidx = (y + ky) * width + (x + kx);
                                if (temp[nidx] < 70) bgCount++;
                            }
                        }
                        if (bgCount > 15) {
                            mask[idx] = 0;
                        }
                    }
                }
            }
        }
        
        for (let iter = 0; iter < 2; iter++) {
            for (let i = 0; i < mask.length; i++) {
                temp[i] = mask[i];
            }
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    
                    if (temp[idx] > 150) {
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                const nidx = (y + ky) * width + (x + kx);
                                if (mask[nidx] < temp[idx] * 0.7) {
                                    mask[nidx] = Math.max(mask[nidx], temp[idx] * 0.6);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        for (let i = 0; i < mask.length; i++) {
            if (mask[i] > 240) mask[i] = 255;
            else if (mask[i] < 15) mask[i] = 0;
        }
    }
    
    gaussianBlurEdges(mask, width, height) {
        const sigma = 0.8;
        const kernelSize = 3;
        const halfKernel = Math.floor(kernelSize / 2);
        const kernel = [];
        let kernelSum = 0;
        
        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
            for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                const weight = Math.exp(-(kx * kx + ky * ky) / (2 * sigma * sigma));
                kernel.push(weight);
                kernelSum += weight;
            }
        }
        
        for (let i = 0; i < kernel.length; i++) {
            kernel[i] /= kernelSum;
        }
        
        const temp = new Uint16Array(mask.length);
        for (let i = 0; i < mask.length; i++) {
            temp[i] = mask[i];
        }
        
        for (let y = halfKernel; y < height - halfKernel; y++) {
            for (let x = halfKernel; x < width - halfKernel; x++) {
                const idx = y * width + x;
                const original = temp[idx];
                
                if (original >= 250 || original <= 5) continue;
                
                let sum = 0;
                let kIdx = 0;
                
                for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                    for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                        const nidx = (y + ky) * width + (x + kx);
                        sum += temp[nidx] * kernel[kIdx];
                        kIdx++;
                    }
                }
                
                mask[idx] = Math.floor(original * 0.55 + sum * 0.45);
            }
        }
    }
}

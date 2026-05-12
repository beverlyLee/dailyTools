export class TextSharpen {
    constructor(options = {}) {
        this.strength = options.strength || 30;
        this.sigma = options.sigma || 1.0;
    }

    createGaussianKernel(sigma) {
        const radius = Math.ceil(sigma * 3);
        const kernelSize = radius * 2 + 1;
        const kernel = new Float32Array(kernelSize * kernelSize);
        
        let sum = 0;
        for (let i = 0; i < kernelSize; i++) {
            for (let j = 0; j < kernelSize; j++) {
                const x = i - radius;
                const y = j - radius;
                const exponent = -(x * x + y * y) / (2 * sigma * sigma);
                kernel[i * kernelSize + j] = Math.exp(exponent);
                sum += kernel[i * kernelSize + j];
            }
        }
        
        for (let i = 0; i < kernelSize * kernelSize; i++) {
            kernel[i] /= sum;
        }
        
        return { kernel, radius, kernelSize };
    }

    applyGaussianBlur(imageData, sigma) {
        const { data, width, height } = imageData;
        const { kernel, radius, kernelSize } = this.createGaussianKernel(sigma);
        
        const blurredData = new Uint8ClampedArray(data);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0;
                
                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const px = Math.max(0, Math.min(width - 1, x + kx - radius));
                        const py = Math.max(0, Math.min(height - 1, y + ky - radius));
                        const dataIdx = (py * width + px) * 4;
                        const kernelIdx = ky * kernelSize + kx;
                        
                        r += data[dataIdx] * kernel[kernelIdx];
                        g += data[dataIdx + 1] * kernel[kernelIdx];
                        b += data[dataIdx + 2] * kernel[kernelIdx];
                    }
                }
                
                const outputIdx = (y * width + x) * 4;
                blurredData[outputIdx] = Math.min(255, Math.max(0, r));
                blurredData[outputIdx + 1] = Math.min(255, Math.max(0, g));
                blurredData[outputIdx + 2] = Math.min(255, Math.max(0, b));
            }
        }
        
        return new ImageData(blurredData, width, height);
    }

    convertToGrayscale(data, width, height) {
        const grayscale = new Float32Array(width * height);
        
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const idx = (i * width + j) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                grayscale[i * width + j] = 0.299 * r + 0.587 * g + 0.114 * b;
            }
        }
        
        return grayscale;
    }

    detectTextRegions(grayscale, width, height) {
        const textMask = new Float32Array(width * height);
        const baseThreshold = 20;
        
        let totalEdges = 0;
        const edgeMap = new Float32Array(width * height);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const current = grayscale[idx];
                
                const gx = 
                    grayscale[(y - 1) * width + (x + 1)] +
                    2 * grayscale[y * width + (x + 1)] +
                    grayscale[(y + 1) * width + (x + 1)] -
                    grayscale[(y - 1) * width + (x - 1)] -
                    2 * grayscale[y * width + (x - 1)] -
                    grayscale[(y + 1) * width + (x - 1)];
                
                const gy = 
                    grayscale[(y + 1) * width + (x - 1)] +
                    2 * grayscale[(y + 1) * width + x] +
                    grayscale[(y + 1) * width + (x + 1)] -
                    grayscale[(y - 1) * width + (x - 1)] -
                    2 * grayscale[(y - 1) * width + x] -
                    grayscale[(y - 1) * width + (x + 1)];
                
                const edgeStrength = Math.sqrt(gx * gx + gy * gy);
                edgeMap[idx] = edgeStrength;
                totalEdges += edgeStrength;
            }
        }
        
        const avgEdge = totalEdges / (width * height);
        const dynamicThreshold = Math.max(baseThreshold, avgEdge * 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const edgeStrength = edgeMap[idx];
                textMask[idx] = Math.min(1, edgeStrength / dynamicThreshold);
            }
        }
        
        return textMask;
    }

    applyUnsharpMask(imageData) {
        const { data, width, height } = imageData;
        const amount = this.strength / 100;
        
        if (amount <= 0) {
            return imageData;
        }
        
        const blurredImageData = this.applyGaussianBlur(imageData, this.sigma);
        const blurredData = blurredImageData.data;
        
        const grayscale = this.convertToGrayscale(data, width, height);
        const textMask = this.detectTextRegions(grayscale, width, height);
        
        const sharpenedData = new Uint8ClampedArray(data);
        
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const idx = (i * width + j);
                const dataIdx = idx * 4;
                
                const textWeight = textMask[idx];
                if (textWeight < 0.05) {
                    continue;
                }
                
                for (let c = 0; c < 3; c++) {
                    const original = data[dataIdx + c];
                    const blurred = blurredData[dataIdx + c];
                    
                    const unsharp = original - blurred;
                    
                    const effectiveAmount = amount * textWeight * 0.8;
                    let sharpened = original + unsharp * effectiveAmount;
                    
                    sharpened = Math.min(255, Math.max(0, sharpened));
                    
                    sharpenedData[dataIdx + c] = Math.round(sharpened);
                }
            }
        }
        
        return new ImageData(sharpenedData, width, height);
    }

    sharpen(imageData) {
        return this.applyUnsharpMask(imageData);
    }

    setStrength(strength) {
        this.strength = strength;
    }

    setSigma(sigma) {
        this.sigma = sigma;
    }
}

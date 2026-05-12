class FormulaPreprocessor {
    constructor(options = {}) {
        this.options = {
            targetWidth: options.targetWidth || 512,
            targetHeight: options.targetHeight || 512,
            padding: options.padding || 20,
            binarizeMethod: options.binarizeMethod || 'adaptive',
            binarizeBlockSize: options.binarizeBlockSize || 15,
            binarizeC: options.binarizeC || 8,
            denoiseStrength: options.denoiseStrength || 2,
            autoCrop: options.autoCrop !== false,
            denoise: options.denoise !== false,
            binarize: options.binarize !== false,
            enhanceContrast: options.enhanceContrast !== false,
            deskew: false
        };
        
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    updateOptions(options) {
        Object.assign(this.options, options);
    }

    async process(imageElement, options = {}) {
        this.updateOptions(options);
        
        const { targetWidth, targetHeight } = this.options;
        
        let processedCanvas = this.loadImage(imageElement);
        
        if (this.options.enhanceContrast) {
            processedCanvas = this.enhanceContrast(processedCanvas);
        }
        
        if (this.options.deskew) {
            processedCanvas = this.deskew(processedCanvas);
        }
        
        if (this.options.autoCrop) {
            processedCanvas = this.autoCropFormulaPrecise(processedCanvas);
        }
        
        if (this.options.denoise) {
            processedCanvas = this.denoiseAdvanced(processedCanvas);
        }
        
        if (this.options.binarize) {
            processedCanvas = this.binarizeAdaptive(processedCanvas);
        }
        
        processedCanvas = this.resizeWithAspectRatio(processedCanvas, targetWidth, targetHeight);
        
        return processedCanvas;
    }

    loadImage(imageElement) {
        const width = imageElement.naturalWidth || imageElement.width;
        const height = imageElement.naturalHeight || imageElement.height;
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.drawImage(imageElement, 0, 0);
        
        return this.canvas;
    }

    enhanceContrast(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const data = imageData.data;
        
        let min = 255, max = 0;
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            min = Math.min(min, brightness);
            max = Math.max(max, brightness);
        }
        
        const range = max - min;
        if (range < 50) {
            const scale = 255 / Math.max(range, 1);
            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const newBrightness = Math.min(255, Math.max(0, (brightness - min) * scale));
                data[i] = newBrightness;
                data[i + 1] = newBrightness;
                data[i + 2] = newBrightness;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        return sourceCanvas;
    }

    deskew(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const data = imageData.data;
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const edgePoints = [];
        const threshold = 128;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                
                if (brightness < threshold) {
                    let hasEdge = false;
                    if (x > 0) {
                        const leftIdx = (y * width + x - 1) * 4;
                        const leftBrightness = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
                        if (Math.abs(brightness - leftBrightness) > 50) hasEdge = true;
                    }
                    if (y > 0) {
                        const topIdx = ((y - 1) * width + x) * 4;
                        const topBrightness = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / 3;
                        if (Math.abs(brightness - topBrightness) > 50) hasEdge = true;
                    }
                    
                    if (hasEdge) {
                        edgePoints.push({ x, y });
                    }
                }
            }
        }
        
        if (edgePoints.length < 10) return sourceCanvas;
        
        let bestAngle = 0;
        let bestScore = 0;
        
        for (let angle = -10; angle <= 10; angle += 0.5) {
            const rad = (angle * Math.PI) / 180;
            let score = 0;
            
            for (const point of edgePoints) {
                const rotatedY = point.y * Math.cos(rad) - point.x * Math.sin(rad);
                const bin = Math.floor(rotatedY);
                score += Math.abs(Math.sin(rad * point.x)) * 10;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestAngle = angle;
            }
        }
        
        if (Math.abs(bestAngle) < 0.5) return sourceCanvas;
        
        const rad = (bestAngle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        const cx = width / 2;
        const cy = height / 2;
        
        const corners = [
            { x: -cx, y: -cy },
            { x: width - cx, y: -cy },
            { x: -cx, y: height - cy },
            { x: width - cx, y: height - cy }
        ];
        
        let newWidth = 0, newHeight = 0;
        for (const corner of corners) {
            const rx = corner.x * cos - corner.y * sin;
            const ry = corner.x * sin + corner.y * cos;
            newWidth = Math.max(newWidth, Math.abs(rx) * 2);
            newHeight = Math.max(newHeight, Math.abs(ry) * 2);
        }
        
        newWidth = Math.ceil(newWidth);
        newHeight = Math.ceil(newHeight);
        
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = newWidth;
        resultCanvas.height = newHeight;
        const resultCtx = resultCanvas.getContext('2d');
        
        resultCtx.fillStyle = '#ffffff';
        resultCtx.fillRect(0, 0, newWidth, newHeight);
        
        resultCtx.translate(newWidth / 2, newHeight / 2);
        resultCtx.rotate(-rad);
        resultCtx.drawImage(sourceCanvas, -cx, -cy);
        
        return resultCanvas;
    }

    autoCropFormulaPrecise(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const data = imageData.data;
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const binaryMap = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                binaryMap.push(brightness < 180 && data[i + 3] > 128);
            }
        }
        
        const visited = new Set();
        const components = [];
        const padding = this.options.padding;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (!binaryMap[idx] || visited.has(idx)) continue;
                
                const component = this.findConnectedComponent(binaryMap, x, y, width, height, visited);
                
                if (component.width >= 3 && component.height >= 3) {
                    components.push(component);
                }
            }
        }
        
        if (components.length === 0) {
            return sourceCanvas;
        }
        
        let minX = width, minY = height, maxX = 0, maxY = 0;
        
        for (const comp of components) {
            minX = Math.min(minX, comp.minX);
            minY = Math.min(minY, comp.minY);
            maxX = Math.max(maxX, comp.maxX);
            maxY = Math.max(maxY, comp.maxY);
        }
        
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(width - 1, maxX + padding);
        maxY = Math.min(height - 1, maxY + padding);
        
        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;
        
        if (cropWidth <= 0 || cropHeight <= 0) {
            return sourceCanvas;
        }
        
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        const croppedCtx = croppedCanvas.getContext('2d');
        
        croppedCtx.fillStyle = '#ffffff';
        croppedCtx.fillRect(0, 0, cropWidth, cropHeight);
        
        croppedCtx.drawImage(
            sourceCanvas,
            minX, minY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
        );
        
        return croppedCanvas;
    }

    findConnectedComponent(binaryMap, startX, startY, width, height, visited) {
        const stack = [{ x: startX, y: startY }];
        let minX = startX, minY = startY, maxX = startX, maxY = startY;
        let pixelCount = 0;
        
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const idx = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited.has(idx) || !binaryMap[idx]) continue;
            
            visited.add(idx);
            pixelCount++;
            
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            
            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
            stack.push({ x: x + 1, y: y + 1 });
            stack.push({ x: x - 1, y: y - 1 });
            stack.push({ x: x + 1, y: y - 1 });
            stack.push({ x: x - 1, y: y + 1 });
        }
        
        return {
            minX, minY, maxX, maxY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            pixelCount,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    denoiseAdvanced(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const data = imageData.data;
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const resultData = new Uint8ClampedArray(data);
        const strength = Math.min(3, Math.max(1, this.options.denoiseStrength));
        
        const binaryMap = [];
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            binaryMap.push(brightness < 128);
        }
        
        const visited = new Set();
        const noiseComponents = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (!binaryMap[idx] || visited.has(idx)) continue;
                
                const component = this.findConnectedComponent(binaryMap, x, y, width, height, visited);
                
                if (component.pixelCount < 10 * strength) {
                    noiseComponents.push(component);
                }
            }
        }
        
        for (const comp of noiseComponents) {
            for (let y = comp.minY; y <= comp.maxY; y++) {
                for (let x = comp.minX; x <= comp.maxX; x++) {
                    const i = (y * width + x) * 4;
                    resultData[i] = 255;
                    resultData[i + 1] = 255;
                    resultData[i + 2] = 255;
                }
            }
        }
        
        for (let y = strength; y < height - strength; y++) {
            for (let x = strength; x < width - strength; x++) {
                const idx = (y * width + x) * 4;
                if (data[idx] > 128) continue;
                
                let darkNeighbors = 0;
                for (let dy = -strength; dy <= strength; dy++) {
                    for (let dx = -strength; dx <= strength; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nIdx = ((y + dy) * width + (x + dx)) * 4;
                        if (data[nIdx] < 128) darkNeighbors++;
                    }
                }
                
                if (darkNeighbors < 2) {
                    resultData[idx] = 255;
                    resultData[idx + 1] = 255;
                    resultData[idx + 2] = 255;
                }
            }
        }
        
        ctx.putImageData(new ImageData(resultData, width, height), 0, 0);
        return sourceCanvas;
    }

    binarizeAdaptive(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const data = imageData.data;
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const resultData = new Uint8ClampedArray(data);
        
        const grayscale = new Float32Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            grayscale[i / 4] = brightness;
        }
        
        const integral = new Float32Array(width * height);
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                rowSum += grayscale[y * width + x];
                integral[y * width + x] = rowSum + (y > 0 ? integral[(y - 1) * width + x] : 0);
            }
        }
        
        const blockSize = this.options.binarizeBlockSize;
        const halfBlock = Math.floor(blockSize / 2);
        const C = this.options.binarizeC;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const x1 = Math.max(0, x - halfBlock);
                const y1 = Math.max(0, y - halfBlock);
                const x2 = Math.min(width - 1, x + halfBlock);
                const y2 = Math.min(height - 1, y + halfBlock);
                
                const count = (x2 - x1 + 1) * (y2 - y1 + 1);
                let sum = integral[y2 * width + x2];
                if (y1 > 0) sum -= integral[(y1 - 1) * width + x2];
                if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)];
                if (y1 > 0 && x1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)];
                
                const localMean = sum / count;
                const idx = (y * width + x) * 4;
                
                if (grayscale[y * width + x] < localMean - C) {
                    resultData[idx] = 0;
                    resultData[idx + 1] = 0;
                    resultData[idx + 2] = 0;
                } else {
                    resultData[idx] = 255;
                    resultData[idx + 1] = 255;
                    resultData[idx + 2] = 255;
                }
            }
        }
        
        ctx.putImageData(new ImageData(resultData, width, height), 0, 0);
        return sourceCanvas;
    }

    resizeWithAspectRatio(sourceCanvas, targetWidth, targetHeight) {
        const aspectRatio = sourceCanvas.width / sourceCanvas.height;
        const targetRatio = targetWidth / targetHeight;
        
        let drawWidth, drawHeight;
        let offsetX = 0, offsetY = 0;
        
        if (aspectRatio > targetRatio) {
            drawWidth = targetWidth;
            drawHeight = targetWidth / aspectRatio;
            offsetY = (targetHeight - drawHeight) / 2;
        } else {
            drawHeight = targetHeight;
            drawWidth = targetHeight * aspectRatio;
            offsetX = (targetWidth - drawWidth) / 2;
        }
        
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = targetWidth;
        resultCanvas.height = targetHeight;
        const resultCtx = resultCanvas.getContext('2d');
        
        resultCtx.fillStyle = '#ffffff';
        resultCtx.fillRect(0, 0, targetWidth, targetHeight);
        
        resultCtx.imageSmoothingEnabled = true;
        resultCtx.imageSmoothingQuality = 'high';
        
        resultCtx.drawImage(
            sourceCanvas,
            offsetX, offsetY,
            drawWidth, drawHeight
        );
        
        return resultCanvas;
    }

    analyzeStructure(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const data = imageData.data;
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const horizontalProjection = new Array(height).fill(0);
        const verticalProjection = new Array(width).fill(0);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (brightness < 128) {
                    horizontalProjection[y]++;
                    verticalProjection[x]++;
                }
            }
        }
        
        const horizontalPeaks = this.findPeaks(horizontalProjection, 5);
        const verticalPeaks = this.findPeaks(verticalProjection, 5);
        
        const hasFractionBar = this.detectFractionBar(data, width, height);
        const hasIntegralSign = this.detectIntegralSign(data, width, height);
        const hasSumSign = this.detectSumSign(data, width, height);
        const hasMatrixBrackets = this.detectMatrixBrackets(data, width, height);
        
        return {
            width,
            height,
            horizontalProjection,
            verticalProjection,
            horizontalPeaks,
            verticalPeaks,
            hasFractionBar,
            hasIntegralSign,
            hasSumSign,
            hasMatrixBrackets,
            connectedComponents: this.findAllComponents(data, width, height)
        };
    }

    findPeaks(array, minDistance) {
        const peaks = [];
        const threshold = Math.max(...array) * 0.1;
        
        for (let i = 1; i < array.length - 1; i++) {
            if (array[i] > threshold && 
                array[i] >= array[i - 1] && 
                array[i] >= array[i + 1]) {
                
                if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
                    peaks.push(i);
                }
            }
        }
        
        return peaks;
    }

    detectFractionBar(data, width, height) {
        const middleY = Math.floor(height / 2);
        const scanRange = Math.floor(height * 0.1);
        
        for (let y = middleY - scanRange; y <= middleY + scanRange; y++) {
            let consecutiveDark = 0;
            let maxConsecutive = 0;
            
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                
                if (brightness < 128) {
                    consecutiveDark++;
                    maxConsecutive = Math.max(maxConsecutive, consecutiveDark);
                } else {
                    consecutiveDark = 0;
                }
            }
            
            if (maxConsecutive > width * 0.3) {
                return true;
            }
        }
        
        return false;
    }

    detectIntegralSign(data, width, height) {
        const leftThird = Math.floor(width * 0.15);
        
        for (let x = 0; x < leftThird; x++) {
            let darkPixels = 0;
            for (let y = 0; y < height; y++) {
                const i = (y * width + x) * 4;
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (brightness < 128) darkPixels++;
            }
            if (darkPixels > height * 0.4) {
                return true;
            }
        }
        
        return false;
    }

    detectSumSign(data, width, height) {
        const topSection = Math.floor(height * 0.2);
        let darkPixels = 0;
        
        for (let y = 0; y < topSection; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (brightness < 128) darkPixels++;
            }
        }
        
        return darkPixels > (topSection * width) * 0.05;
    }

    detectMatrixBrackets(data, width, height) {
        const leftEdge = Math.floor(width * 0.1);
        const rightEdge = Math.floor(width * 0.9);
        
        let leftDark = 0, rightDark = 0;
        
        for (let y = 0; y < height; y++) {
            const leftIdx = (y * width + leftEdge) * 4;
            const rightIdx = (y * width + rightEdge) * 4;
            
            const leftBrightness = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
            const rightBrightness = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
            
            if (leftBrightness < 128) leftDark++;
            if (rightBrightness < 128) rightDark++;
        }
        
        return leftDark > height * 0.3 && rightDark > height * 0.3;
    }

    findAllComponents(data, width, height) {
        const binaryMap = [];
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            binaryMap.push(brightness < 128);
        }
        
        const visited = new Set();
        const components = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (!binaryMap[idx] || visited.has(idx)) continue;
                
                const component = this.findConnectedComponent(binaryMap, x, y, width, height, visited);
                if (component.width >= 2 && component.height >= 2) {
                    components.push(component);
                }
            }
        }
        
        return components.sort((a, b) => a.minX - b.minX);
    }

    toTensor(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const tensor = new Float32Array(1 * 1 * canvas.height * canvas.width);
        
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const i = (y * canvas.width + x) * 4;
                const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                tensor[y * canvas.width + x] = 1.0 - brightness / 255.0;
            }
        }
        
        return {
            data: tensor,
            shape: [1, 1, canvas.height, canvas.width],
            type: 'float32'
        };
    }
}

export { FormulaPreprocessor };

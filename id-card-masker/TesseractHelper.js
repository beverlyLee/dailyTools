export class TesseractHelper {
    constructor(options = {}) {
        this.language = options.language || 'chi_sim+eng';
        this.onProgress = options.onProgress || null;
        this.worker = null;
        this.isReady = false;
    }

    async init() {
        if (this.isReady) return;

        try {
            this.worker = await Tesseract.createWorker(this.language, 1, {
                logger: (m) => {
                    if (this.onProgress && m.status) {
                        this.onProgress(m);
                    }
                }
            });
            this.isReady = true;
        } catch (error) {
            console.error('OCR 引擎初始化失败:', error);
            throw error;
        }
    }

    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isReady = false;
        }
    }

    preprocessImage(imageSource) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let originalWidth, originalHeight;
        
        if (imageSource instanceof HTMLCanvasElement) {
            originalWidth = imageSource.width;
            originalHeight = imageSource.height;
            canvas.width = originalWidth;
            canvas.height = originalHeight;
            ctx.drawImage(imageSource, 0, 0);
        } else if (imageSource instanceof HTMLImageElement) {
            originalWidth = imageSource.naturalWidth;
            originalHeight = imageSource.naturalHeight;
            canvas.width = originalWidth;
            canvas.height = originalHeight;
            ctx.drawImage(imageSource, 0, 0);
        } else {
            return imageSource;
        }

        const variants = [];

        variants.push({
            canvas: canvas,
            name: 'original',
            width: originalWidth,
            height: originalHeight
        });

        const enhancedCanvas = this.enhanceContrast(canvas, ctx, originalWidth, originalHeight);
        variants.push({
            canvas: enhancedCanvas,
            name: 'enhanced',
            width: originalWidth,
            height: originalHeight
        });

        const scaledCanvas = this.scaleForOCR(canvas, originalWidth, originalHeight);
        if (scaledCanvas !== canvas) {
            variants.push({
                canvas: scaledCanvas,
                name: 'scaled',
                width: scaledCanvas.width,
                height: scaledCanvas.height
            });
        }

        const grayscaleCanvas = this.grayscale(canvas, ctx, originalWidth, originalHeight);
        variants.push({
            canvas: grayscaleCanvas,
            name: 'grayscale',
            width: originalWidth,
            height: originalHeight
        });

        return variants;
    }

    enhanceContrast(sourceCanvas, ctx, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const newCtx = canvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const avg = (r + g + b) / 3;
            
            const factor = (259 * (128 + 255)) / (255 * (259 - 128));
            data[i] = this.clamp(factor * (r - 128) + 128);
            data[i + 1] = this.clamp(factor * (g - 128) + 128);
            data[i + 2] = this.clamp(factor * (b - 128) + 128);
            
            if (avg < 200) {
                const saturationFactor = 1.3;
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                data[i] = this.clamp(gray + saturationFactor * (r - gray));
                data[i + 1] = this.clamp(gray + saturationFactor * (g - gray));
                data[i + 2] = this.clamp(gray + saturationFactor * (b - gray));
            }
        }
        
        newCtx.putImageData(imageData, 0, 0);
        return canvas;
    }

    grayscale(sourceCanvas, ctx, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const newCtx = canvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            let thresholded = gray;
            if (gray > 128) {
                thresholded = Math.min(255, gray + 30);
            } else {
                thresholded = Math.max(0, gray - 30);
            }
            
            data[i] = thresholded;
            data[i + 1] = thresholded;
            data[i + 2] = thresholded;
        }
        
        newCtx.putImageData(imageData, 0, 0);
        return canvas;
    }

    scaleForOCR(sourceCanvas, originalWidth, originalHeight) {
        const minDim = Math.min(originalWidth, originalHeight);
        const maxDim = Math.max(originalWidth, originalHeight);
        
        if (maxDim < 1000) {
            const scaleFactor = 1000 / maxDim;
            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(originalWidth * scaleFactor);
            canvas.height = Math.floor(originalHeight * scaleFactor);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
            return canvas;
        }
        
        return sourceCanvas;
    }

    clamp(value) {
        return Math.max(0, Math.min(255, Math.round(value)));
    }

    async recognize(imageSource) {
        if (!this.isReady) {
            await this.init();
        }

        try {
            const variants = this.preprocessImage(imageSource);
            const allResults = [];

            for (const variant of variants) {
                try {
                    const { data } = await this.worker.recognize(variant.canvas);
                    allResults.push({
                        data,
                        variant: variant.name
                    });
                } catch (e) {
                    console.warn(`识别变体 ${variant.name} 失败:`, e);
                }
            }

            const mergedData = this.mergeOCRResults(allResults);
            return this.parseResults(mergedData);
        } catch (error) {
            console.error('OCR 识别失败:', error);
            throw error;
        }
    }

    mergeOCRResults(results) {
        if (results.length === 0) {
            return { text: '', words: [], lines: [] };
        }

        const allWords = [];
        const allLines = [];
        const seenText = new Set();

        results.forEach(result => {
            const data = result.data;
            
            if (data.words) {
                data.words.forEach(word => {
                    const text = word.text.trim();
                    if (text && !seenText.has(text + '_' + word.confidence)) {
                        allWords.push(word);
                        seenText.add(text + '_' + word.confidence);
                    }
                });
            }
            
            if (data.lines) {
                data.lines.forEach(line => {
                    const text = line.text.trim();
                    if (text) {
                        allLines.push(line);
                    }
                });
            }
        });

        return {
            text: results[0].data.text,
            words: allWords,
            lines: allLines
        };
    }

    parseResults(ocrData) {
        const results = {
            fullText: ocrData.text,
            words: [],
            lines: [],
            numbers: []
        };

        if (ocrData.words) {
            results.words = ocrData.words.map(word => ({
                text: word.text,
                confidence: word.confidence,
                bbox: {
                    x: word.bbox.x0,
                    y: word.bbox.y0,
                    width: word.bbox.x1 - word.bbox.x0,
                    height: word.bbox.y1 - word.bbox.y0
                }
            }));
        }

        if (ocrData.lines) {
            results.lines = ocrData.lines.map(line => ({
                text: line.text,
                confidence: line.confidence,
                bbox: {
                    x: line.bbox.x0,
                    y: line.bbox.y0,
                    width: line.bbox.x1 - line.bbox.x0,
                    height: line.bbox.y1 - line.bbox.y0
                }
            }));
        }

        results.numbers = this.extractNumbers(results.words, results.lines);

        return results;
    }

    extractNumbers(words, lines) {
        const numbers = [];
        const seenPatterns = new Set();

        const processText = (text, bbox, confidence, sourceType) => {
            const cleanText = text.replace(/[^0-9Xx]/g, '');
            if (cleanText.length >= 10) {
                const pattern = `${cleanText}_${Math.round(bbox.x)}_${Math.round(bbox.y)}`;
                if (!seenPatterns.has(pattern)) {
                    seenPatterns.add(pattern);
                    numbers.push({
                        text: cleanText,
                        originalText: text,
                        length: cleanText.length,
                        bbox: { ...bbox },
                        confidence: confidence,
                        sourceType: sourceType
                    });
                }
            }
        };

        words.forEach(word => {
            processText(word.text, word.bbox, word.confidence, 'word');
        });

        lines.forEach(line => {
            const digitsInLine = line.text.replace(/[^0-9Xx]/g, '');
            if (digitsInLine.length >= 10) {
                const pattern = `${digitsInLine}_${Math.round(line.bbox.x)}_${Math.round(line.bbox.y)}`;
                if (!seenPatterns.has(pattern)) {
                    seenPatterns.add(pattern);
                    numbers.push({
                        text: digitsInLine,
                        originalText: line.text,
                        length: digitsInLine.length,
                        bbox: { ...line.bbox },
                        confidence: line.confidence,
                        sourceType: 'line'
                    });
                }
            }
        });

        return this.dedupeNumbers(numbers);
    }

    dedupeNumbers(numbers) {
        const unique = [];
        const used = new Set();

        numbers.sort((a, b) => b.text.length - a.text.length);

        for (let i = 0; i < numbers.length; i++) {
            if (used.has(i)) continue;
            
            const current = numbers[i];
            let isSubset = false;
            
            for (let j = 0; j < unique.length; j++) {
                if (unique[j].text.includes(current.text) || current.text.includes(unique[j].text)) {
                    if (current.text.length > unique[j].text.length) {
                        unique[j] = current;
                    }
                    isSubset = true;
                    break;
                }
                
                const overlap = this.bboxOverlap(current.bbox, unique[j].bbox);
                if (overlap > 0.5) {
                    isSubset = true;
                    break;
                }
            }
            
            if (!isSubset) {
                unique.push(current);
            }
        }

        return unique;
    }

    bboxOverlap(bbox1, bbox2) {
        const r1 = {
            left: bbox1.x,
            right: bbox1.x + bbox1.width,
            top: bbox1.y,
            bottom: bbox1.y + bbox1.height
        };
        const r2 = {
            left: bbox2.x,
            right: bbox2.x + bbox2.width,
            top: bbox2.y,
            bottom: bbox2.y + bbox2.height
        };

        const overlapLeft = Math.max(r1.left, r2.left);
        const overlapRight = Math.min(r1.right, r2.right);
        const overlapTop = Math.max(r1.top, r2.top);
        const overlapBottom = Math.min(r1.bottom, r2.bottom);

        if (overlapRight <= overlapLeft || overlapBottom <= overlapTop) {
            return 0;
        }

        const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
        const area1 = (r1.right - r1.left) * (r1.bottom - r1.top);
        const area2 = (r2.right - r2.left) * (r2.bottom - r2.top);

        return overlapArea / Math.min(area1, area2);
    }

    classifyNumber(numbers, options = {}) {
        const config = {
            enableIdCard: options.enableIdCard !== false,
            enableBankCard: options.enableBankCard !== false,
            enablePhone: options.enablePhone !== false
        };

        const classified = {
            idCards: [],
            bankCards: [],
            phones: [],
            others: []
        };

        numbers.forEach(num => {
            const len = num.length;

            if (config.enableIdCard && this.isIdCard(num.text)) {
                classified.idCards.push({ ...num, type: 'idCard', label: '身份证号' });
            } else if (config.enableBankCard && this.isBankCard(num.text)) {
                classified.bankCards.push({ ...num, type: 'bankCard', label: '银行卡号' });
            } else if (config.enablePhone && this.isPhoneNumber(num.text)) {
                classified.phones.push({ ...num, type: 'phone', label: '手机号' });
            } else if (len >= 14 && len <= 20) {
                classified.bankCards.push({ ...num, type: 'bankCard', label: '银行卡号' });
            } else if (len === 18) {
                classified.idCards.push({ ...num, type: 'idCard', label: '身份证号' });
            } else {
                classified.others.push({ ...num, type: 'other', label: '其他' });
            }
        });

        return classified;
    }

    isIdCard(numStr) {
        if (numStr.length !== 18) return false;
        const re = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/;
        if (re.test(numStr)) {
            return this.verifyIdCardChecksum(numStr);
        }
        return false;
    }

    verifyIdCardChecksum(idCard) {
        const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
        const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
        
        let sum = 0;
        for (let i = 0; i < 17; i++) {
            sum += parseInt(idCard[i], 10) * weights[i];
        }
        
        const checkCode = checkCodes[sum % 11];
        return idCard[17].toUpperCase() === checkCode;
    }

    isBankCard(numStr) {
        if (numStr.length < 15 || numStr.length > 19) return false;
        if (!/^\d+$/.test(numStr)) return false;
        
        if (numStr.length >= 16) {
            let sum = 0;
            let isEven = false;
            
            for (let i = numStr.length - 1; i >= 0; i--) {
                let digit = parseInt(numStr[i], 10);
                
                if (isEven) {
                    digit *= 2;
                    if (digit > 9) {
                        digit -= 9;
                    }
                }
                
                sum += digit;
                isEven = !isEven;
            }
            
            return sum % 10 === 0;
        }
        
        return true;
    }

    isPhoneNumber(numStr) {
        if (numStr.length !== 11) return false;
        const re = /^1[3-9]\d{9}$/;
        return re.test(numStr);
    }

    createMaskRegions(classified, imageWidth, imageHeight) {
        const regions = [];
        let id = 0;

        const addRegion = (item, padding = 10) => {
            const bbox = item.bbox;
            const x = Math.max(0, bbox.x - padding);
            const y = Math.max(0, bbox.y - padding);
            const width = Math.min(imageWidth - x, bbox.width + padding * 2);
            const height = Math.min(imageHeight - y, bbox.height + padding * 2);

            regions.push({
                id: id++,
                type: item.type,
                label: item.label,
                x: x,
                y: y,
                width: width,
                height: height,
                originalText: item.originalText,
                masked: true
            });
        };

        classified.idCards.forEach(item => addRegion(item, 12));
        classified.bankCards.forEach(item => addRegion(item, 12));
        classified.phones.forEach(item => addRegion(item, 8));

        return this.mergeOverlappingRegions(regions);
    }

    mergeOverlappingRegions(regions) {
        if (regions.length <= 1) return regions;

        const merged = [];
        const used = new Set();

        regions.sort((a, b) => a.x - b.x);

        for (let i = 0; i < regions.length; i++) {
            if (used.has(regions[i].id)) continue;

            let current = { ...regions[i] };
            used.add(current.id);

            for (let j = i + 1; j < regions.length; j++) {
                if (used.has(regions[j].id)) continue;

                if (this.regionsOverlap(current, regions[j])) {
                    current = this.mergeTwoRegions(current, regions[j]);
                    used.add(regions[j].id);
                }
            }

            merged.push(current);
        }

        merged.forEach((region, index) => {
            region.id = index;
        });

        return merged;
    }

    regionsOverlap(region1, region2) {
        const r1 = {
            left: region1.x,
            right: region1.x + region1.width,
            top: region1.y,
            bottom: region1.y + region1.height
        };
        const r2 = {
            left: region2.x,
            right: region2.x + region2.width,
            top: region2.y,
            bottom: region2.y + region2.height
        };

        return !(r1.right < r2.left || r2.right < r1.left || r1.bottom < r2.top || r2.bottom < r1.top);
    }

    mergeTwoRegions(r1, r2) {
        const x = Math.min(r1.x, r2.x);
        const y = Math.min(r1.y, r2.y);
        const width = Math.max(r1.x + r1.width, r2.x + r2.width) - x;
        const height = Math.max(r1.y + r1.height, r2.y + r2.height) - y;

        return {
            ...r1,
            id: r1.id,
            x,
            y,
            width,
            height,
            label: r1.label === r2.label ? r1.label : '敏感区域'
        };
    }

    async detectAndClassify(imageSource, options = {}) {
        const results = await this.recognize(imageSource);
        const classified = this.classifyNumber(results.numbers, options);
        
        let imageWidth, imageHeight;
        
        if (imageSource instanceof HTMLCanvasElement) {
            imageWidth = imageSource.width;
            imageHeight = imageSource.height;
        } else if (imageSource instanceof HTMLImageElement) {
            imageWidth = imageSource.naturalWidth;
            imageHeight = imageSource.naturalHeight;
        } else {
            imageWidth = 0;
            imageHeight = 0;
        }

        const regions = this.createMaskRegions(classified, imageWidth, imageHeight);

        return {
            ocrResults: results,
            classified,
            regions
        };
    }
}

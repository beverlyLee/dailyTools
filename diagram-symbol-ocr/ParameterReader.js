export class ParameterReader {
    constructor(options = {}) {
        this.options = {
            searchRadius: options.searchRadius || 100,
            tesseractAvailable: typeof Tesseract !== 'undefined'
        };
        this.tesseractReady = false;
    }

    async initOCR() {
        if (!this.options.tesseractAvailable) {
            return false;
        }

        try {
            this.worker = await Tesseract.createWorker('eng', 1, {
                logger: m => console.log('OCR:', m.status)
            });
            this.tesseractReady = true;
            return true;
        } catch (error) {
            console.warn('Tesseract OCR 初始化失败:', error);
            return false;
        }
    }

    async readParameters(canvas, component, components = []) {
        const region = this.extractParameterRegion(canvas, component, components);
        
        if (!region) {
            return {
                found: false,
                parameters: [],
                pins: []
            };
        }

        if (this.tesseractReady && this.worker) {
            return await this.readWithOCR(region);
        } else {
            return this.readWithPatternMatching(canvas, component);
        }
    }

    extractParameterRegion(canvas, component, components) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        const cx = component.centerX;
        const cy = component.centerY;
        const radius = this.options.searchRadius;
        
        let bestRegion = null;
        let bestScore = 0;
        
        const directions = [
            { dx: 1, dy: 0, name: 'right' },
            { dx: -1, dy: 0, name: 'left' },
            { dx: 0, dy: 1, name: 'bottom' },
            { dx: 0, dy: -1, name: 'top' }
        ];
        
        for (const dir of directions) {
            const regionX = cx + dir.dx * (component.width / 2 + 20);
            const regionY = cy + dir.dy * (component.height / 2 + 20);
            
            const x = Math.max(0, regionX - radius / 2);
            const y = Math.max(0, regionY - radius / 2);
            const w = Math.min(width - x, radius);
            const h = Math.min(height - y, radius);
            
            if (w < 20 || h < 20) continue;
            
            const overlaps = this.checkOverlap(x, y, w, h, component, components);
            if (overlaps) continue;
            
            const score = this.estimateTextDensity(canvas, x, y, w, h);
            if (score > bestScore) {
                bestScore = score;
                bestRegion = { x, y, width: w, height: h, direction: dir.name };
            }
        }
        
        return bestRegion;
    }

    checkOverlap(x, y, w, h, excludeComponent, components) {
        const margin = 10;
        const rect1 = {
            left: x - margin,
            right: x + w + margin,
            top: y - margin,
            bottom: y + h + margin
        };
        
        for (const comp of components) {
            if (comp.label === excludeComponent.label) continue;
            
            const rect2 = {
                left: comp.x,
                right: comp.x + comp.width,
                top: comp.y,
                bottom: comp.y + comp.height
            };
            
            if (!(rect1.right < rect2.left || rect1.left > rect2.right ||
                  rect1.bottom < rect2.top || rect1.top > rect2.bottom)) {
                return true;
            }
        }
        
        return false;
    }

    estimateTextDensity(canvas, x, y, w, h) {
        const ctx = canvas.getContext('2d');
        
        try {
            const imageData = ctx.getImageData(x, y, w, h);
            const data = imageData.data;
            
            let edgePixels = 0;
            let totalPixels = 0;
            
            for (let py = 1; py < h - 1; py++) {
                for (let px = 1; px < w - 1; px++) {
                    const idx = (py * w + px) * 4;
                    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    
                    const rightIdx = (py * w + px + 1) * 4;
                    const rightGray = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
                    
                    const downIdx = ((py + 1) * w + px) * 4;
                    const downGray = (data[downIdx] + data[downIdx + 1] + data[downIdx + 2]) / 3;
                    
                    if (Math.abs(gray - rightGray) > 20 || Math.abs(gray - downGray) > 20) {
                        edgePixels++;
                    }
                    totalPixels++;
                }
            }
            
            return totalPixels > 0 ? edgePixels / totalPixels : 0;
        } catch (e) {
            return 0;
        }
    }

    async readWithOCR(region) {
        try {
            const { data } = await this.worker.recognize(region.canvas || region);
            const parameters = this.parseOCRResult(data);
            
            return {
                found: parameters.length > 0,
                parameters: parameters,
                pins: this.extractPins(data.text),
                rawText: data.text
            };
        } catch (error) {
            console.error('OCR 识别失败:', error);
            return {
                found: false,
                parameters: [],
                pins: []
            };
        }
    }

    readWithPatternMatching(canvas, component) {
        return {
            found: false,
            parameters: [],
            pins: [],
            message: 'OCR 不可用，请在 HTML 中引入 tesseract.js 以启用参数读取功能'
        };
    }

    parseOCRResult(ocrData) {
        const parameters = [];
        
        const text = ocrData.text || '';
        const words = ocrData.words || [];
        
        const resistorPattern = /(\d+(?:\.\d+)?)\s*([kKmM]?)\s*(?:Ω|ohm|R)/i;
        const capacitorPattern = /(\d+(?:\.\d+)?)\s*([μunp]?)\s*(?:F|farad|C)/i;
        const voltagePattern = /(\d+(?:\.\d+)?)\s*V/i;
        const currentPattern = /(\d+(?:\.\d+)?)\s*(?:m|μ|n)?\s*A/i;
        const labelPattern = /([A-Za-z]+)\s*(\d+)/;
        
        const resistorMatch = text.match(resistorPattern);
        if (resistorMatch) {
            parameters.push({
                type: 'resistance',
                value: parseFloat(resistorMatch[1]),
                unit: this.getUnit(resistorMatch[2], 'resistance'),
                displayValue: `${resistorMatch[1]}${resistorMatch[2]}Ω`,
                label: null
            });
        }
        
        const capacitorMatch = text.match(capacitorPattern);
        if (capacitorMatch) {
            parameters.push({
                type: 'capacitance',
                value: parseFloat(capacitorMatch[1]),
                unit: this.getUnit(capacitorMatch[2], 'capacitance'),
                displayValue: `${capacitorMatch[1]}${capacitorMatch[2]}F`,
                label: null
            });
        }
        
        const voltageMatch = text.match(voltagePattern);
        if (voltageMatch) {
            parameters.push({
                type: 'voltage',
                value: parseFloat(voltageMatch[1]),
                unit: 'V',
                displayValue: `${voltageMatch[1]}V`,
                label: null
            });
        }
        
        const currentMatch = text.match(currentPattern);
        if (currentMatch) {
            parameters.push({
                type: 'current',
                value: parseFloat(currentMatch[1]),
                unit: this.getUnit(currentMatch[2] || '', 'current'),
                displayValue: `${currentMatch[1]}${currentMatch[2] || ''}A`,
                label: null
            });
        }
        
        const labelMatch = text.match(labelPattern);
        if (labelMatch && parameters.length > 0) {
            parameters[0].label = labelMatch[0];
        }
        
        return parameters;
    }

    extractPins(text) {
        const pins = [];
        const pinPattern = /\b([A-Za-z]?\d{1,3})\b/g;
        
        let match;
        while ((match = pinPattern.exec(text)) !== null) {
            const pinNum = match[1];
            if (/^[A-Za-z]?\d{1,3}$/.test(pinNum) && pinNum.length <= 4) {
                pins.push({
                    number: pinNum,
                    raw: match[0]
                });
            }
        }
        
        return [...new Set(pins.map(p => p.number))].map(num => ({ number: num }));
    }

    getUnit(prefix, type) {
        const units = {
            resistance: {
                '': 'Ω',
                'k': 'kΩ',
                'K': 'kΩ',
                'm': 'mΩ',
                'M': 'MΩ'
            },
            capacitance: {
                '': 'F',
                'm': 'mF',
                'μ': 'μF',
                'u': 'μF',
                'n': 'nF',
                'p': 'pF'
            },
            current: {
                '': 'A',
                'm': 'mA',
                'μ': 'μA',
                'u': 'μA',
                'n': 'nA'
            }
        };
        
        return units[type]?.[prefix] || '';
    }

    async readAllParameters(canvas, components) {
        const results = [];
        
        for (const component of components) {
            const params = await this.readParameters(canvas, component, components);
            results.push({
                component: component,
                ...params
            });
        }
        
        return results;
    }

    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.tesseractReady = false;
        }
    }
}

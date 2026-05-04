"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const Tesseract = require("tesseract.js");
let OcrService = class OcrService {
    async extractTextFromImage(imageBase64) {
        try {
            let imageBuffer;
            if (imageBase64.startsWith('data:image')) {
                const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                imageBuffer = Buffer.from(base64Data, 'base64');
            }
            else {
                imageBuffer = Buffer.from(imageBase64, 'base64');
            }
            const worker = await Tesseract.createWorker('chi_sim+eng', 1, {
                logger: (m) => console.log(m),
            });
            const { data: { text } } = await worker.recognize(imageBuffer);
            await worker.terminate();
            const expiryDates = this.extractExpiryDates(text);
            return {
                success: true,
                text: text.trim(),
                expiryDates,
                message: expiryDates.length > 0
                    ? `成功识别，找到 ${expiryDates.length} 个有效期信息`
                    : '成功识别文本，但未找到明确的有效期信息',
            };
        }
        catch (error) {
            return {
                success: false,
                message: `OCR识别失败: ${error.message}`,
            };
        }
    }
    extractExpiryDates(text) {
        const dates = [];
        const patterns = [
            { regex: /有效期(?:至|截止)?[:：\s]*(\d{4}[-年\/\\\s]\d{1,2}[-月\/\\\s]\d{1,2}[日]?)/g, group: 1 },
            { regex: /EXP(?:IRY)?[:：\s]*(\d{4}[-\/\\\s]\d{1,2}[-\/\\\s]\d{1,2})/gi, group: 1 },
            { regex: /有效期(?:至|截止)?[:：\s]*(\d{4}年?\d{2}月?\d{2}日?)/g, group: 1 },
            { regex: /使用期限[:：\s]*(\d{4}[-年\/\\\s]\d{1,2}[-月\/\\\s]\d{1,2}[日]?)/g, group: 1 },
            { regex: /保质期(?:至|截止)?[:：\s]*(\d{4}[-年\/\\\s]\d{1,2}[-月\/\\\s]\d{1,2}[日]?)/g, group: 1 },
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                const dateStr = this.normalizeDate(match[pattern.group]);
                if (dateStr && !dates.includes(dateStr)) {
                    dates.push(dateStr);
                }
            }
        }
        const simpleDatePattern = /(\d{4}[-年\/]\d{1,2}[-月\/]\d{1,2}[日]?)/g;
        let match;
        while ((match = simpleDatePattern.exec(text)) !== null) {
            const dateStr = this.normalizeDate(match[1]);
            if (dateStr && !dates.includes(dateStr)) {
                const context = text.substring(Math.max(0, match.index - 30), Math.min(text.length, match.index + match[0].length + 30));
                const contextLower = context.toLowerCase();
                if (contextLower.includes('有效期') ||
                    contextLower.includes('expiry') ||
                    contextLower.includes('使用期限') ||
                    contextLower.includes('保质期')) {
                    dates.push(dateStr);
                }
            }
        }
        return dates;
    }
    normalizeDate(dateStr) {
        try {
            const cleaned = dateStr
                .replace(/年/g, '-')
                .replace(/月/g, '-')
                .replace(/日/g, '')
                .replace(/\//g, '-')
                .replace(/\s+/g, '')
                .trim();
            const parts = cleaned.split('-');
            if (parts.length !== 3)
                return null;
            const year = parts[0].padStart(4, '2');
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            const date = new Date(`${year}-${month}-${day}`);
            if (isNaN(date.getTime()))
                return null;
            return `${year}-${month}-${day}`;
        }
        catch {
            return null;
        }
    }
    parseTextForMedicineInfo(text) {
        const result = {};
        const expiryDates = this.extractExpiryDates(text);
        if (expiryDates.length > 0) {
            result.expiryDate = expiryDates[0];
        }
        const namePatterns = [
            /药品名称[:：\s]*([^\n\r]{2,30})/g,
            /通用名[:：\s]*([^\n\r]{2,30})/g,
            /商品名[:：\s]*([^\n\r]{2,30})/g,
        ];
        for (const pattern of namePatterns) {
            const match = pattern.exec(text);
            if (match) {
                result.name = match[1].trim();
                break;
            }
        }
        const batchPattern = /批号[:：\s]*([A-Za-z0-9]{6,})/g;
        const batchMatch = batchPattern.exec(text);
        if (batchMatch) {
            result.batchNumber = batchMatch[1];
        }
        const manufacturerPattern = /生产企业|制造商|厂家[:：\s]*([^\n\r]{4,50})/g;
        const manuMatch = manufacturerPattern.exec(text);
        if (manuMatch) {
            result.manufacturer = manuMatch[1].trim();
        }
        const specPattern = /规格|规格型号[:：\s]*([^\n\r]{2,30})/g;
        const specMatch = specPattern.exec(text);
        if (specMatch) {
            result.specifications = specMatch[1].trim();
        }
        return result;
    }
};
exports.OcrService = OcrService;
exports.OcrService = OcrService = __decorate([
    (0, common_1.Injectable)()
], OcrService);
//# sourceMappingURL=ocr.service.js.map
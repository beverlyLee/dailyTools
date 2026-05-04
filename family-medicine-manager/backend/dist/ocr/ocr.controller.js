"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrController = void 0;
const common_1 = require("@nestjs/common");
const ocr_service_1 = require("./ocr.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let OcrController = class OcrController {
    constructor(ocrService) {
        this.ocrService = ocrService;
    }
    async recognize(body) {
        if (!body.imageBase64) {
            return {
                success: false,
                message: '请提供图片数据',
            };
        }
        return this.ocrService.extractTextFromImage(body.imageBase64);
    }
    async parseMedicine(body) {
        if (!body.text) {
            return {
                success: false,
                message: '请提供文本内容',
            };
        }
        const info = this.ocrService.parseTextForMedicineInfo(body.text);
        return {
            success: true,
            data: info,
            message: '解析完成',
        };
    }
    async recognizeAndParse(body) {
        if (!body.imageBase64) {
            return {
                success: false,
                message: '请提供图片数据',
            };
        }
        const ocrResult = await this.ocrService.extractTextFromImage(body.imageBase64);
        if (!ocrResult.success) {
            return ocrResult;
        }
        const medicineInfo = this.ocrService.parseTextForMedicineInfo(ocrResult.text);
        return {
            success: true,
            text: ocrResult.text,
            expiryDates: ocrResult.expiryDates,
            medicineInfo,
            message: '识别并解析完成',
        };
    }
};
exports.OcrController = OcrController;
__decorate([
    (0, common_1.Post)('recognize'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OcrController.prototype, "recognize", null);
__decorate([
    (0, common_1.Post)('parse-medicine'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OcrController.prototype, "parseMedicine", null);
__decorate([
    (0, common_1.Post)('recognize-and-parse'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OcrController.prototype, "recognizeAndParse", null);
exports.OcrController = OcrController = __decorate([
    (0, common_1.Controller)('ocr'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ocr_service_1.OcrService])
], OcrController);
//# sourceMappingURL=ocr.controller.js.map
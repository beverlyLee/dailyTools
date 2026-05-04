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
exports.ScannerController = void 0;
const common_1 = require("@nestjs/common");
const scanner_service_1 = require("./scanner.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let ScannerController = class ScannerController {
    constructor(scannerService) {
        this.scannerService = scannerService;
    }
    async queryByBarcode(barcode) {
        return this.scannerService.queryByBarcode(barcode);
    }
    validateBarcode(barcode) {
        const isValid = this.scannerService.validateBarcode(barcode);
        return {
            success: true,
            isValid,
            message: isValid ? '条码格式有效' : '条码格式无效',
        };
    }
    async recognizeBarcode(body) {
        if (body.barcode) {
            return this.scannerService.queryByBarcode(body.barcode);
        }
        if (body.imageBase64) {
            return {
                success: false,
                message: '图片识别请在前端使用ZXing库完成，后端仅支持条码字符串查询',
            };
        }
        return {
            success: false,
            message: '请提供条码或图片数据',
        };
    }
};
exports.ScannerController = ScannerController;
__decorate([
    (0, common_1.Get)('barcode/:barcode'),
    __param(0, (0, common_1.Param)('barcode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScannerController.prototype, "queryByBarcode", null);
__decorate([
    (0, common_1.Get)('validate/:barcode'),
    __param(0, (0, common_1.Param)('barcode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ScannerController.prototype, "validateBarcode", null);
__decorate([
    (0, common_1.Post)('recognize'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ScannerController.prototype, "recognizeBarcode", null);
exports.ScannerController = ScannerController = __decorate([
    (0, common_1.Controller)('scanner'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [scanner_service_1.ScannerService])
], ScannerController);
//# sourceMappingURL=scanner.controller.js.map
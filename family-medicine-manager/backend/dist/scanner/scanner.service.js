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
exports.ScannerService = void 0;
const common_1 = require("@nestjs/common");
const medicine_service_1 = require("../medicine/medicine.service");
let ScannerService = class ScannerService {
    constructor(medicineService) {
        this.medicineService = medicineService;
    }
    validateBarcode(barcode) {
        if (!barcode)
            return false;
        const ean13Regex = /^\d{13}$/;
        const ean8Regex = /^\d{8}$/;
        const upcARegex = /^\d{12}$/;
        const code128Regex = /^[\x00-\x7F]+$/;
        return ean13Regex.test(barcode) ||
            ean8Regex.test(barcode) ||
            upcARegex.test(barcode) ||
            code128Regex.test(barcode);
    }
    async queryByBarcode(barcode) {
        if (!this.validateBarcode(barcode)) {
            return { success: false, message: '无效的条形码格式' };
        }
        const localDictionary = await this.medicineService.findDictionaryByBarcode(barcode);
        if (localDictionary) {
            return { success: true, data: localDictionary, message: '从本地字典找到' };
        }
        const mockResult = await this.queryExternalDrugAPI(barcode);
        if (mockResult) {
            const saved = await this.medicineService.createDictionaryItem({
                barcode,
                name: mockResult.name,
                genericName: mockResult.genericName,
                brand: mockResult.brand,
                dosageForm: mockResult.dosageForm,
                strength: mockResult.strength,
                manufacturer: mockResult.manufacturer,
                approvalNumber: mockResult.approvalNumber,
                usageInstructions: mockResult.usageInstructions,
                indications: mockResult.indications,
                source: 'mock',
            });
            return { success: true, data: saved, message: '从外部API获取' };
        }
        return { success: false, message: '未找到该药品信息，请手动录入' };
    }
    async queryExternalDrugAPI(barcode) {
        const mockDatabase = {
            '6901234567890': {
                name: '阿莫西林胶囊',
                genericName: '阿莫西林',
                brand: '某品牌',
                dosageForm: '胶囊剂',
                strength: '0.5g',
                manufacturer: '某制药有限公司',
                approvalNumber: '国药准字H12345678',
                usageInstructions: '口服。成人一次0.5g，一日3-4次。',
                indications: '用于敏感菌所致的呼吸道、泌尿道、皮肤软组织感染等。',
            },
            '6901234567891': {
                name: '布洛芬缓释胶囊',
                genericName: '布洛芬',
                brand: '芬必得',
                dosageForm: '缓释胶囊',
                strength: '0.3g',
                manufacturer: '中美天津史克制药有限公司',
                approvalNumber: '国药准字H10900089',
                usageInstructions: '口服，成人一次1粒，一日2次。',
                indications: '用于缓解轻至中度疼痛如头痛、关节痛、偏头痛、牙痛、肌肉痛、神经痛、痛经。',
            },
            '6901234567892': {
                name: '感冒灵颗粒',
                genericName: '感冒灵',
                brand: '999',
                dosageForm: '颗粒剂',
                strength: '10g',
                manufacturer: '华润三九医药股份有限公司',
                approvalNumber: '国药准字Z44021940',
                usageInstructions: '开水冲服，一次10克，一日3次。',
                indications: '用于感冒引起的头痛、发热、鼻塞、流涕、咽痛等症状。',
            },
        };
        await new Promise(resolve => setTimeout(resolve, 500));
        if (mockDatabase[barcode]) {
            return mockDatabase[barcode];
        }
        if (barcode.length === 13 && barcode.startsWith('69')) {
            return {
                name: `药品-${barcode.slice(-4)}`,
                genericName: '通用药品',
                brand: '未知品牌',
                dosageForm: '未知剂型',
                strength: '未知规格',
                manufacturer: '未知生产厂家',
                source: 'mock-generated',
            };
        }
        return null;
    }
    decodeBarcodeFromImage(imageBuffer) {
        return Promise.resolve({
            success: false,
            message: '条形码识别需要在前端通过ZXing库完成，后端仅负责解析条码信息',
        });
    }
};
exports.ScannerService = ScannerService;
exports.ScannerService = ScannerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => medicine_service_1.MedicineService))),
    __metadata("design:paramtypes", [medicine_service_1.MedicineService])
], ScannerService);
//# sourceMappingURL=scanner.service.js.map
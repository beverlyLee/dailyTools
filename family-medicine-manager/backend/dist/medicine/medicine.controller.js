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
exports.MedicineController = void 0;
const common_1 = require("@nestjs/common");
const medicine_service_1 = require("./medicine.service");
const create_medicine_dto_1 = require("./dto/create-medicine.dto");
const update_medicine_dto_1 = require("./dto/update-medicine.dto");
const dose_medicine_dto_1 = require("./dto/dose-medicine.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const medicine_entity_1 = require("./entities/medicine.entity");
let MedicineController = class MedicineController {
    constructor(medicineService) {
        this.medicineService = medicineService;
    }
    create(req, createMedicineDto) {
        return this.medicineService.create(req.user.id, createMedicineDto);
    }
    findAll(req, status, isFavorite, tag, search) {
        return this.medicineService.findAll(req.user.id, {
            status,
            isFavorite: isFavorite !== undefined ? isFavorite === 'true' : undefined,
            tag,
            search,
        });
    }
    getExpiring(req, days = '7') {
        return this.medicineService.getExpiring(req.user.id, parseInt(days, 10));
    }
    getLowStock(req, threshold = '0.3') {
        return this.medicineService.getLowStock(req.user.id, parseFloat(threshold));
    }
    getExpired(req) {
        return this.medicineService.getExpired(req.user.id);
    }
    findByBarcode(barcode, req) {
        return this.medicineService.findByBarcode(barcode, req.user.id);
    }
    findOne(id, req) {
        return this.medicineService.findOne(id, req.user.id);
    }
    getLogs(id, req, limit = '20') {
        return this.medicineService.getLogs(id, req.user.id, parseInt(limit, 10));
    }
    update(id, req, updateMedicineDto) {
        return this.medicineService.update(id, req.user.id, updateMedicineDto);
    }
    dose(id, req, doseDto) {
        return this.medicineService.dose(id, req.user.id, doseDto);
    }
    toggleFavorite(id, req) {
        return this.medicineService.toggleFavorite(id, req.user.id);
    }
    remove(id, req) {
        return this.medicineService.remove(id, req.user.id);
    }
};
exports.MedicineController = MedicineController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_medicine_dto_1.CreateMedicineDto]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('isFavorite')),
    __param(3, (0, common_1.Query)('tag')),
    __param(4, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('expiring'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "getExpiring", null);
__decorate([
    (0, common_1.Get)('low-stock'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('threshold')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "getLowStock", null);
__decorate([
    (0, common_1.Get)('expired'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "getExpired", null);
__decorate([
    (0, common_1.Get)('barcode/:barcode'),
    __param(0, (0, common_1.Param)('barcode')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "findByBarcode", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/logs'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_medicine_dto_1.UpdateMedicineDto]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/dose'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dose_medicine_dto_1.DoseMedicineDto]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "dose", null);
__decorate([
    (0, common_1.Post)(':id/toggle-favorite'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "toggleFavorite", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MedicineController.prototype, "remove", null);
exports.MedicineController = MedicineController = __decorate([
    (0, common_1.Controller)('medicines'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [medicine_service_1.MedicineService])
], MedicineController);
//# sourceMappingURL=medicine.controller.js.map
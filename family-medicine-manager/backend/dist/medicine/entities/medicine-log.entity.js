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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicineLog = exports.LogAction = void 0;
const typeorm_1 = require("typeorm");
const medicine_entity_1 = require("./medicine.entity");
const user_entity_1 = require("../../user/entities/user.entity");
var LogAction;
(function (LogAction) {
    LogAction["CREATED"] = "created";
    LogAction["UPDATED"] = "updated";
    LogAction["DELETED"] = "deleted";
    LogAction["DOSED"] = "dosed";
    LogAction["RETURNED"] = "returned";
    LogAction["EXPIRED"] = "expired";
    LogAction["LOW_STOCK"] = "low_stock";
})(LogAction || (exports.LogAction = LogAction = {}));
let MedicineLog = class MedicineLog {
};
exports.MedicineLog = MedicineLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MedicineLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: LogAction,
    }),
    __metadata("design:type", String)
], MedicineLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], MedicineLog.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], MedicineLog.prototype, "quantityChanged", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], MedicineLog.prototype, "previousState", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], MedicineLog.prototype, "newState", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MedicineLog.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => medicine_entity_1.Medicine, (medicine) => medicine.logs, { onDelete: 'CASCADE' }),
    __metadata("design:type", medicine_entity_1.Medicine)
], MedicineLog.prototype, "medicine", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MedicineLog.prototype, "medicineId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    __metadata("design:type", user_entity_1.User)
], MedicineLog.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MedicineLog.prototype, "userId", void 0);
exports.MedicineLog = MedicineLog = __decorate([
    (0, typeorm_1.Entity)()
], MedicineLog);
//# sourceMappingURL=medicine-log.entity.js.map
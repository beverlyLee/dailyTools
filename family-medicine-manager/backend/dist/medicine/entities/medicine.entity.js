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
exports.Medicine = exports.StorageCondition = exports.MedicineStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../user/entities/user.entity");
const reminder_entity_1 = require("../../reminder/entities/reminder.entity");
const medicine_log_entity_1 = require("./medicine-log.entity");
var MedicineStatus;
(function (MedicineStatus) {
    MedicineStatus["IN_STOCK"] = "in_stock";
    MedicineStatus["LOW_STOCK"] = "low_stock";
    MedicineStatus["EXPIRED"] = "expired";
    MedicineStatus["USED_UP"] = "used_up";
})(MedicineStatus || (exports.MedicineStatus = MedicineStatus = {}));
var StorageCondition;
(function (StorageCondition) {
    StorageCondition["ROOM_TEMP"] = "room_temp";
    StorageCondition["REFRIGERATED"] = "refrigerated";
    StorageCondition["FROZEN"] = "frozen";
    StorageCondition["DARK"] = "dark";
})(StorageCondition || (exports.StorageCondition = StorageCondition = {}));
let Medicine = class Medicine {
};
exports.Medicine = Medicine;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Medicine.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Medicine.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "genericName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "brand", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "barcode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "dosageForm", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "strength", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 1 }),
    __metadata("design:type", Number)
], Medicine.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '盒' }),
    __metadata("design:type", String)
], Medicine.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Medicine.prototype, "totalQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Medicine.prototype, "remainingQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], Medicine.prototype, "productionDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], Medicine.prototype, "expiryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "batchNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: StorageCondition,
        default: StorageCondition.ROOM_TEMP,
    }),
    __metadata("design:type", String)
], Medicine.prototype, "storageCondition", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: MedicineStatus,
        default: MedicineStatus.IN_STOCK,
    }),
    __metadata("design:type", String)
], Medicine.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "usageInstructions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "indications", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "contraindications", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "sideEffects", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "purchaseLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], Medicine.prototype, "purchaseDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Medicine.prototype, "purchasePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Medicine.prototype, "isPrescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "prescribingDoctor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Medicine.prototype, "prescriptionNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Medicine.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Medicine.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Medicine.prototype, "isFavorite", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Medicine.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Medicine.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.medicines, { onDelete: 'CASCADE' }),
    __metadata("design:type", user_entity_1.User)
], Medicine.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Medicine.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => reminder_entity_1.Reminder, (reminder) => reminder.medicine),
    __metadata("design:type", Array)
], Medicine.prototype, "reminders", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => medicine_log_entity_1.MedicineLog, (log) => log.medicine),
    __metadata("design:type", Array)
], Medicine.prototype, "logs", void 0);
exports.Medicine = Medicine = __decorate([
    (0, typeorm_1.Entity)()
], Medicine);
//# sourceMappingURL=medicine.entity.js.map
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
exports.Reminder = exports.RepeatFrequency = exports.ReminderStatus = exports.ReminderType = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../user/entities/user.entity");
const medicine_entity_1 = require("../../medicine/entities/medicine.entity");
var ReminderType;
(function (ReminderType) {
    ReminderType["DOSAGE"] = "dosage";
    ReminderType["EXPIRY"] = "expiry";
    ReminderType["LOW_STOCK"] = "low_stock";
    ReminderType["CUSTOM"] = "custom";
})(ReminderType || (exports.ReminderType = ReminderType = {}));
var ReminderStatus;
(function (ReminderStatus) {
    ReminderStatus["PENDING"] = "pending";
    ReminderStatus["ACTIVE"] = "active";
    ReminderStatus["TRIGGERED"] = "triggered";
    ReminderStatus["DISMISSED"] = "dismissed";
    ReminderStatus["DISABLED"] = "disabled";
})(ReminderStatus || (exports.ReminderStatus = ReminderStatus = {}));
var RepeatFrequency;
(function (RepeatFrequency) {
    RepeatFrequency["ONCE"] = "once";
    RepeatFrequency["DAILY"] = "daily";
    RepeatFrequency["WEEKLY"] = "weekly";
    RepeatFrequency["MONTHLY"] = "monthly";
    RepeatFrequency["CUSTOM"] = "custom";
})(RepeatFrequency || (exports.RepeatFrequency = RepeatFrequency = {}));
let Reminder = class Reminder {
};
exports.Reminder = Reminder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Reminder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Reminder.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Reminder.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: ReminderType,
        default: ReminderType.DOSAGE,
    }),
    __metadata("design:type", String)
], Reminder.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: ReminderStatus,
        default: ReminderStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], Reminder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: RepeatFrequency,
        default: RepeatFrequency.ONCE,
    }),
    __metadata("design:type", String)
], Reminder.prototype, "repeatFrequency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Reminder.prototype, "repeatDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], Reminder.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], Reminder.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time' }),
    __metadata("design:type", String)
], Reminder.prototype, "reminderTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], Reminder.prototype, "additionalTimes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Reminder.prototype, "advanceNoticeMinutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Reminder.prototype, "notificationChannels", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Reminder.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Reminder.prototype, "lastTriggeredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Reminder.prototype, "nextTriggerAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Reminder.prototype, "triggerCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Reminder.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Reminder.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.reminders, { onDelete: 'CASCADE' }),
    __metadata("design:type", user_entity_1.User)
], Reminder.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Reminder.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => medicine_entity_1.Medicine, (medicine) => medicine.reminders, { onDelete: 'CASCADE', nullable: true }),
    __metadata("design:type", medicine_entity_1.Medicine)
], Reminder.prototype, "medicine", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Reminder.prototype, "medicineId", void 0);
exports.Reminder = Reminder = __decorate([
    (0, typeorm_1.Entity)()
], Reminder);
//# sourceMappingURL=reminder.entity.js.map
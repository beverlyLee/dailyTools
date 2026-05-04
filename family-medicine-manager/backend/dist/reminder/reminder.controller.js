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
exports.ReminderController = void 0;
const common_1 = require("@nestjs/common");
const reminder_service_1 = require("./reminder.service");
const create_reminder_dto_1 = require("./dto/create-reminder.dto");
const update_reminder_dto_1 = require("./dto/update-reminder.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const reminder_entity_1 = require("./entities/reminder.entity");
let ReminderController = class ReminderController {
    constructor(reminderService) {
        this.reminderService = reminderService;
    }
    create(req, createReminderDto) {
        return this.reminderService.create(req.user.id, createReminderDto);
    }
    findAll(req, status, type, medicineId) {
        return this.reminderService.findAll(req.user.id, { status, type, medicineId });
    }
    getUpcoming(req, limit = '10') {
        return this.reminderService.getUpcoming(req.user.id, parseInt(limit, 10));
    }
    findOne(id, req) {
        return this.reminderService.findOne(id, req.user.id);
    }
    update(id, req, updateReminderDto) {
        return this.reminderService.update(id, req.user.id, updateReminderDto);
    }
    dismiss(id, req) {
        return this.reminderService.dismiss(id, req.user.id);
    }
    toggle(id, req) {
        return this.reminderService.toggle(id, req.user.id);
    }
    remove(id, req) {
        return this.reminderService.remove(id, req.user.id);
    }
};
exports.ReminderController = ReminderController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_reminder_dto_1.CreateReminderDto]),
    __metadata("design:returntype", void 0)
], ReminderController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('medicineId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ReminderController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('upcoming'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ReminderController.prototype, "getUpcoming", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ReminderController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_reminder_dto_1.UpdateReminderDto]),
    __metadata("design:returntype", void 0)
], ReminderController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/dismiss'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ReminderController.prototype, "dismiss", null);
__decorate([
    (0, common_1.Post)(':id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ReminderController.prototype, "toggle", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ReminderController.prototype, "remove", null);
exports.ReminderController = ReminderController = __decorate([
    (0, common_1.Controller)('reminders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [reminder_service_1.ReminderService])
], ReminderController);
//# sourceMappingURL=reminder.controller.js.map
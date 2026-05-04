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
var ReminderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule = require("node-schedule");
const reminder_entity_1 = require("./entities/reminder.entity");
const medicine_entity_1 = require("../medicine/entities/medicine.entity");
let ReminderService = ReminderService_1 = class ReminderService {
    constructor(reminderRepository, medicineRepository) {
        this.reminderRepository = reminderRepository;
        this.medicineRepository = medicineRepository;
        this.logger = new common_1.Logger(ReminderService_1.name);
        this.scheduledJobs = new Map();
    }
    async onModuleInit() {
        this.logger.log('ReminderService initialized, loading active reminders...');
        await this.loadActiveReminders();
    }
    async loadActiveReminders() {
        const activeReminders = await this.reminderRepository.find({
            where: { status: reminder_entity_1.ReminderStatus.ACTIVE },
        });
        for (const reminder of activeReminders) {
            this.scheduleReminder(reminder);
        }
    }
    scheduleReminder(reminder) {
        const jobId = `reminder-${reminder.id}`;
        if (this.scheduledJobs.has(jobId)) {
            this.scheduledJobs.get(jobId).cancel();
        }
        const rule = this.buildScheduleRule(reminder);
        const job = schedule.scheduleJob(jobId, rule, () => {
            this.triggerReminder(reminder);
        });
        if (job) {
            this.scheduledJobs.set(jobId, job);
            this.logger.log(`Scheduled reminder: ${reminder.title} (${reminder.id})`);
        }
    }
    buildScheduleRule(reminder) {
        const rule = new schedule.RecurrenceRule();
        const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
        rule.hour = hours;
        rule.minute = minutes;
        rule.second = 0;
        switch (reminder.repeatFrequency) {
            case reminder_entity_1.RepeatFrequency.DAILY:
                return rule;
            case reminder_entity_1.RepeatFrequency.WEEKLY:
                rule.dayOfWeek = reminder.repeatDays || [0, 1, 2, 3, 4, 5, 6];
                return rule;
            case reminder_entity_1.RepeatFrequency.MONTHLY:
                rule.date = new Date(reminder.startDate).getDate();
                return rule;
            case reminder_entity_1.RepeatFrequency.ONCE:
            default:
                const triggerDate = new Date(reminder.startDate);
                triggerDate.setHours(hours, minutes, 0, 0);
                return triggerDate;
        }
    }
    async triggerReminder(reminder) {
        this.logger.log(`Triggering reminder: ${reminder.title} (${reminder.id})`);
        reminder.lastTriggeredAt = new Date();
        reminder.triggerCount += 1;
        reminder.status = reminder_entity_1.ReminderStatus.TRIGGERED;
        await this.reminderRepository.save(reminder);
        if (reminder.repeatFrequency === reminder_entity_1.RepeatFrequency.ONCE) {
            const jobId = `reminder-${reminder.id}`;
            if (this.scheduledJobs.has(jobId)) {
                this.scheduledJobs.get(jobId).cancel();
                this.scheduledJobs.delete(jobId);
            }
        }
        else {
            reminder.status = reminder_entity_1.ReminderStatus.ACTIVE;
            reminder.nextTriggerAt = this.calculateNextTrigger(reminder);
            await this.reminderRepository.save(reminder);
        }
    }
    calculateNextTrigger(reminder) {
        const now = new Date();
        const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
        const nextTrigger = new Date(now);
        nextTrigger.setHours(hours, minutes, 0, 0);
        if (nextTrigger <= now) {
            nextTrigger.setDate(nextTrigger.getDate() + 1);
        }
        if (reminder.repeatFrequency === reminder_entity_1.RepeatFrequency.WEEKLY && reminder.repeatDays?.length > 0) {
            const currentDay = nextTrigger.getDay();
            const sortedDays = [...reminder.repeatDays].sort((a, b) => a - b);
            let nextDay = sortedDays.find(d => d >= currentDay);
            if (nextDay === undefined) {
                nextDay = sortedDays[0];
                nextTrigger.setDate(nextTrigger.getDate() + ((nextDay + 7 - currentDay) % 7));
            }
            else if (nextDay !== currentDay) {
                nextTrigger.setDate(nextTrigger.getDate() + (nextDay - currentDay));
            }
        }
        return nextTrigger;
    }
    async create(userId, createReminderDto) {
        const repeatFrequency = createReminderDto.repeatFrequency ?? reminder_entity_1.RepeatFrequency.ONCE;
        const reminder = this.reminderRepository.create({
            ...createReminderDto,
            userId,
            status: reminder_entity_1.ReminderStatus.ACTIVE,
            nextTriggerAt: this.calculateNextTrigger({
                reminderTime: createReminderDto.reminderTime,
                repeatFrequency,
                repeatDays: createReminderDto.repeatDays,
            }),
        });
        if (createReminderDto.medicineId) {
            const medicine = await this.medicineRepository.findOne({
                where: { id: createReminderDto.medicineId, userId },
            });
            if (medicine) {
                reminder.medicine = medicine;
            }
        }
        const saved = await this.reminderRepository.save(reminder);
        this.scheduleReminder(saved);
        return saved;
    }
    async findAll(userId, filters) {
        const query = this.reminderRepository
            .createQueryBuilder('reminder')
            .where('reminder.userId = :userId', { userId })
            .leftJoinAndSelect('reminder.medicine', 'medicine');
        if (filters?.status) {
            query.andWhere('reminder.status = :status', { status: filters.status });
        }
        if (filters?.type) {
            query.andWhere('reminder.type = :type', { type: filters.type });
        }
        if (filters?.medicineId) {
            query.andWhere('reminder.medicineId = :medicineId', { medicineId: filters.medicineId });
        }
        query.orderBy('reminder.nextTriggerAt', 'ASC');
        return query.getMany();
    }
    async findOne(id, userId) {
        const reminder = await this.reminderRepository.findOne({
            where: { id, userId },
            relations: ['medicine'],
        });
        if (!reminder) {
            throw new common_1.NotFoundException(`提醒ID ${id} 不存在`);
        }
        return reminder;
    }
    async update(id, userId, updateReminderDto) {
        const reminder = await this.findOne(id, userId);
        Object.assign(reminder, updateReminderDto);
        if (updateReminderDto.status === reminder_entity_1.ReminderStatus.DISABLED || updateReminderDto.status === reminder_entity_1.ReminderStatus.DISMISSED) {
            const jobId = `reminder-${reminder.id}`;
            if (this.scheduledJobs.has(jobId)) {
                this.scheduledJobs.get(jobId).cancel();
                this.scheduledJobs.delete(jobId);
            }
        }
        else if (updateReminderDto.status === reminder_entity_1.ReminderStatus.ACTIVE) {
            this.scheduleReminder(reminder);
        }
        return this.reminderRepository.save(reminder);
    }
    async remove(id, userId) {
        const reminder = await this.findOne(id, userId);
        const jobId = `reminder-${reminder.id}`;
        if (this.scheduledJobs.has(jobId)) {
            this.scheduledJobs.get(jobId).cancel();
            this.scheduledJobs.delete(jobId);
        }
        const result = await this.reminderRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`提醒ID ${id} 不存在`);
        }
    }
    async createMedicineExpiryReminder(userId, medicine, daysBefore = 7) {
        const expiryDate = new Date(medicine.expiryDate);
        expiryDate.setDate(expiryDate.getDate() - daysBefore);
        const now = new Date();
        if (expiryDate < now) {
            expiryDate.setDate(now.getDate() + 1);
        }
        return this.create(userId, {
            title: `${medicine.name} 即将过期提醒`,
            description: `药品 ${medicine.name} 将在 ${daysBefore} 天后过期`,
            type: reminder_entity_1.ReminderType.EXPIRY,
            repeatFrequency: reminder_entity_1.RepeatFrequency.ONCE,
            startDate: expiryDate.toISOString(),
            reminderTime: '09:00',
            medicineId: medicine.id,
            advanceNoticeMinutes: 0,
            notificationChannels: ['push'],
        });
    }
    async createLowStockReminder(userId, medicine) {
        const now = new Date();
        now.setDate(now.getDate() + 1);
        return this.create(userId, {
            title: `${medicine.name} 库存不足提醒`,
            description: `药品 ${medicine.name} 库存不足，请及时补充`,
            type: reminder_entity_1.ReminderType.LOW_STOCK,
            repeatFrequency: reminder_entity_1.RepeatFrequency.WEEKLY,
            repeatDays: [1, 3, 5],
            startDate: now.toISOString(),
            reminderTime: '10:00',
            medicineId: medicine.id,
            advanceNoticeMinutes: 0,
            notificationChannels: ['push'],
        });
    }
    async dismiss(id, userId) {
        return this.update(id, userId, { status: reminder_entity_1.ReminderStatus.DISMISSED });
    }
    async toggle(id, userId) {
        const reminder = await this.findOne(id, userId);
        const newStatus = reminder.status === reminder_entity_1.ReminderStatus.ACTIVE
            ? reminder_entity_1.ReminderStatus.DISABLED
            : reminder_entity_1.ReminderStatus.ACTIVE;
        return this.update(id, userId, { status: newStatus });
    }
    getUpcoming(userId, limit = 10) {
        return this.reminderRepository.find({
            where: { userId, status: reminder_entity_1.ReminderStatus.ACTIVE },
            order: { nextTriggerAt: 'ASC' },
            take: limit,
            relations: ['medicine'],
        });
    }
};
exports.ReminderService = ReminderService;
exports.ReminderService = ReminderService = ReminderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(reminder_entity_1.Reminder)),
    __param(1, (0, typeorm_1.InjectRepository)(medicine_entity_1.Medicine)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ReminderService);
//# sourceMappingURL=reminder.service.js.map
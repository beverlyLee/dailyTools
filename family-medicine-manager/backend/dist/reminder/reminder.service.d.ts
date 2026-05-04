import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Reminder, ReminderStatus, ReminderType } from './entities/reminder.entity';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { Medicine } from '../medicine/entities/medicine.entity';
export declare class ReminderService implements OnModuleInit {
    private readonly reminderRepository;
    private readonly medicineRepository;
    private readonly logger;
    private scheduledJobs;
    constructor(reminderRepository: Repository<Reminder>, medicineRepository: Repository<Medicine>);
    onModuleInit(): Promise<void>;
    private loadActiveReminders;
    private scheduleReminder;
    private buildScheduleRule;
    private triggerReminder;
    private calculateNextTrigger;
    create(userId: string, createReminderDto: CreateReminderDto): Promise<Reminder>;
    findAll(userId: string, filters?: {
        status?: ReminderStatus;
        type?: ReminderType;
        medicineId?: string;
    }): Promise<Reminder[]>;
    findOne(id: string, userId: string): Promise<Reminder>;
    update(id: string, userId: string, updateReminderDto: UpdateReminderDto): Promise<Reminder>;
    remove(id: string, userId: string): Promise<void>;
    createMedicineExpiryReminder(userId: string, medicine: Medicine, daysBefore?: number): Promise<Reminder>;
    createLowStockReminder(userId: string, medicine: Medicine): Promise<Reminder>;
    dismiss(id: string, userId: string): Promise<Reminder>;
    toggle(id: string, userId: string): Promise<Reminder>;
    getUpcoming(userId: string, limit?: number): Promise<Reminder[]>;
}

import { ReminderService } from './reminder.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { ReminderStatus, ReminderType } from './entities/reminder.entity';
export declare class ReminderController {
    private readonly reminderService;
    constructor(reminderService: ReminderService);
    create(req: any, createReminderDto: CreateReminderDto): Promise<import("./entities/reminder.entity").Reminder>;
    findAll(req: any, status?: ReminderStatus, type?: ReminderType, medicineId?: string): Promise<import("./entities/reminder.entity").Reminder[]>;
    getUpcoming(req: any, limit?: string): Promise<import("./entities/reminder.entity").Reminder[]>;
    findOne(id: string, req: any): Promise<import("./entities/reminder.entity").Reminder>;
    update(id: string, req: any, updateReminderDto: UpdateReminderDto): Promise<import("./entities/reminder.entity").Reminder>;
    dismiss(id: string, req: any): Promise<import("./entities/reminder.entity").Reminder>;
    toggle(id: string, req: any): Promise<import("./entities/reminder.entity").Reminder>;
    remove(id: string, req: any): Promise<void>;
}

import { CreateReminderDto } from './create-reminder.dto';
import { ReminderStatus } from '../entities/reminder.entity';
declare const UpdateReminderDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateReminderDto>>;
export declare class UpdateReminderDto extends UpdateReminderDto_base {
    status?: ReminderStatus;
}
export {};

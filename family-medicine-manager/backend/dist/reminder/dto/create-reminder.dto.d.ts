import { ReminderType, RepeatFrequency } from '../entities/reminder.entity';
export declare class CreateReminderDto {
    title: string;
    description?: string;
    type?: ReminderType;
    repeatFrequency?: RepeatFrequency;
    repeatDays?: number[];
    startDate: string;
    endDate?: string;
    reminderTime: string;
    additionalTimes?: string[];
    advanceNoticeMinutes?: number;
    medicineId?: string;
    notificationChannels?: string[];
}

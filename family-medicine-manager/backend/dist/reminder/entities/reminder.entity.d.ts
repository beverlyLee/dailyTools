import { User } from '../../user/entities/user.entity';
import { Medicine } from '../../medicine/entities/medicine.entity';
export declare enum ReminderType {
    DOSAGE = "dosage",
    EXPIRY = "expiry",
    LOW_STOCK = "low_stock",
    CUSTOM = "custom"
}
export declare enum ReminderStatus {
    PENDING = "pending",
    ACTIVE = "active",
    TRIGGERED = "triggered",
    DISMISSED = "dismissed",
    DISABLED = "disabled"
}
export declare enum RepeatFrequency {
    ONCE = "once",
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    CUSTOM = "custom"
}
export declare class Reminder {
    id: string;
    title: string;
    description: string;
    type: ReminderType;
    status: ReminderStatus;
    repeatFrequency: RepeatFrequency;
    repeatDays: number[];
    startDate: Date;
    endDate: Date;
    reminderTime: string;
    additionalTimes: string[];
    advanceNoticeMinutes: number;
    notificationChannels: string[];
    payload: Record<string, any>;
    lastTriggeredAt: Date;
    nextTriggerAt: Date;
    triggerCount: number;
    createdAt: Date;
    updatedAt: Date;
    user: User;
    userId: string;
    medicine: Medicine;
    medicineId: string;
}

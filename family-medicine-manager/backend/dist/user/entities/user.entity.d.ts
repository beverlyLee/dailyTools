import { Medicine } from '../../medicine/entities/medicine.entity';
import { Reminder } from '../../reminder/entities/reminder.entity';
export declare class User {
    id: string;
    username: string;
    email: string;
    password: string;
    nickname: string;
    avatar: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
    medicines: Medicine[];
    reminders: Reminder[];
}

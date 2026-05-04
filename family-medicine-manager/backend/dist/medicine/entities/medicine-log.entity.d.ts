import { Medicine } from './medicine.entity';
import { User } from '../../user/entities/user.entity';
export declare enum LogAction {
    CREATED = "created",
    UPDATED = "updated",
    DELETED = "deleted",
    DOSED = "dosed",
    RETURNED = "returned",
    EXPIRED = "expired",
    LOW_STOCK = "low_stock"
}
export declare class MedicineLog {
    id: string;
    action: LogAction;
    description: string;
    quantityChanged: number;
    previousState: Record<string, any>;
    newState: Record<string, any>;
    createdAt: Date;
    medicine: Medicine;
    medicineId: string;
    user: User;
    userId: string;
}

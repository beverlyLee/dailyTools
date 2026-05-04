import { User } from '../../user/entities/user.entity';
import { Reminder } from '../../reminder/entities/reminder.entity';
import { MedicineLog } from './medicine-log.entity';
export declare enum MedicineStatus {
    IN_STOCK = "in_stock",
    LOW_STOCK = "low_stock",
    EXPIRED = "expired",
    USED_UP = "used_up"
}
export declare enum StorageCondition {
    ROOM_TEMP = "room_temp",
    REFRIGERATED = "refrigerated",
    FROZEN = "frozen",
    DARK = "dark"
}
export declare class Medicine {
    id: string;
    name: string;
    genericName: string;
    brand: string;
    barcode: string;
    dosageForm: string;
    strength: string;
    quantity: number;
    unit: string;
    totalQuantity: number;
    remainingQuantity: number;
    productionDate: Date;
    expiryDate: Date;
    batchNumber: string;
    storageCondition: StorageCondition;
    status: MedicineStatus;
    usageInstructions: string;
    indications: string;
    contraindications: string;
    sideEffects: string;
    notes: string;
    purchaseLocation: string;
    purchaseDate: Date;
    purchasePrice: number;
    isPrescription: boolean;
    prescribingDoctor: string;
    prescriptionNumber: string;
    tags: string[];
    images: string[];
    isFavorite: boolean;
    createdAt: Date;
    updatedAt: Date;
    user: User;
    userId: string;
    reminders: Reminder[];
    logs: MedicineLog[];
}

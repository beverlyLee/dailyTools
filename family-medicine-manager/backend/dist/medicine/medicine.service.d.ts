import { Repository } from 'typeorm';
import { Medicine, MedicineStatus } from './entities/medicine.entity';
import { MedicineLog } from './entities/medicine-log.entity';
import { MedicineDictionary } from './entities/medicine-dictionary.entity';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { DoseMedicineDto } from './dto/dose-medicine.dto';
export declare class MedicineService {
    private readonly medicineRepository;
    private readonly medicineLogRepository;
    private readonly medicineDictionaryRepository;
    constructor(medicineRepository: Repository<Medicine>, medicineLogRepository: Repository<MedicineLog>, medicineDictionaryRepository: Repository<MedicineDictionary>);
    private calculateStatus;
    private logAction;
    create(userId: string, createMedicineDto: CreateMedicineDto): Promise<Medicine>;
    findAll(userId: string, filters?: {
        status?: MedicineStatus;
        isFavorite?: boolean;
        tag?: string;
        search?: string;
    }): Promise<Medicine[]>;
    findOne(id: string, userId: string): Promise<Medicine>;
    findByBarcode(barcode: string, userId: string): Promise<Medicine[]>;
    update(id: string, userId: string, updateMedicineDto: UpdateMedicineDto): Promise<Medicine>;
    remove(id: string, userId: string): Promise<void>;
    dose(id: string, userId: string, doseDto: DoseMedicineDto): Promise<Medicine>;
    toggleFavorite(id: string, userId: string): Promise<Medicine>;
    getExpiring(userId: string, daysAhead?: number): Promise<Medicine[]>;
    getLowStock(userId: string, threshold?: number): Promise<Medicine[]>;
    getExpired(userId: string): Promise<Medicine[]>;
    getLogs(medicineId: string, userId: string, limit?: number): Promise<MedicineLog[]>;
    findDictionaryByBarcode(barcode: string): Promise<MedicineDictionary | null>;
    createDictionaryItem(data: Partial<MedicineDictionary>): Promise<MedicineDictionary>;
}

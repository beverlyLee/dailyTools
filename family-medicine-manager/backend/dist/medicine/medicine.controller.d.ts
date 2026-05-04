import { MedicineService } from './medicine.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { DoseMedicineDto } from './dto/dose-medicine.dto';
import { MedicineStatus } from './entities/medicine.entity';
export declare class MedicineController {
    private readonly medicineService;
    constructor(medicineService: MedicineService);
    create(req: any, createMedicineDto: CreateMedicineDto): Promise<import("./entities/medicine.entity").Medicine>;
    findAll(req: any, status?: MedicineStatus, isFavorite?: string, tag?: string, search?: string): Promise<import("./entities/medicine.entity").Medicine[]>;
    getExpiring(req: any, days?: string): Promise<import("./entities/medicine.entity").Medicine[]>;
    getLowStock(req: any, threshold?: string): Promise<import("./entities/medicine.entity").Medicine[]>;
    getExpired(req: any): Promise<import("./entities/medicine.entity").Medicine[]>;
    findByBarcode(barcode: string, req: any): Promise<import("./entities/medicine.entity").Medicine[]>;
    findOne(id: string, req: any): Promise<import("./entities/medicine.entity").Medicine>;
    getLogs(id: string, req: any, limit?: string): Promise<import("./entities/medicine-log.entity").MedicineLog[]>;
    update(id: string, req: any, updateMedicineDto: UpdateMedicineDto): Promise<import("./entities/medicine.entity").Medicine>;
    dose(id: string, req: any, doseDto: DoseMedicineDto): Promise<import("./entities/medicine.entity").Medicine>;
    toggleFavorite(id: string, req: any): Promise<import("./entities/medicine.entity").Medicine>;
    remove(id: string, req: any): Promise<void>;
}

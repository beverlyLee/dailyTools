import { MedicineService } from '../medicine/medicine.service';
import { MedicineDictionary } from '../medicine/entities/medicine-dictionary.entity';
export declare class ScannerService {
    private readonly medicineService;
    constructor(medicineService: MedicineService);
    validateBarcode(barcode: string): boolean;
    queryByBarcode(barcode: string): Promise<{
        success: boolean;
        data?: MedicineDictionary;
        message: string;
    }>;
    private queryExternalDrugAPI;
    decodeBarcodeFromImage(imageBuffer: Buffer): Promise<{
        success: boolean;
        barcode?: string;
        message: string;
    }>;
}

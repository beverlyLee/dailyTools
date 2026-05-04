import { ScannerService } from './scanner.service';
export declare class ScannerController {
    private readonly scannerService;
    constructor(scannerService: ScannerService);
    queryByBarcode(barcode: string): Promise<{
        success: boolean;
        data?: import("../medicine/entities/medicine-dictionary.entity").MedicineDictionary;
        message: string;
    }>;
    validateBarcode(barcode: string): {
        success: boolean;
        isValid: boolean;
        message: string;
    };
    recognizeBarcode(body: {
        imageBase64?: string;
        barcode?: string;
    }): Promise<{
        success: boolean;
        data?: import("../medicine/entities/medicine-dictionary.entity").MedicineDictionary;
        message: string;
    }>;
}

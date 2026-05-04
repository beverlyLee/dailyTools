import { OcrService } from './ocr.service';
export declare class OcrController {
    private readonly ocrService;
    constructor(ocrService: OcrService);
    recognize(body: {
        imageBase64: string;
    }): Promise<{
        success: boolean;
        text?: string;
        expiryDates?: string[];
        message: string;
    }>;
    parseMedicine(body: {
        text: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            name?: string;
            brand?: string;
            manufacturer?: string;
            expiryDate?: string;
            batchNumber?: string;
            specifications?: string;
        };
        message: string;
    }>;
    recognizeAndParse(body: {
        imageBase64: string;
    }): Promise<{
        success: boolean;
        text?: string;
        expiryDates?: string[];
        message: string;
    } | {
        success: boolean;
        text: string;
        expiryDates: string[];
        medicineInfo: {
            name?: string;
            brand?: string;
            manufacturer?: string;
            expiryDate?: string;
            batchNumber?: string;
            specifications?: string;
        };
        message: string;
    }>;
}

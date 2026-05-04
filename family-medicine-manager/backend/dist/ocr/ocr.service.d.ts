export declare class OcrService {
    extractTextFromImage(imageBase64: string): Promise<{
        success: boolean;
        text?: string;
        expiryDates?: string[];
        message: string;
    }>;
    private extractExpiryDates;
    private normalizeDate;
    parseTextForMedicineInfo(text: string): {
        name?: string;
        brand?: string;
        manufacturer?: string;
        expiryDate?: string;
        batchNumber?: string;
        specifications?: string;
    };
}

import { ConfigService } from '@nestjs/config';
export declare class LocationService {
    private configService;
    private readonly logger;
    private readonly amapKey;
    constructor(configService: ConfigService);
    searchNearby(latitude: number, longitude: number, keywords?: string, radius?: number): Promise<{
        success: boolean;
        pois?: Array<{
            name: string;
            address: string;
            latitude: number;
            longitude: number;
            distance: number;
            telephone?: string;
            category?: string;
        }>;
        message: string;
    }>;
    private buildAmapUrl;
    private getMockNearbyPOIs;
    reverseGeocode(latitude: number, longitude: number): Promise<{
        success: boolean;
        address?: string;
        province?: string;
        city?: string;
        district?: string;
        street?: string;
        message: string;
    }>;
    searchByKeyword(keyword: string, city?: string, page?: number, offset?: number): Promise<{
        success: boolean;
        pois?: Array<{
            name: string;
            address: string;
            latitude: number;
            longitude: number;
            telephone?: string;
            category?: string;
            province?: string;
            city?: string;
            district?: string;
        }>;
        count: number;
        message: string;
    }>;
}

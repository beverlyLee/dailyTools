import { LocationService } from './location.service';
export declare class LocationController {
    private readonly locationService;
    constructor(locationService: LocationService);
    searchNearby(latitude: string, longitude: string, keywords?: string, radius?: string): Promise<{
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
    reverseGeocode(latitude: string, longitude: string): Promise<{
        success: boolean;
        address?: string;
        province?: string;
        city?: string;
        district?: string;
        street?: string;
        message: string;
    }>;
    searchByKeyword(keyword: string, city?: string, page?: string, offset?: string): Promise<{
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
    } | {
        success: boolean;
        message: string;
    }>;
    findNearbyPharmacies(latitude: string, longitude: string, radius?: string): Promise<{
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
    findNearbyHospitals(latitude: string, longitude: string, radius?: string): Promise<{
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
}

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationController = void 0;
const common_1 = require("@nestjs/common");
const location_service_1 = require("./location.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let LocationController = class LocationController {
    constructor(locationService) {
        this.locationService = locationService;
    }
    async searchNearby(latitude, longitude, keywords = '药店|医院', radius = '3000') {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lng)) {
            return {
                success: false,
                message: '请提供有效的经纬度坐标',
            };
        }
        return this.locationService.searchNearby(lat, lng, keywords, parseInt(radius, 10));
    }
    async reverseGeocode(latitude, longitude) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lng)) {
            return {
                success: false,
                message: '请提供有效的经纬度坐标',
            };
        }
        return this.locationService.reverseGeocode(lat, lng);
    }
    async searchByKeyword(keyword, city = '全国', page = '1', offset = '20') {
        if (!keyword) {
            return {
                success: false,
                message: '请提供搜索关键词',
            };
        }
        return this.locationService.searchByKeyword(keyword, city, parseInt(page, 10), parseInt(offset, 10));
    }
    async findNearbyPharmacies(latitude, longitude, radius = '3000') {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lng)) {
            return {
                success: false,
                message: '请提供有效的经纬度坐标',
            };
        }
        return this.locationService.searchNearby(lat, lng, '药店', parseInt(radius, 10));
    }
    async findNearbyHospitals(latitude, longitude, radius = '5000') {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lng)) {
            return {
                success: false,
                message: '请提供有效的经纬度坐标',
            };
        }
        return this.locationService.searchNearby(lat, lng, '医院', parseInt(radius, 10));
    }
};
exports.LocationController = LocationController;
__decorate([
    (0, common_1.Get)('nearby'),
    __param(0, (0, common_1.Query)('latitude')),
    __param(1, (0, common_1.Query)('longitude')),
    __param(2, (0, common_1.Query)('keywords')),
    __param(3, (0, common_1.Query)('radius')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], LocationController.prototype, "searchNearby", null);
__decorate([
    (0, common_1.Get)('reverse-geocode'),
    __param(0, (0, common_1.Query)('latitude')),
    __param(1, (0, common_1.Query)('longitude')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LocationController.prototype, "reverseGeocode", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Query)('city')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], LocationController.prototype, "searchByKeyword", null);
__decorate([
    (0, common_1.Get)('pharmacies'),
    __param(0, (0, common_1.Query)('latitude')),
    __param(1, (0, common_1.Query)('longitude')),
    __param(2, (0, common_1.Query)('radius')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LocationController.prototype, "findNearbyPharmacies", null);
__decorate([
    (0, common_1.Get)('hospitals'),
    __param(0, (0, common_1.Query)('latitude')),
    __param(1, (0, common_1.Query)('longitude')),
    __param(2, (0, common_1.Query)('radius')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LocationController.prototype, "findNearbyHospitals", null);
exports.LocationController = LocationController = __decorate([
    (0, common_1.Controller)('location'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [location_service_1.LocationService])
], LocationController);
//# sourceMappingURL=location.controller.js.map
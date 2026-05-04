import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LocationService } from './location.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('location')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('nearby')
  async searchNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('keywords') keywords: string = '药店|医院',
    @Query('radius') radius: string = '3000',
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return {
        success: false,
        message: '请提供有效的经纬度坐标',
      };
    }

    return this.locationService.searchNearby(
      lat,
      lng,
      keywords,
      parseInt(radius, 10),
    );
  }

  @Get('reverse-geocode')
  async reverseGeocode(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
  ) {
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

  @Get('search')
  async searchByKeyword(
    @Query('keyword') keyword: string,
    @Query('city') city: string = '全国',
    @Query('page') page: string = '1',
    @Query('offset') offset: string = '20',
  ) {
    if (!keyword) {
      return {
        success: false,
        message: '请提供搜索关键词',
      };
    }

    return this.locationService.searchByKeyword(
      keyword,
      city,
      parseInt(page, 10),
      parseInt(offset, 10),
    );
  }

  @Get('pharmacies')
  async findNearbyPharmacies(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius: string = '3000',
  ) {
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

  @Get('hospitals')
  async findNearbyHospitals(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius: string = '5000',
  ) {
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
}

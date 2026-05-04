import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly amapKey: string;

  constructor(private configService: ConfigService) {
    this.amapKey = this.configService.get<string>('AMAP_KEY', '');
  }

  async searchNearby(
    latitude: number,
    longitude: number,
    keywords: string = '药店|医院',
    radius: number = 3000,
  ): Promise<{
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
  }> {
    if (!this.amapKey) {
      return this.getMockNearbyPOIs(latitude, longitude, keywords, radius);
    }

    try {
      const url = this.buildAmapUrl(latitude, longitude, keywords, radius);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === '1' && data.pois) {
        return {
          success: true,
          pois: data.pois.map((poi: any) => ({
            name: poi.name,
            address: poi.address,
            latitude: parseFloat(poi.location.split(',')[1]),
            longitude: parseFloat(poi.location.split(',')[0]),
            distance: parseInt(poi.distance, 10),
            telephone: poi.tel,
            category: poi.category,
          })),
          message: `找到 ${data.pois.length} 个结果`,
        };
      }

      return {
        success: false,
        message: data.info || '搜索失败',
      };
    } catch (error) {
      this.logger.error(`AMAP API error: ${error.message}`);
      return this.getMockNearbyPOIs(latitude, longitude, keywords, radius);
    }
  }

  private buildAmapUrl(
    latitude: number,
    longitude: number,
    keywords: string,
    radius: number,
  ): string {
    const params = new URLSearchParams({
      key: this.amapKey,
      location: `${longitude},${latitude}`,
      keywords: keywords,
      radius: radius.toString(),
      extensions: 'base',
      page: '1',
      offset: '20',
    });
    return `https://restapi.amap.com/v3/place/around?${params.toString()}`;
  }

  private getMockNearbyPOIs(
    latitude: number,
    longitude: number,
    keywords: string,
    radius: number,
  ): {
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
  } {
    const mockPOIs = [
      {
        name: '大药房(中心店)',
        address: '北京市朝阳区建国路88号',
        distance: 350,
        telephone: '010-12345678',
        category: '医药健康;药店;药房',
      },
      {
        name: '社区卫生服务中心',
        address: '北京市朝阳区建国路66号',
        distance: 800,
        telephone: '010-87654321',
        category: '医疗保健服务;综合医院;社区卫生服务中心',
      },
      {
        name: '康复医院',
        address: '北京市朝阳区光华路100号',
        distance: 1200,
        telephone: '010-55556666',
        category: '医疗保健服务;综合医院;综合医院',
      },
      {
        name: '便民药店(24小时店)',
        address: '北京市朝阳区光华路55号',
        distance: 1500,
        telephone: '010-77778888',
        category: '医药健康;药店;药房',
      },
      {
        name: '儿童医院门诊部',
        address: '北京市朝阳区建国路120号',
        distance: 2000,
        telephone: '010-99990000',
        category: '医疗保健服务;专科医院;儿童医院',
      },
    ];

    const offset = 0.005;
    const pois = mockPOIs.map((poi, index) => ({
      ...poi,
      latitude: latitude + (Math.random() - 0.5) * offset * 2,
      longitude: longitude + (Math.random() - 0.5) * offset * 2,
    }));

    return {
      success: true,
      pois,
      message: `[模拟数据] 找到 ${pois.length} 个结果，请配置 AMAP_KEY 以使用真实高德地图API`,
    };
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<{
    success: boolean;
    address?: string;
    province?: string;
    city?: string;
    district?: string;
    street?: string;
    message: string;
  }> {
    if (!this.amapKey) {
      return {
        success: true,
        address: '北京市朝阳区建国路88号',
        province: '北京市',
        city: '北京市',
        district: '朝阳区',
        street: '建国路',
        message: '[模拟数据] 请配置 AMAP_KEY 以使用真实高德地图API',
      };
    }

    try {
      const params = new URLSearchParams({
        key: this.amapKey,
        location: `${longitude},${latitude}`,
        extensions: 'base',
      });
      const url = `https://restapi.amap.com/v3/geocode/regeo?${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === '1' && data.regeocode) {
        const addressComponent = data.regeocode.addressComponent || {};
        return {
          success: true,
          address: data.regeocode.formatted_address,
          province: addressComponent.province,
          city: addressComponent.city,
          district: addressComponent.district,
          street: addressComponent.street,
          message: '逆地理编码成功',
        };
      }

      return {
        success: false,
        message: data.info || '逆地理编码失败',
      };
    } catch (error) {
      this.logger.error(`AMAP reverse geocode error: ${error.message}`);
      return {
        success: false,
        message: '逆地理编码失败',
      };
    }
  }

  async searchByKeyword(
    keyword: string,
    city: string = '全国',
    page: number = 1,
    offset: number = 20,
  ): Promise<{
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
  }> {
    if (!this.amapKey) {
      return {
        success: true,
        pois: [
          {
            name: '大药房(全国连锁)',
            address: '全国各城市均有分店',
            latitude: 39.9042,
            longitude: 116.4074,
            telephone: '400-123-4567',
            category: '医药健康;药店;药房',
            province: '北京市',
            city: '北京市',
            district: '朝阳区',
          },
        ],
        count: 1,
        message: '[模拟数据] 请配置 AMAP_KEY 以使用真实高德地图API',
      };
    }

    try {
      const params = new URLSearchParams({
        key: this.amapKey,
        keywords: keyword,
        city: city,
        extensions: 'base',
        page: page.toString(),
        offset: offset.toString(),
      });
      const url = `https://restapi.amap.com/v3/place/text?${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === '1' && data.pois) {
        return {
          success: true,
          pois: data.pois.map((poi: any) => ({
            name: poi.name,
            address: poi.address,
            latitude: parseFloat(poi.location.split(',')[1]),
            longitude: parseFloat(poi.location.split(',')[0]),
            telephone: poi.tel,
            category: poi.category,
            province: poi.pname,
            city: poi.cityname,
            district: poi.adname,
          })),
          count: parseInt(data.count, 10),
          message: `找到 ${data.count} 个结果`,
        };
      }

      return {
        success: false,
        pois: [],
        count: 0,
        message: data.info || '搜索失败',
      };
    } catch (error) {
      this.logger.error(`AMAP keyword search error: ${error.message}`);
      return {
        success: false,
        pois: [],
        count: 0,
        message: '搜索失败',
      };
    }
  }
}

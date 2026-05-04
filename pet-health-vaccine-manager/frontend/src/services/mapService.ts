// 高德地图 API 服务
// 需要在 manifest.json 中配置高德地图 API 密钥
// 或者在 uni-app 项目中配置地图相关权限

interface Hospital {
  id: string
  name: string
  address: string
  phone: string
  distance: string
  rating: number
  is24h: boolean
  isEmergency: boolean
  businessHours: string
  services: string[]
  description: string
  latitude: number
  longitude: number
}

// 高德地图 API 密钥
// 请替换为您自己的高德地图 API 密钥
const AMAP_KEY = '62894d3a0f745186ad4c99050a491b2f'

// 模拟数据 - 当 API 密钥未配置时使用
const mockHospitals: Hospital[] = [
  {
    id: '1',
    name: '阳光宠物医院',
    address: '北京市朝阳区建国路88号',
    phone: '010-12345678',
    distance: '500m',
    rating: 4.8,
    is24h: true,
    isEmergency: true,
    businessHours: '24小时营业',
    services: ['疫苗接种', '体检', '手术', '急诊', '美容'],
    description: '专业宠物医院，拥有20年临床经验的兽医团队，提供24小时急诊服务。',
    latitude: 39.9042,
    longitude: 116.4074
  },
  {
    id: '2',
    name: '爱心宠物诊所',
    address: '北京市海淀区中关村大街100号',
    phone: '010-87654321',
    distance: '1.2km',
    rating: 4.5,
    is24h: false,
    isEmergency: false,
    businessHours: '09:00-21:00',
    services: ['疫苗接种', '体检', '驱虫', '美容'],
    description: '社区宠物诊所，价格实惠，服务周到。',
    latitude: 39.9847,
    longitude: 116.3046
  },
  {
    id: '3',
    name: '康泰宠物医院',
    address: '北京市西城区西单北大街50号',
    phone: '010-55667788',
    distance: '2.0km',
    rating: 4.9,
    is24h: true,
    isEmergency: true,
    businessHours: '24小时营业',
    services: ['疫苗接种', '体检', '手术', '急诊', '住院', '皮肤科', '牙科'],
    description: '大型综合性宠物医院，设备先进，专家团队。',
    latitude: 39.9153,
    longitude: 116.3742
  },
  {
    id: '4',
    name: '悦宠动物诊所',
    address: '北京市东城区东四北大街80号',
    phone: '010-99887766',
    distance: '3.5km',
    rating: 4.3,
    is24h: false,
    isEmergency: false,
    businessHours: '08:30-20:30',
    services: ['疫苗接种', '体检', '驱虫', '绝育手术'],
    description: '专注于宠物健康管理，提供个性化服务。',
    latitude: 39.9289,
    longitude: 116.4166
  }
]

// 使用高德地图 API 搜索附近的宠物医院
export const useMapService = () => {
  // 根据经纬度获取地址信息
  const getAddressFromLocation = async (latitude: number, longitude: number): Promise<string> => {
    try {
      // 检查是否配置了 API 密钥
      if (AMAP_KEY === 'YOUR_AMAP_API_KEY') {
        console.warn('请配置高德地图 API 密钥')
        return '当前位置（模拟地址）'
      }
      
      // 调用高德地图逆地理编码 API
      const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${longitude},${latitude}`
      
      const response = await uni.request({
        url: url,
        method: 'GET'
      })
      
      if (response.data && (response.data as any).status === '1') {
        const regeocode = (response.data as any).regeocode
        return regeocode.formatted_address || '未知地址'
      }
      
      return '获取地址失败'
    } catch (error) {
      console.error('获取地址失败:', error)
      return '当前位置'
    }
  }

  // 搜索附近的宠物医院
  const searchNearbyHospitals = async (
    latitude: number,
    longitude: number,
    keyword: string = '',
    filter: string = 'all'
  ): Promise<Hospital[]> => {
    try {
      // 检查是否配置了 API 密钥
      if (AMAP_KEY === 'YOUR_AMAP_API_KEY') {
        console.warn('使用模拟数据，请配置高德地图 API 密钥以获取真实数据')
        // 返回模拟数据
        return filterMockHospitals(mockHospitals, keyword, filter)
      }
      
      // 构建搜索关键词
      let searchKeyword = '宠物医院'
      if (keyword) {
        searchKeyword = `${searchKeyword} ${keyword}`
      }
      
      // 根据筛选条件调整搜索
      if (filter === 'hospital') {
        searchKeyword = '宠物医院'
      } else if (filter === 'clinic') {
        searchKeyword = '宠物诊所'
      } else if (filter === '24h') {
        searchKeyword = '24小时宠物医院'
      }
      
      // 调用高德地图搜索 API
      const url = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${longitude},${latitude}&keywords=${encodeURIComponent(searchKeyword)}&radius=5000&extensions=base`
      
      const response = await uni.request({
        url: url,
        method: 'GET'
      })
      
      if (response.data && (response.data as any).status === '1') {
        const pois = (response.data as any).pois || []
        
        // 转换为 Hospital 格式
        const hospitals: Hospital[] = pois.map((poi: any, index: number) => {
          const [lng, lat] = poi.location.split(',').map(Number)
          
          return {
            id: poi.id || `hospital_${index}`,
            name: poi.name || '未知医院',
            address: poi.address || '未知地址',
            phone: poi.tel || '',
            distance: formatDistance(poi.distance),
            rating: poi.rating ? parseFloat(poi.rating) : 0,
            is24h: check24Hours(poi.business_hours),
            isEmergency: checkEmergency(poi.name, poi.business_hours),
            businessHours: poi.business_hours || '未知',
            services: extractServices(poi.name, poi.type),
            description: poi.shopinfo || '',
            latitude: lat,
            longitude: lng
          }
        })
        
        return hospitals
      }
      
      return []
    } catch (error) {
      console.error('搜索医院失败:', error)
      // 发生错误时返回模拟数据
      return filterMockHospitals(mockHospitals, keyword, filter)
    }
  }

  // 格式化距离
  const formatDistance = (distance: string | number): string => {
    const dist = typeof distance === 'string' ? parseInt(distance) : distance
    if (dist < 1000) {
      return `${dist}m`
    } else {
      return `${(dist / 1000).toFixed(1)}km`
    }
  }

  // 检查是否24小时营业
  const check24Hours = (businessHours: string): boolean => {
    if (!businessHours) return false
    return businessHours.includes('24') || 
           businessHours.includes('全天') ||
           businessHours.includes('00:00-24:00')
  }

  // 检查是否提供急诊服务
  const checkEmergency = (name: string, businessHours: string): boolean => {
    if (!name && !businessHours) return false
    const hasEmergencyName = name ? name.includes('急诊') || name.includes('24') : false
    const has24Hours = check24Hours(businessHours || '')
    return hasEmergencyName || has24Hours
  }

  // 提取服务项目
  const extractServices = (name: string, type: string): string[] => {
    const services: string[] = []
    
    // 默认服务
    services.push('疫苗接种')
    services.push('体检')
    
    // 根据名称和类型添加服务
    if (name) {
      if (name.includes('手术') || type?.includes('医院')) {
        services.push('手术')
      }
      if (name.includes('急诊') || name.includes('24')) {
        services.push('急诊')
      }
      if (name.includes('美容')) {
        services.push('美容')
      }
      if (name.includes('住院')) {
        services.push('住院')
      }
    }
    
    return services
  }

  // 筛选模拟数据
  const filterMockHospitals = (hospitals: Hospital[], keyword: string, filter: string): Hospital[] => {
    let filtered = [...hospitals]
    
    // 关键词筛选
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      filtered = filtered.filter(hospital => 
        hospital.name.toLowerCase().includes(lowerKeyword) ||
        hospital.address.toLowerCase().includes(lowerKeyword)
      )
    }
    
    // 类型筛选
    if (filter === 'hospital') {
      filtered = filtered.filter(hospital => hospital.name.includes('医院'))
    } else if (filter === 'clinic') {
      filtered = filtered.filter(hospital => hospital.name.includes('诊所'))
    } else if (filter === '24h') {
      filtered = filtered.filter(hospital => hospital.is24h)
    }
    
    return filtered
  }

  return {
    getAddressFromLocation,
    searchNearbyHospitals
  }
}

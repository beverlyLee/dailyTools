'use client';

import { useState, useEffect } from 'react';
import { MapPin, Star, Clock, DollarSign, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { citiesApi, attractionsApi, restaurantsApi, City, Attraction, Restaurant } from '@/lib/api';
import toast from 'react-hot-toast';

const sampleCities = [
  {
    id: 'beijing',
    name: '北京',
    country: '中国',
    description: '千年古都，现代都市',
    latitude: 39.9042,
    longitude: 116.4074,
  },
];

const sampleAttractions = [
  {
    id: 'forbidden_city',
    name: '故宫博物院',
    entry_fee: 60,
    visit_duration: 180,
    rating: 4.9,
    open_time: '08:30',
    close_time: '17:00',
    latitude: 39.9163,
    longitude: 116.3972,
    city_id: 'beijing',
  },
  {
    id: 'summer_palace',
    name: '颐和园',
    entry_fee: 30,
    visit_duration: 120,
    rating: 4.7,
    open_time: '06:30',
    close_time: '18:00',
    latitude: 39.9999,
    longitude: 116.2755,
    city_id: 'beijing',
  },
  {
    id: 'great_wall',
    name: '长城(八达岭)',
    entry_fee: 45,
    visit_duration: 240,
    rating: 4.8,
    open_time: '06:30',
    close_time: '19:00',
    latitude: 40.3576,
    longitude: 116.0200,
    city_id: 'beijing',
  },
  {
    id: 'temple_heaven',
    name: '天坛公园',
    entry_fee: 15,
    visit_duration: 90,
    rating: 4.6,
    open_time: '06:00',
    close_time: '22:00',
    latitude: 39.8882,
    longitude: 116.4172,
    city_id: 'beijing',
  },
];

const sampleRestaurants = [
  {
    id: 'quanjude',
    name: '全聚德(王府井店)',
    cuisine_type: '北京菜',
    avg_price: 200,
    rating: 4.5,
    open_time: '11:00',
    close_time: '21:00',
    latitude: 39.9147,
    longitude: 116.4104,
    city_id: 'beijing',
  },
  {
    id: 'din_tai_fung',
    name: '鼎泰丰',
    cuisine_type: '台湾菜',
    avg_price: 150,
    rating: 4.6,
    open_time: '10:00',
    close_time: '22:00',
    latitude: 39.9089,
    longitude: 116.4012,
    city_id: 'beijing',
  },
];

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('beijing');
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      loadCityData(selectedCity);
    }
  }, [selectedCity]);

  const loadCities = async () => {
    try {
      const data = await citiesApi.getAll();
      if (data && data.length > 0) {
        setCities(data);
      } else {
        setCities(sampleCities as City[]);
      }
    } catch (error) {
      console.error('Failed to load cities:', error);
      setCities(sampleCities as City[]);
    }
  };

  const loadCityData = async (cityId: string) => {
    setIsLoading(true);
    try {
      const [attractionsData, restaurantsData] = await Promise.all([
        attractionsApi.getByCity(cityId),
        restaurantsApi.getByCity(cityId),
      ]);

      if (attractionsData && attractionsData.length > 0) {
        setAttractions(attractionsData);
      } else {
        setAttractions(sampleAttractions as Attraction[]);
      }

      if (restaurantsData && restaurantsData.length > 0) {
        setRestaurants(restaurantsData);
      } else {
        setRestaurants(sampleRestaurants as Restaurant[]);
      }
    } catch (error) {
      console.error('Failed to load city data:', error);
      setAttractions(sampleAttractions as Attraction[]);
      setRestaurants(sampleRestaurants as Restaurant[]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentCity = cities.find(c => c.id === selectedCity) || sampleCities[0];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            探索热门城市
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            发现世界各地的精彩景点和美食，为您的下一次旅行寻找灵感
          </p>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            {cities.map((city) => (
              <button
                key={city.id}
                onClick={() => setSelectedCity(city.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCity === city.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>{city.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {currentCity.name}
              </h2>
              <p className="text-gray-600">{currentCity.description || '探索这座城市的精彩'}</p>
            </div>
            <Link
              href="/planner"
              className="btn-primary inline-flex items-center space-x-2 w-fit"
            >
              <span>规划行程</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-primary-600" />
            <span>热门景点</span>
          </h3>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {attractions.map((attraction) => (
                <div
                  key={attraction.id}
                  className="card p-6 card-hover"
                >
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg">
                    {attraction.name}
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-gray-900">{attraction.rating}</span>
                      <span className="text-gray-400">/ 5.0</span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{Math.round(attraction.visit_duration / 60)} 小时</span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span>¥{attraction.entry_fee}</span>
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                      {attraction.open_time} - {attraction.close_time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <DollarSign className="w-6 h-6 text-orange-600" />
            <span>推荐餐厅</span>
          </h3>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="card p-6 card-hover"
                >
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg">
                    {restaurant.name}
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        {restaurant.cuisine_type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-gray-900">{restaurant.rating}</span>
                      <span className="text-gray-400">/ 5.0</span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span>人均 ¥{restaurant.avg_price}</span>
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                      {restaurant.open_time} - {restaurant.close_time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface City {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  country: string;
}

export interface Attraction {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city_id: string;
  entry_fee: number;
  visit_duration: number;
  rating: number;
  open_time: string;
  close_time: string;
}

export interface Restaurant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city_id: string;
  cuisine_type: string;
  avg_price: number;
  rating: number;
  open_time: string;
  close_time: string;
}

export interface OptimizeRouteRequest {
  points: {
    id: string;
    latitude: number;
    longitude: number;
    open_time?: string;
    close_time?: string;
    duration: number;
    cost: number;
  }[];
  speed_kmh?: number;
}

export interface OptimizeRouteResponse {
  success: boolean;
  data: {
    optimized_path: {
      order: number;
      point_id: string;
      arrival_time: string;
    }[];
    total_distance: number;
    is_valid: boolean;
    original_points: any[];
  };
}

export interface BudgetOptimizeRequest {
  items: {
    id: string;
    name: string;
    cost: number;
    value?: number;
    duration: number;
  }[];
  budget: number;
  max_duration?: number;
  days?: number;
  daily_hours?: number;
}

export interface BudgetOptimizeResponse {
  success: boolean;
  data: {
    daily_plans: {
      day: number;
      selected_items: {
        id: string;
        name: string;
        cost: number;
        value: number;
        duration: number;
      }[];
      total_cost: number;
      total_value: number;
      total_duration: number;
    }[];
    total_budget: number;
    days: number;
  };
}

export interface GenerateItineraryRequest {
  city_id: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  daily_hours?: number;
}

export interface GenerateItineraryResponse {
  success: boolean;
  data: {
    city_id: string;
    start_date: string;
    end_date: string;
    total_budget: number;
    days: number;
    itinerary: {
      day_number: number;
      items: {
        id: string;
        name: string;
        type: string;
        start_time: string;
        end_time: string;
        cost: number;
        duration: number;
      }[];
      total_cost: number;
      total_duration: number;
    }[];
  };
}

export const citiesApi = {
  getAll: async (): Promise<City[]> => {
    const response = await api.get('/cities');
    return response.data.data;
  },
  getById: async (id: string): Promise<City> => {
    const response = await api.get(`/cities/${id}`);
    return response.data.data;
  },
};

export const attractionsApi = {
  getByCity: async (cityId: string): Promise<Attraction[]> => {
    const response = await api.get(`/attractions/city/${cityId}`);
    return response.data.data;
  },
  getById: async (id: string): Promise<Attraction> => {
    const response = await api.get(`/attractions/${id}`);
    return response.data.data;
  },
};

export const restaurantsApi = {
  getByCity: async (cityId: string): Promise<Restaurant[]> => {
    const response = await api.get(`/restaurants/city/${cityId}`);
    return response.data.data;
  },
};

export const planningApi = {
  optimizeRoute: async (request: OptimizeRouteRequest): Promise<OptimizeRouteResponse> => {
    const response = await api.post('/planning/optimize-route', request);
    return response.data;
  },
  budgetOptimize: async (request: BudgetOptimizeRequest): Promise<BudgetOptimizeResponse> => {
    const response = await api.post('/planning/budget-optimize', request);
    return response.data;
  },
  generateItinerary: async (request: GenerateItineraryRequest): Promise<GenerateItineraryResponse> => {
    const response = await api.post('/planning/generate-itinerary', request);
    return response.data;
  },
};

export const itineraryApi = {
  exportPDF: async (id: string): Promise<Blob> => {
    const response = await api.get(`/itineraries/${id}/export-pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;

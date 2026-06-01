const API_BASE = '/api';

async function request(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || data.error || '请求失败');
    }

    return data;
  } catch (error) {
    console.error(`API Request failed [${url}]:`, error);
    throw error;
  }
}

export const api = {
  async getPlaces(filterType = null, minScore = null) {
    const params = new URLSearchParams();
    if (filterType) params.append('filter_type', filterType);
    if (minScore !== null) params.append('min_score', minScore);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(`/places${queryString}`);
  },

  async getPlace(placeId) {
    return request(`/places/${placeId}`);
  },

  async getStats() {
    return request('/stats');
  },

  async getHealth() {
    return request('/health');
  },

  async getMapConfig() {
    return request('/config/map');
  },

  async analyzeComments(comments, priceLevel = null, seatComfort = null) {
    return request('/analyze', {
      method: 'POST',
      body: JSON.stringify({ comments, price_level: priceLevel, seat_comfort: seatComfort })
    });
  }
};

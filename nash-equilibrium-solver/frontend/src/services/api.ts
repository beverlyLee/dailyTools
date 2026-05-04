import {
  NashEquilibriumResponse,
  GameExample,
  GameExampleListResponse,
  PayoffMatrixData
} from '../types';

const API_BASE = '/api';

export const nashEquilibriumApi = {
  solve: async (data: PayoffMatrixData): Promise<NashEquilibriumResponse> => {
    const response = await fetch(`${API_BASE}/solver/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '求解失败');
    }

    return response.json();
  },
};

export const gameExamplesApi = {
  getAll: async (): Promise<GameExample[]> => {
    const response = await fetch(`${API_BASE}/examples/`);
    if (!response.ok) {
      throw new Error('获取博弈案例失败');
    }
    const data: GameExampleListResponse = await response.json();
    return data.examples;
  },

  getById: async (id: number): Promise<GameExample> => {
    const response = await fetch(`${API_BASE}/examples/${id}`);
    if (!response.ok) {
      throw new Error('获取博弈案例失败');
    }
    return response.json();
  },

  getByCategory: async (category: string): Promise<GameExample[]> => {
    const response = await fetch(`${API_BASE}/examples/category/${category}`);
    if (!response.ok) {
      throw new Error('获取博弈案例失败');
    }
    const data: GameExampleListResponse = await response.json();
    return data.examples;
  },

  getCategories: async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/examples/categories`);
    if (!response.ok) {
      throw new Error('获取分类失败');
    }
    return response.json();
  },
};

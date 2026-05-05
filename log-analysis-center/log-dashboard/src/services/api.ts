import axios from 'axios';
import type { LogEntry, Alert, Rule, Stats, SearchQuery, SearchResult } from '@/types';

const api = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const logApi = {
  getLogs: async (params?: { limit?: number; level?: string; service?: string; query?: string }) => {
    const response = await api.get<SearchResult>('/api/logs', { params });
    return response.data;
  },

  searchLogs: async (query: SearchQuery) => {
    const response = await api.post<SearchResult>('/api/logs/search', query);
    return response.data;
  },

  sendLog: async (log: {
    message: string;
    level?: string;
    service?: string;
    hostname?: string;
    tags?: string[];
    fields?: Record<string, unknown>;
  }) => {
    const response = await api.post('/api/logs', log);
    return response.data;
  },
};

export const alertApi = {
  getAlerts: async () => {
    const response = await api.get<{ total: number; alerts: Alert[] }>('/api/alerts');
    return response.data;
  },
};

export const ruleApi = {
  getRules: async () => {
    const response = await api.get<{ total: number; rules: Rule[] }>('/api/rules');
    return response.data;
  },

  createRule: async (rule: {
    name: string;
    description?: string;
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    actions: Array<{
      action_type: string;
      config: Record<string, unknown>;
    }>;
  }) => {
    const response = await api.post('/api/rules', rule);
    return response.data;
  },

  deleteRule: async (ruleId: string) => {
    const response = await api.delete(`/api/rules/${ruleId}`);
    return response.data;
  },
};

export const statsApi = {
  getStats: async () => {
    const response = await api.get<Stats>('/api/stats');
    return response.data;
  },
};

export const healthApi = {
  checkHealth: async () => {
    const response = await api.get<{ status: string; timestamp: string }>('/health');
    return response.data;
  },
};

export default api;

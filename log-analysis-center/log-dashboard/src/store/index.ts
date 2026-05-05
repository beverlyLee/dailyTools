import { create } from 'zustand';
import type { LogEntry, Alert, Rule, Stats, DashboardData } from '@/types';
import { logApi, alertApi, ruleApi, statsApi } from '@/services/api';

interface LogStore {
  logs: LogEntry[];
  alerts: Alert[];
  rules: Rule[];
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  
  fetchLogs: (params?: { limit?: number; level?: string; service?: string; query?: string }) => Promise<void>;
  fetchAlerts: () => Promise<void>;
  fetchRules: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAllData: () => Promise<void>;
  clearError: () => void;
}

const initialStats: Stats = {
  logs: {
    total: 0,
    by_level: {},
    by_service: {},
    error_rate_percent: 0,
  },
  alerts: {
    total: 0,
    by_severity: {},
  },
};

export const useLogStore = create<LogStore>((set, get) => ({
  logs: [],
  alerts: [],
  rules: [],
  stats: initialStats,
  loading: false,
  error: null,

  fetchLogs: async (params) => {
    set({ loading: true, error: null });
    try {
      const result = await logApi.getLogs(params);
      set({ logs: result.logs, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch logs',
        loading: false 
      });
    }
  },

  fetchAlerts: async () => {
    set({ loading: true, error: null });
    try {
      const result = await alertApi.getAlerts();
      set({ alerts: result.alerts, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch alerts',
        loading: false 
      });
    }
  },

  fetchRules: async () => {
    set({ loading: true, error: null });
    try {
      const result = await ruleApi.getRules();
      set({ rules: result.rules, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch rules',
        loading: false 
      });
    }
  },

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const stats = await statsApi.getStats();
      set({ stats, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
        loading: false 
      });
    }
  },

  fetchAllData: async () => {
    set({ loading: true, error: null });
    try {
      const [logsResult, alertsResult, rulesResult, stats] = await Promise.all([
        logApi.getLogs({ limit: 100 }),
        alertApi.getAlerts(),
        ruleApi.getRules(),
        statsApi.getStats(),
      ]);
      
      set({
        logs: logsResult.logs,
        alerts: alertsResult.alerts,
        rules: rulesResult.rules,
        stats,
        loading: false,
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        loading: false 
      });
    }
  },

  clearError: () => set({ error: null }),
}));

interface UiStore {
  sidebarCollapsed: boolean;
  selectedLogLevel: string | null;
  selectedService: string | null;
  searchQuery: string;
  refreshInterval: number;
  
  toggleSidebar: () => void;
  setSelectedLogLevel: (level: string | null) => void;
  setSelectedService: (service: string | null) => void;
  setSearchQuery: (query: string) => void;
  setRefreshInterval: (interval: number) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarCollapsed: false,
  selectedLogLevel: null,
  selectedService: null,
  searchQuery: '',
  refreshInterval: 30000,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSelectedLogLevel: (level) => set({ selectedLogLevel: level }),
  setSelectedService: (service) => set({ selectedService: service }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setRefreshInterval: (interval) => set({ refreshInterval: interval }),
}));

import axios from 'axios';
import type {
  DashboardData,
  ValidationResult,
  MonthlySummary,
  HighRiskPeriod,
} from './types';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export async function getDashboard(): Promise<DashboardData> {
  const response = await api.get('/dashboard');
  return response.data;
}

export async function getValidate(): Promise<ValidationResult> {
  const response = await api.get('/validate');
  return response.data;
}

export async function getCalendarHeatmap(
  illness: string,
  college?: string,
  region?: string
): Promise<{ illness: string; college?: string; region?: string; data: [string, number][] }> {
  const params = new URLSearchParams();
  params.append('illness', illness);
  if (college) params.append('college', college);
  if (region) params.append('region', region);

  const response = await api.get(`/calendar-heatmap?${params.toString()}`);
  return response.data;
}

export async function getMonthlySummary(
  month: number,
  college?: string
): Promise<MonthlySummary> {
  const params = new URLSearchParams();
  params.append('month', month.toString());
  if (college) params.append('college', college);

  const response = await api.get(`/monthly-summary?${params.toString()}`);
  return response.data;
}

export async function getHighRiskPeriods(
  threshold: number = 0.3,
  college?: string
): Promise<{ threshold: number; college?: string; periods: HighRiskPeriod[] }> {
  const params = new URLSearchParams();
  params.append('threshold', threshold.toString());
  if (college) params.append('college', college);

  const response = await api.get(`/high-risk-periods?${params.toString()}`);
  return response.data;
}

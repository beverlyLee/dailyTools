import apiClient from './client';
import type {
  WeatherResponse,
  SoilSimulationRequest,
  SoilSimulationResponse,
  PrescriptionRequest,
  PrescriptionResponse,
  CostCalculateRequest,
  CostDetail,
  CostCompareRequest,
  CostCompareResponse,
  CalendarTask,
  TaskCreateRequest,
  TaskUpdateRequest,
  UserConfig,
  CropParams,
  SoilParams
} from '../../shared/types';

export const weatherApi = {
  getWeather: (city: string) =>
    apiClient.get<WeatherResponse>(`/weather?city=${encodeURIComponent(city)}`),
};

export const soilApi = {
  simulate: (data: SoilSimulationRequest) =>
    apiClient.post<SoilSimulationResponse>('/soil/simulate', data),
  getDefaultCropParams: (cropType: string) =>
    apiClient.get<CropParams>(`/soil/crop-params?type=${cropType}`),
  getDefaultSoilParams: (texture: string) =>
    apiClient.get<SoilParams>(`/soil/soil-params?texture=${texture}`),
};

export const prescriptionApi = {
  generate: (data: PrescriptionRequest) =>
    apiClient.post<PrescriptionResponse>('/prescription/generate', data),
  getById: (id: string) =>
    apiClient.get<PrescriptionResponse>(`/prescription/${id}`),
};

export const costApi = {
  calculate: (data: CostCalculateRequest) =>
    apiClient.post<CostDetail>('/cost/calculate', data),
  compare: (data: CostCompareRequest) =>
    apiClient.post<CostCompareResponse>('/cost/compare', data),
};

export const taskApi = {
  list: () => apiClient.get<CalendarTask[]>('/calendar/tasks'),
  create: (data: TaskCreateRequest) =>
    apiClient.post<CalendarTask>('/calendar/tasks', data),
  update: (id: string, data: TaskUpdateRequest) =>
    apiClient.put<CalendarTask>(`/calendar/tasks/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/calendar/tasks/${id}`),
  updateStatus: (id: string, status: string) =>
    apiClient.patch<CalendarTask>(`/calendar/tasks/${id}/status`, { status }),
};

export const userApi = {
  getConfig: () => apiClient.get<UserConfig>('/config'),
  saveConfig: (config: Partial<UserConfig>) =>
    apiClient.put<UserConfig>('/config', config),
};

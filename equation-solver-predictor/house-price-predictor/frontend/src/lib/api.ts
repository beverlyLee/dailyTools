import axios, { type AxiosInstance } from 'axios';
import type {
  FeatureInfo,
  FeatureImportance,
  ModelMetrics,
  PredictionResult,
  ResidualData,
  DatasetStats,
  TrainingRecord,
  PredictionHistory,
  ModelInfo,
} from '../types';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const housePriceApi = {
  async getFeatures(): Promise<FeatureInfo[]> {
    const response = await api.get('/prediction/features');
    return response.data.data;
  },

  async getDefaultValues(): Promise<Record<string, number>> {
    const response = await api.get('/prediction/default-values');
    return response.data.data;
  },

  async predict(features: Record<string, number>): Promise<PredictionResult> {
    const response = await api.post('/prediction/predict', { features });
    return response.data.data;
  },

  async getPredictionHistory(limit: number = 50): Promise<PredictionHistory[]> {
    const response = await api.get('/prediction/history', { params: { limit } });
    return response.data.data;
  },

  async getModelInfo(): Promise<ModelInfo> {
    const response = await api.get('/model/info');
    return response.data.data;
  },

  async getDatasetInfo(): Promise<DatasetStats> {
    const response = await api.get('/model/dataset-info');
    return response.data.data;
  },

  async trainModel(testSize: number = 0.2, randomState: number = 42): Promise<{
    metrics: ModelMetrics;
    coefficients: number[];
    intercept: number;
    feature_importance: FeatureImportance[];
  }> {
    const response = await api.post('/model/train', {
      test_size: testSize,
      random_state: randomState,
    });
    return response.data.data;
  },

  async getResiduals(): Promise<ResidualData> {
    const response = await api.get('/model/residuals');
    return response.data.data;
  },

  async getTrainingRecords(limit: number = 20): Promise<TrainingRecord[]> {
    const response = await api.get('/model/training-records', { params: { limit } });
    return response.data.data;
  },
};

export default api;

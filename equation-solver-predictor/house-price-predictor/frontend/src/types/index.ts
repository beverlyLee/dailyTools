export interface FeatureInfo {
  name: string;
  display_name: string;
  description: string;
  min_value: number;
  max_value: number;
  default_value: number;
  unit?: string;
}

export interface FeatureImportance {
  name: string;
  display_name: string;
  importance: number;
  coefficient: number;
}

export interface ModelMetrics {
  r2_score: number;
  mse: number;
  rmse: number;
  mae: number;
}

export interface PredictionResult {
  predicted_price: number;
  predicted_price_formatted: string;
  feature_contributions: Record<string, number>;
  confidence?: number;
}

export interface ResidualData {
  actual: number[];
  predicted: number[];
  residuals: number[];
  residuals_normalized: number[];
}

export interface DatasetStats {
  total_samples: number;
  feature_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_std: number;
}

export interface TrainingRecord {
  id: number;
  model_name: string;
  dataset_size: number;
  train_size: number;
  test_size: number;
  r2_score: number;
  mse: number;
  rmse: number;
  mae: number;
  created_at: string;
}

export interface PredictionHistory {
  id: number;
  input_features: Record<string, number>;
  predicted_price: number;
  created_at: string;
}

export interface ModelInfo {
  is_trained: boolean;
  metrics: ModelMetrics | null;
  feature_importance: FeatureImportance[] | null;
}

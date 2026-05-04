import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1/housing',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export interface FeatureRange {
  min: number
  max: number
  mean: number
  std: number
}

export interface FeatureStatistic {
  min: number
  max: number
  mean: number
  std: number
  correlation_with_price: number
}

export interface FeatureImportance {
  feature: string
  coefficient: number
  importance_score: number
  absolute_coefficient?: number
}

export interface ResidualData {
  actual: number
  predicted: number
  residual: number
}

export interface ModelMetadata {
  id: number
  model_name: string
  training_date: string
  r2_score: number
  mse: number
  features: string[]
  target: string
}

export interface EvaluationMetrics {
  mse: number
  rmse: number
  r2_score: number
}

export interface TrainResponse {
  success: boolean
  message: string
  model_id: number
  evaluation_metrics: EvaluationMetrics
  feature_importance: FeatureImportance[]
  data_info: {
    original_samples: number
    cleaned_samples: number
    features: string[]
    target: string
  }
  feature_statistics: Record<string, FeatureStatistic>
}

export interface PredictResponse {
  success: boolean
  predicted_price: number
  features_used: Record<string, number>
  model_id: number
  feature_importance: FeatureImportance[]
}

export interface ModelInfoResponse {
  success: boolean
  data: {
    model_metadata: ModelMetadata
    feature_importance: FeatureImportance[]
    residuals: ResidualData[]
  }
}

export interface FeatureRangesResponse {
  success: boolean
  feature_ranges: Record<string, FeatureRange>
  feature_info: {
    total_samples: number
    feature_count: number
    features: string[]
    target: string
    statistics: Record<string, FeatureStatistic>
  }
  target_column: string
}

export const housingApi = {
  trainModel: async (params: {
    file_path?: string
    target_column?: string
    normalization_method?: string
    test_size?: number
  } = {}): Promise<TrainResponse> => {
    const response = await api.post('/train', {
      file_path: './data/housing_data.csv',
      target_column: 'price',
      normalization_method: 'standard',
      test_size: 0.2,
      ...params
    })
    return response.data
  },

  predictPrice: async (features: Record<string, number>, modelId?: number): Promise<PredictResponse> => {
    const response = await api.post('/predict', {
      features,
      model_id: modelId
    })
    return response.data
  },

  getLatestModel: async (): Promise<ModelInfoResponse> => {
    const response = await api.get('/latest-model')
    return response.data
  },

  getModelInfo: async (modelId: number): Promise<ModelInfoResponse> => {
    const response = await api.get(`/model-info/${modelId}`)
    return response.data
  },

  getFeatureRanges: async (filePath?: string): Promise<FeatureRangesResponse> => {
    const params = filePath ? { file_path: filePath } : {}
    const response = await api.get('/feature-ranges', { params })
    return response.data
  },

  uploadData: async (file: File): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/upload-data', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  getAvailableDatasets: async (): Promise<any> => {
    const response = await api.get('/available-datasets')
    return response.data
  }
}

export default housingApi

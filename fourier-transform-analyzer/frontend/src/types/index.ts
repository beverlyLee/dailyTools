export type SignalType = 'sine' | 'square' | 'triangle' | 'noise' | 'composite';

export type FilterType = 'none' | 'lowpass' | 'highpass' | 'bandstop';

export interface SignalParams {
  signal_type: SignalType;
  amplitude: number;
  frequency: number;
  phase: number;
  duration: number;
  sampling_rate: number;
  composite_components?: CompositeComponent[];
  noise_level: number;
}

export interface CompositeComponent {
  type: SignalType;
  frequency: number;
  amplitude: number;
  phase: number;
}

export interface FilterParams {
  filter_type: FilterType;
  cutoff_low?: number;
  cutoff_high?: number;
  order: number;
}

export interface FrequencyDomainData {
  frequencies: number[];
  magnitude: number[];
  phase?: number[];
}

export interface STFTData {
  frequencies: number[];
  times: number[];
  magnitude: number[][];
  magnitude_db: number[][];
}

export interface SignalResponse {
  time: number[];
  original_signal: number[];
  filtered_signal?: number[];
  frequency_domain: FrequencyDomainData;
  filtered_frequency_domain?: FrequencyDomainData;
  stft_data?: STFTData;
  signal_params: SignalParams;
  filter_params?: FilterParams;
}

export interface SnapshotListResponse {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  signal_type: string;
}

export interface SnapshotResponse {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  signal_params: SignalParams;
  filter_params?: FilterParams;
  time_data: number[];
  original_signal: number[];
  filtered_signal?: number[];
  frequency: number[];
  magnitude: number[];
  stft_data?: STFTData;
}

export interface SnapshotCreate {
  name: string;
  description?: string;
  signal_params: SignalParams;
  filter_params?: FilterParams;
  time_data: number[];
  original_signal: number[];
  filtered_signal?: number[];
  frequency_domain: number[];
  magnitude: number[];
  stft_data?: STFTData;
}

export interface SignalRequest {
  signal_params: SignalParams;
  filter_params?: FilterParams;
  perform_stft: boolean;
  stft_window_size: number;
  stft_overlap: number;
}

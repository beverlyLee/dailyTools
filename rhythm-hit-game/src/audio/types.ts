export interface AudioAnalysisResult {
  spectralCentroid: number;
  spectralFlatness: number;
  spectralRolloff: number;
  rms: number;
  energy: number;
  zcr: number;
  chroma: number[];
  mfcc: number[];
  perceptualSharpness: number;
  perceptualSpread: number;
}

export interface BeatDetectionResult {
  isBeat: boolean;
  confidence: number;
  time: number;
  energy: number;
}

export interface AudioConfig {
  sampleRate: number;
  bufferSize: number;
  fftSize: number;
  smoothingTimeConstant: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 44100,
  bufferSize: 512,
  fftSize: 2048,
  smoothingTimeConstant: 0.8
};

export const MEYDA_FEATURES = [
  'spectralCentroid',
  'spectralFlatness',
  'spectralRolloff',
  'rms',
  'energy',
  'zcr',
  'chroma',
  'mfcc',
  'perceptualSharpness',
  'perceptualSpread'
] as const;

export type MeydaFeature = typeof MEYDA_FEATURES[number];

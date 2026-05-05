import type { WorkerMessage, WorkerResponse } from '@edge-perception/common';

export { WorkerMessage, WorkerResponse };

export interface AudioConfig {
  sampleRate: number;
  channelCount: number;
  frameSize: number;
}

export interface VADConfig {
  threshold: number;
  frameDurationMs: number;
  aggressiveness: number;
}

export interface WakeWordConfig {
  wakeWord: string;
  sensitivity: number;
  threshold: number;
}

export interface RingBufferConfig {
  size: number;
  sampleRate: number;
}

export interface WakeupDetectionResult {
  detected: boolean;
  confidence: number;
  timestamp: number;
  wakeWord?: string;
}

export interface VADResult {
  isSpeech: boolean;
  confidence: number;
  energy: number;
  zcr: number;
}

export interface AudioFrame {
  samples: Float32Array;
  sampleRate: number;
  timestamp: number;
}

export type WakeupCallback = (result: WakeupDetectionResult) => void;
export type VADCallback = (result: VADResult) => void;
export type AudioCallback = (frame: AudioFrame) => void;

export interface VoiceWakeupOptions {
  audioConfig?: AudioConfig;
  vadConfig?: VADConfig;
  wakeWordConfig?: WakeWordConfig;
  ringBufferConfig?: RingBufferConfig;
  useSimd?: boolean;
  useWorker?: boolean;
}

export interface VoiceWakeupWorkerMessage extends WorkerMessage {
  type: 'init' | 'process_audio' | 'set_wake_word' | 'set_vad_threshold' | 'start' | 'stop';
  options?: VoiceWakeupOptions;
  audioFrame?: {
    samples: number[];
    sampleRate: number;
    timestamp: number;
  };
  wakeWord?: string;
  threshold?: number;
}

export interface VoiceWakeupWorkerResponse extends WorkerResponse {
  type: 'ready' | 'wakeup_detected' | 'vad_result' | 'status' | 'error';
  result?: WakeupDetectionResult;
  vadResult?: VADResult;
  status?: {
    isRunning: boolean;
    isListening: boolean;
    bufferSize: number;
  };
}

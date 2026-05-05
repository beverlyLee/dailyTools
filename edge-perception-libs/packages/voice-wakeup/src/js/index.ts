import type {
  VoiceWakeupOptions,
  WakeupDetectionResult,
  VADResult,
  AudioFrame,
  WakeupCallback,
  VADCallback,
  AudioCallback,
  AudioConfig,
  VADConfig,
  WakeWordConfig,
  RingBufferConfig,
} from './types';

import { RingBuffer, resampleAudio, convertToMono, computeRMS, computeZCR } from './utils';
import { WorkerVoiceWakeup, createWorkerVoiceWakeup } from './workerDetector';

export * from './types';
export { 
  RingBuffer, 
  resampleAudio, 
  convertToMono, 
  computeRMS, 
  computeZCR,
  applyPreEmphasis,
  normalizeAudio,
  generateHannWindow,
  applyWindow,
} from './utils';
export { WorkerVoiceWakeup, createWorkerVoiceWakeup } from './workerDetector';

interface WasmModule {
  VoiceWakeupDetector: {
    new (sample_rate: number, frame_size: number): WasmVoiceWakeupDetector;
  };
  VAD: {
    new (sample_rate: number, aggressiveness: number): WasmVAD;
  };
  RingBuffer: {
    new (capacity: number): WasmRingBuffer;
  };
  init_panic_hook(): void;
  default(): Promise<void>;
}

interface WasmVoiceWakeupDetector {
  set_wake_word(word: string): void;
  set_threshold(threshold: number): void;
  process(samples: Float32Array): WasmWakeupResult;
  reset(): void;
}

interface WasmVAD {
  process(samples: Float32Array): boolean;
  set_aggressiveness(level: number): void;
  reset(): void;
}

interface WasmRingBuffer {
  write(samples: Float32Array): number;
  read(length: number): Float32Array;
  peek(length: number): Float32Array;
  clear(): void;
  is_empty(): boolean;
  is_full(): boolean;
  capacity(): number;
  size(): number;
}

interface WasmWakeupResult {
  detected: boolean;
  confidence: number;
}

let wasmModule: WasmModule | null = null;
let initPromise: Promise<void> | null = null;

const defaultAudioConfig: AudioConfig = {
  sampleRate: 16000,
  channelCount: 1,
  frameSize: 160,
};

const defaultVADConfig: VADConfig = {
  threshold: 0.5,
  frameDurationMs: 10,
  aggressiveness: 2,
};

const defaultWakeWordConfig: WakeWordConfig = {
  wakeWord: '你好小明',
  sensitivity: 0.7,
  threshold: 0.8,
};

const defaultRingBufferConfig: RingBufferConfig = {
  size: 48000,
  sampleRate: 16000,
};

export async function init(
  wasmPath?: string,
  options?: VoiceWakeupOptions
): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      if (wasmPath) {
        wasmModule = await import(wasmPath) as WasmModule;
      } else {
        wasmModule = await import('../../pkg/edge_voice_wakeup.js') as WasmModule;
      }

      if (typeof wasmModule.default === 'function') {
        await wasmModule.default();
      }

      if (typeof wasmModule.init_panic_hook === 'function') {
        wasmModule.init_panic_hook();
      }
    } catch (error) {
      initPromise = null;
      throw new Error(`Failed to initialize voice wakeup: ${error}`);
    }
  })();

  return initPromise;
}

export class VoiceWakeupDetector {
  private wasmDetector: WasmVoiceWakeupDetector | null = null;
  private wasmVAD: WasmVAD | null = null;
  private wasmRingBuffer: WasmRingBuffer | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isListening: boolean = false;
  private isInitialized: boolean = false;
  private audioConfig: AudioConfig;
  private vadConfig: VADConfig;
  private wakeWordConfig: WakeWordConfig;
  private ringBufferConfig: RingBufferConfig;
  private wakeupCallbacks: Set<WakeupCallback> = new Set();
  private vadCallbacks: Set<VADCallback> = new Set();
  private audioCallbacks: Set<AudioCallback> = new Set();

  constructor(options: VoiceWakeupOptions = {}) {
    this.audioConfig = { ...defaultAudioConfig, ...options.audioConfig };
    this.vadConfig = { ...defaultVADConfig, ...options.vadConfig };
    this.wakeWordConfig = { ...defaultWakeWordConfig, ...options.wakeWordConfig };
    this.ringBufferConfig = { ...defaultRingBufferConfig, ...options.ringBufferConfig };
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!wasmModule) {
      await init();
    }

    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    this.wasmDetector = new wasmModule.VoiceWakeupDetector(
      this.audioConfig.sampleRate,
      this.audioConfig.frameSize
    );
    this.wasmDetector.set_wake_word(this.wakeWordConfig.wakeWord);
    this.wasmDetector.set_threshold(this.wakeWordConfig.threshold);

    this.wasmVAD = new wasmModule.VAD(
      this.audioConfig.sampleRate,
      this.vadConfig.aggressiveness
    );

    this.wasmRingBuffer = new wasmModule.RingBuffer(this.ringBufferConfig.size);

    this.isInitialized = true;
  }

  async startListening(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.isListening) {
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.audioConfig.sampleRate,
          channelCount: this.audioConfig.channelCount,
        },
      });

      this.audioContext = new AudioContext({
        sampleRate: this.audioConfig.sampleRate,
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      if (this.audioContext.audioWorklet) {
        const bufferSize = this.audioConfig.frameSize;
        this.scriptProcessor = this.audioContext.createScriptProcessor(
          bufferSize * 2,
          this.audioConfig.channelCount,
          this.audioConfig.channelCount
        );
      } else {
        const bufferSize = this.audioConfig.frameSize;
        this.scriptProcessor = this.audioContext.createScriptProcessor(
          bufferSize * 2,
          this.audioConfig.channelCount,
          this.audioConfig.channelCount
        );
      }

      this.scriptProcessor.onaudioprocess = (event) => {
        this.handleAudioProcess(event);
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.isListening = true;
    } catch (error) {
      throw new Error(`Failed to start listening: ${error}`);
    }
  }

  private handleAudioProcess(event: AudioProcessingEvent): void {
    const inputBuffer = event.inputBuffer;
    let samples = inputBuffer.getChannelData(0);
    
    if (this.audioConfig.channelCount > 1) {
      const monoSamples = convertToMono(samples, this.audioConfig.channelCount);
      samples = monoSamples;
    }

    const frame: AudioFrame = {
      samples: samples.slice(),
      sampleRate: this.audioConfig.sampleRate,
      timestamp: performance.now(),
    };

    for (const callback of this.audioCallbacks) {
      callback(frame);
    }

    if (this.wasmVAD) {
      const isSpeech = this.wasmVAD.process(samples);
      const energy = computeRMS(samples);
      const zcr = computeZCR(samples);
      
      const vadResult: VADResult = {
        isSpeech,
        confidence: isSpeech ? Math.min(1, energy * 10) : 0,
        energy,
        zcr,
      };

      for (const callback of this.vadCallbacks) {
        callback(vadResult);
      }

      if (!isSpeech && energy < 0.01) {
        return;
      }
    }

    if (this.wasmRingBuffer) {
      this.wasmRingBuffer.write(samples);
    }

    if (this.wasmDetector) {
      const result = this.wasmDetector.process(samples);
      
      if (result.detected && result.confidence >= this.wakeWordConfig.threshold) {
        const wakeupResult: WakeupDetectionResult = {
          detected: true,
          confidence: result.confidence,
          timestamp: performance.now(),
          wakeWord: this.wakeWordConfig.wakeWord,
        };

        for (const callback of this.wakeupCallbacks) {
          callback(wakeupResult);
        }
      }
    }
  }

  stopListening(): void {
    if (!this.isListening) {
      return;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isListening = false;
  }

  processAudio(samples: Float32Array): WakeupDetectionResult {
    if (!this.wasmDetector) {
      throw new Error('Detector not initialized');
    }

    const result = this.wasmDetector.process(samples);

    return {
      detected: result.detected && result.confidence >= this.wakeWordConfig.threshold,
      confidence: result.confidence,
      timestamp: performance.now(),
      wakeWord: this.wakeWordConfig.wakeWord,
    };
  }

  processVAD(samples: Float32Array): VADResult {
    if (!this.wasmVAD) {
      throw new Error('VAD not initialized');
    }

    const isSpeech = this.wasmVAD.process(samples);
    const energy = computeRMS(samples);
    const zcr = computeZCR(samples);

    return {
      isSpeech,
      confidence: isSpeech ? Math.min(1, energy * 10) : 0,
      energy,
      zcr,
    };
  }

  setWakeWord(wakeWord: string): void {
    this.wakeWordConfig.wakeWord = wakeWord;
    if (this.wasmDetector) {
      this.wasmDetector.set_wake_word(wakeWord);
    }
  }

  setThreshold(threshold: number): void {
    this.wakeWordConfig.threshold = threshold;
    if (this.wasmDetector) {
      this.wasmDetector.set_threshold(threshold);
    }
  }

  setVADAggressiveness(aggressiveness: number): void {
    this.vadConfig.aggressiveness = Math.max(0, Math.min(3, aggressiveness));
    if (this.wasmVAD) {
      this.wasmVAD.set_aggressiveness(this.vadConfig.aggressiveness);
    }
  }

  onWakeup(callback: WakeupCallback): void {
    this.wakeupCallbacks.add(callback);
  }

  offWakeup(callback: WakeupCallback): void {
    this.wakeupCallbacks.delete(callback);
  }

  onVADResult(callback: VADCallback): void {
    this.vadCallbacks.add(callback);
  }

  offVADResult(callback: VADCallback): void {
    this.vadCallbacks.delete(callback);
  }

  onAudioFrame(callback: AudioCallback): void {
    this.audioCallbacks.add(callback);
  }

  offAudioFrame(callback: AudioCallback): void {
    this.audioCallbacks.delete(callback);
  }

  reset(): void {
    if (this.wasmDetector) {
      this.wasmDetector.reset();
    }
    if (this.wasmVAD) {
      this.wasmVAD.reset();
    }
    if (this.wasmRingBuffer) {
      this.wasmRingBuffer.clear();
    }
  }

  dispose(): void {
    this.stopListening();
    this.wakeupCallbacks.clear();
    this.vadCallbacks.clear();
    this.audioCallbacks.clear();
    this.isInitialized = false;
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }

  isListening(): boolean {
    return this.isListening;
  }

  getConfig(): {
    audioConfig: AudioConfig;
    vadConfig: VADConfig;
    wakeWordConfig: WakeWordConfig;
    ringBufferConfig: RingBufferConfig;
  } {
    return {
      audioConfig: { ...this.audioConfig },
      vadConfig: { ...this.vadConfig },
      wakeWordConfig: { ...this.wakeWordConfig },
      ringBufferConfig: { ...this.ringBufferConfig },
    };
  }
}

export async function createVoiceWakeupDetector(
  options?: VoiceWakeupOptions
): Promise<VoiceWakeupDetector> {
  const detector = new VoiceWakeupDetector(options);
  await detector.init();
  return detector;
}

export default {
  init,
  VoiceWakeupDetector,
  createVoiceWakeupDetector,
  WorkerVoiceWakeup,
  createWorkerVoiceWakeup,
};

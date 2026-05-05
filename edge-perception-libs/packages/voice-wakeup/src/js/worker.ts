import type {
  VoiceWakeupOptions,
  VoiceWakeupWorkerMessage,
  VoiceWakeupWorkerResponse,
  WakeupDetectionResult,
  VADResult,
} from './types';

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
let detector: WasmVoiceWakeupDetector | null = null;
let vad: WasmVAD | null = null;
let ringBuffer: WasmRingBuffer | null = null;
let isRunning: boolean = false;
let options: VoiceWakeupOptions = {};

function computeRMS(input: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input[i] * input[i];
  }
  return Math.sqrt(sum / input.length);
}

function computeZCR(input: Float32Array): number {
  if (input.length < 2) {
    return 0;
  }

  let crossings = 0;
  for (let i = 1; i < input.length; i++) {
    if ((input[i] >= 0 && input[i - 1] < 0) || (input[i] < 0 && input[i - 1] >= 0)) {
      crossings++;
    }
  }
  return crossings / (input.length - 1);
}

async function handleInit(message: VoiceWakeupWorkerMessage): Promise<void> {
  try {
    const importScriptsFunc = (globalThis as any).importScripts;
    
    if (importScriptsFunc) {
      try {
        importScriptsFunc('./pkg/edge_voice_wakeup.js');
        wasmModule = (globalThis as any).edge_voice_wakeup as WasmModule;
      } catch {
        wasmModule = (await import('../../pkg/edge_voice_wakeup.js')) as WasmModule;
      }
    } else {
      wasmModule = (await import('../../pkg/edge_voice_wakeup.js')) as WasmModule;
    }

    if (wasmModule && typeof (wasmModule as any).default === 'function') {
      await (wasmModule as any).default();
    }

    if (wasmModule && typeof wasmModule.init_panic_hook === 'function') {
      wasmModule.init_panic_hook();
    }

    if (!wasmModule) {
      throw new Error('WASM module not loaded properly');
    }

    const audioConfig = message.options?.audioConfig || {
      sampleRate: 16000,
      channelCount: 1,
      frameSize: 160,
    };

    const vadConfig = message.options?.vadConfig || {
      threshold: 0.5,
      frameDurationMs: 10,
      aggressiveness: 2,
    };

    const wakeWordConfig = message.options?.wakeWordConfig || {
      wakeWord: '你好小明',
      sensitivity: 0.7,
      threshold: 0.8,
    };

    const ringBufferConfig = message.options?.ringBufferConfig || {
      size: 48000,
      sampleRate: 16000,
    };

    options = message.options || {};

    detector = new wasmModule.VoiceWakeupDetector(
      audioConfig.sampleRate,
      audioConfig.frameSize
    );
    detector.set_wake_word(wakeWordConfig.wakeWord);
    detector.set_threshold(wakeWordConfig.threshold);

    vad = new wasmModule.VAD(
      audioConfig.sampleRate,
      vadConfig.aggressiveness
    );

    ringBuffer = new wasmModule.RingBuffer(ringBufferConfig.size);

    postMessage({
      type: 'ready',
      id: message.id,
    } as VoiceWakeupWorkerResponse);
  } catch (error) {
    postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      id: message.id,
    } as VoiceWakeupWorkerResponse);
  }
}

function handleProcessAudio(message: VoiceWakeupWorkerMessage): void {
  if (!detector || !message.audioFrame) {
    postMessage({
      type: 'error',
      error: 'Detector not initialized or no audio frame provided',
      id: message.id,
    } as VoiceWakeupWorkerResponse);
    return;
  }

  try {
    const samples = new Float32Array(message.audioFrame.samples);
    const result = detector.process(samples);

    const wakeupResult: WakeupDetectionResult = {
      detected: result.detected,
      confidence: result.confidence,
      timestamp: message.audioFrame.timestamp,
      wakeWord: options.wakeWordConfig?.wakeWord || '你好小明',
    };

    if (result.detected) {
      postMessage({
        type: 'wakeup_detected',
        result: wakeupResult,
      } as VoiceWakeupWorkerResponse);
    }

    if (vad) {
      const isSpeech = vad.process(samples);
      const energy = computeRMS(samples);
      const zcr = computeZCR(samples);

      const vadResult: VADResult = {
        isSpeech,
        confidence: isSpeech ? Math.min(1, energy * 10) : 0,
        energy,
        zcr,
      };

      postMessage({
        type: 'vad_result',
        vadResult,
      } as VoiceWakeupWorkerResponse);
    }

    if (ringBuffer) {
      ringBuffer.write(samples);
    }

    postMessage({
      type: 'result',
      result: wakeupResult,
      id: message.id,
    } as VoiceWakeupWorkerResponse);
  } catch (error) {
    postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      id: message.id,
    } as VoiceWakeupWorkerResponse);
  }
}

function handleSetWakeWord(message: VoiceWakeupWorkerMessage): void {
  if (detector && message.wakeWord) {
    detector.set_wake_word(message.wakeWord);
  }
}

function handleSetThreshold(message: VoiceWakeupWorkerMessage): void {
  if (detector && message.threshold !== undefined) {
    detector.set_threshold(message.threshold);
  }
}

function handleStart(message: VoiceWakeupWorkerMessage): void {
  isRunning = true;
  
  postMessage({
    type: 'ready',
    id: message.id,
  } as VoiceWakeupWorkerResponse);
}

function handleStop(): void {
  isRunning = false;
  
  if (detector) {
    detector.reset();
  }
  if (vad) {
    vad.reset();
  }
  if (ringBuffer) {
    ringBuffer.clear();
  }
}

function onMessageHandler(event: MessageEvent<VoiceWakeupWorkerMessage>): void {
  const message = event.data;

  switch (message.type) {
    case 'init':
      handleInit(message);
      break;
    case 'process_audio':
      handleProcessAudio(message);
      break;
    case 'set_wake_word':
      handleSetWakeWord(message);
      break;
    case 'set_vad_threshold':
      handleSetThreshold(message);
      break;
    case 'start':
      handleStart(message);
      break;
    case 'stop':
      handleStop();
      break;
    default:
      console.warn('Unknown message type:', (message as any).type);
  }
}

if (typeof addEventListener !== 'undefined') {
  addEventListener('message', onMessageHandler);
} else if (typeof onmessage !== 'undefined') {
  (globalThis as any).onmessage = onMessageHandler;
}

export { onMessageHandler };

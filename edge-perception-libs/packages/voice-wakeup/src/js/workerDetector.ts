import type {
  VoiceWakeupOptions,
  WakeupDetectionResult,
  VADResult,
  AudioFrame,
  WakeupCallback,
  VADCallback,
  AudioCallback,
  VoiceWakeupWorkerMessage,
  VoiceWakeupWorkerResponse,
} from './types';

type MessageCallback = (response: VoiceWakeupWorkerResponse) => void;

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export class WorkerVoiceWakeup {
  private worker: Worker | null = null;
  private initialized: boolean = false;
  private listening: boolean = false;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private nextRequestId: number = 1;
  private wakeupCallbacks: Set<WakeupCallback> = new Set();
  private vadCallbacks: Set<VADCallback> = new Set();
  private audioCallbacks: Set<AudioCallback> = new Set();

  constructor() {}

  async init(
    workerUrl?: string,
    options?: VoiceWakeupOptions
  ): Promise<void> {
    if (this.initialized) {
      return;
    }

    const actualWorkerUrl = workerUrl || this.getDefaultWorkerUrl();
    
    this.worker = new Worker(actualWorkerUrl);
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);

    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      
      this.pendingRequests.set(requestId, {
        resolve: () => resolve(),
        reject: (error) => reject(error),
      });

      const message: VoiceWakeupWorkerMessage = {
        type: 'init',
        options,
        id: requestId,
      };

      this.worker!.postMessage(message);
    });
  }

  private getDefaultWorkerUrl(): string {
    return './edge-voice-wakeup-worker.js';
  }

  private handleMessage(event: MessageEvent<VoiceWakeupWorkerResponse>): void {
    const response = event.data;
    const requestId = response.id;

    if (response.type === 'wakeup_detected' && response.result) {
      for (const callback of this.wakeupCallbacks) {
        callback(response.result);
      }
      return;
    }

    if (response.type === 'vad_result' && response.vadResult) {
      for (const callback of this.vadCallbacks) {
        callback(response.vadResult);
      }
      return;
    }

    if (requestId !== undefined) {
      const pending = this.pendingRequests.get(requestId);
      
      if (pending) {
        this.pendingRequests.delete(requestId);

        if (response.type === 'ready') {
          this.initialized = true;
          (pending.resolve as any)();
        } else if (response.type === 'result' && response.result) {
          pending.resolve(response.result);
        } else if (response.type === 'error') {
          pending.reject(new Error(response.error || 'Worker error'));
        }
      }
    }
  }

  private handleError(event: ErrorEvent): void {
    console.error('Worker error:', event);
    
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error(`Worker error: ${event.message}`));
    }
    
    this.pendingRequests.clear();
    this.initialized = false;
    this.listening = false;
  }

  async startListening(): Promise<void> {
    if (!this.initialized || !this.worker) {
      throw new Error('Detector not initialized. Call init() first.');
    }

    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;

      this.pendingRequests.set(requestId, {
        resolve: () => {
          this.listening = true;
          resolve();
        },
        reject,
      });

      const message: VoiceWakeupWorkerMessage = {
        type: 'start',
        id: requestId,
      };

      this.worker!.postMessage(message);
    });
  }

  stopListening(): void {
    if (!this.worker) return;

    const message: VoiceWakeupWorkerMessage = {
      type: 'stop',
    };

    this.worker.postMessage(message);
    this.listening = false;
  }

  processAudio(samples: Float32Array): Promise<WakeupDetectionResult> {
    if (!this.initialized || !this.worker) {
      return Promise.reject(new Error('Detector not initialized. Call init() first.'));
    }

    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;

      this.pendingRequests.set(requestId, { resolve, reject });

      const message: VoiceWakeupWorkerMessage = {
        type: 'process_audio',
        audioFrame: {
          samples: Array.from(samples),
          sampleRate: 16000,
          timestamp: performance.now(),
        },
        id: requestId,
      };

      this.worker!.postMessage(message, [samples.buffer]);
    });
  }

  setWakeWord(wakeWord: string): void {
    if (!this.initialized || !this.worker) {
      throw new Error('Detector not initialized. Call init() first.');
    }

    const message: VoiceWakeupWorkerMessage = {
      type: 'set_wake_word',
      wakeWord,
    };

    this.worker.postMessage(message);
  }

  setThreshold(threshold: number): void {
    if (!this.initialized || !this.worker) {
      throw new Error('Detector not initialized. Call init() first.');
    }

    const message: VoiceWakeupWorkerMessage = {
      type: 'set_vad_threshold',
      threshold,
    };

    this.worker.postMessage(message);
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

  isInitialized(): boolean {
    return this.initialized;
  }

  isListening(): boolean {
    return this.listening;
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.initialized = false;
    this.listening = false;
    
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('Detector terminated'));
    }
    this.pendingRequests.clear();
    this.wakeupCallbacks.clear();
    this.vadCallbacks.clear();
    this.audioCallbacks.clear();
  }
}

export async function createWorkerVoiceWakeup(
  options?: VoiceWakeupOptions,
  workerUrl?: string
): Promise<WorkerVoiceWakeup> {
  const detector = new WorkerVoiceWakeup();
  await detector.init(workerUrl, options);
  return detector;
}

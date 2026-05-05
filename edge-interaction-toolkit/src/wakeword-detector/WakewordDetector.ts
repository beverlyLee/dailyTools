import { AudioStreamProcessor } from './audio';
import { VAD } from './vad';
import { WakewordModel } from './model';
import type { 
  AudioConfig, 
  VADConfig, 
  WakewordConfig, 
  WakewordEvent, 
  WakewordCallback,
  AudioFrame,
  WakewordResult
} from './types';

export interface WakewordDetectorOptions {
  audioConfig?: Partial<AudioConfig>;
  vadConfig?: Partial<VADConfig>;
  wakewordConfig?: Partial<WakewordConfig>;
  wakeword?: string;
}

export class WakewordDetector {
  private _audioProcessor: AudioStreamProcessor;
  private _vad: VAD;
  private _model: WakewordModel;
  private _isInitialized: boolean;
  private _isRunning: boolean;
  private _listeners: Map<string, Set<WakewordCallback>>;
  private _wakeword: string;
  private _audioConfig: AudioConfig;
  private _vadConfig: VADConfig;
  private _wakewordConfig: WakewordConfig;
  private _frameCount: number;
  private _speechFrames: number;
  private _isSpeechDetected: boolean;
  private _cooldownFrames: number;
  private _cooldownCounter: number;
  
  constructor(options: WakewordDetectorOptions = {}) {
    this._audioConfig = {
      sampleRate: options.audioConfig?.sampleRate ?? 16000,
      channels: options.audioConfig?.channels ?? 1,
      bufferSize: options.audioConfig?.bufferSize ?? 4096,
      fftSize: options.audioConfig?.fftSize ?? 2048,
    };
    
    this._vadConfig = {
      threshold: options.vadConfig?.threshold ?? 0.4,
      frameDurationMs: options.vadConfig?.frameDurationMs ?? 30,
      bufferSize: options.vadConfig?.bufferSize ?? 10,
      hangoverFrames: options.vadConfig?.hangoverFrames ?? 8,
      minSpeechFrames: options.vadConfig?.minSpeechFrames ?? 3,
    };
    
    this._wakewordConfig = {
      modelName: options.wakewordConfig?.modelName ?? 'wakeword-model',
      threshold: options.wakewordConfig?.threshold ?? 0.65,
      windowSize: options.wakewordConfig?.windowSize ?? 80,
      hopSize: options.wakewordConfig?.hopSize ?? 10,
      samplingRate: options.wakewordConfig?.samplingRate ?? 16000,
      mfccCoeffs: options.wakewordConfig?.mfccCoeffs ?? 13,
    };
    
    this._audioProcessor = new AudioStreamProcessor(this._audioConfig);
    this._vad = new VAD(this._vadConfig);
    this._model = new WakewordModel(this._wakewordConfig);
    
    this._isInitialized = false;
    this._isRunning = false;
    this._listeners = new Map();
    this._wakeword = options.wakeword ?? '你好小明';
    this._frameCount = 0;
    this._speechFrames = 0;
    this._isSpeechDetected = false;
    this._cooldownFrames = 50;
    this._cooldownCounter = 0;
    
    this._setupListeners();
    this._createDummyTemplate();
  }
  
  get isInitialized(): boolean { return this._isInitialized; }
  get isRunning(): boolean { return this._isRunning; }
  get wakeword(): string { return this._wakeword; }
  get audioProcessor(): AudioStreamProcessor { return this._audioProcessor; }
  get vad(): VAD { return this._vad; }
  get model(): WakewordModel { return this._model; }
  
  async init(): Promise<void> {
    if (this._isInitialized) return;
    
    await this._audioProcessor.init();
    this._isInitialized = true;
    
    this._emit('initialized', {
      type: 'audio_data',
      timestamp: performance.now(),
      data: { success: true },
    });
  }
  
  async start(): Promise<void> {
    if (!this._isInitialized) {
      await this.init();
    }
    
    if (this._isRunning) return;
    
    this._audioProcessor.start();
    this._vad.start();
    this._isRunning = true;
    this._frameCount = 0;
    this._speechFrames = 0;
    this._cooldownCounter = 0;
    
    this._emit('started', {
      type: 'audio_data',
      timestamp: performance.now(),
      data: { wakeword: this._wakeword },
    });
  }
  
  stop(): void {
    if (!this._isRunning) return;
    
    this._audioProcessor.stop();
    this._vad.stop();
    this._isRunning = false;
    
    this._emit('stopped', {
      type: 'audio_data',
      timestamp: performance.now(),
      data: {},
    });
  }
  
  async destroy(): Promise<void> {
    this.stop();
    await this._audioProcessor.destroy();
    this._listeners.clear();
    this._isInitialized = false;
  }
  
  private _setupListeners(): void {
    this._audioProcessor.on('audioFrame', (frame: AudioFrame) => {
      this._processAudioFrame(frame);
    });
    
    this._vad.on('speechStart', (data: any) => {
      this._isSpeechDetected = true;
      this._speechFrames = 0;
      
      this._emit('vad_start', {
        type: 'vad_start',
        timestamp: data.timestamp,
        data,
      });
    });
    
    this._vad.on('speechEnd', (data: any) => {
      this._isSpeechDetected = false;
      
      this._emit('vad_end', {
        type: 'vad_end',
        timestamp: data.timestamp,
        data,
      });
      
      if (this._speechFrames > 10 && this._speechFrames < 100) {
        this._processSpeechSegment();
      }
      
      this._speechFrames = 0;
    });
  }
  
  private _processAudioFrame(frame: AudioFrame): void {
    if (this._cooldownCounter > 0) {
      this._cooldownCounter--;
      return;
    }
    
    const features = this._audioProcessor.getFeatures(1024);
    
    if (features) {
      const vadResult = this._vad.process(features);
      
      if (this._isSpeechDetected) {
        this._speechFrames++;
      }
      
      this._emit('audio_data', {
        type: 'audio_data',
        timestamp: frame.timestamp,
        data: {
          frame,
          features,
          vad: vadResult,
        },
      });
    }
    
    this._frameCount++;
  }
  
  private _processSpeechSegment(): void {
    const audioData = this._audioProcessor.readAvailable();
    
    if (audioData.length < 1000) return;
    
    const result = this._model.predict(audioData);
    
    if (result.detected) {
      this._cooldownCounter = this._cooldownFrames;
      
      this._emit('wakeword', {
        type: 'wakeword',
        timestamp: result.timestamp,
        data: {
          ...result,
          wakeword: this._wakeword,
        },
      });
    }
  }
  
  onWakeword(callback: (result: WakewordResult & { wakeword: string }) => void): () => void {
    return this.on('wakeword', (event: WakewordEvent) => {
      callback({
        detected: event.data.detected,
        confidence: event.data.confidence,
        timestamp: event.data.timestamp,
        label: event.data.label,
        wakeword: event.data.wakeword,
      });
    });
  }
  
  onVADStart(callback: (data: any) => void): () => void {
    return this.on('vad_start', (event: WakewordEvent) => {
      callback(event.data);
    });
  }
  
  onVADEnd(callback: (data: any) => void): () => void {
    return this.on('vad_end', (event: WakewordEvent) => {
      callback(event.data);
    });
  }
  
  on(event: string, callback: WakewordCallback): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    
    return () => {
      this._listeners.get(event)?.delete(callback);
    };
  }
  
  off(event: string, callback: WakewordCallback): void {
    this._listeners.get(event)?.delete(callback);
  }
  
  private _emit(event: string, data: WakewordEvent): void {
    this._listeners.get(event)?.forEach(callback => callback(data));
  }
  
  private _createDummyTemplate(): void {
    const dummyFeatures: Float32Array[] = [];
    
    for (let i = 0; i < 50; i++) {
      const frame = new Float32Array(this._wakewordConfig.mfccCoeffs);
      for (let j = 0; j < this._wakewordConfig.mfccCoeffs; j++) {
        frame[j] = Math.sin(i * 0.1 + j * 0.05) * 5 + 
                    Math.cos(i * 0.07 + j * 0.03) * 3;
      }
      dummyFeatures.push(frame);
    }
    
    this._model.trainWithFeatures(dummyFeatures, this._wakeword);
  }
  
  trainWithAudio(audioData: Float32Array, label?: string): void {
    this._model.train(audioData, label ?? this._wakeword);
  }
  
  trainWithFeatures(features: Float32Array[], label?: string): void {
    this._model.trainWithFeatures(features, label ?? this._wakeword);
  }
  
  setWakeword(wakeword: string): void {
    this._wakeword = wakeword;
  }
  
  setThreshold(threshold: number): void {
    this._model.threshold = threshold;
  }
  
  setVADThreshold(threshold: number): void {
    this._vad.updateConfig({ threshold });
  }
  
  saveModel(): {
    config: WakewordConfig;
    templates: Record<string, number[][]>;
  } {
    return this._model.saveModel();
  }
  
  loadModel(data: {
    config: WakewordConfig;
    templates: Record<string, number[][]>;
  }): void {
    this._model.loadModel(data);
  }
}

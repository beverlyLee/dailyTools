import { MFCCExtractor } from './MFCCExtractor';
import type { WakewordConfig, WakewordResult, WakewordEvent, WakewordCallback } from '../types';

export class WakewordModel {
  private _config: WakewordConfig;
  private _extractor: MFCCExtractor;
  private _template: Float32Array[] | null;
  private _templates: Map<string, Float32Array[]>;
  private _threshold: number;
  private _isTrained: boolean;
  private _listeners: Map<string, Set<WakewordCallback>>;
  private _frameBuffer: Float32Array[];
  private _maxFrames: number;
  
  constructor(config: Partial<WakewordConfig> = {}) {
    this._config = {
      modelName: config.modelName ?? 'wakeword-model',
      threshold: config.threshold ?? 0.7,
      windowSize: config.windowSize ?? 100,
      hopSize: config.hopSize ?? 10,
      samplingRate: config.samplingRate ?? 16000,
      mfccCoeffs: config.mfccCoeffs ?? 13,
    };
    
    this._extractor = new MFCCExtractor({
      sampleRate: this._config.samplingRate,
      numMfcc: this._config.mfccCoeffs,
    });
    
    this._template = null;
    this._templates = new Map();
    this._threshold = this._config.threshold;
    this._isTrained = false;
    this._listeners = new Map();
    this._frameBuffer = [];
    this._maxFrames = this._config.windowSize;
  }
  
  get config(): WakewordConfig { return { ...this._config }; }
  get isTrained(): boolean { return this._isTrained; }
  get threshold(): number { return this._threshold; }
  set threshold(value: number) { this._threshold = value; }
  get extractor(): MFCCExtractor { return this._extractor; }
  
  train(audioData: Float32Array, label: string = 'default'): void {
    const mfccs = this._extractor.extract(audioData);
    
    if (mfccs.length === 0) {
      throw new Error('Failed to extract MFCC features from audio data');
    }
    
    const normalized = this._extractor.normalizeFeatures(mfccs);
    
    if (label === 'default') {
      this._template = normalized;
    }
    this._templates.set(label, normalized);
    this._isTrained = true;
    
    this._emit('trained', {
      type: 'audio_data',
      timestamp: performance.now(),
      data: { label, frames: normalized.length },
    });
  }
  
  trainWithFeatures(features: Float32Array[], label: string = 'default'): void {
    if (features.length === 0) {
      throw new Error('Empty feature array provided');
    }
    
    if (label === 'default') {
      this._template = features;
    }
    this._templates.set(label, features);
    this._isTrained = true;
    
    this._emit('trained', {
      type: 'audio_data',
      timestamp: performance.now(),
      data: { label, frames: features.length },
    });
  }
  
  reset(): void {
    this._template = null;
    this._templates.clear();
    this._isTrained = false;
    this._frameBuffer = [];
  }
  
  predict(audioData: Float32Array): WakewordResult {
    if (!this._isTrained || !this._template) {
      return {
        detected: false,
        confidence: 0,
        timestamp: performance.now(),
        label: '',
      };
    }
    
    const mfccs = this._extractor.extract(audioData);
    
    if (mfccs.length === 0) {
      return {
        detected: false,
        confidence: 0,
        timestamp: performance.now(),
        label: '',
      };
    }
    
    const normalized = this._extractor.normalizeFeatures(mfccs);
    
    let maxScore = 0;
    let bestLabel = '';
    
    for (const [label, template] of this._templates) {
      const score = this._dynamicTimeWarping(normalized, template);
      const confidence = 1 / (1 + score);
      
      if (confidence > maxScore) {
        maxScore = confidence;
        bestLabel = label;
      }
    }
    
    if (this._template) {
      const score = this._dynamicTimeWarping(normalized, this._template);
      const confidence = 1 / (1 + score);
      
      if (confidence > maxScore) {
        maxScore = confidence;
        bestLabel = 'default';
      }
    }
    
    const detected = maxScore >= this._threshold;
    
    const result: WakewordResult = {
      detected,
      confidence: maxScore,
      timestamp: performance.now(),
      label: bestLabel,
    };
    
    if (detected) {
      this._emit('wakeword', {
        type: 'wakeword',
        timestamp: result.timestamp,
        data: result,
      });
    }
    
    return result;
  }
  
  predictIncremental(frame: Float32Array): WakewordResult | null {
    this._frameBuffer.push(frame);
    
    if (this._frameBuffer.length > this._maxFrames) {
      this._frameBuffer.shift();
    }
    
    if (this._frameBuffer.length < Math.min(this._maxFrames, 20)) {
      return null;
    }
    
    const normalized = this._extractor.normalizeFeatures(this._frameBuffer);
    
    let maxScore = 0;
    let bestLabel = '';
    
    for (const [label, template] of this._templates) {
      const score = this._dynamicTimeWarping(normalized, template);
      const confidence = 1 / (1 + score);
      
      if (confidence > maxScore) {
        maxScore = confidence;
        bestLabel = label;
      }
    }
    
    if (this._template) {
      const score = this._dynamicTimeWarping(normalized, this._template);
      const confidence = 1 / (1 + score);
      
      if (confidence > maxScore) {
        maxScore = confidence;
        bestLabel = 'default';
      }
    }
    
    const detected = maxScore >= this._threshold;
    
    if (detected) {
      this._frameBuffer = [];
      
      const result: WakewordResult = {
        detected: true,
        confidence: maxScore,
        timestamp: performance.now(),
        label: bestLabel,
      };
      
      this._emit('wakeword', {
        type: 'wakeword',
        timestamp: result.timestamp,
        data: result,
      });
      
      return result;
    }
    
    return null;
  }
  
  private _dynamicTimeWarping(seq1: Float32Array[], seq2: Float32Array[]): number {
    const n = seq1.length;
    const m = seq2.length;
    
    if (n === 0 || m === 0) return Infinity;
    
    const dtw: number[][] = new Array(n + 1);
    for (let i = 0; i <= n; i++) {
      dtw[i] = new Array(m + 1);
      for (let j = 0; j <= m; j++) {
        dtw[i][j] = Infinity;
      }
    }
    
    dtw[0][0] = 0;
    
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = this._euclideanDistance(seq1[i - 1], seq2[j - 1]);
        
        dtw[i][j] = cost + Math.min(
          dtw[i - 1][j],
          dtw[i][j - 1],
          dtw[i - 1][j - 1]
        );
      }
    }
    
    return dtw[n][m] / Math.max(n, m);
  }
  
  private _euclideanDistance(v1: Float32Array, v2: Float32Array): number {
    let sum = 0;
    const length = Math.min(v1.length, v2.length);
    
    for (let i = 0; i < length; i++) {
      const diff = v1[i] - v2[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
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
  
  saveModel(): {
    config: WakewordConfig;
    templates: Record<string, number[][]>;
  } {
    const templates: Record<string, number[][]> = {};
    
    for (const [label, template] of this._templates) {
      templates[label] = template.map(frame => Array.from(frame));
    }
    
    if (this._template) {
      templates['default'] = this._template.map(frame => Array.from(frame));
    }
    
    return {
      config: this._config,
      templates,
    };
  }
  
  loadModel(data: {
    config: WakewordConfig;
    templates: Record<string, number[][]>;
  }): void {
    this._config = { ...this._config, ...data.config };
    
    for (const [label, template] of Object.entries(data.templates)) {
      const floatTemplate = template.map(frame => new Float32Array(frame));
      
      if (label === 'default') {
        this._template = floatTemplate;
      }
      this._templates.set(label, floatTemplate);
    }
    
    this._isTrained = true;
  }
}

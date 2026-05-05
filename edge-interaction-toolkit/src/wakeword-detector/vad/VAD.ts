import type { VADConfig, VADResult, AudioFeatures } from '../types';

export class VAD {
  private _config: VADConfig;
  private _frameIndex: number;
  private _isSpeech: boolean;
  private _speechFrames: number;
  private _silenceFrames: number;
  private _hangoverCount: number;
  private _speechStartFrame: number;
  private _history: VADResult[];
  private _listeners: Map<string, Set<(event: any) => void>>;
  private _isRunning: boolean;
  
  constructor(config: Partial<VADConfig> = {}) {
    this._config = {
      threshold: config.threshold ?? 0.5,
      frameDurationMs: config.frameDurationMs ?? 30,
      bufferSize: config.bufferSize ?? 10,
      hangoverFrames: config.hangoverFrames ?? 5,
      minSpeechFrames: config.minSpeechFrames ?? 3,
    };
    
    this._frameIndex = 0;
    this._isSpeech = false;
    this._speechFrames = 0;
    this._silenceFrames = 0;
    this._hangoverCount = 0;
    this._speechStartFrame = -1;
    this._history = [];
    this._listeners = new Map();
    this._isRunning = false;
  }
  
  get config(): VADConfig { return { ...this._config }; }
  get isSpeech(): boolean { return this._isSpeech; }
  get isRunning(): boolean { return this._isRunning; }
  get history(): VADResult[] { return [...this._history]; }
  
  start(): void {
    if (this._isRunning) return;
    this._isRunning = true;
    this._frameIndex = 0;
    this._isSpeech = false;
    this._speechFrames = 0;
    this._silenceFrames = 0;
    this._hangoverCount = 0;
    this._speechStartFrame = -1;
    this._history = [];
    this._emit('started', {});
  }
  
  stop(): void {
    if (!this._isRunning) return;
    this._isRunning = false;
    this._emit('stopped', {});
  }
  
  reset(): void {
    this._frameIndex = 0;
    this._isSpeech = false;
    this._speechFrames = 0;
    this._silenceFrames = 0;
    this._hangoverCount = 0;
    this._speechStartFrame = -1;
    this._history = [];
  }
  
  process(features: AudioFeatures): VADResult {
    if (!this._isRunning) {
      return {
        isSpeech: false,
        probability: 0,
        frameIndex: this._frameIndex++,
        timestamp: features.timestamp,
      };
    }
    
    const probability = this._calculateSpeechProbability(features);
    const rawIsSpeech = probability >= this._config.threshold;
    
    if (rawIsSpeech) {
      this._speechFrames++;
      this._silenceFrames = 0;
      this._hangoverCount = this._config.hangoverFrames;
      
      if (!this._isSpeech && this._speechFrames >= this._config.minSpeechFrames) {
        this._isSpeech = true;
        this._speechStartFrame = this._frameIndex;
        this._emit('speechStart', {
          frameIndex: this._frameIndex,
          timestamp: features.timestamp,
        });
      }
    } else {
      this._silenceFrames++;
      
      if (this._isSpeech) {
        if (this._hangoverCount > 0) {
          this._hangoverCount--;
        } else {
          this._isSpeech = false;
          this._speechFrames = 0;
          this._emit('speechEnd', {
            frameIndex: this._frameIndex,
            timestamp: features.timestamp,
            startFrame: this._speechStartFrame,
          });
        }
      }
    }
    
    const result: VADResult = {
      isSpeech: this._isSpeech,
      probability,
      frameIndex: this._frameIndex,
      timestamp: features.timestamp,
    };
    
    this._history.push(result);
    if (this._history.length > this._config.bufferSize) {
      this._history.shift();
    }
    
    this._emit('result', result);
    this._frameIndex++;
    
    return result;
  }
  
  private _calculateSpeechProbability(features: AudioFeatures): number {
    let score = 0;
    let weight = 0;
    
    if (features.rms > 0) {
      const rmsScore = Math.min(1, features.rms * 10);
      score += rmsScore * 0.4;
      weight += 0.4;
    }
    
    const zcrNormalized = features.zcr * 100;
    const zcrScore = zcrNormalized > 5 && zcrNormalized < 50 ? 1 : zcrNormalized / 50;
    score += zcrScore * 0.2;
    weight += 0.2;
    
    if (features.spectralCentroid > 0) {
      const centroidScore = Math.min(1, features.spectralCentroid / 200);
      score += centroidScore * 0.2;
      weight += 0.2;
    }
    
    if (features.spectralFlatness > 0) {
      const flatnessScore = 1 - features.spectralFlatness;
      score += flatnessScore * 0.2;
      weight += 0.2;
    }
    
    if (features.energy > 0) {
      const energyScore = Math.min(1, features.energy * 100);
      score += energyScore * 0.1;
      weight += 0.1;
    }
    
    const probability = weight > 0 ? score / weight : 0;
    
    return Math.max(0, Math.min(1, probability));
  }
  
  getSpeechSegments(): Array<{ startFrame: number; endFrame: number; startTimestamp: number; endTimestamp: number }> {
    const segments: Array<{
      startFrame: number;
      endFrame: number;
      startTimestamp: number;
      endTimestamp: number;
    }> = [];
    
    let inSegment = false;
    let segmentStart: number = -1;
    let segmentStartTimestamp: number = 0;
    
    for (const result of this._history) {
      if (result.isSpeech && !inSegment) {
        inSegment = true;
        segmentStart = result.frameIndex;
        segmentStartTimestamp = result.timestamp;
      } else if (!result.isSpeech && inSegment) {
        inSegment = false;
        segments.push({
          startFrame: segmentStart,
          endFrame: result.frameIndex - 1,
          startTimestamp: segmentStartTimestamp,
          endTimestamp: result.timestamp,
        });
      }
    }
    
    if (inSegment) {
      const lastResult = this._history[this._history.length - 1];
      segments.push({
        startFrame: segmentStart,
        endFrame: lastResult.frameIndex,
        startTimestamp: segmentStartTimestamp,
        endTimestamp: lastResult.timestamp,
      });
    }
    
    return segments;
  }
  
  updateConfig(config: Partial<VADConfig>): void {
    this._config = { ...this._config, ...config };
  }
  
  on(event: string, callback: (event: any) => void): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    
    return () => {
      this._listeners.get(event)?.delete(callback);
    };
  }
  
  off(event: string, callback: (event: any) => void): void {
    this._listeners.get(event)?.delete(callback);
  }
  
  private _emit(event: string, data: any): void {
    this._listeners.get(event)?.forEach(callback => callback(data));
  }
}

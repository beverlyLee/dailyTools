import { RingBuffer } from './RingBuffer';
import type { AudioConfig, AudioFrame, AudioFeatures } from '../types';

export class AudioStreamProcessor {
  private _config: AudioConfig;
  private _audioContext: AudioContext | null;
  private _mediaStream: MediaStream | null;
  private _mediaStreamSource: MediaStreamAudioSourceNode | null;
  private _scriptProcessor: ScriptProcessorNode | null;
  private _analyser: AnalyserNode | null;
  private _ringBuffer: RingBuffer;
  private _isRunning: boolean;
  private _isRecording: boolean;
  private _listeners: Map<string, Set<(event: any) => void>>;
  
  constructor(config: Partial<AudioConfig> = {}) {
    this._config = {
      sampleRate: config.sampleRate ?? 16000,
      channels: config.channels ?? 1,
      bufferSize: config.bufferSize ?? 4096,
      fftSize: config.fftSize ?? 2048,
    };
    
    this._audioContext = null;
    this._mediaStream = null;
    this._mediaStreamSource = null;
    this._scriptProcessor = null;
    this._analyser = null;
    this._ringBuffer = new RingBuffer(this._config.sampleRate * 3);
    this._isRunning = false;
    this._isRecording = false;
    this._listeners = new Map();
  }
  
  get config(): AudioConfig { return { ...this._config }; }
  get isRunning(): boolean { return this._isRunning; }
  get isRecording(): boolean { return this._isRecording; }
  get ringBuffer(): RingBuffer { return this._ringBuffer; }
  get sampleRate(): number { return this._config.sampleRate; }
  
  async init(): Promise<void> {
    if (this._isRunning) return;
    
    try {
      this._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this._config.sampleRate,
      });
      
      this._mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: this._config.channels,
          sampleRate: this._config.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      this._mediaStreamSource = this._audioContext.createMediaStreamSource(this._mediaStream);
      
      this._analyser = this._audioContext.createAnalyser();
      this._analyser.fftSize = this._config.fftSize;
      this._analyser.smoothingTimeConstant = 0.1;
      
      this._scriptProcessor = this._audioContext.createScriptProcessor(
        this._config.bufferSize,
        this._config.channels,
        this._config.channels
      );
      
      this._scriptProcessor.onaudioprocess = this._onAudioProcess.bind(this);
      
      this._mediaStreamSource.connect(this._analyser);
      this._analyser.connect(this._scriptProcessor);
      this._scriptProcessor.connect(this._audioContext.destination);
      
      this._isRunning = true;
      this._emit('initialized', { success: true });
      
    } catch (error) {
      this._emit('error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
  
  start(): void {
    if (this._isRecording) return;
    this._isRecording = true;
    this._ringBuffer.clear();
    this._emit('started', {});
  }
  
  stop(): void {
    this._isRecording = false;
    this._emit('stopped', {});
  }
  
  private _onAudioProcess(event: AudioProcessingEvent): void {
    if (!this._isRecording) return;
    
    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    
    const inputData = inputBuffer.getChannelData(0);
    
    const downsampled = this._resample(inputData, inputBuffer.sampleRate, this._config.sampleRate);
    
    this._ringBuffer.write(downsampled);
    
    const frame: AudioFrame = {
      data: new Float32Array(downsampled),
      sampleRate: this._config.sampleRate,
      timestamp: performance.now(),
      duration: downsampled.length / this._config.sampleRate,
    };
    
    this._emit('audioFrame', frame);
    
    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      const outputData = outputBuffer.getChannelData(channel);
      outputData.fill(0);
    }
  }
  
  private _resample(data: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
    if (inputSampleRate === outputSampleRate) {
      return data;
    }
    
    const ratio = inputSampleRate / outputSampleRate;
    const outputLength = Math.round(data.length / ratio);
    const result = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const index = i * ratio;
      const floorIndex = Math.floor(index);
      const fraction = index - floorIndex;
      
      if (floorIndex + 1 < data.length) {
        result[i] = data[floorIndex] * (1 - fraction) + data[floorIndex + 1] * fraction;
      } else {
        result[i] = data[floorIndex];
      }
    }
    
    return result;
  }
  
  readAvailable(): Float32Array {
    return this._ringBuffer.read(this._ringBuffer.length);
  }
  
  peekAvailable(): Float32Array {
    return this._ringBuffer.peek(this._ringBuffer.length);
  }
  
  getFeatures(frameSize: number = 1024): AudioFeatures | null {
    if (this._ringBuffer.length < frameSize) return null;
    
    const data = this._ringBuffer.peek(frameSize);
    
    const rms = this._calculateRMS(data);
    const zcr = this._calculateZCR(data);
    const energy = this._calculateEnergy(data);
    const spectralCentroid = this._calculateSpectralCentroid(data);
    const spectralFlatness = this._calculateSpectralFlatness(data);
    
    return {
      rms,
      zcr,
      energy,
      spectralCentroid,
      spectralFlatness,
      timestamp: performance.now(),
    };
  }
  
  private _calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }
  
  private _calculateZCR(data: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / data.length;
  }
  
  private _calculateEnergy(data: Float32Array): number {
    let energy = 0;
    for (let i = 0; i < data.length; i++) {
      energy += data[i] * data[i];
    }
    return energy / data.length;
  }
  
  private _calculateSpectralCentroid(data: Float32Array): number {
    const n = data.length;
    const fftSize = 1024;
    const windowSize = Math.min(n, fftSize);
    
    const windowedData = new Float32Array(fftSize);
    for (let i = 0; i < windowSize; i++) {
      const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowSize - 1)));
      windowedData[i] = data[i] * hann;
    }
    
    const magnitude = new Float32Array(fftSize / 2);
    for (let i = 0; i < fftSize / 2; i++) {
      magnitude[i] = Math.abs(windowedData[i * 2]) + Math.abs(windowedData[i * 2 + 1]);
    }
    
    let sumMagnitude = 0;
    let sumWeighted = 0;
    
    for (let i = 0; i < magnitude.length; i++) {
      sumMagnitude += magnitude[i];
      sumWeighted += i * magnitude[i];
    }
    
    return sumMagnitude > 0 ? sumWeighted / sumMagnitude : 0;
  }
  
  private _calculateSpectralFlatness(data: Float32Array): number {
    const n = data.length;
    const fftSize = 1024;
    const windowSize = Math.min(n, fftSize);
    
    const magnitude = new Float32Array(fftSize / 2);
    for (let i = 0; i < fftSize / 2; i++) {
      const real = i * 2 < windowSize ? data[i * 2] : 0;
      const imag = i * 2 + 1 < windowSize ? data[i * 2 + 1] : 0;
      magnitude[i] = Math.sqrt(real * real + imag * imag);
    }
    
    let sumLog = 0;
    let sumLinear = 0;
    let count = 0;
    
    for (let i = 0; i < magnitude.length; i++) {
      if (magnitude[i] > 0) {
        sumLog += Math.log(magnitude[i]);
        sumLinear += magnitude[i];
        count++;
      }
    }
    
    if (count === 0 || sumLinear === 0) return 0;
    
    const geometricMean = Math.exp(sumLog / count);
    const arithmeticMean = sumLinear / count;
    
    return geometricMean / arithmeticMean;
  }
  
  clearBuffer(): void {
    this._ringBuffer.clear();
  }
  
  async destroy(): Promise<void> {
    this._isRunning = false;
    this._isRecording = false;
    
    if (this._scriptProcessor) {
      this._scriptProcessor.onaudioprocess = null;
      this._scriptProcessor.disconnect();
      this._scriptProcessor = null;
    }
    
    if (this._analyser) {
      this._analyser.disconnect();
      this._analyser = null;
    }
    
    if (this._mediaStreamSource) {
      this._mediaStreamSource.disconnect();
      this._mediaStreamSource = null;
    }
    
    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach(track => track.stop());
      this._mediaStream = null;
    }
    
    if (this._audioContext) {
      if (this._audioContext.state !== 'closed') {
        await this._audioContext.close();
      }
      this._audioContext = null;
    }
    
    this._ringBuffer.clear();
    this._emit('destroyed', {});
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

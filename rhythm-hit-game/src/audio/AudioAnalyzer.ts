import { 
  AudioAnalysisResult, 
  BeatDetectionResult, 
  AudioConfig, 
  DEFAULT_AUDIO_CONFIG,
  MEYDA_FEATURES,
  MeydaFeature 
} from './types';

declare global {
  interface Window {
    Meyda?: any;
  }
}

export class AudioAnalyzer {
  private config: AudioConfig;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isInitialized = false;
  private energyHistory: number[] = [];
  private readonly ENERGY_HISTORY_SIZE = 43;
  private readonly BEAT_THRESHOLD_MULTIPLIER = 1.35;
  private meyda: any = null;

  constructor(config?: Partial<AudioConfig>) {
    this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
    this.energyHistory = new Array(this.ENERGY_HISTORY_SIZE).fill(0);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.config.sampleRate
    });

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = this.config.fftSize;
    this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.analyserNode.connect(this.gainNode);

    await this.loadMeyda();

    this.isInitialized = true;
  }

  private async loadMeyda(): Promise<void> {
    if (window.Meyda) {
      this.meyda = window.Meyda;
      return;
    }

    try {
      const module = await import('meyda');
      this.meyda = module.default || module;
    } catch (e) {
      console.warn('Meyda not available, using fallback analysis');
      this.meyda = null;
    }
  }

  async loadAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  async loadAudioFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    return this.loadAudioBuffer(arrayBuffer);
  }

  play(audioBuffer: AudioBuffer, startTime: number = 0, loop: boolean = false): void {
    if (!this.audioContext || !this.analyserNode || !this.gainNode) {
      throw new Error('Audio system not initialized');
    }

    this.stop();

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = audioBuffer;
    this.sourceNode.loop = loop;
    this.sourceNode.connect(this.analyserNode);
    this.sourceNode.start(0, startTime);
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.energyHistory.fill(0);
  }

  analyze(): AudioAnalysisResult {
    if (!this.analyserNode) {
      throw new Error('Analyser not available');
    }

    const bufferLength = this.analyserNode.frequencyBinCount;
    const timeData = new Float32Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);

    this.analyserNode.getByteTimeDomainData(timeData as any);
    this.analyserNode.getByteFrequencyData(frequencyData);

    if (this.meyda && this.audioContext) {
      try {
        const features: Record<MeydaFeature, any> = {} as any;
        
        for (const feature of MEYDA_FEATURES) {
          features[feature] = this.meyda.extract(feature, {
            buffer: timeData,
            sampleRate: this.audioContext.sampleRate,
            bufferSize: bufferLength
          });
        }

        return {
          spectralCentroid: features.spectralCentroid || 0,
          spectralFlatness: features.spectralFlatness || 0,
          spectralRolloff: features.spectralRolloff || 0,
          rms: features.rms || this.calculateRMS(timeData),
          energy: features.energy || this.calculateEnergy(frequencyData),
          zcr: features.zcr || this.calculateZCR(timeData),
          chroma: features.chroma || new Array(12).fill(0),
          mfcc: features.mfcc || new Array(13).fill(0),
          perceptualSharpness: features.perceptualSharpness || 0,
          perceptualSpread: features.perceptualSpread || 0
        };
      } catch (e) {
        console.warn('Meyda extraction failed, using fallback', e);
      }
    }

    return this.fallbackAnalysis(timeData, frequencyData, bufferLength);
  }

  private fallbackAnalysis(
    timeData: Float32Array,
    frequencyData: Uint8Array,
    bufferLength: number
  ): AudioAnalysisResult {
    const rms = this.calculateRMS(timeData);
    const energy = this.calculateEnergy(frequencyData);
    const zcr = this.calculateZCR(timeData);
    const spectralCentroid = this.calculateSpectralCentroid(frequencyData, bufferLength);
    const spectralFlatness = this.calculateSpectralFlatness(frequencyData);
    const spectralRolloff = this.calculateSpectralRolloff(frequencyData, 0.85);

    return {
      spectralCentroid,
      spectralFlatness,
      spectralRolloff,
      rms,
      energy,
      zcr,
      chroma: new Array(12).fill(0),
      mfcc: new Array(13).fill(0),
      perceptualSharpness: 0,
      perceptualSpread: 0
    };
  }

  detectBeat(currentEnergy: number, currentTime: number): BeatDetectionResult {
    this.energyHistory.shift();
    this.energyHistory.push(currentEnergy);

    const localAverage = this.calculateLocalAverage();
    const variance = this.calculateVariance(localAverage);
    const threshold = this.calculateThreshold(localAverage, variance);

    const isBeat = currentEnergy > threshold;
    const confidence = isBeat ? Math.min((currentEnergy - threshold) / (threshold * 0.5), 1) : 0;

    return {
      isBeat,
      confidence,
      time: currentTime,
      energy: currentEnergy
    };
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  private calculateEnergy(frequencyData: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const normalized = frequencyData[i] / 255;
      sum += normalized * normalized;
    }
    return sum / frequencyData.length;
  }

  private calculateZCR(timeData: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < timeData.length; i++) {
      if ((timeData[i - 1] >= 0 && timeData[i] < 0) ||
          (timeData[i - 1] < 0 && timeData[i] >= 0)) {
        crossings++;
      }
    }
    return crossings / timeData.length;
  }

  private calculateSpectralCentroid(frequencyData: Uint8Array, binCount: number): number {
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < binCount; i++) {
      const magnitude = frequencyData[i] / 255;
      numerator += i * magnitude;
      denominator += magnitude;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateSpectralFlatness(frequencyData: Uint8Array): number {
    let geometricMean = 1;
    let arithmeticMean = 0;
    const epsilon = 0.0001;

    for (let i = 0; i < frequencyData.length; i++) {
      const magnitude = (frequencyData[i] / 255) + epsilon;
      geometricMean *= magnitude;
      arithmeticMean += magnitude;
    }

    geometricMean = Math.pow(geometricMean, 1 / frequencyData.length);
    arithmeticMean /= frequencyData.length;

    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
  }

  private calculateSpectralRolloff(frequencyData: Uint8Array, percentile: number): number {
    const totalEnergy = frequencyData.reduce((sum, val) => sum + (val / 255), 0);
    const threshold = totalEnergy * percentile;
    let accumulated = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      accumulated += frequencyData[i] / 255;
      if (accumulated >= threshold) {
        return i / frequencyData.length;
      }
    }

    return 1;
  }

  private calculateLocalAverage(): number {
    const recent = this.energyHistory.slice(-Math.floor(this.ENERGY_HISTORY_SIZE / 2));
    return recent.reduce((sum, val) => sum + val, 0) / recent.length;
  }

  private calculateVariance(average: number): number {
    const recent = this.energyHistory.slice(-Math.floor(this.ENERGY_HISTORY_SIZE / 2));
    const sumSquaredDiffs = recent.reduce((sum, val) => {
      const diff = val - average;
      return sum + diff * diff;
    }, 0);
    return sumSquaredDiffs / recent.length;
  }

  private calculateThreshold(average: number, variance: number): number {
    const varianceCoefficient = -0.0025714 * variance + 1.5142857;
    return average * Math.min(varianceCoefficient, this.BEAT_THRESHOLD_MULTIPLIER);
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  resumeContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      return this.audioContext.resume();
    }
    return Promise.resolve();
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  dispose(): void {
    this.stop();
    
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isInitialized = false;
  }
}

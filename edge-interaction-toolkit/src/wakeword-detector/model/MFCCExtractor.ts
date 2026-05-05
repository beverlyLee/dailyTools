export class MFCCExtractor {
  private _sampleRate: number;
  private _fftSize: number;
  private _hopSize: number;
  private _numMfcc: number;
  private _numFilters: number;
  private _minFreq: number;
  private _maxFreq: number;
  private _filterBank: number[][];
  private _dctMatrix: number[][];
  private _hannWindow: number[];
  
  constructor(options: {
    sampleRate?: number;
    fftSize?: number;
    hopSize?: number;
    numMfcc?: number;
    numFilters?: number;
    minFreq?: number;
    maxFreq?: number;
  } = {}) {
    this._sampleRate = options.sampleRate ?? 16000;
    this._fftSize = options.fftSize ?? 512;
    this._hopSize = options.hopSize ?? 160;
    this._numMfcc = options.numMfcc ?? 13;
    this._numFilters = options.numFilters ?? 26;
    this._minFreq = options.minFreq ?? 0;
    this._maxFreq = options.maxFreq ?? this._sampleRate / 2;
    
    this._filterBank = this._createMelFilterBank();
    this._dctMatrix = this._createDCTMatrix();
    this._hannWindow = this._createHannWindow();
  }
  
  get sampleRate(): number { return this._sampleRate; }
  get fftSize(): number { return this._fftSize; }
  get hopSize(): number { return this._hopSize; }
  get numMfcc(): number { return this._numMfcc; }
  
  extract(audioData: Float32Array): Float32Array[] {
    const numFrames = Math.floor((audioData.length - this._fftSize) / this._hopSize) + 1;
    const mfccs: Float32Array[] = [];
    
    for (let i = 0; i < numFrames; i++) {
      const startIndex = i * this._hopSize;
      const frame = audioData.slice(startIndex, startIndex + this._fftSize);
      
      if (frame.length < this._fftSize) {
        const padded = new Float32Array(this._fftSize);
        padded.set(frame);
        const mfcc = this._processFrame(padded);
        mfccs.push(mfcc);
      } else {
        const mfcc = this._processFrame(frame);
        mfccs.push(mfcc);
      }
    }
    
    return mfccs;
  }
  
  private _processFrame(frame: Float32Array): Float32Array {
    const windowed = this._applyWindow(frame);
    const magnitudeSpectrum = this._computeMagnitudeSpectrum(windowed);
    const filterBankEnergies = this._applyFilterBank(magnitudeSpectrum);
    const logEnergies = filterBankEnergies.map(e => Math.log(Math.max(e, 1e-10)));
    const mfcc = this._applyDCT(logEnergies);
    
    return mfcc;
  }
  
  private _createHannWindow(): number[] {
    const window: number[] = [];
    for (let i = 0; i < this._fftSize; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (this._fftSize - 1)));
    }
    return window;
  }
  
  private _applyWindow(frame: Float32Array): Float32Array {
    const result = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      result[i] = frame[i] * this._hannWindow[i];
    }
    return result;
  }
  
  private _computeMagnitudeSpectrum(frame: Float32Array): Float32Array {
    const spectrum = new Float32Array(this._fftSize / 2);
    
    for (let k = 0; k < this._fftSize / 2; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < this._fftSize; n++) {
        const angle = -2 * Math.PI * k * n / this._fftSize;
        real += frame[n] * Math.cos(angle);
        imag += frame[n] * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag) / this._fftSize;
    }
    
    return spectrum;
  }
  
  private _createMelFilterBank(): number[][] {
    const filterBank: number[][] = [];
    const numFilters = this._numFilters;
    const fftSize = this._fftSize;
    const sampleRate = this._sampleRate;
    
    const minMel = this._hzToMel(this._minFreq);
    const maxMel = this._hzToMel(this._maxFreq);
    
    const melPoints: number[] = [];
    for (let i = 0; i <= numFilters + 1; i++) {
      melPoints[i] = minMel + (maxMel - minMel) * i / (numFilters + 1);
    }
    
    const hzPoints = melPoints.map(m => this._melToHz(m));
    
    const binIndices = hzPoints.map(hz => Math.floor((fftSize + 1) * hz / sampleRate));
    
    for (let i = 1; i <= numFilters; i++) {
      const filter: number[] = new Array(fftSize / 2).fill(0);
      
      for (let j = binIndices[i - 1]; j <= binIndices[i]; j++) {
        if (j < fftSize / 2) {
          filter[j] = (j - binIndices[i - 1]) / (binIndices[i] - binIndices[i - 1]);
        }
      }
      
      for (let j = binIndices[i]; j <= binIndices[i + 1]; j++) {
        if (j < fftSize / 2) {
          filter[j] = 1 - (j - binIndices[i]) / (binIndices[i + 1] - binIndices[i]);
        }
      }
      
      filterBank.push(filter);
    }
    
    return filterBank;
  }
  
  private _applyFilterBank(spectrum: Float32Array): number[] {
    const energies: number[] = [];
    
    for (let i = 0; i < this._filterBank.length; i++) {
      let energy = 0;
      for (let j = 0; j < spectrum.length; j++) {
        energy += spectrum[j] * spectrum[j] * this._filterBank[i][j];
      }
      energies.push(energy);
    }
    
    return energies;
  }
  
  private _createDCTMatrix(): number[][] {
    const matrix: number[][] = [];
    const numFilters = this._numFilters;
    const numMfcc = this._numMfcc;
    
    for (let i = 0; i < numMfcc; i++) {
      matrix[i] = [];
      for (let j = 0; j < numFilters; j++) {
        matrix[i][j] = Math.sqrt(2.0 / numFilters) * Math.cos(i * Math.PI * (j + 0.5) / numFilters);
      }
    }
    
    return matrix;
  }
  
  private _applyDCT(logEnergies: number[]): Float32Array {
    const mfcc = new Float32Array(this._numMfcc);
    
    for (let i = 0; i < this._numMfcc; i++) {
      let sum = 0;
      for (let j = 0; j < logEnergies.length; j++) {
        sum += logEnergies[j] * this._dctMatrix[i][j];
      }
      mfcc[i] = sum;
    }
    
    return mfcc;
  }
  
  private _hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
  }
  
  private _melToHz(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }
  
  computeDeltaFeatures(mfccs: Float32Array[]): Float32Array[] {
    const deltas: Float32Array[] = [];
    const numFrames = mfccs.length;
    const numCoeffs = mfccs[0]?.length || 0;
    
    for (let t = 0; t < numFrames; t++) {
      const delta = new Float32Array(numCoeffs);
      
      for (let c = 0; c < numCoeffs; c++) {
        let numerator = 0;
        let denominator = 0;
        
        for (let n = 1; n <= 2; n++) {
          const prev = t - n >= 0 ? mfccs[t - n][c] : 0;
          const next = t + n < numFrames ? mfccs[t + n][c] : mfccs[t][c];
          numerator += n * (next - prev);
          denominator += n * n;
        }
        
        delta[c] = numerator / (2 * denominator);
      }
      
      deltas.push(delta);
    }
    
    return deltas;
  }
  
  normalizeFeatures(mfccs: Float32Array[]): Float32Array[] {
    const numFrames = mfccs.length;
    if (numFrames === 0) return mfccs;
    
    const numCoeffs = mfccs[0].length;
    const mean = new Float32Array(numCoeffs);
    const variance = new Float32Array(numCoeffs);
    
    for (let c = 0; c < numCoeffs; c++) {
      let sum = 0;
      for (let t = 0; t < numFrames; t++) {
        sum += mfccs[t][c];
      }
      mean[c] = sum / numFrames;
    }
    
    for (let c = 0; c < numCoeffs; c++) {
      let sum = 0;
      for (let t = 0; t < numFrames; t++) {
        const diff = mfccs[t][c] - mean[c];
        sum += diff * diff;
      }
      variance[c] = Math.sqrt(sum / numFrames + 1e-10);
    }
    
    const normalized: Float32Array[] = [];
    for (let t = 0; t < numFrames; t++) {
      const frame = new Float32Array(numCoeffs);
      for (let c = 0; c < numCoeffs; c++) {
        frame[c] = (mfccs[t][c] - mean[c]) / variance[c];
      }
      normalized.push(frame);
    }
    
    return normalized;
  }
}

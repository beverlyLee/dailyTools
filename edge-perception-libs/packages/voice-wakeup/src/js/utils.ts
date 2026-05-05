import type { AudioConfig, AudioFrame } from './types';

export function resampleAudio(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return input;
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;

    if (index >= input.length - 1) {
      output[i] = input[input.length - 1];
    } else {
      output[i] = input[index] * (1 - fraction) + input[index + 1] * fraction;
    }
  }

  return output;
}

export function convertToMono(input: Float32Array, channelCount: number): Float32Array {
  if (channelCount === 1) {
    return input;
  }

  const output = new Float32Array(input.length / channelCount);
  for (let i = 0; i < output.length; i++) {
    let sum = 0;
    for (let c = 0; c < channelCount; c++) {
      sum += input[i * channelCount + c];
    }
    output[i] = sum / channelCount;
  }
  return output;
}

export function applyPreEmphasis(input: Float32Array, coefficient: number = 0.97): Float32Array {
  const output = new Float32Array(input.length);
  output[0] = input[0];
  for (let i = 1; i < input.length; i++) {
    output[i] = input[i] - coefficient * input[i - 1];
  }
  return output;
}

export function normalizeAudio(input: Float32Array): Float32Array {
  if (input.length === 0) {
    return input;
  }

  let max = Math.abs(input[0]);
  for (let i = 1; i < input.length; i++) {
    max = Math.max(max, Math.abs(input[i]));
  }

  if (max === 0) {
    return input;
  }

  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] / max;
  }
  return output;
}

export function computeRMS(input: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input[i] * input[i];
  }
  return Math.sqrt(sum / input.length);
}

export function computeZCR(input: Float32Array): number {
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

export function computeSpectralCentroid(input: Float32Array, sampleRate: number): number {
  const n = input.length;
  const fftSize = Math.pow(2, Math.ceil(Math.log2(n)));
  
  let magnitudeSum = 0;
  let weightedSum = 0;
  
  for (let k = 0; k < n / 2; k++) {
    const freq = k * sampleRate / n;
    const magnitude = Math.abs(input[k]);
    magnitudeSum += magnitude;
    weightedSum += freq * magnitude;
  }
  
  if (magnitudeSum === 0) {
    return 0;
  }
  
  return weightedSum / magnitudeSum;
}

export function generateHannWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
  }
  return window;
}

export function applyWindow(input: Float32Array, window: Float32Array): Float32Array {
  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] * window[i];
  }
  return output;
}

export class RingBuffer {
  private buffer: Float32Array;
  private writeIndex: number = 0;
  private readIndex: number = 0;
  private _size: number = 0;

  constructor(capacity: number) {
    this.buffer = new Float32Array(capacity);
  }

  get capacity(): number {
    return this.buffer.length;
  }

  get size(): number {
    return this._size;
  }

  write(samples: Float32Array): number {
    const written = Math.min(samples.length, this.capacity - this._size);
    
    for (let i = 0; i < written; i++) {
      this.buffer[this.writeIndex] = samples[i];
      this.writeIndex = (this.writeIndex + 1) % this.capacity;
      this._size++;
    }
    
    return written;
  }

  read(length: number): Float32Array {
    const toRead = Math.min(length, this._size);
    const output = new Float32Array(toRead);
    
    for (let i = 0; i < toRead; i++) {
      output[i] = this.buffer[this.readIndex];
      this.readIndex = (this.readIndex + 1) % this.capacity;
      this._size--;
    }
    
    return output;
  }

  peek(length: number): Float32Array {
    const toRead = Math.min(length, this._size);
    const output = new Float32Array(toRead);
    
    for (let i = 0; i < toRead; i++) {
      const index = (this.readIndex + i) % this.capacity;
      output[i] = this.buffer[index];
    }
    
    return output;
  }

  clear(): void {
    this.writeIndex = 0;
    this.readIndex = 0;
    this._size = 0;
    this.buffer.fill(0);
  }

  isEmpty(): boolean {
    return this._size === 0;
  }

  isFull(): boolean {
    return this._size === this.capacity;
  }
}

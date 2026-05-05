export class RingBuffer {
  private _buffer: Float32Array;
  private _capacity: number;
  private _writeIndex: number;
  private _readIndex: number;
  private _length: number;
  
  constructor(capacity: number) {
    this._capacity = capacity;
    this._buffer = new Float32Array(capacity);
    this._writeIndex = 0;
    this._readIndex = 0;
    this._length = 0;
  }
  
  get capacity(): number { return this._capacity; }
  get length(): number { return this._length; }
  get isEmpty(): boolean { return this._length === 0; }
  get isFull(): boolean { return this._length === this._capacity; }
  
  write(data: Float32Array): number {
    const dataLength = data.length;
    const available = this._capacity - this._length;
    
    if (available === 0) return 0;
    
    const toWrite = Math.min(dataLength, available);
    
    for (let i = 0; i < toWrite; i++) {
      this._buffer[this._writeIndex] = data[i];
      this._writeIndex = (this._writeIndex + 1) % this._capacity;
    }
    
    this._length += toWrite;
    
    return toWrite;
  }
  
  read(length: number): Float32Array {
    if (this._length === 0 || length <= 0) {
      return new Float32Array(0);
    }
    
    const toRead = Math.min(length, this._length);
    const result = new Float32Array(toRead);
    
    for (let i = 0; i < toRead; i++) {
      result[i] = this._buffer[this._readIndex];
      this._readIndex = (this._readIndex + 1) % this._capacity;
    }
    
    this._length -= toRead;
    
    return result;
  }
  
  peek(length: number): Float32Array {
    if (this._length === 0 || length <= 0) {
      return new Float32Array(0);
    }
    
    const toPeek = Math.min(length, this._length);
    const result = new Float32Array(toPeek);
    
    for (let i = 0; i < toPeek; i++) {
      const index = (this._readIndex + i) % this._capacity;
      result[i] = this._buffer[index];
    }
    
    return result;
  }
  
  discard(length: number): number {
    if (this._length === 0 || length <= 0) return 0;
    
    const toDiscard = Math.min(length, this._length);
    this._readIndex = (this._readIndex + toDiscard) % this._capacity;
    this._length -= toDiscard;
    
    return toDiscard;
  }
  
  clear(): void {
    this._writeIndex = 0;
    this._readIndex = 0;
    this._length = 0;
    this._buffer.fill(0);
  }
  
  getAvailable(): number {
    return this._capacity - this._length;
  }
  
  getReadable(): number {
    return this._length;
  }
  
  toArray(): Float32Array {
    return this.peek(this._length);
  }
  
  forEach(callback: (value: number, index: number) => void): void {
    for (let i = 0; i < this._length; i++) {
      const index = (this._readIndex + i) % this._capacity;
      callback(this._buffer[index], i);
    }
  }
  
  map<T>(callback: (value: number, index: number) => T): T[] {
    const result: T[] = [];
    this.forEach((value, index) => {
      result.push(callback(value, index));
    });
    return result;
  }
  
  reduce<T>(callback: (accumulator: T, currentValue: number, index: number) => T, initialValue: T): T {
    let accumulator = initialValue;
    this.forEach((value, index) => {
      accumulator = callback(accumulator, value, index);
    });
    return accumulator;
  }
  
  clone(): RingBuffer {
    const clone = new RingBuffer(this._capacity);
    clone._buffer = new Float32Array(this._buffer);
    clone._writeIndex = this._writeIndex;
    clone._readIndex = this._readIndex;
    clone._length = this._length;
    return clone;
  }
}

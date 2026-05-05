export declare class RingBuffer {
    private _buffer;
    private _capacity;
    private _writeIndex;
    private _readIndex;
    private _length;
    constructor(capacity: number);
    get capacity(): number;
    get length(): number;
    get isEmpty(): boolean;
    get isFull(): boolean;
    write(data: Float32Array): number;
    read(length: number): Float32Array;
    peek(length: number): Float32Array;
    discard(length: number): number;
    clear(): void;
    getAvailable(): number;
    getReadable(): number;
    toArray(): Float32Array;
    forEach(callback: (value: number, index: number) => void): void;
    map<T>(callback: (value: number, index: number) => T): T[];
    reduce<T>(callback: (accumulator: T, currentValue: number, index: number) => T, initialValue: T): T;
    clone(): RingBuffer;
}

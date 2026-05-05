import { RingBuffer } from './RingBuffer';
import { AudioConfig, AudioFeatures } from '../types';

export declare class AudioStreamProcessor {
    private _config;
    private _audioContext;
    private _mediaStream;
    private _mediaStreamSource;
    private _scriptProcessor;
    private _analyser;
    private _ringBuffer;
    private _isRunning;
    private _isRecording;
    private _listeners;
    constructor(config?: Partial<AudioConfig>);
    get config(): AudioConfig;
    get isRunning(): boolean;
    get isRecording(): boolean;
    get ringBuffer(): RingBuffer;
    get sampleRate(): number;
    init(): Promise<void>;
    start(): void;
    stop(): void;
    private _onAudioProcess;
    private _resample;
    readAvailable(): Float32Array;
    peekAvailable(): Float32Array;
    getFeatures(frameSize?: number): AudioFeatures | null;
    private _calculateRMS;
    private _calculateZCR;
    private _calculateEnergy;
    private _calculateSpectralCentroid;
    private _calculateSpectralFlatness;
    clearBuffer(): void;
    destroy(): Promise<void>;
    on(event: string, callback: (event: any) => void): () => void;
    off(event: string, callback: (event: any) => void): void;
    private _emit;
}

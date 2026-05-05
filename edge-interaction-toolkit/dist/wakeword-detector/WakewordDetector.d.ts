import { AudioStreamProcessor } from './audio';
import { VAD } from './vad';
import { WakewordModel } from './model';
import { AudioConfig, VADConfig, WakewordConfig, WakewordCallback, WakewordResult } from './types';

export interface WakewordDetectorOptions {
    audioConfig?: Partial<AudioConfig>;
    vadConfig?: Partial<VADConfig>;
    wakewordConfig?: Partial<WakewordConfig>;
    wakeword?: string;
}
export declare class WakewordDetector {
    private _audioProcessor;
    private _vad;
    private _model;
    private _isInitialized;
    private _isRunning;
    private _listeners;
    private _wakeword;
    private _audioConfig;
    private _vadConfig;
    private _wakewordConfig;
    private _frameCount;
    private _speechFrames;
    private _isSpeechDetected;
    private _cooldownFrames;
    private _cooldownCounter;
    constructor(options?: WakewordDetectorOptions);
    get isInitialized(): boolean;
    get isRunning(): boolean;
    get wakeword(): string;
    get audioProcessor(): AudioStreamProcessor;
    get vad(): VAD;
    get model(): WakewordModel;
    init(): Promise<void>;
    start(): Promise<void>;
    stop(): void;
    destroy(): Promise<void>;
    private _setupListeners;
    private _processAudioFrame;
    private _processSpeechSegment;
    onWakeword(callback: (result: WakewordResult & {
        wakeword: string;
    }) => void): () => void;
    onVADStart(callback: (data: any) => void): () => void;
    onVADEnd(callback: (data: any) => void): () => void;
    on(event: string, callback: WakewordCallback): () => void;
    off(event: string, callback: WakewordCallback): void;
    private _emit;
    private _createDummyTemplate;
    trainWithAudio(audioData: Float32Array, label?: string): void;
    trainWithFeatures(features: Float32Array[], label?: string): void;
    setWakeword(wakeword: string): void;
    setThreshold(threshold: number): void;
    setVADThreshold(threshold: number): void;
    saveModel(): {
        config: WakewordConfig;
        templates: Record<string, number[][]>;
    };
    loadModel(data: {
        config: WakewordConfig;
        templates: Record<string, number[][]>;
    }): void;
}

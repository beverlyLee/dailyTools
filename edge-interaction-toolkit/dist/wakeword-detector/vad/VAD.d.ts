import { VADConfig, VADResult, AudioFeatures } from '../types';

export declare class VAD {
    private _config;
    private _frameIndex;
    private _isSpeech;
    private _speechFrames;
    private _silenceFrames;
    private _hangoverCount;
    private _speechStartFrame;
    private _history;
    private _listeners;
    private _isRunning;
    constructor(config?: Partial<VADConfig>);
    get config(): VADConfig;
    get isSpeech(): boolean;
    get isRunning(): boolean;
    get history(): VADResult[];
    start(): void;
    stop(): void;
    reset(): void;
    process(features: AudioFeatures): VADResult;
    private _calculateSpeechProbability;
    getSpeechSegments(): Array<{
        startFrame: number;
        endFrame: number;
        startTimestamp: number;
        endTimestamp: number;
    }>;
    updateConfig(config: Partial<VADConfig>): void;
    on(event: string, callback: (event: any) => void): () => void;
    off(event: string, callback: (event: any) => void): void;
    private _emit;
}

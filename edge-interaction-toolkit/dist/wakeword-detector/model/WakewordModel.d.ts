import { MFCCExtractor } from './MFCCExtractor';
import { WakewordConfig, WakewordResult, WakewordCallback } from '../types';

export declare class WakewordModel {
    private _config;
    private _extractor;
    private _template;
    private _templates;
    private _threshold;
    private _isTrained;
    private _listeners;
    private _frameBuffer;
    private _maxFrames;
    constructor(config?: Partial<WakewordConfig>);
    get config(): WakewordConfig;
    get isTrained(): boolean;
    get threshold(): number;
    set threshold(value: number);
    get extractor(): MFCCExtractor;
    train(audioData: Float32Array, label?: string): void;
    trainWithFeatures(features: Float32Array[], label?: string): void;
    reset(): void;
    predict(audioData: Float32Array): WakewordResult;
    predictIncremental(frame: Float32Array): WakewordResult | null;
    private _dynamicTimeWarping;
    private _euclideanDistance;
    on(event: string, callback: WakewordCallback): () => void;
    off(event: string, callback: WakewordCallback): void;
    private _emit;
    saveModel(): {
        config: WakewordConfig;
        templates: Record<string, number[][]>;
    };
    loadModel(data: {
        config: WakewordConfig;
        templates: Record<string, number[][]>;
    }): void;
}

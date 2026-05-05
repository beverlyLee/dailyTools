export interface AudioConfig {
    sampleRate: number;
    channels: number;
    bufferSize: number;
    fftSize: number;
}
export interface AudioFrame {
    data: Float32Array;
    sampleRate: number;
    timestamp: number;
    duration: number;
}
export interface AudioFeatures {
    rms: number;
    zcr: number;
    energy: number;
    spectralCentroid: number;
    spectralFlatness: number;
    mfcc?: Float32Array;
    timestamp: number;
}
export interface VADConfig {
    threshold: number;
    frameDurationMs: number;
    bufferSize: number;
    hangoverFrames: number;
    minSpeechFrames: number;
}
export interface VADResult {
    isSpeech: boolean;
    probability: number;
    frameIndex: number;
    timestamp: number;
}
export interface WakewordConfig {
    modelName: string;
    threshold: number;
    windowSize: number;
    hopSize: number;
    samplingRate: number;
    mfccCoeffs: number;
}
export interface WakewordResult {
    detected: boolean;
    confidence: number;
    timestamp: number;
    label: string;
}
export interface WakewordEvent {
    type: 'wakeword' | 'vad_start' | 'vad_end' | 'audio_data';
    data?: any;
    timestamp: number;
}
export type WakewordCallback = (event: WakewordEvent) => void;
export interface AudioProcessorState {
    isRunning: boolean;
    isRecording: boolean;
    isVADActive: boolean;
    audioContext?: AudioContext;
    mediaStream?: MediaStream;
    mediaStreamSource?: MediaStreamAudioSourceNode;
    scriptProcessor?: ScriptProcessorNode | AudioWorkletNode;
}

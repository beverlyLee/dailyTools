export declare class MFCCExtractor {
    private _sampleRate;
    private _fftSize;
    private _hopSize;
    private _numMfcc;
    private _numFilters;
    private _minFreq;
    private _maxFreq;
    private _filterBank;
    private _dctMatrix;
    private _hannWindow;
    constructor(options?: {
        sampleRate?: number;
        fftSize?: number;
        hopSize?: number;
        numMfcc?: number;
        numFilters?: number;
        minFreq?: number;
        maxFreq?: number;
    });
    get sampleRate(): number;
    get fftSize(): number;
    get hopSize(): number;
    get numMfcc(): number;
    extract(audioData: Float32Array): Float32Array[];
    private _processFrame;
    private _createHannWindow;
    private _applyWindow;
    private _computeMagnitudeSpectrum;
    private _createMelFilterBank;
    private _applyFilterBank;
    private _createDCTMatrix;
    private _applyDCT;
    private _hzToMel;
    private _melToHz;
    computeDeltaFeatures(mfccs: Float32Array[]): Float32Array[];
    normalizeFeatures(mfccs: Float32Array[]): Float32Array[];
}

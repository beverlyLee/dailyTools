import type {
  DetectorOptions,
  FaceDetectionResult,
  ImageSource,
  FrameInput,
} from './types';

import { imageSourceToFrame, frameToImageData, drawDetections } from './utils';
import { WorkerFaceDetector, createWorkerDetector } from './workerDetector';

export * from './types';
export { drawDetections, imageSourceToFrame } from './utils';
export { WorkerFaceDetector, createWorkerDetector } from './workerDetector';

interface WasmModule {
  FaceDetector: {
    new (): WasmFaceDetector;
  };
  init_panic_hook(): void;
  default(): Promise<void>;
}

interface WasmFaceDetector {
  set_min_face_size(size: number): void;
  set_scale_factor(factor: number): void;
  set_score_threshold(threshold: number): void;
  enable_landmarks(count: number): void;
  detect(imageData: ImageData): WasmDetectionResult[];
}

interface WasmDetectionResult {
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    area(): number;
    center_x(): number;
    center_y(): number;
  };
  landmarks_5?: Array<{ x: number; y: number }>;
  landmarks_68?: Array<{ x: number; y: number }>;
}

let wasmModule: WasmModule | null = null;
let detector: WasmFaceDetector | null = null;
let initPromise: Promise<void> | null = null;
let defaultOptions: DetectorOptions = {};

export async function init(
  wasmPath?: string,
  options?: DetectorOptions
): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      if (wasmPath) {
        wasmModule = await import(wasmPath) as WasmModule;
      } else {
        // @ts-ignore - WASM module is generated at build time
        wasmModule = await import('../../pkg/edge_face_detection.js') as WasmModule;
      }

      if (typeof wasmModule.default === 'function') {
        await wasmModule.default();
      }

      if (typeof wasmModule.init_panic_hook === 'function') {
        wasmModule.init_panic_hook();
      }

      detector = new wasmModule.FaceDetector();

      if (options) {
        applyOptions(options);
        defaultOptions = { ...defaultOptions, ...options };
      }
    } catch (error) {
      initPromise = null;
      throw new Error(`Failed to initialize face detector: ${error}`);
    }
  })();

  return initPromise;
}

function applyOptions(options: DetectorOptions): void {
  if (!detector) return;

  if (options.minFaceSize !== undefined) {
    detector.set_min_face_size(options.minFaceSize);
  }

  if (options.scaleFactor !== undefined) {
    detector.set_scale_factor(options.scaleFactor);
  }

  if (options.scoreThreshold !== undefined) {
    detector.set_score_threshold(options.scoreThreshold);
  }

  if (options.enableLandmarks !== undefined) {
    if (options.enableLandmarks === 5 || options.enableLandmarks === 68) {
      detector.enable_landmarks(options.enableLandmarks);
    } else {
      detector.enable_landmarks(0);
    }
  }
}

function convertWasmResult(wasmResult: WasmDetectionResult): FaceDetectionResult {
  const bbox = wasmResult.bbox;
  const result: FaceDetectionResult = {
    bbox: {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      confidence: bbox.confidence,
      area: bbox.area(),
      center_x: bbox.center_x(),
      center_y: bbox.center_y(),
    },
  };

  if (wasmResult.landmarks_5) {
    result.landmarks_5 = wasmResult.landmarks_5.map((p) => ({
      x: p.x,
      y: p.y,
    }));
  }

  if (wasmResult.landmarks_68) {
    result.landmarks_68 = wasmResult.landmarks_68.map((p) => ({
      x: p.x,
      y: p.y,
    }));
  }

  return result;
}

export async function detect(
  source: ImageSource,
  options?: DetectorOptions
): Promise<FaceDetectionResult[]> {
  if (!initPromise) {
    throw new Error('Detector not initialized. Call init() first.');
  }

  await initPromise;

  if (!detector) {
    throw new Error('Detector not initialized properly.');
  }

  if (options) {
    applyOptions(options);
  }

  const frame = imageSourceToFrame(source);
  const imageData = frameToImageData(frame);

  const wasmResults = detector.detect(imageData);

  const results = wasmResults.map(convertWasmResult);

  if (options) {
    applyOptions(defaultOptions);
  }

  return results;
}

export function setOptions(options: DetectorOptions): void {
  if (!detector) {
    throw new Error('Detector not initialized. Call init() first.');
  }

  applyOptions(options);
  defaultOptions = { ...defaultOptions, ...options };
}

export function getOptions(): DetectorOptions {
  return { ...defaultOptions };
}

export async function dispose(): Promise<void> {
  detector = null;
  wasmModule = null;
  initPromise = null;
  defaultOptions = {};
}

export class FaceDetectorWrapper {
  private initialized: boolean = false;

  constructor(private options: DetectorOptions = {}) {}

  async init(wasmPath?: string): Promise<void> {
    if (this.initialized) return;

    await init(wasmPath, this.options);
    this.initialized = true;
  }

  detect(source: ImageSource, options?: DetectorOptions): Promise<FaceDetectionResult[]> {
    if (!this.initialized) {
      throw new Error('Detector not initialized. Call init() first.');
    }

    return detect(source, options);
  }

  setOptions(options: DetectorOptions): void {
    this.options = { ...this.options, ...options };
    setOptions(options);
  }

  getOptions(): DetectorOptions {
    return { ...this.options };
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    await dispose();
  }
}

export async function createDetector(
  options?: DetectorOptions,
  wasmPath?: string
): Promise<FaceDetectorWrapper> {
  const detectorWrapper = new FaceDetectorWrapper(options);
  await detectorWrapper.init(wasmPath);
  return detectorWrapper;
}

export default {
  init,
  detect,
  setOptions,
  getOptions,
  dispose,
  createDetector,
  drawDetections,
  WorkerFaceDetector,
  createWorkerDetector,
};

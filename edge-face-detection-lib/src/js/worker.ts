import type {
  DetectorOptions,
  WorkerMessage,
  WorkerResponse,
  FrameInput,
} from './types';

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
  detect(imageData: ImageData): Array<{
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
  }>;
}

let wasmModule: WasmModule | null = null;
let detector: WasmFaceDetector | null = null;
let currentOptions: DetectorOptions = {};

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

  currentOptions = { ...currentOptions, ...options };
}

function frameToImageData(frame: FrameInput): ImageData {
  const clampedArray = new Uint8ClampedArray(frame.data);
  return new ImageData(clampedArray, frame.width, frame.height);
}

async function handleInit(message: WorkerMessage): Promise<void> {
  try {
    const importScripts = (globalThis as any).importScripts;
    
    if (importScripts) {
      try {
        importScripts('./pkg/edge_face_detection.js');
        wasmModule = (globalThis as any).edge_face_detection as WasmModule;
      } catch {
        wasmModule = (await import('../../pkg/edge_face_detection.js')) as WasmModule;
      }
    } else {
      wasmModule = (await import('../../pkg/edge_face_detection.js')) as WasmModule;
    }

    if (wasmModule && typeof (wasmModule as any).default === 'function') {
      await (wasmModule as any).default();
    }

    if (wasmModule && typeof wasmModule.init_panic_hook === 'function') {
      wasmModule.init_panic_hook();
    }

    if (!wasmModule || !wasmModule.FaceDetector) {
      throw new Error('WASM module not loaded properly');
    }

    detector = new wasmModule.FaceDetector();

    if (message.options) {
      applyOptions(message.options);
    }

    postMessage({
      type: 'ready',
      id: message.id,
    } as WorkerResponse);
  } catch (error) {
    postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      id: message.id,
    } as WorkerResponse);
  }
}

function handleSetOptions(message: WorkerMessage): void {
  if (message.options) {
    applyOptions(message.options);
  }
}

function handleDetect(message: WorkerMessage): void {
  if (!detector || !message.frame) {
    postMessage({
      type: 'error',
      error: 'Detector not initialized or no frame provided',
      id: message.id,
    } as WorkerResponse);
    return;
  }

  try {
    const frame = message.frame;
    const imageData = frameToImageData(frame);

    const wasmResults = detector.detect(imageData);

    const results = wasmResults.map((wasmResult) => ({
      bbox: {
        x: wasmResult.bbox.x,
        y: wasmResult.bbox.y,
        width: wasmResult.bbox.width,
        height: wasmResult.bbox.height,
        confidence: wasmResult.bbox.confidence,
      },
      landmarks_5: wasmResult.landmarks_5?.map((p) => ({ x: p.x, y: p.y })),
      landmarks_68: wasmResult.landmarks_68?.map((p) => ({ x: p.x, y: p.y })),
    }));

    postMessage({
      type: 'result',
      results,
      id: message.id,
    } as WorkerResponse);
  } catch (error) {
    postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      id: message.id,
    } as WorkerResponse);
  }
}

function onMessageHandler(event: MessageEvent<WorkerMessage>): void {
  const message = event.data;

  switch (message.type) {
    case 'init':
      handleInit(message);
      break;
    case 'setOptions':
      handleSetOptions(message);
      break;
    case 'detect':
      handleDetect(message);
      break;
    default:
      console.warn('Unknown message type:', (message as any).type);
  }
}

if (typeof addEventListener !== 'undefined') {
  addEventListener('message', onMessageHandler);
} else if (typeof onmessage !== 'undefined') {
  (globalThis as any).onmessage = onMessageHandler;
}

export { onMessageHandler };

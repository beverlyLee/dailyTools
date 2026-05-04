export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  area(): number;
  center_x(): number;
  center_y(): number;
}

export interface FaceDetectionResult {
  bbox: BoundingBox;
  landmarks_5?: Point[];
  landmarks_68?: Point[];
}

export interface DetectorOptions {
  minFaceSize?: number;
  scaleFactor?: number;
  scoreThreshold?: number;
  enableLandmarks?: 5 | 68 | null;
}

export interface FrameInput {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

export type ImageSource = 
  | HTMLImageElement 
  | HTMLCanvasElement 
  | HTMLVideoElement 
  | ImageData 
  | FrameInput;

export interface WorkerMessage {
  type: 'init' | 'detect' | 'setOptions';
  options?: DetectorOptions;
  frame?: FrameInput;
  id?: number;
}

export interface WorkerResponse {
  type: 'ready' | 'result' | 'error';
  results?: FaceDetectionResult[];
  error?: string;
  id?: number;
}

import type { Point, BoundingBox, FrameInput, ImageSource, WorkerMessage, WorkerResponse } from '@edge-perception/common';

export { Point, BoundingBox, FrameInput, ImageSource, WorkerMessage, WorkerResponse };

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
  useSimd?: boolean;
}

export interface FaceDetectorWorkerMessage extends WorkerMessage {
  type: 'init' | 'detect' | 'setOptions';
  options?: DetectorOptions;
  frame?: FrameInput;
}

export interface FaceDetectorWorkerResponse extends WorkerResponse {
  type: 'ready' | 'result' | 'error';
  results?: FaceDetectionResult[];
}

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

export interface WorkerMessage<T = unknown> {
  type: string;
  payload?: T;
  id?: number;
}

export interface WorkerResponse<T = unknown> {
  type: 'ready' | 'result' | 'error' | 'status';
  payload?: T;
  error?: string;
  id?: number;
}

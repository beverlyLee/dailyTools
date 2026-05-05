declare module '../../pkg/edge_face_detection.js' {
  export interface Point {
    x: number;
    y: number;
    new(x: number, y: number): Point;
  }

  export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    new(x: number, y: number, width: number, height: number, confidence: number): BoundingBox;
    area(): number;
    center_x(): number;
    center_y(): number;
  }

  export interface FaceDetectionResult {
    bbox: BoundingBox;
    landmarks_5?: Array<Point>;
    landmarks_68?: Array<Point>;
    new(bbox: BoundingBox): FaceDetectionResult;
    set_landmarks_5(points: Array<Point>): void;
    set_landmarks_68(points: Array<Point>): void;
  }

  export interface FaceDetector {
    new(): FaceDetector;
    set_min_face_size(size: number): void;
    set_scale_factor(factor: number): void;
    set_score_threshold(threshold: number): void;
    enable_landmarks(count: number): void;
    detect(imageData: ImageData): Array<FaceDetectionResult>;
  }

  export function init_panic_hook(): void;
  export function start(): void;
  export default function init(): Promise<void>;

  export const Point: Point;
  export const BoundingBox: BoundingBox;
  export const FaceDetectionResult: FaceDetectionResult;
  export const FaceDetector: FaceDetector;
}

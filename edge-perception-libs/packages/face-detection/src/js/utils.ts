import type { ImageSource, FrameInput, BoundingBox, Point, FaceDetectionResult } from './types';
import { imageSourceToFrame as commonImageSourceToFrame, frameToImageData as commonFrameToImageData } from '@edge-perception/common';

export { clamp, lerp, debounce, throttle } from '@edge-perception/common';

export function imageSourceToFrame(source: ImageSource): FrameInput {
  return commonImageSourceToFrame(source);
}

export function frameToImageData(frame: FrameInput): ImageData {
  return commonFrameToImageData(frame);
}

export function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: FaceDetectionResult[],
  options?: { color?: string; lineWidth?: number; drawLandmarks?: boolean }
): void {
  const { color = '#00ff00', lineWidth = 2, drawLandmarks = true } = options || {};

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.fillStyle = color;

  for (const detection of detections) {
    const { bbox } = detection;
    
    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
    
    ctx.font = '12px sans-serif';
    ctx.fillText(`${(bbox.confidence * 100).toFixed(1)}%`, bbox.x, bbox.y - 5);

    if (drawLandmarks) {
      if (detection.landmarks_5) {
        ctx.fillStyle = '#ff0000';
        for (const point of detection.landmarks_5) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      if (detection.landmarks_68) {
        ctx.fillStyle = '#ffff00';
        for (const point of detection.landmarks_68) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

export function computeIoU(box1: BoundingBox, box2: BoundingBox): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
  
  const width = x2 - x1;
  const height = y2 - y1;
  
  if (width <= 0 || height <= 0) {
    return 0;
  }
  
  const intersection = width * height;
  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const union = area1 + area2 - intersection;
  
  return intersection / union;
}

export function nonMaxSuppression(
  detections: FaceDetectionResult[],
  iouThreshold: number = 0.5
): FaceDetectionResult[] {
  if (detections.length === 0) {
    return [];
  }
  
  const sorted = [...detections].sort((a, b) => b.bbox.confidence - a.bbox.confidence);
  const keep: FaceDetectionResult[] = [];
  const suppressed = new Set<number>();
  
  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    
    keep.push(sorted[i]);
    
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;
      
      const iou = computeIoU(sorted[i].bbox, sorted[j].bbox);
      if (iou > iouThreshold) {
        suppressed.add(j);
      }
    }
  }
  
  return keep;
}

export function scaleDetections(
  detections: FaceDetectionResult[],
  scaleX: number,
  scaleY: number
): FaceDetectionResult[] {
  return detections.map(d => ({
    bbox: {
      x: d.bbox.x * scaleX,
      y: d.bbox.y * scaleY,
      width: d.bbox.width * scaleX,
      height: d.bbox.height * scaleY,
      confidence: d.bbox.confidence,
    },
    landmarks_5: d.landmarks_5?.map(p => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
    })),
    landmarks_68: d.landmarks_68?.map(p => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
    })),
  }));
}

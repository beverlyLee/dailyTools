import type { ImageSource, FrameInput } from './types';

export function imageSourceToFrame(source: ImageSource): FrameInput {
  if ('data' in source && 'width' in source && 'height' in source) {
    return {
      width: source.width,
      height: source.height,
      data: source.data instanceof Uint8ClampedArray 
        ? new Uint8Array(source.data) 
        : source.data,
    };
  }

  const canvas = document.createElement('canvas');
  
  if (source instanceof HTMLVideoElement) {
    canvas.width = source.videoWidth || source.width;
    canvas.height = source.videoHeight || source.height;
  } else if (source instanceof HTMLImageElement) {
    canvas.width = source.naturalWidth || source.width;
    canvas.height = source.naturalHeight || source.height;
  } else {
    canvas.width = (source as HTMLCanvasElement).width;
    canvas.height = (source as HTMLCanvasElement).height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(source as CanvasImageSource, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8Array(imageData.data),
  };
}

export function frameToImageData(frame: FrameInput): ImageData {
  const clampedArray = new Uint8ClampedArray(frame.data);
  return new ImageData(clampedArray, frame.width, frame.height);
}

export function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: Array<{ bbox: { x: number; y: number; width: number; height: number; confidence: number }; landmarks_5?: Array<{ x: number; y: number }>; landmarks_68?: Array<{ x: number; y: number }> }>,
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
        for (const point of detection.landmarks_5) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      if (detection.landmarks_68) {
        for (const point of detection.landmarks_68) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

import type { ImageSource, FrameInput } from './types';

export function createOffscreenCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }
  return { canvas, ctx };
}

export function imageSourceToFrame(source: ImageSource): FrameInput {
  if ('data' in source && 'width' in source && 'height' in source) {
    if (source instanceof ImageData) {
      return {
        width: source.width,
        height: source.height,
        data: new Uint8Array(source.data),
      };
    }
    return {
      width: source.width,
      height: source.height,
      data: source.data instanceof Uint8Array 
        ? source.data 
        : new Uint8Array(source.data),
    };
  }

  const { width, height } = getImageDimensions(source);
  const { canvas, ctx } = createOffscreenCanvas(width, height);

  if (source instanceof HTMLVideoElement) {
    ctx.drawImage(source, 0, 0, width, height);
  } else if (source instanceof HTMLCanvasElement) {
    ctx.drawImage(source, 0, 0);
  } else if (source instanceof HTMLImageElement) {
    ctx.drawImage(source, 0, 0, width, height);
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  
  return {
    width,
    height,
    data: new Uint8Array(imageData.data),
  };
}

export function getImageDimensions(source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): {
  width: number;
  height: number;
} {
  if (source instanceof HTMLVideoElement) {
    return {
      width: source.videoWidth || source.clientWidth,
      height: source.videoHeight || source.clientHeight,
    };
  }
  
  if (source instanceof HTMLCanvasElement) {
    return {
      width: source.width,
      height: source.height,
    };
  }
  
  return {
    width: source.naturalWidth || source.width,
    height: source.naturalHeight || source.height,
  };
}

export function frameToImageData(frame: FrameInput): ImageData {
  const clampedArray = new Uint8ClampedArray(frame.data);
  return new ImageData(clampedArray, frame.width, frame.height);
}

export function drawDetections(
  ctx: CanvasRenderingContext2D,
  results: Array<{
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    };
    landmarks_5?: Array<{ x: number; y: number }>;
    landmarks_68?: Array<{ x: number; y: number }>;
  }>,
  options?: {
    boxColor?: string;
    landmarkColor?: string;
    textColor?: string;
    showConfidence?: boolean;
    lineWidth?: number;
  }
): void {
  const {
    boxColor = '#00ff00',
    landmarkColor = '#ff0000',
    textColor = '#ffffff',
    showConfidence = true,
    lineWidth = 2,
  } = options || {};

  ctx.strokeStyle = boxColor;
  ctx.lineWidth = lineWidth;
  ctx.fillStyle = textColor;
  ctx.font = '12px sans-serif';

  for (const result of results) {
    const { x, y, width, height, confidence } = result.bbox;

    ctx.strokeRect(x, y, width, height);

    if (showConfidence) {
      const text = `${(confidence * 100).toFixed(1)}%`;
      const textWidth = ctx.measureText(text).width;
      
      ctx.fillStyle = boxColor;
      ctx.fillRect(x, y - 18, textWidth + 8, 16);
      
      ctx.fillStyle = textColor;
      ctx.fillText(text, x + 4, y - 6);
    }

    if (result.landmarks_5) {
      ctx.fillStyle = landmarkColor;
      for (const point of result.landmarks_5) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (result.landmarks_68) {
      ctx.fillStyle = landmarkColor;
      for (const point of result.landmarks_68) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

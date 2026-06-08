export async function exportSnapshot(
  canvas: HTMLCanvasElement,
  width: number = 1920,
  height: number = 1080,
  filename: string = 'material-swapper-snapshot.png'
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'));
        return;
      }

      ctx.drawImage(canvas, 0, 0, width, height);

      const link = document.createElement('a');
      link.download = filename;
      link.href = tempCanvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function getCanvasDataURL(
  canvas: HTMLCanvasElement,
  type: string = 'image/png',
  quality: number = 1.0
): string {
  return canvas.toDataURL(type, quality);
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = 'image/png',
  quality: number = 1.0
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

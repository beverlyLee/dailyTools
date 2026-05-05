import type {
  DetectorOptions,
  FaceDetectionResult,
  ImageSource,
  FaceDetectorWorkerMessage,
  FaceDetectorWorkerResponse,
  FrameInput,
} from './types';

import { imageSourceToFrame } from './utils';

type MessageCallback = (response: FaceDetectorWorkerResponse) => void;

interface PendingRequest {
  resolve: (value: FaceDetectionResult[] | PromiseLike<FaceDetectionResult[]>) => void;
  reject: (reason?: any) => void;
}

export class WorkerFaceDetector {
  private worker: Worker | null = null;
  private initialized: boolean = false;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private nextRequestId: number = 1;

  constructor() {}

  async init(
    workerUrl?: string,
    options?: DetectorOptions
  ): Promise<void> {
    if (this.initialized) {
      return;
    }

    const actualWorkerUrl = workerUrl || this.getDefaultWorkerUrl();
    
    this.worker = new Worker(actualWorkerUrl);
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);

    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      
      this.pendingRequests.set(requestId, {
        resolve: () => resolve(),
        reject: (error) => reject(error),
      });

      const message: FaceDetectorWorkerMessage = {
        type: 'init',
        options,
        id: requestId,
      };

      this.worker!.postMessage(message);
    });
  }

  private getDefaultWorkerUrl(): string {
    return './edge-face-detection-worker.js';
  }

  private handleMessage(event: MessageEvent<FaceDetectorWorkerResponse>): void {
    const response = event.data;
    const requestId = response.id;

    if (requestId !== undefined) {
      const pending = this.pendingRequests.get(requestId);
      
      if (pending) {
        this.pendingRequests.delete(requestId);

        if (response.type === 'ready') {
          this.initialized = true;
          (pending.resolve as any)();
        } else if (response.type === 'result' && response.results) {
          pending.resolve(response.results);
        } else if (response.type === 'error') {
          pending.reject(new Error(response.error || 'Worker error'));
        }
      }
    }
  }

  private handleError(event: ErrorEvent): void {
    console.error('Worker error:', event);
    
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error(`Worker error: ${event.message}`));
    }
    
    this.pendingRequests.clear();
    this.initialized = false;
  }

  detect(
    source: ImageSource,
    options?: DetectorOptions
  ): Promise<FaceDetectionResult[]> {
    if (!this.initialized || !this.worker) {
      return Promise.reject(new Error('Detector not initialized. Call init() first.'));
    }

    const frame = imageSourceToFrame(source);

    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;

      this.pendingRequests.set(requestId, { resolve, reject });

      const message: FaceDetectorWorkerMessage = {
        type: 'detect',
        frame: {
          width: frame.width,
          height: frame.height,
          data: frame.data,
        },
        options,
        id: requestId,
      };

      this.worker!.postMessage(message, [frame.data.buffer]);
    });
  }

  setOptions(options: DetectorOptions): void {
    if (!this.initialized || !this.worker) {
      throw new Error('Detector not initialized. Call init() first.');
    }

    const message: FaceDetectorWorkerMessage = {
      type: 'setOptions',
      options,
    };

    this.worker.postMessage(message);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.initialized = false;
    
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('Detector terminated'));
    }
    this.pendingRequests.clear();
  }
}

export async function createWorkerDetector(
  options?: DetectorOptions,
  workerUrl?: string
): Promise<WorkerFaceDetector> {
  const detector = new WorkerFaceDetector();
  await detector.init(workerUrl, options);
  return detector;
}

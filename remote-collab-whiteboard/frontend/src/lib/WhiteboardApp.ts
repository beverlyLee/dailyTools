import { v4 as uuidv4 } from 'uuid';
import { ViewportManager } from './ViewportManager';
import { CanvasRenderer } from './CanvasRenderer';
import { DrawTool } from './DrawTool';
import type { DrawCallbacks } from './DrawTool';
import { CRDTManager } from './CRDTManager';
import { NetworkManager } from './NetworkManager';
import type { NetworkConfig, NetworkCallbacks } from './NetworkManager';
import type { Stroke, Color, BrushType, StrokeStyle, ImageElement } from '../types';

export interface WhiteboardConfig {
  canvasId: string;
  roomId?: string;
  serverUrl?: string;
  defaultColor?: Color;
  defaultLineWidth?: number;
  defaultBrushType?: BrushType;
  defaultStrokeStyle?: StrokeStyle;
  autoConnect?: boolean;
  autoSave?: boolean;
}

const DEFAULT_CONFIG: Required<WhiteboardConfig> = {
  canvasId: 'whiteboard',
  roomId: 'default-room',
  serverUrl: 'ws://localhost:8080/ws',
  defaultColor: { r: 0, g: 0, b: 0, a: 1 },
  defaultLineWidth: 3,
  defaultBrushType: 'pencil',
  defaultStrokeStyle: 'solid',
  autoConnect: true,
  autoSave: true
};

export class WhiteboardApp {
  private config: Required<WhiteboardConfig>;
  private userId: string;

  private canvas: HTMLCanvasElement | null = null;
  private viewportManager: ViewportManager | null = null;
  private renderer: CanvasRenderer | null = null;
  private drawTool: DrawTool | null = null;
  private crdtManager: CRDTManager | null = null;
  private networkManager: NetworkManager | null = null;

  private isInitialized: boolean = false;
  private autoSaveInterval: number | null = null;

  constructor(config: WhiteboardConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.userId = uuidv4();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Whiteboard already initialized');
    }

    this.canvas = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas element with id "${this.config.canvasId}" not found`);
    }

    this.viewportManager = new ViewportManager(this.canvas);
    this.renderer = new CanvasRenderer(this.canvas, this.viewportManager);
    this.crdtManager = new CRDTManager(this.config.roomId);

    this.drawTool = new DrawTool(
      this.canvas,
      this.viewportManager,
      this.userId,
      {
        brushType: this.config.defaultBrushType,
        color: this.config.defaultColor,
        lineWidth: this.config.defaultLineWidth,
        strokeStyle: this.config.defaultStrokeStyle
      },
      this.getDrawCallbacks()
    );

    const loadedFromLocal = this.crdtManager.loadFromLocalStorage();
    if (loadedFromLocal) {
      this.syncRendererFromCRDT();
    }

    this.setupCRDTListener();

    if (this.config.autoSave) {
      this.startAutoSave();
    }

    if (this.config.autoConnect) {
      await this.connect();
    }

    this.setupWindowResize();

    this.isInitialized = true;
  }

  private getDrawCallbacks(): DrawCallbacks {
    return {
      onStrokeStart: (stroke: Stroke) => {
        this.renderer?.setTempStroke(stroke);
      },
      onStrokeUpdate: (stroke: Stroke) => {
        this.renderer?.setTempStroke(stroke);
        if (this.crdtManager) {
          this.crdtManager.updateStroke(stroke);
        }
      },
      onStrokeComplete: (stroke: Stroke) => {
        this.renderer?.removeTempStroke(stroke.id);
        if (this.crdtManager) {
          this.crdtManager.addStroke(stroke);
        }
      }
    };
  }

  private setupCRDTListener(): void {
    if (!this.crdtManager) return;

    this.crdtManager.onUpdate(() => {
      this.syncRendererFromCRDT();
      if (this.config.autoSave) {
        this.crdtManager?.saveToLocalStorage();
      }
    });
  }

  private syncRendererFromCRDT(): void {
    if (!this.crdtManager || !this.renderer) return;

    const elements = this.crdtManager.getAllElements();
    this.renderer.setElements(elements);
  }

  private setupWindowResize(): void {
    const handleResize = () => {
      this.viewportManager?.resize();
      this.renderer?.resize();
    };

    window.addEventListener('resize', handleResize);
    handleResize();
  }

  private startAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = window.setInterval(() => {
      this.crdtManager?.saveToLocalStorage();
    }, 5000);
  }

  async connect(): Promise<void> {
    if (!this.crdtManager) {
      throw new Error('CRDT Manager not initialized');
    }

    const networkConfig: NetworkConfig = {
      url: this.config.serverUrl,
      roomId: this.config.roomId
    };

    this.networkManager = new NetworkManager(
      networkConfig,
      this.getNetworkCallbacks(),
      this.crdtManager.getDoc()
    );

    this.networkManager.connect();
  }

  private getNetworkCallbacks(): NetworkCallbacks {
    return {
      onConnected: () => {
        console.log('Connected to server');
        this.emitStatusChange('connected');
      },
      onDisconnected: () => {
        console.log('Disconnected from server');
        this.emitStatusChange('disconnected');
      },
      onError: (error: Error) => {
        console.error('Network error:', error);
        this.emitStatusChange('error', error.message);
      },
      onRemoteUpdate: (_update: Uint8Array) => {
        this.syncRendererFromCRDT();
      },
      onSyncComplete: () => {
        console.log('Sync complete');
        this.syncRendererFromCRDT();
      }
    };
  }

  private emitStatusChange(status: string, message?: string): void {
    const event = new CustomEvent('whiteboard-status', {
      detail: { status, message }
    });
    window.dispatchEvent(event);
  }

  disconnect(): void {
    this.networkManager?.disconnect();
    this.networkManager = null;
  }

  setColor(color: Color): void {
    this.drawTool?.setColor(color);
    this.config.defaultColor = color;
  }

  setLineWidth(width: number): void {
    this.drawTool?.setLineWidth(width);
    this.config.defaultLineWidth = width;
  }

  setBrushType(type: BrushType): void {
    this.drawTool?.setBrushType(type);
    this.config.defaultBrushType = type;
  }

  setStrokeStyle(style: StrokeStyle): void {
    this.drawTool?.setStrokeStyle(style);
    this.config.defaultStrokeStyle = style;
  }

  getColor(): Color {
    return { ...this.config.defaultColor };
  }

  getLineWidth(): number {
    return this.config.defaultLineWidth;
  }

  getBrushType(): BrushType {
    return this.config.defaultBrushType;
  }

  getStrokeStyle(): StrokeStyle {
    return this.config.defaultStrokeStyle;
  }

  async insertImage(imageData: string, x: number, y: number): Promise<void> {
    const image = new Image();
    image.src = imageData;

    return new Promise((resolve, reject) => {
      image.onload = () => {
        const worldX = this.viewportManager?.screenToWorldX(x) || x;
        const worldY = this.viewportManager?.screenToWorldY(y) || y;

        const imageElement: ImageElement = {
          id: uuidv4(),
          type: 'image',
          x: worldX,
          y: worldY,
          width: image.naturalWidth,
          height: image.naturalHeight,
          imageData,
          createdAt: Date.now(),
          userId: this.userId
        };

        this.crdtManager?.addImageElement(imageElement);
        this.renderer?.addElement(imageElement);
        resolve();
      };

      image.onerror = reject;
    });
  }

  async insertImageFromFile(file: File, x: number, y: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        this.insertImage(imageData, x, y).then(resolve).catch(reject);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  clearCanvas(): void {
    this.crdtManager?.clearAll();
    this.renderer?.clearAll();
  }

  undo(): void {
    console.log('Undo not fully implemented - requires additional history tracking');
  }

  redo(): void {
    console.log('Redo not fully implemented - requires additional history tracking');
  }

  zoomIn(): void {
    if (!this.viewportManager) return;
    const viewport = this.viewportManager.getViewport();
    this.viewportManager.setViewport({ zoom: viewport.zoom * 1.2 });
  }

  zoomOut(): void {
    if (!this.viewportManager) return;
    const viewport = this.viewportManager.getViewport();
    this.viewportManager.setViewport({ zoom: viewport.zoom / 1.2 });
  }

  resetViewport(): void {
    this.viewportManager?.reset();
  }

  getViewportZoom(): number {
    return this.viewportManager?.getViewport().zoom || 1;
  }

  saveToLocalStorage(): void {
    this.crdtManager?.saveToLocalStorage();
  }

  loadFromLocalStorage(): boolean {
    const success = this.crdtManager?.loadFromLocalStorage() || false;
    if (success) {
      this.syncRendererFromCRDT();
    }
    return success;
  }

  isOnline(): boolean {
    return this.networkManager?.getConnected() || false;
  }

  getRoomId(): string {
    return this.config.roomId;
  }

  getUserId(): string {
    return this.userId;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getViewportManager(): ViewportManager | null {
    return this.viewportManager;
  }

  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    this.disconnect();

    this.renderer?.stopAnimationLoop();

    this.crdtManager?.destroy();

    this.isInitialized = false;
  }
}

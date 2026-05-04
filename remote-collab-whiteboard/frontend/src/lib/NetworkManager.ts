import * as Y from 'yjs';

export interface NetworkConfig {
  url: string;
  roomId: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface NetworkCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: Error) => void;
  onRemoteUpdate: (update: Uint8Array) => void;
  onSyncComplete: () => void;
}

export class NetworkManager {
  private config: NetworkConfig;
  private callbacks: NetworkCallbacks;
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private reconnectTimer: number | null = null;
  private isConnected: boolean = false;
  private doc: Y.Doc;

  private readonly maxReconnectAttempts: number;
  private readonly reconnectInterval: number;

  constructor(config: NetworkConfig, callbacks: NetworkCallbacks, doc: Y.Doc) {
    this.config = { ...config };
    this.callbacks = callbacks;
    this.doc = doc;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
    this.reconnectInterval = config.reconnectInterval || 3000;
    
    this.setupDocListener();
  }

  private setupDocListener(): void {
    this.doc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== 'remote' && this.isConnected) {
        this.sendUpdate(update);
      }
    });
  }

  connect(): void {
    if (this.ws) {
      this.disconnect();
    }
    
    try {
      const wsUrl = this.buildWebSocketUrl();
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (e) {
      this.callbacks.onError(e instanceof Error ? e : new Error('Failed to connect'));
      this.scheduleReconnect();
    }
  }

  private buildWebSocketUrl(): string {
    const baseUrl = this.config.url.replace(/^http/, 'ws');
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}room=${encodeURIComponent(this.config.roomId)}`;
  }

  private handleOpen(): void {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.callbacks.onConnected();
    
    this.requestSync();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      if (event.data instanceof ArrayBuffer) {
        this.handleBinaryMessage(event.data);
      } else if (typeof event.data === 'string') {
        this.handleTextMessage(event.data);
      }
    } catch (e) {
      console.error('Failed to handle message:', e);
    }
  }

  private handleBinaryMessage(data: ArrayBuffer): void {
    const uint8Array = new Uint8Array(data);
    this.handleYUpdate(uint8Array);
  }

  private handleTextMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'sync-required':
          this.sendFullState();
          break;
        case 'sync-complete':
          this.callbacks.onSyncComplete();
          break;
        case 'error':
          this.callbacks.onError(new Error(message.message || 'Server error'));
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (e) {
      console.error('Failed to parse text message:', e);
    }
  }

  private handleYUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update, 'remote');
    this.callbacks.onRemoteUpdate(update);
  }

  private handleClose(event: CloseEvent): void {
    const wasConnected = this.isConnected;
    this.isConnected = false;
    this.ws = null;
    
    if (wasConnected) {
      this.callbacks.onDisconnected();
    }
    
    if (!event.wasClean) {
      this.scheduleReconnect();
    }
  }

  private handleError(_event: Event): void {
    const error = new Error('WebSocket error');
    this.callbacks.onError(error);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.callbacks.onError(new Error('Max reconnect attempts reached'));
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  sendUpdate(update: Uint8Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      const buffer = update.buffer.slice(
        update.byteOffset,
        update.byteOffset + update.byteLength
      ) as ArrayBuffer;
      this.ws.send(buffer);
    } catch (e) {
      console.error('Failed to send update:', e);
    }
  }

  sendFullState(): void {
    const state = Y.encodeStateAsUpdate(this.doc);
    this.sendUpdate(state);
  }

  requestSync(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    const message = JSON.stringify({ type: 'request-sync' });
    this.ws.send(message);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      const wasConnected = this.isConnected;
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      
      if (wasConnected) {
        this.callbacks.onDisconnected();
      }
    }
  }

  getConnected(): boolean {
    return this.isConnected;
  }

  getRoomId(): string {
    return this.config.roomId;
  }

  updateUrl(url: string): void {
    this.config.url = url;
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }
}

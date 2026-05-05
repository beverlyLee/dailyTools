export class EventEmitter<Events extends { [K in keyof Events]: (...args: any[]) => void }> {
  private _events: Map<keyof Events, Set<(...args: any[]) => void>>;

  constructor() {
    this._events = new Map();
  }

  on<K extends keyof Events>(event: K, listener: Events[K]): this {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    this._events.get(event)!.add(listener);
    return this;
  }

  off<K extends keyof Events>(event: K, listener: Events[K]): this {
    const listeners = this._events.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this._events.delete(event);
      }
    }
    return this;
  }

  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): this {
    const listeners = this._events.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      }
    }
    return this;
  }

  once<K extends keyof Events>(event: K, listener: Events[K]): this {
    const onceListener = ((...args: Parameters<Events[K]>) => {
      this.off(event, onceListener as Events[K]);
      listener(...args);
    }) as Events[K];
    return this.on(event, onceListener);
  }

  removeAllListeners<K extends keyof Events>(event?: K): this {
    if (event === undefined) {
      this._events.clear();
    } else {
      this._events.delete(event);
    }
    return this;
  }

  listenerCount<K extends keyof Events>(event: K): number {
    const listeners = this._events.get(event);
    return listeners ? listeners.size : 0;
  }
}

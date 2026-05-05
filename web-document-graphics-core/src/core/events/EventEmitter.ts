export type EventListener = (...args: any[]) => void;

export interface EventMap {
  [event: string]: EventListener;
}

export class EventEmitter<T extends EventMap = EventMap> {
  private listeners: Map<keyof T, Set<EventListener>> = new Map();

  on<K extends keyof T>(event: K, listener: T[K]): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as EventListener);
    return this;
  }

  off<K extends keyof T>(event: K, listener: T[K]): this {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as EventListener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  once<K extends keyof T>(event: K, listener: T[K]): this {
    const onceListener = (...args: unknown[]) => {
      (listener as EventListener)(...args);
      this.off(event, onceListener as T[K]);
    };
    return this.on(event, onceListener as T[K]);
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): this {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for '${String(event)}':`, error);
        }
      }
    }
    return this;
  }

  removeAllListeners<K extends keyof T>(event?: K): this {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  listenerCount<K extends keyof T>(event: K): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.size : 0;
  }

  hasListeners<K extends keyof T>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }
}

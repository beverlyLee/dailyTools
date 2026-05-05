export type EventListener = (...args: any[]) => void;
export interface EventMap {
    [event: string]: EventListener;
}
export declare class EventEmitter<T extends EventMap = EventMap> {
    private listeners;
    on<K extends keyof T>(event: K, listener: T[K]): this;
    off<K extends keyof T>(event: K, listener: T[K]): this;
    once<K extends keyof T>(event: K, listener: T[K]): this;
    emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): this;
    removeAllListeners<K extends keyof T>(event?: K): this;
    listenerCount<K extends keyof T>(event: K): number;
    hasListeners<K extends keyof T>(event: K): boolean;
}

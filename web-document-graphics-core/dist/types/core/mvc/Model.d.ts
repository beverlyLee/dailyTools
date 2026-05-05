import { EventEmitter, EventMap } from '../events/EventEmitter';

export interface ModelEventMap extends EventMap {
    change: (property: string, value: unknown, oldValue: unknown) => void;
    'change:*': (property: string, value: unknown, oldValue: unknown) => void;
}
export declare abstract class Model<T extends object = object> extends EventEmitter<ModelEventMap> {
    protected _data: T;
    constructor(initialData?: T);
    get data(): T;
    get<K extends keyof T>(key: K): T[K];
    set<K extends keyof T>(key: K, value: T[K]): this;
    update(data: Partial<T>): this;
    reset(initialData?: T): this;
    toJSON(): T;
    fromJSON(json: T): this;
    abstract clone(): Model<T>;
}

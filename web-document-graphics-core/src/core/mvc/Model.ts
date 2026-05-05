import { EventEmitter, EventMap } from '../events/EventEmitter';

export interface ModelEventMap extends EventMap {
  change: (property: string, value: unknown, oldValue: unknown) => void;
  'change:*': (property: string, value: unknown, oldValue: unknown) => void;
}

export abstract class Model<T extends object = object> extends EventEmitter<ModelEventMap> {
  protected _data: T;

  constructor(initialData?: T) {
    super();
    this._data = { ...initialData } as T;
  }

  get data(): T {
    return { ...this._data };
  }

  get<K extends keyof T>(key: K): T[K] {
    return this._data[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): this {
    const oldValue = this._data[key];
    if (oldValue !== value) {
      this._data[key] = value;
      this.emit('change', key as string, value, oldValue);
      this.emit(`change:${String(key)}` as keyof ModelEventMap, key as string, value, oldValue);
    }
    return this;
  }

  update(data: Partial<T>): this {
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        this.set(key as keyof T, data[key] as T[keyof T]);
      }
    }
    return this;
  }

  reset(initialData?: T): this {
    const oldData = { ...this._data };
    this._data = { ...initialData } as T;
    for (const key in oldData) {
      if (Object.prototype.hasOwnProperty.call(oldData, key)) {
        this.emit('change', key, this._data[key as keyof T], oldData[key]);
      }
    }
    return this;
  }

  toJSON(): T {
    return { ...this._data };
  }

  fromJSON(json: T): this {
    this.reset(json);
    return this;
  }

  abstract clone(): Model<T>;
}

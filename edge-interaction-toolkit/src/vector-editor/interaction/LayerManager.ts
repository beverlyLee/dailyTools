export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  shapeIds: string[];
  index: number;
}

export interface LayerChangeEvent {
  type: 'add' | 'remove' | 'update' | 'reorder';
  layerId?: string;
  layers: Layer[];
}

export class LayerManager {
  private _layers: Layer[];
  private _shapeToLayer: Map<string, string>;
  private _listeners: Set<(event: LayerChangeEvent) => void>;
  private _nextLayerId: number;
  
  constructor() {
    this._layers = [];
    this._shapeToLayer = new Map();
    this._listeners = new Set();
    this._nextLayerId = 1;
    
    this.addLayer('Default');
  }
  
  get layers(): Layer[] {
    return [...this._layers];
  }
  
  get activeLayer(): Layer {
    return this._layers[this._layers.length - 1];
  }
  
  addLayer(name: string, index?: number): Layer {
    const layer: Layer = {
      id: `layer_${this._nextLayerId++}`,
      name,
      visible: true,
      locked: false,
      shapeIds: [],
      index: index ?? this._layers.length,
    };
    
    if (index !== undefined) {
      this._layers.splice(index, 0, layer);
      this._updateIndices();
    } else {
      this._layers.push(layer);
    }
    
    this._notify({
      type: 'add',
      layerId: layer.id,
      layers: this.layers,
    });
    
    return layer;
  }
  
  removeLayer(layerId: string): boolean {
    const index = this._layers.findIndex(l => l.id === layerId);
    
    if (index === -1 || this._layers.length <= 1) return false;
    
    const layer = this._layers[index];
    
    for (const shapeId of layer.shapeIds) {
      this._shapeToLayer.delete(shapeId);
    }
    
    this._layers.splice(index, 1);
    this._updateIndices();
    
    this._notify({
      type: 'remove',
      layerId,
      layers: this.layers,
    });
    
    return true;
  }
  
  getLayer(layerId: string): Layer | undefined {
    return this._layers.find(l => l.id === layerId);
  }
  
  getLayerByShapeId(shapeId: string): Layer | undefined {
    const layerId = this._shapeToLayer.get(shapeId);
    return layerId ? this.getLayer(layerId) : undefined;
  }
  
  updateLayer(layerId: string, updates: Partial<Layer>): boolean {
    const layer = this.getLayer(layerId);
    
    if (!layer) return false;
    
    Object.assign(layer, updates);
    
    this._notify({
      type: 'update',
      layerId,
      layers: this.layers,
    });
    
    return true;
  }
  
  moveLayer(layerId: string, newIndex: number): boolean {
    const currentIndex = this._layers.findIndex(l => l.id === layerId);
    
    if (currentIndex === -1 || newIndex < 0 || newIndex >= this._layers.length) {
      return false;
    }
    
    if (currentIndex === newIndex) return false;
    
    const [layer] = this._layers.splice(currentIndex, 1);
    this._layers.splice(newIndex, 0, layer);
    this._updateIndices();
    
    this._notify({
      type: 'reorder',
      layerId,
      layers: this.layers,
    });
    
    return true;
  }
  
  moveLayerUp(layerId: string): boolean {
    const index = this._layers.findIndex(l => l.id === layerId);
    if (index === -1 || index >= this._layers.length - 1) return false;
    return this.moveLayer(layerId, index + 1);
  }
  
  moveLayerDown(layerId: string): boolean {
    const index = this._layers.findIndex(l => l.id === layerId);
    if (index === -1 || index <= 0) return false;
    return this.moveLayer(layerId, index - 1);
  }
  
  addShapeToLayer(shapeId: string, layerId: string): boolean {
    const layer = this.getLayer(layerId);
    
    if (!layer) return false;
    
    const oldLayerId = this._shapeToLayer.get(shapeId);
    if (oldLayerId) {
      const oldLayer = this.getLayer(oldLayerId);
      if (oldLayer) {
        oldLayer.shapeIds = oldLayer.shapeIds.filter(id => id !== shapeId);
      }
    }
    
    layer.shapeIds.push(shapeId);
    this._shapeToLayer.set(shapeId, layerId);
    
    this._notify({
      type: 'update',
      layerId,
      layers: this.layers,
    });
    
    return true;
  }
  
  removeShapeFromLayer(shapeId: string): boolean {
    const layerId = this._shapeToLayer.get(shapeId);
    
    if (!layerId) return false;
    
    const layer = this.getLayer(layerId);
    if (!layer) return false;
    
    layer.shapeIds = layer.shapeIds.filter(id => id !== shapeId);
    this._shapeToLayer.delete(shapeId);
    
    this._notify({
      type: 'update',
      layerId,
      layers: this.layers,
    });
    
    return true;
  }
  
  isShapeVisible(shapeId: string): boolean {
    const layer = this.getLayerByShapeId(shapeId);
    return layer ? layer.visible : true;
  }
  
  isShapeLocked(shapeId: string): boolean {
    const layer = this.getLayerByShapeId(shapeId);
    return layer ? layer.locked : false;
  }
  
  getShapesInLayer(layerId: string): string[] {
    const layer = this.getLayer(layerId);
    return layer ? [...layer.shapeIds] : [];
  }
  
  getRenderOrder(): string[] {
    const order: string[] = [];
    
    for (const layer of this._layers) {
      if (layer.visible) {
        order.push(...layer.shapeIds);
      }
    }
    
    return order;
  }
  
  onLayerChange(callback: (event: LayerChangeEvent) => void): () => void {
    this._listeners.add(callback);
    
    return () => {
      this._listeners.delete(callback);
    };
  }
  
  private _updateIndices(): void {
    this._layers.forEach((layer, index) => {
      layer.index = index;
    });
  }
  
  private _notify(event: LayerChangeEvent): void {
    for (const listener of this._listeners) {
      listener(event);
    }
  }
  
  toJSON(): { layers: Layer[]; shapeToLayer: Record<string, string> } {
    return {
      layers: this._layers.map(l => ({ ...l, shapeIds: [...l.shapeIds] })),
      shapeToLayer: Object.fromEntries(this._shapeToLayer),
    };
  }
  
  fromJSON(data: { layers: Layer[]; shapeToLayer: Record<string, string> }): void {
    this._layers = data.layers.map(l => ({ ...l, shapeIds: [...l.shapeIds] }));
    this._shapeToLayer = new Map(Object.entries(data.shapeToLayer));
    
    let maxId = 0;
    for (const layer of this._layers) {
      const match = layer.id.match(/layer_(\d+)/);
      if (match) {
        maxId = Math.max(maxId, parseInt(match[1]));
      }
    }
    this._nextLayerId = maxId + 1;
    
    this._notify({
      type: 'update',
      layers: this.layers,
    });
  }
}

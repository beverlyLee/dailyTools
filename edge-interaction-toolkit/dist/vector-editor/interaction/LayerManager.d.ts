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
export declare class LayerManager {
    private _layers;
    private _shapeToLayer;
    private _listeners;
    private _nextLayerId;
    constructor();
    get layers(): Layer[];
    get activeLayer(): Layer;
    addLayer(name: string, index?: number): Layer;
    removeLayer(layerId: string): boolean;
    getLayer(layerId: string): Layer | undefined;
    getLayerByShapeId(shapeId: string): Layer | undefined;
    updateLayer(layerId: string, updates: Partial<Layer>): boolean;
    moveLayer(layerId: string, newIndex: number): boolean;
    moveLayerUp(layerId: string): boolean;
    moveLayerDown(layerId: string): boolean;
    addShapeToLayer(shapeId: string, layerId: string): boolean;
    removeShapeFromLayer(shapeId: string): boolean;
    isShapeVisible(shapeId: string): boolean;
    isShapeLocked(shapeId: string): boolean;
    getShapesInLayer(layerId: string): string[];
    getRenderOrder(): string[];
    onLayerChange(callback: (event: LayerChangeEvent) => void): () => void;
    private _updateIndices;
    private _notify;
    toJSON(): {
        layers: Layer[];
        shapeToLayer: Record<string, string>;
    };
    fromJSON(data: {
        layers: Layer[];
        shapeToLayer: Record<string, string>;
    }): void;
}

import { Point, BoundingBox } from '../types';
import { Shape } from '../primitives';

export interface SelectionChangeEvent {
    type: 'add' | 'remove' | 'clear' | 'replace';
    ids: string[];
}
export declare class SelectionManager {
    private _selectedIds;
    private _listeners;
    private _shapes;
    constructor();
    get selectedIds(): string[];
    get selectedCount(): number;
    get isEmpty(): boolean;
    registerShape(shape: Shape): void;
    unregisterShape(shapeId: string): void;
    clearShapes(): void;
    has(shapeId: string): boolean;
    add(shapeId: string): boolean;
    remove(shapeId: string): boolean;
    toggle(shapeId: string): boolean;
    replace(shapeIds: string[]): void;
    clear(): void;
    selectPoint(point: Point, multiSelect?: boolean): void;
    selectRectangle(rect: BoundingBox, multiSelect?: boolean): void;
    private _findShapeAtPoint;
    private _findShapesInRect;
    getSelectedShapes(): Shape[];
    getSelectionBounds(): BoundingBox | null;
    deleteSelected(): Shape[];
    onSelectionChange(callback: (event: SelectionChangeEvent) => void): () => void;
    private _notify;
    clone(): SelectionManager;
}

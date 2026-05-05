import type { Point, BoundingBox } from '../types';
import { Shape } from '../primitives';

export interface SelectionChangeEvent {
  type: 'add' | 'remove' | 'clear' | 'replace';
  ids: string[];
}

export class SelectionManager {
  private _selectedIds: Set<string>;
  private _listeners: Set<(event: SelectionChangeEvent) => void>;
  private _shapes: Map<string, Shape>;
  
  constructor() {
    this._selectedIds = new Set();
    this._listeners = new Set();
    this._shapes = new Map();
  }
  
  get selectedIds(): string[] {
    return Array.from(this._selectedIds);
  }
  
  get selectedCount(): number {
    return this._selectedIds.size;
  }
  
  get isEmpty(): boolean {
    return this._selectedIds.size === 0;
  }
  
  registerShape(shape: Shape): void {
    this._shapes.set(shape.id, shape);
  }
  
  unregisterShape(shapeId: string): void {
    this._shapes.delete(shapeId);
    this.remove(shapeId);
  }
  
  clearShapes(): void {
    this._shapes.clear();
    this.clear();
  }
  
  has(shapeId: string): boolean {
    return this._selectedIds.has(shapeId);
  }
  
  add(shapeId: string): boolean {
    if (this._selectedIds.has(shapeId)) return false;
    
    this._selectedIds.add(shapeId);
    this._notify({
      type: 'add',
      ids: [shapeId],
    });
    
    return true;
  }
  
  remove(shapeId: string): boolean {
    if (!this._selectedIds.has(shapeId)) return false;
    
    this._selectedIds.delete(shapeId);
    this._notify({
      type: 'remove',
      ids: [shapeId],
    });
    
    return true;
  }
  
  toggle(shapeId: string): boolean {
    if (this._selectedIds.has(shapeId)) {
      this.remove(shapeId);
      return false;
    } else {
      this.add(shapeId);
      return true;
    }
  }
  
  replace(shapeIds: string[]): void {
    this._selectedIds = new Set(shapeIds);
    
    this._notify({
      type: 'replace',
      ids: shapeIds,
    });
  }
  
  clear(): void {
    if (this._selectedIds.size === 0) return;
    
    const oldIds = this.selectedIds;
    this._selectedIds.clear();
    
    this._notify({
      type: 'clear',
      ids: oldIds,
    });
  }
  
  selectPoint(point: Point, multiSelect: boolean = false): void {
    const hitShapeId = this._findShapeAtPoint(point);
    
    if (multiSelect) {
      if (hitShapeId) {
        this.toggle(hitShapeId);
      }
    } else {
      if (hitShapeId) {
        if (!this.has(hitShapeId)) {
          this.replace([hitShapeId]);
        }
      } else {
        this.clear();
      }
    }
  }
  
  selectRectangle(rect: BoundingBox, multiSelect: boolean = false): void {
    const hitIds = this._findShapesInRect(rect);
    
    if (multiSelect) {
      for (const id of hitIds) {
        this.toggle(id);
      }
    } else {
      this.replace(hitIds);
    }
  }
  
  private _findShapeAtPoint(point: Point): string | null {
    const shapes = Array.from(this._shapes.values())
      .sort((a, b) => b.layerIndex - a.layerIndex);
    
    for (const shape of shapes) {
      if (!shape.visible || shape.locked) continue;
      if (shape.containsPoint(point)) {
        return shape.id;
      }
    }
    
    return null;
  }
  
  private _findShapesInRect(rect: BoundingBox): string[] {
    const result: string[] = [];
    
    for (const [id, shape] of this._shapes) {
      if (!shape.visible || shape.locked) continue;
      
      const bbox = shape.getBoundingBox();
      
      if (
        bbox.x >= rect.x &&
        bbox.y >= rect.y &&
        bbox.x + bbox.width <= rect.x + rect.width &&
        bbox.y + bbox.height <= rect.y + rect.height
      ) {
        result.push(id);
      }
    }
    
    return result;
  }
  
  getSelectedShapes(): Shape[] {
    const shapes: Shape[] = [];
    
    for (const id of this._selectedIds) {
      const shape = this._shapes.get(id);
      if (shape) {
        shapes.push(shape);
      }
    }
    
    return shapes;
  }
  
  getSelectionBounds(): BoundingBox | null {
    const shapes = this.getSelectedShapes();
    
    if (shapes.length === 0) return null;
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const shape of shapes) {
      const bbox = shape.getBoundingBox();
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
  
  deleteSelected(): Shape[] {
    const deleted = this.getSelectedShapes();
    
    for (const shape of deleted) {
      this._shapes.delete(shape.id);
    }
    
    this.clear();
    
    return deleted;
  }
  
  onSelectionChange(callback: (event: SelectionChangeEvent) => void): () => void {
    this._listeners.add(callback);
    
    return () => {
      this._listeners.delete(callback);
    };
  }
  
  private _notify(event: SelectionChangeEvent): void {
    for (const listener of this._listeners) {
      listener(event);
    }
  }
  
  clone(): SelectionManager {
    const clone = new SelectionManager();
    
    for (const id of this._selectedIds) {
      clone._selectedIds.add(id);
    }
    
    for (const [id, shape] of this._shapes) {
      clone._shapes.set(id, shape);
    }
    
    return clone;
  }
}

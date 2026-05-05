import { Model } from '../core';
import {
  Graphics,
  CanvasState,
  GraphicsHistoryEntry,
  FillStyle,
  StrokeStyle,
  Transform,
} from './types';

function generateId(): string {
  return `gfx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createDefaultTransform(): Transform {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

function createDefaultFill(): FillStyle {
  return {
    color: '#2196f3',
    opacity: 0.8,
  };
}

function createDefaultStroke(): StrokeStyle {
  return {
    color: '#1976d2',
    width: 2,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
  };
}

export interface GraphicsModelData {
  canvasState: CanvasState;
  graphics: Map<string, Graphics>;
  graphicsOrder: string[];
  selectedIds: Set<string>;
  defaultFill: FillStyle;
  defaultStroke: StrokeStyle;
  undoStack: GraphicsHistoryEntry[];
  redoStack: GraphicsHistoryEntry[];
  maxHistorySize: number;
}

export interface GraphicsModelSerializable {
  canvasState: CanvasState;
  graphics: Graphics[];
  graphicsOrder: string[];
  selectedIds: string[];
  defaultFill: FillStyle;
  defaultStroke: StrokeStyle;
  maxHistorySize: number;
}

export class GraphicsModel extends Model<GraphicsModelData> {
  constructor() {
    super({
      canvasState: {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
      },
      graphics: new Map(),
      graphicsOrder: [],
      selectedIds: new Set(),
      defaultFill: createDefaultFill(),
      defaultStroke: createDefaultStroke(),
      undoStack: [],
      redoStack: [],
      maxHistorySize: 50,
    });
  }

  get canvasState(): CanvasState {
    return { ...this._data.canvasState };
  }

  get graphicsCount(): number {
    return this._data.graphics.size;
  }

  get selectedCount(): number {
    return this._data.selectedIds.size;
  }

  get selectedIds(): string[] {
    return [...this._data.selectedIds];
  }

  get undoAvailable(): boolean {
    return this._data.undoStack.length > 0;
  }

  get redoAvailable(): boolean {
    return this._data.redoStack.length > 0;
  }

  setCanvasSize(width: number, height: number): void {
    this._data.canvasState.width = width;
    this._data.canvasState.height = height;
    this.emit('change', 'canvasState', this._data.canvasState, this._data.canvasState);
  }

  setCanvasBackground(color: string): void {
    this._data.canvasState.backgroundColor = color;
    this.emit('change', 'canvasState', this._data.canvasState, this._data.canvasState);
  }

  setDefaultFill(fill: Partial<FillStyle>): void {
    this._data.defaultFill = { ...this._data.defaultFill, ...fill };
    this.emit('change', 'defaultFill', this._data.defaultFill, this._data.defaultFill);
  }

  setDefaultStroke(stroke: Partial<StrokeStyle>): void {
    this._data.defaultStroke = { ...this._data.defaultStroke, ...stroke };
    this.emit('change', 'defaultStroke', this._data.defaultStroke, this._data.defaultStroke);
  }

  addGraphics(graphics: any): Graphics {
    const newGraphics: Graphics = {
      ...graphics,
      id: generateId(),
      transform: { ...createDefaultTransform(), ...graphics.transform },
      visible: true,
      locked: false,
      selected: false,
      zIndex: this._data.graphicsOrder.length,
    } as Graphics;

    this._data.graphics.set(newGraphics.id, newGraphics);
    this._data.graphicsOrder.push(newGraphics.id);

    this.addToHistory({
      type: 'add',
      graphics: [{ ...newGraphics }],
    });

    this.emit('change', 'graphics', this._data.graphics, this._data.graphics);
    return newGraphics;
  }

  getGraphics(id: string): Graphics | undefined {
    const g = this._data.graphics.get(id);
    return g ? { ...g } : undefined;
  }

  getAllGraphics(): Graphics[] {
    return this._data.graphicsOrder.map((id) => this._data.graphics.get(id)!).filter(Boolean);
  }

  getSortedGraphics(): Graphics[] {
    return this.getAllGraphics().sort((a, b) => a.zIndex - b.zIndex);
  }

  updateGraphics(id: string, updates: Partial<Graphics>): Graphics | null {
    const existing = this._data.graphics.get(id);
    if (!existing) return null;

    const oldGraphics = { ...existing };
    const updated: Graphics = {
      ...existing,
      ...updates,
      id,
    } as Graphics;

    this._data.graphics.set(id, updated);

    this.addToHistory({
      type: 'update',
      graphics: [{ ...updated }],
      oldGraphics: [oldGraphics],
    });

    this.emit('change', 'graphics', this._data.graphics, this._data.graphics);
    return updated;
  }

  removeGraphics(id: string): boolean {
    const graphics = this._data.graphics.get(id);
    if (!graphics) return false;

    this.addToHistory({
      type: 'remove',
      graphics: [{ ...graphics }],
    });

    this._data.graphics.delete(id);
    const index = this._data.graphicsOrder.indexOf(id);
    if (index > -1) {
      this._data.graphicsOrder.splice(index, 1);
    }

    this._data.selectedIds.delete(id);
    this.emit('change', 'graphics', this._data.graphics, this._data.graphics);
    this.emit('change', 'selectedIds', this._data.selectedIds, this._data.selectedIds);
    return true;
  }

  clearAll(): void {
    const allGraphics = this.getAllGraphics();
    
    this.addToHistory({
      type: 'remove',
      graphics: allGraphics.map((g) => ({ ...g })),
    });

    this._data.graphics.clear();
    this._data.graphicsOrder = [];
    this._data.selectedIds.clear();

    this.emit('change', 'graphics', this._data.graphics, this._data.graphics);
    this.emit('change', 'selectedIds', this._data.selectedIds, this._data.selectedIds);
  }

  select(id: string, addToSelection: boolean = false): void {
    const graphics = this._data.graphics.get(id);
    if (!graphics || graphics.locked) return;

    if (!addToSelection) {
      for (const selectedId of this._data.selectedIds) {
        const g = this._data.graphics.get(selectedId);
        if (g) {
          g.selected = false;
        }
      }
      this._data.selectedIds.clear();
    }

    graphics.selected = true;
    this._data.selectedIds.add(id);

    this.emit('change', 'selectedIds', this._data.selectedIds, this._data.selectedIds);
  }

  selectMultiple(ids: string[]): void {
    for (const selectedId of this._data.selectedIds) {
      const g = this._data.graphics.get(selectedId);
      if (g) {
        g.selected = false;
      }
    }
    this._data.selectedIds.clear();

    for (const id of ids) {
      const graphics = this._data.graphics.get(id);
      if (graphics && !graphics.locked) {
        graphics.selected = true;
        this._data.selectedIds.add(id);
      }
    }

    this.emit('change', 'selectedIds', this._data.selectedIds, this._data.selectedIds);
  }

  deselect(id: string): void {
    const graphics = this._data.graphics.get(id);
    if (!graphics) return;

    graphics.selected = false;
    this._data.selectedIds.delete(id);

    this.emit('change', 'selectedIds', this._data.selectedIds, this._data.selectedIds);
  }

  deselectAll(): void {
    for (const id of this._data.selectedIds) {
      const g = this._data.graphics.get(id);
      if (g) {
        g.selected = false;
      }
    }
    this._data.selectedIds.clear();

    this.emit('change', 'selectedIds', this._data.selectedIds, this._data.selectedIds);
  }

  bringToFront(id: string): void {
    const graphics = this._data.graphics.get(id);
    if (!graphics) return;

    const oldZIndex = graphics.zIndex;
    const maxZIndex = this._data.graphicsOrder.length - 1;
    if (oldZIndex >= maxZIndex) return;

    const oldOrder = [...this._data.graphicsOrder];
    
    for (const gid of this._data.graphicsOrder) {
      const g = this._data.graphics.get(gid);
      if (g && g.zIndex > oldZIndex) {
        g.zIndex--;
      }
    }
    graphics.zIndex = maxZIndex;

    const index = this._data.graphicsOrder.indexOf(id);
    if (index > -1) {
      this._data.graphicsOrder.splice(index, 1);
      this._data.graphicsOrder.push(id);
    }

    this.addToHistory({
      type: 'reorder',
      ids: [...this._data.graphicsOrder],
      oldIds: oldOrder,
    });

    this.emit('change', 'graphics', this._data.graphics, this._data.graphics);
  }

  sendToBack(id: string): void {
    const graphics = this._data.graphics.get(id);
    if (!graphics) return;

    const oldZIndex = graphics.zIndex;
    if (oldZIndex <= 0) return;

    const oldOrder = [...this._data.graphicsOrder];
    
    for (const gid of this._data.graphicsOrder) {
      const g = this._data.graphics.get(gid);
      if (g && g.zIndex < oldZIndex) {
        g.zIndex++;
      }
    }
    graphics.zIndex = 0;

    const index = this._data.graphicsOrder.indexOf(id);
    if (index > -1) {
      this._data.graphicsOrder.splice(index, 1);
      this._data.graphicsOrder.unshift(id);
    }

    this.addToHistory({
      type: 'reorder',
      ids: [...this._data.graphicsOrder],
      oldIds: oldOrder,
    });

    this.emit('change', 'graphics', this._data.graphics, this._data.graphics);
  }

  bringForward(id: string): void {
    const graphics = this._data.graphics.get(id);
    if (!graphics) return;

    const oldZIndex = graphics.zIndex;
    const maxZIndex = this._data.graphicsOrder.length - 1;
    if (oldZIndex >= maxZIndex) return;

    const oldOrder = [...this._data.graphicsOrder];
    const index = this._data.graphicsOrder.indexOf(id);
    const nextId = this._data.graphicsOrder[index + 1];
    const nextGraphics = this._data.graphics.get(nextId);

    if (nextGraphics) {
      graphics.zIndex++;
      nextGraphics.zIndex--;

      this._data.graphicsOrder[index] = nextId;
      this._data.graphicsOrder[index + 1] = id;
    }

    this.addToHistory({
      type: 'reorder',
      ids: [...this._data.graphicsOrder],
      oldIds: oldOrder,
    });

    this.emit('change', 'graphics', this._data.graphics, this._data.graphics);
  }

  sendBackward(id: string): void {
    const graphics = this._data.graphics.get(id);
    if (!graphics) return;

    const oldZIndex = graphics.zIndex;
    if (oldZIndex <= 0) return;

    const oldOrder = [...this._data.graphicsOrder];
    const index = this._data.graphicsOrder.indexOf(id);
    const prevId = this._data.graphicsOrder[index - 1];
    const prevGraphics = this._data.graphics.get(prevId);

    if (prevGraphics) {
      graphics.zIndex--;
      prevGraphics.zIndex++;

      this._data.graphicsOrder[index] = prevId;
      this._data.graphicsOrder[index - 1] = id;
    }

    this.addToHistory({
      type: 'reorder',
      ids: [...this._data.graphicsOrder],
      oldIds: oldOrder,
    });

    this.emit('change', 'graphics', this._data.graphics, this._data.graphics);
  }

  private addToHistory(entry: GraphicsHistoryEntry): void {
    this._data.undoStack.push(entry);
    if (this._data.undoStack.length > this._data.maxHistorySize) {
      this._data.undoStack.shift();
    }
    this._data.redoStack = [];
  }

  undo(): boolean {
    if (this._data.undoStack.length === 0) return false;

    const entry = this._data.undoStack.pop()!;
    this._data.redoStack.push(entry);

    this.executeHistoryEntry(entry, true);
    return true;
  }

  redo(): boolean {
    if (this._data.redoStack.length === 0) return false;

    const entry = this._data.redoStack.pop()!;
    this._data.undoStack.push(entry);

    this.executeHistoryEntry(entry, false);
    return true;
  }

  private executeHistoryEntry(entry: GraphicsHistoryEntry, isUndo: boolean): void {
    switch (entry.type) {
      case 'add':
        if (isUndo) {
          for (const g of entry.graphics || []) {
            this._data.graphics.delete(g.id);
            const idx = this._data.graphicsOrder.indexOf(g.id);
            if (idx > -1) this._data.graphicsOrder.splice(idx, 1);
          }
        } else {
          for (const g of entry.graphics || []) {
            this._data.graphics.set(g.id, { ...g });
            this._data.graphicsOrder.push(g.id);
          }
        }
        break;

      case 'remove':
        if (isUndo) {
          for (const g of entry.graphics || []) {
            this._data.graphics.set(g.id, { ...g });
            this._data.graphicsOrder.splice(g.zIndex, 0, g.id);
          }
        } else {
          for (const g of entry.graphics || []) {
            this._data.graphics.delete(g.id);
            const idx = this._data.graphicsOrder.indexOf(g.id);
            if (idx > -1) this._data.graphicsOrder.splice(idx, 1);
          }
        }
        break;

      case 'update':
        if (isUndo && entry.oldGraphics) {
          for (const g of entry.oldGraphics) {
            this._data.graphics.set(g.id, { ...g });
          }
        } else if (entry.graphics) {
          for (const g of entry.graphics) {
            this._data.graphics.set(g.id, { ...g });
          }
        }
        break;

      case 'reorder':
        if (isUndo && entry.oldIds) {
          this._data.graphicsOrder = [...entry.oldIds];
          for (let i = 0; i < this._data.graphicsOrder.length; i++) {
            const g = this._data.graphics.get(this._data.graphicsOrder[i]);
            if (g) g.zIndex = i;
          }
        } else if (entry.ids) {
          this._data.graphicsOrder = [...entry.ids];
          for (let i = 0; i < this._data.graphicsOrder.length; i++) {
            const g = this._data.graphics.get(this._data.graphicsOrder[i]);
            if (g) g.zIndex = i;
          }
        }
        break;
    }

    this.emit('change', 'graphics', this._data.graphics, this._data.graphics);
  }

  toJSON(): GraphicsModelData {
    return {
      ...this._data,
      canvasState: { ...this._data.canvasState },
      graphics: new Map(this._data.graphics),
      graphicsOrder: [...this._data.graphicsOrder],
      selectedIds: new Set(this._data.selectedIds),
      defaultFill: { ...this._data.defaultFill },
      defaultStroke: { ...this._data.defaultStroke },
      undoStack: [...this._data.undoStack],
      redoStack: [...this._data.redoStack],
    };
  }

  fromJSON(data: GraphicsModelData): this {
    this._data = {
      canvasState: { ...data.canvasState },
      graphics: new Map(data.graphics),
      graphicsOrder: [...data.graphicsOrder],
      selectedIds: new Set(data.selectedIds),
      defaultFill: { ...data.defaultFill },
      defaultStroke: { ...data.defaultStroke },
      undoStack: [...data.undoStack],
      redoStack: [...data.redoStack],
      maxHistorySize: data.maxHistorySize,
    };
    this.emit('change', 'graphics', this._data.graphics, this._data.graphics);
    return this;
  }

  serialize(): GraphicsModelSerializable {
    return {
      canvasState: { ...this._data.canvasState },
      graphics: this.getAllGraphics(),
      graphicsOrder: [...this._data.graphicsOrder],
      selectedIds: [...this._data.selectedIds],
      defaultFill: { ...this._data.defaultFill },
      defaultStroke: { ...this._data.defaultStroke },
      maxHistorySize: this._data.maxHistorySize,
    };
  }

  deserialize(data: GraphicsModelSerializable): void {
    this._data.canvasState = { ...data.canvasState };
    this._data.graphics.clear();
    this._data.graphicsOrder = [...data.graphicsOrder];

    for (const g of data.graphics) {
      this._data.graphics.set(g.id, g);
    }

    this._data.selectedIds = new Set(data.selectedIds);
    this._data.defaultFill = { ...data.defaultFill };
    this._data.defaultStroke = { ...data.defaultStroke };
    this._data.maxHistorySize = data.maxHistorySize;
    this._data.undoStack = [];
    this._data.redoStack = [];

    this.emit('change', 'graphics', this._data.graphics, this._data.graphics);
  }

  clone(): Model<GraphicsModelData> {
    const clone = new GraphicsModel();
    clone._data = {
      canvasState: { ...this._data.canvasState },
      graphics: new Map(this._data.graphics),
      graphicsOrder: [...this._data.graphicsOrder],
      selectedIds: new Set(this._data.selectedIds),
      defaultFill: { ...this._data.defaultFill },
      defaultStroke: { ...this._data.defaultStroke },
      undoStack: [...this._data.undoStack],
      redoStack: [...this._data.redoStack],
      maxHistorySize: this._data.maxHistorySize,
    };
    return clone;
  }
}

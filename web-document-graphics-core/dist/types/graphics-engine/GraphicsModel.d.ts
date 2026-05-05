import { Model } from '../core';
import { Graphics, CanvasState, GraphicsHistoryEntry, FillStyle, StrokeStyle } from './types';

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
export declare class GraphicsModel extends Model<GraphicsModelData> {
    constructor();
    get canvasState(): CanvasState;
    get graphicsCount(): number;
    get selectedCount(): number;
    get selectedIds(): string[];
    get undoAvailable(): boolean;
    get redoAvailable(): boolean;
    setCanvasSize(width: number, height: number): void;
    setCanvasBackground(color: string): void;
    setDefaultFill(fill: Partial<FillStyle>): void;
    setDefaultStroke(stroke: Partial<StrokeStyle>): void;
    addGraphics(graphics: any): Graphics;
    getGraphics(id: string): Graphics | undefined;
    getAllGraphics(): Graphics[];
    getSortedGraphics(): Graphics[];
    updateGraphics(id: string, updates: Partial<Graphics>): Graphics | null;
    removeGraphics(id: string): boolean;
    clearAll(): void;
    select(id: string, addToSelection?: boolean): void;
    selectMultiple(ids: string[]): void;
    deselect(id: string): void;
    deselectAll(): void;
    bringToFront(id: string): void;
    sendToBack(id: string): void;
    bringForward(id: string): void;
    sendBackward(id: string): void;
    private addToHistory;
    undo(): boolean;
    redo(): boolean;
    private executeHistoryEntry;
    toJSON(): GraphicsModelData;
    fromJSON(data: GraphicsModelData): this;
    serialize(): GraphicsModelSerializable;
    deserialize(data: GraphicsModelSerializable): void;
    clone(): Model<GraphicsModelData>;
}

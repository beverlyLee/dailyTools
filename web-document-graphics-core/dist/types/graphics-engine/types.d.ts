import { Point } from '../core';

export type GraphicsType = 'rect' | 'ellipse' | 'path' | 'text' | 'group';
export interface FillStyle {
    color: string;
    opacity: number;
}
export interface StrokeStyle {
    color: string;
    width: number;
    opacity: number;
    lineCap?: 'butt' | 'round' | 'square';
    lineJoin?: 'bevel' | 'round' | 'miter';
    dashPattern?: number[];
}
export interface TextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textAlign?: 'left' | 'center' | 'right';
    textBaseline?: 'top' | 'middle' | 'bottom';
}
export interface Transform {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
}
export interface BaseGraphics {
    id: string;
    type: GraphicsType;
    visible: boolean;
    locked: boolean;
    selected: boolean;
    zIndex: number;
    transform: Transform;
    fill?: FillStyle;
    stroke?: StrokeStyle;
}
export interface RectGraphics extends BaseGraphics {
    type: 'rect';
    width: number;
    height: number;
    cornerRadius: number;
}
export interface EllipseGraphics extends BaseGraphics {
    type: 'ellipse';
    radiusX: number;
    radiusY: number;
}
export interface PathGraphics extends BaseGraphics {
    type: 'path';
    points: Point[];
    closed: boolean;
}
export interface TextGraphics extends BaseGraphics {
    type: 'text';
    content: string;
    textStyle: TextStyle;
}
export interface GroupGraphics extends BaseGraphics {
    type: 'group';
    children: string[];
}
export type Graphics = RectGraphics | EllipseGraphics | PathGraphics | TextGraphics | GroupGraphics;
export interface GraphicsEventMap {
    'graphics:added': (graphics: Graphics) => void;
    'graphics:removed': (id: string) => void;
    'graphics:updated': (graphics: Graphics) => void;
    'selection:changed': (selectedIds: string[]) => void;
    'zorder:changed': () => void;
    'undo:available': (available: boolean) => void;
    'redo:available': (available: boolean) => void;
}
export interface CanvasState {
    width: number;
    height: number;
    backgroundColor: string;
}
export interface GraphicsHistoryEntry {
    type: 'add' | 'remove' | 'update' | 'reorder';
    graphics?: Graphics[];
    oldGraphics?: Graphics[];
    ids?: string[];
    oldIds?: string[];
}

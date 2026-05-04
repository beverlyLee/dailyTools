export interface Point {
  x: number;
  y: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type BrushType = 'pencil' | 'pen' | 'marker' | 'eraser';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

export type ElementType = 'stroke' | 'image' | 'text';

export interface Stroke {
  id: string;
  type: 'stroke';
  points: Point[];
  color: Color;
  lineWidth: number;
  brushType: BrushType;
  strokeStyle: StrokeStyle;
  createdAt: number;
  userId: string;
}

export interface ImageElement {
  id: string;
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: string;
  createdAt: number;
  userId: string;
}

export interface TextElement {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: Color;
  createdAt: number;
  userId: string;
}

export type CanvasElement = Stroke | ImageElement | TextElement;

export interface Viewport {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface DrawCommand {
  type: 'start' | 'continue' | 'end' | 'clear';
  strokeId?: string;
  userId: string;
  points?: Point[];
  color?: Color;
  lineWidth?: number;
  timestamp: number;
}

export interface SyncMessage {
  type: 'sync' | 'update';
  data: ArrayBuffer;
}

export interface ToolConfig {
  brushType: BrushType;
  color: Color;
  lineWidth: number;
  strokeStyle: StrokeStyle;
}

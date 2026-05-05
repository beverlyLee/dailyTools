export type ShapeType = 'rect' | 'ellipse' | 'path' | 'text' | 'group';

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

export interface TransformData {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
}

export interface ShapeData {
  id: string;
  type: ShapeType;
  transform: TransformData;
  fill?: Color;
  stroke?: Color;
  strokeWidth: number;
  visible: boolean;
  locked: boolean;
  layerIndex: number;
  name: string;
}

export interface RectData extends ShapeData {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}

export interface EllipseData extends ShapeData {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number;
}

export interface PathData extends ShapeData {
  type: 'path';
  commands: PathCommand[];
  closed: boolean;
}

export interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  points: number[];
}

export interface TextData extends ShapeData {
  type: 'text';
  x: number;
  y: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
}

export interface GroupData extends ShapeData {
  type: 'group';
  children: string[];
}

export interface CanvasState {
  shapes: ShapeData[];
  selectedIds: string[];
  activeLayer: number;
  zoom: number;
  panX: number;
  panY: number;
}

export type ToolType = 'select' | 'rect' | 'ellipse' | 'path' | 'text' | 'zoom' | 'pan';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

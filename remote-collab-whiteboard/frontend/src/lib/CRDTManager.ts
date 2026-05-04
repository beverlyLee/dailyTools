import * as Y from 'yjs';
import type { Stroke, Point, Color, BrushType, StrokeStyle, CanvasElement, ImageElement, TextElement } from '../types';

export interface CRDTOperation {
  type: 'addStroke' | 'updateStroke' | 'removeStroke' | 'clearAll' | 'addElement' | 'removeElement';
  strokeId?: string;
  elementId?: string;
  timestamp: number;
}

export class CRDTManager {
  private doc: Y.Doc;
  private elementsMap: Y.Map<Y.Array<Y.Map<any>>>;
  private onUpdateCallback: ((operations: CRDTOperation[]) => void) | null = null;
  private roomId: string;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.doc = new Y.Doc();
    this.elementsMap = this.doc.getMap('elements');
    this.setupListeners();
  }

  private setupListeners(): void {
    this.doc.on('update', (_update: Uint8Array, origin: any) => {
      if (origin !== 'local') return;
      this.onLocalUpdate();
    });
  }

  private onLocalUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback([{
        type: 'addStroke',
        timestamp: Date.now()
      }]);
    }
  }

  onRemoteUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update, 'remote');
  }

  getDoc(): Y.Doc {
    return this.doc;
  }

  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  onUpdate(callback: (operations: CRDTOperation[]) => void): void {
    this.onUpdateCallback = callback;
  }

  private createStrokeMetadata(stroke: Stroke, extraMetadata: Record<string, any> = {}): Y.Map<any> {
    const metadata = new Y.Map();
    metadata.set('id', stroke.id);
    metadata.set('elementType', 'stroke');
    metadata.set('color', JSON.stringify(stroke.color));
    metadata.set('lineWidth', stroke.lineWidth);
    metadata.set('brushType', stroke.brushType);
    metadata.set('strokeStyle', stroke.strokeStyle);
    metadata.set('createdAt', stroke.createdAt);
    metadata.set('userId', stroke.userId);
    metadata.set('pointCount', stroke.points.length);
    
    for (const [key, value] of Object.entries(extraMetadata)) {
      metadata.set(key, value);
    }
    
    return metadata;
  }

  addStroke(stroke: Stroke): void {
    this.doc.transact(() => {
      const elementArray = this.elementsMap.get(stroke.id) || new Y.Array();

      if (!this.elementsMap.has(stroke.id)) {
        this.elementsMap.set(stroke.id, elementArray);
      }

      elementArray.delete(0, elementArray.length);

      stroke.points.forEach(point => {
        const pointMap = new Y.Map();
        pointMap.set('x', point.x);
        pointMap.set('y', point.y);
        elementArray.push([pointMap]);
      });

      const metadata = this.createStrokeMetadata(stroke);
      elementArray.push([metadata]);
    }, 'local');
  }

  updateStroke(stroke: Stroke): void {
    this.addStroke(stroke);
  }

  removeStroke(strokeId: string): void {
    this.doc.transact(() => {
      this.elementsMap.delete(strokeId);
    }, 'local');
  }

  addImageElement(image: ImageElement): void {
    this.doc.transact(() => {
      const elementArray = this.elementsMap.get(image.id) || new Y.Array();

      if (!this.elementsMap.has(image.id)) {
        this.elementsMap.set(image.id, elementArray);
      }

      elementArray.delete(0, elementArray.length);

      const metadata = new Y.Map();
      metadata.set('id', image.id);
      metadata.set('elementType', 'image');
      metadata.set('x', image.x);
      metadata.set('y', image.y);
      metadata.set('width', image.width);
      metadata.set('height', image.height);
      metadata.set('imageData', image.imageData);
      metadata.set('createdAt', image.createdAt);
      metadata.set('userId', image.userId);

      elementArray.push([metadata]);
    }, 'local');
  }

  removeElement(elementId: string): void {
    this.doc.transact(() => {
      this.elementsMap.delete(elementId);
    }, 'local');
  }

  clearAll(): void {
    this.doc.transact(() => {
      const keys = Array.from(this.elementsMap.keys());
      keys.forEach(key => this.elementsMap.delete(key));
    }, 'local');
  }

  getAllStrokes(): Stroke[] {
    const strokes: Stroke[] = [];

    this.elementsMap.forEach((elementArray, id) => {
      try {
        const element = this.parseElementFromYArray(elementArray, id);
        if (element && element.type === 'stroke') {
          strokes.push(element);
        }
      } catch (e) {
        console.error('Failed to parse stroke:', e);
      }
    });

    strokes.sort((a, b) => a.createdAt - b.createdAt);
    return strokes;
  }

  getAllElements(): CanvasElement[] {
    const elements: CanvasElement[] = [];

    this.elementsMap.forEach((elementArray, id) => {
      try {
        const element = this.parseElementFromYArray(elementArray, id);
        if (element) {
          elements.push(element);
        }
      } catch (e) {
        console.error('Failed to parse element:', e);
      }
    });

    elements.sort((a, b) => a.createdAt - b.createdAt);
    return elements;
  }

  private parseElementFromYArray(elementArray: Y.Array<Y.Map<any>>, _id: string): CanvasElement | null {
    if (elementArray.length === 0) return null;

    const metadataItem = elementArray.get(elementArray.length - 1);
    const elementType = metadataItem.get('elementType') as string;

    if (elementType === 'stroke') {
      return this.parseStrokeFromYArray(elementArray, metadataItem);
    } else if (elementType === 'image') {
      return this.parseImageElementFromYArray(metadataItem);
    } else if (elementType === 'text') {
      return this.parseTextElementFromYArray(metadataItem);
    }

    return null;
  }

  private parseStrokeFromYArray(strokeArray: Y.Array<Y.Map<any>>, metadataItem: Y.Map<any>): Stroke | null {
    const pointCount = metadataItem.get('pointCount') as number;

    if (strokeArray.length < pointCount + 1) return null;

    const points: Point[] = [];
    for (let i = 0; i < pointCount; i++) {
      const pointMap = strokeArray.get(i);
      points.push({
        x: pointMap.get('x') as number,
        y: pointMap.get('y') as number
      });
    }

    const colorStr = metadataItem.get('color') as string;
    const color: Color = JSON.parse(colorStr);

    return {
      id: metadataItem.get('id') as string,
      type: 'stroke',
      points,
      color,
      lineWidth: metadataItem.get('lineWidth') as number,
      brushType: (metadataItem.get('brushType') as BrushType) || 'pencil',
      strokeStyle: (metadataItem.get('strokeStyle') as StrokeStyle) || 'solid',
      createdAt: metadataItem.get('createdAt') as number,
      userId: metadataItem.get('userId') as string
    };
  }

  private parseImageElementFromYArray(metadataItem: Y.Map<any>): ImageElement {
    return {
      id: metadataItem.get('id') as string,
      type: 'image',
      x: metadataItem.get('x') as number,
      y: metadataItem.get('y') as number,
      width: metadataItem.get('width') as number,
      height: metadataItem.get('height') as number,
      imageData: metadataItem.get('imageData') as string,
      createdAt: metadataItem.get('createdAt') as number,
      userId: metadataItem.get('userId') as string
    };
  }

  private parseTextElementFromYArray(metadataItem: Y.Map<any>): TextElement {
    const colorStr = metadataItem.get('color') as string;
    const color: Color = colorStr ? JSON.parse(colorStr) : { r: 0, g: 0, b: 0, a: 1 };

    return {
      id: metadataItem.get('id') as string,
      type: 'text',
      x: metadataItem.get('x') as number,
      y: metadataItem.get('y') as number,
      text: metadataItem.get('text') as string,
      fontSize: metadataItem.get('fontSize') as number,
      color,
      createdAt: metadataItem.get('createdAt') as number,
      userId: metadataItem.get('userId') as string
    };
  }

  saveToLocalStorage(): void {
    try {
      const update = Y.encodeStateAsUpdate(this.doc);
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(update)));
      localStorage.setItem(`whiteboard_${this.roomId}`, base64);
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  loadFromLocalStorage(): boolean {
    try {
      const base64 = localStorage.getItem(`whiteboard_${this.roomId}`);
      if (!base64) return false;

      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      Y.applyUpdate(this.doc, bytes, 'local');
      return true;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return false;
    }
  }

  destroy(): void {
    this.doc.destroy();
  }
}

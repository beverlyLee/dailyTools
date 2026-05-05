import type { ShapeData, CanvasState } from '../types';
import { Shape, Rect, Ellipse, Path, Text } from '../primitives';

export interface SerializedProject {
  version: string;
  timestamp: number;
  canvasState: CanvasState;
  layers: {
    layers: Array<{
      id: string;
      name: string;
      visible: boolean;
      locked: boolean;
      shapeIds: string[];
      index: number;
    }>;
    shapeToLayer: Record<string, string>;
  };
}

export class Serializer {
  static readonly VERSION = '1.0.0';
  static readonly STORAGE_KEY = 'edge-interaction-toolkit-canvas';
  
  static shapeFromData(data: ShapeData): Shape {
    switch (data.type) {
      case 'rect':
        return new Rect(data as any);
      case 'ellipse':
        return new Ellipse(data as any);
      case 'path':
        return new Path(data as any);
      case 'text':
        return new Text(data as any);
      default:
        throw new Error(`Unknown shape type: ${(data as ShapeData).type}`);
    }
  }
  
  static shapeToData(shape: Shape): ShapeData {
    return shape.toJSON();
  }
  
  static shapesFromDataArray(dataArray: ShapeData[]): Shape[] {
    return dataArray.map(data => this.shapeFromData(data));
  }
  
  static shapesToDataArray(shapes: Shape[]): ShapeData[] {
    return shapes.map(shape => this.shapeToData(shape));
  }
  
  static serializeProject(
    canvasState: CanvasState,
    layerData: {
      layers: Array<{
        id: string;
        name: string;
        visible: boolean;
        locked: boolean;
        shapeIds: string[];
        index: number;
      }>;
      shapeToLayer: Record<string, string>;
    }
  ): string {
    const project: SerializedProject = {
      version: this.VERSION,
      timestamp: Date.now(),
      canvasState: {
        ...canvasState,
        shapes: this.shapesToDataArray(
          canvasState.shapes.map(s => typeof s === 'string' 
            ? { id: s } as any 
            : s
          )
        ),
      },
      layers: layerData,
    };
    
    return JSON.stringify(project, null, 2);
  }
  
  static deserializeProject(json: string): {
    canvasState: CanvasState;
    layerData: {
      layers: Array<{
        id: string;
        name: string;
        visible: boolean;
        locked: boolean;
        shapeIds: string[];
        index: number;
      }>;
      shapeToLayer: Record<string, string>;
    };
    shapes: Shape[];
  } {
    const project: SerializedProject = JSON.parse(json);
    
    if (project.version !== this.VERSION) {
      console.warn(`Version mismatch: expected ${this.VERSION}, got ${project.version}`);
    }
    
    const shapes = this.shapesFromDataArray(project.canvasState.shapes);
    
    return {
      canvasState: {
        ...project.canvasState,
        shapes: project.canvasState.shapes,
      },
      layerData: project.layers,
      shapes,
    };
  }
  
  static saveToLocalStorage(
    canvasState: CanvasState,
    layerData: {
      layers: Array<{
        id: string;
        name: string;
        visible: boolean;
        locked: boolean;
        shapeIds: string[];
        index: number;
      }>;
      shapeToLayer: Record<string, string>;
    },
    key?: string
  ): boolean {
    try {
      const json = this.serializeProject(canvasState, layerData);
      localStorage.setItem(key || this.STORAGE_KEY, json);
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }
  
  static loadFromLocalStorage(key?: string): {
    canvasState: CanvasState;
    layerData: {
      layers: Array<{
        id: string;
        name: string;
        visible: boolean;
        locked: boolean;
        shapeIds: string[];
        index: number;
      }>;
      shapeToLayer: Record<string, string>;
    };
    shapes: Shape[];
  } | null {
    try {
      const json = localStorage.getItem(key || this.STORAGE_KEY);
      
      if (!json) {
        return null;
      }
      
      return this.deserializeProject(json);
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }
  
  static clearLocalStorage(key?: string): void {
    localStorage.removeItem(key || this.STORAGE_KEY);
  }
  
  static hasLocalStorageData(key?: string): boolean {
    return localStorage.getItem(key || this.STORAGE_KEY) !== null;
  }
  
  static exportToFile(
    canvasState: CanvasState,
    layerData: {
      layers: Array<{
        id: string;
        name: string;
        visible: boolean;
        locked: boolean;
        shapeIds: string[];
        index: number;
      }>;
      shapeToLayer: Record<string, string>;
    },
    filename: string = 'canvas-project.json'
  ): void {
    const json = this.serializeProject(canvasState, layerData);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
  
  static async importFromFile(file: File): Promise<{
    canvasState: CanvasState;
    layerData: {
      layers: Array<{
        id: string;
        name: string;
        visible: boolean;
        locked: boolean;
        shapeIds: string[];
        index: number;
      }>;
      shapeToLayer: Record<string, string>;
    };
    shapes: Shape[];
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const result = this.deserializeProject(json);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
  
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

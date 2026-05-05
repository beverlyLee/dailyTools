import { ShapeData, CanvasState } from '../types';
import { Shape } from '../primitives';

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
export declare class Serializer {
    static readonly VERSION = "1.0.0";
    static readonly STORAGE_KEY = "edge-interaction-toolkit-canvas";
    static shapeFromData(data: ShapeData): Shape;
    static shapeToData(shape: Shape): ShapeData;
    static shapesFromDataArray(dataArray: ShapeData[]): Shape[];
    static shapesToDataArray(shapes: Shape[]): ShapeData[];
    static serializeProject(canvasState: CanvasState, layerData: {
        layers: Array<{
            id: string;
            name: string;
            visible: boolean;
            locked: boolean;
            shapeIds: string[];
            index: number;
        }>;
        shapeToLayer: Record<string, string>;
    }): string;
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
    };
    static saveToLocalStorage(canvasState: CanvasState, layerData: {
        layers: Array<{
            id: string;
            name: string;
            visible: boolean;
            locked: boolean;
            shapeIds: string[];
            index: number;
        }>;
        shapeToLayer: Record<string, string>;
    }, key?: string): boolean;
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
    } | null;
    static clearLocalStorage(key?: string): void;
    static hasLocalStorageData(key?: string): boolean;
    static exportToFile(canvasState: CanvasState, layerData: {
        layers: Array<{
            id: string;
            name: string;
            visible: boolean;
            locked: boolean;
            shapeIds: string[];
            index: number;
        }>;
        shapeToLayer: Record<string, string>;
    }, filename?: string): void;
    static importFromFile(file: File): Promise<{
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
    }>;
    static deepClone<T>(obj: T): T;
}

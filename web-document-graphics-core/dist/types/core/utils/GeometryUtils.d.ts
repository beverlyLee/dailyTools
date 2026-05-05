export interface Point {
    x: number;
    y: number;
}
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Bounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export declare class GeometryUtils {
    static distance(p1: Point, p2: Point): number;
    static distanceSquared(p1: Point, p2: Point): number;
    static midpoint(p1: Point, p2: Point): Point;
    static angle(p1: Point, p2: Point): number;
    static angleInDegrees(p1: Point, p2: Point): number;
    static pointInRect(point: Point, rect: Rect): boolean;
    static pointInBounds(point: Point, bounds: Bounds): boolean;
    static rectsOverlap(rect1: Rect, rect2: Rect): boolean;
    static boundsOverlap(bounds1: Bounds, bounds2: Bounds): boolean;
    static expandBounds(bounds: Bounds, point: Point): Bounds;
    static unionBounds(bounds1: Bounds, bounds2: Bounds): Bounds;
    static rectToBounds(rect: Rect): Bounds;
    static boundsToRect(bounds: Bounds): Rect;
    static normalizeAngle(angle: number): number;
    static normalizeAngleDegrees(angle: number): number;
    static lerp(p1: Point, p2: Point, t: number): Point;
    static clamp(value: number, min: number, max: number): number;
    static degToRad(degrees: number): number;
    static radToDeg(radians: number): number;
    static getMousePosition(canvas: HTMLCanvasElement, event: MouseEvent): Point;
    static createBoundsFromPoints(points: Point[]): Bounds;
}

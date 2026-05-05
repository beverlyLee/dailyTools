import { Shape } from './Shape';
import type { PathData, PathCommand, BoundingBox, Point } from '../types';

export class Path extends Shape {
  public commands: PathCommand[];
  public closed: boolean;
  
  constructor(data: Partial<PathData> = {}) {
    super(data);
    this.commands = data.commands || [];
    this.closed = data.closed ?? false;
    this.name = data.name || 'Path';
  }
  
  public getBoundingBox(): BoundingBox {
    if (this.commands.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const localPoints = this.getPathPoints();
    
    if (localPoints.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const globalPoints = localPoints.map(p => this.localToGlobal(p));
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const point of globalPoints) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
  
  private getPathPoints(): Point[] {
    const points: Point[] = [];
    let currentPoint: Point = { x: 0, y: 0 };
    
    for (const cmd of this.commands) {
      switch (cmd.type) {
        case 'M':
        case 'L':
          currentPoint = { x: cmd.points[0], y: cmd.points[1] };
          points.push(currentPoint);
          break;
        case 'C':
          points.push(
            { x: cmd.points[0], y: cmd.points[1] },
            { x: cmd.points[2], y: cmd.points[3] },
            { x: cmd.points[4], y: cmd.points[5] }
          );
          currentPoint = { x: cmd.points[4], y: cmd.points[5] };
          break;
        case 'Q':
          points.push(
            { x: cmd.points[0], y: cmd.points[1] },
            { x: cmd.points[2], y: cmd.points[3] }
          );
          currentPoint = { x: cmd.points[2], y: cmd.points[3] };
          break;
      }
    }
    
    return points;
  }
  
  public containsPoint(point: Point): boolean {
    const localPoint = this.globalToLocal(point);
    
    const path2D = this.createPath2D();
    
    const ctx = document.createElement('canvas').getContext('2d')!;
    return ctx.isPointInPath(path2D, localPoint.x, localPoint.y);
  }
  
  private createPath2D(): Path2D {
    const path = new Path2D();
    
    for (const cmd of this.commands) {
      switch (cmd.type) {
        case 'M':
          path.moveTo(cmd.points[0], cmd.points[1]);
          break;
        case 'L':
          path.lineTo(cmd.points[0], cmd.points[1]);
          break;
        case 'C':
          path.bezierCurveTo(
            cmd.points[0], cmd.points[1],
            cmd.points[2], cmd.points[3],
            cmd.points[4], cmd.points[5]
          );
          break;
        case 'Q':
          path.quadraticCurveTo(
            cmd.points[0], cmd.points[1],
            cmd.points[2], cmd.points[3]
          );
          break;
        case 'Z':
          path.closePath();
          break;
      }
    }
    
    if (this.closed) {
      path.closePath();
    }
    
    return path;
  }
  
  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    
    ctx.save();
    this.applyTransform(ctx);
    
    const path = this.createPath2D();
    
    if (this.fill) {
      ctx.fillStyle = this.colorToString(this.fill);
      ctx.fill(path);
    }
    
    if (this.stroke) {
      ctx.strokeStyle = this.colorToString(this.stroke);
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke(path);
    }
    
    ctx.restore();
  }
  
  public moveTo(x: number, y: number): void {
    this.commands.push({ type: 'M', points: [x, y] });
  }
  
  public lineTo(x: number, y: number): void {
    this.commands.push({ type: 'L', points: [x, y] });
  }
  
  public cubicCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.commands.push({ type: 'C', points: [cp1x, cp1y, cp2x, cp2y, x, y] });
  }
  
  public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.commands.push({ type: 'Q', points: [cpx, cpy, x, y] });
  }
  
  public closePath(): void {
    this.commands.push({ type: 'Z', points: [] });
  }
  
  public toJSON(): PathData {
    return {
      id: this.id,
      type: 'path',
      transform: { ...this.transform },
      fill: this.fill ? { ...this.fill } : undefined,
      stroke: this.stroke ? { ...this.stroke } : undefined,
      strokeWidth: this.strokeWidth,
      visible: this.visible,
      locked: this.locked,
      layerIndex: this.layerIndex,
      name: this.name,
      commands: this.commands.map(c => ({ ...c, points: [...c.points] })),
      closed: this.closed,
    };
  }
  
  static fromJSON(data: PathData): Path {
    return new Path(data);
  }
}

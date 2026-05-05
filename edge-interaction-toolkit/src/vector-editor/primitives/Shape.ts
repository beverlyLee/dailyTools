import type { ShapeData, Color, TransformData, BoundingBox, Point } from '../types';
import { Matrix2D } from '../transforms';

export abstract class Shape {
  public id: string;
  public transform: TransformData;
  public fill?: Color;
  public stroke?: Color;
  public strokeWidth: number;
  public visible: boolean;
  public locked: boolean;
  public layerIndex: number;
  public name: string;
  
  protected matrix: Matrix2D;
  protected inverseMatrix: Matrix2D;
  
  constructor(data: Partial<ShapeData> = {}) {
    this.id = data.id || this.generateId();
    this.transform = data.transform || {
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
    };
    this.fill = data.fill;
    this.stroke = data.stroke;
    this.strokeWidth = data.strokeWidth ?? 1;
    this.visible = data.visible ?? true;
    this.locked = data.locked ?? false;
    this.layerIndex = data.layerIndex ?? 0;
    this.name = data.name || 'Shape';
    
    this.matrix = new Matrix2D();
    this.inverseMatrix = new Matrix2D();
    this.updateMatrices();
  }
  
  protected generateId(): string {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  protected updateMatrices(): void {
    this.matrix.reset()
      .translate(this.transform.x, this.transform.y)
      .rotate(this.transform.rotation)
      .scale(this.transform.scaleX, this.transform.scaleY)
      .skew(this.transform.skewX, this.transform.skewY);
    
    this.inverseMatrix = this.matrix.invert();
  }
  
  public translate(tx: number, ty: number): void {
    this.transform.x += tx;
    this.transform.y += ty;
    this.updateMatrices();
  }
  
  public rotate(angle: number): void {
    this.transform.rotation += angle;
    this.updateMatrices();
  }
  
  public scale(sx: number, sy: number): void {
    this.transform.scaleX *= sx;
    this.transform.scaleY *= sy;
    this.updateMatrices();
  }
  
  public setTransform(transform: Partial<TransformData>): void {
    this.transform = { ...this.transform, ...transform };
    this.updateMatrices();
  }
  
  public localToGlobal(point: Point): Point {
    return this.matrix.transformPoint(point);
  }
  
  public globalToLocal(point: Point): Point {
    return this.inverseMatrix.transformPoint(point);
  }
  
  public applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(
      this.matrix.a, this.matrix.b,
      this.matrix.c, this.matrix.d,
      this.matrix.e, this.matrix.f
    );
  }
  
  public abstract getBoundingBox(): BoundingBox;
  public abstract containsPoint(point: Point): boolean;
  public abstract draw(ctx: CanvasRenderingContext2D): void;
  public abstract toJSON(): ShapeData;
  
  protected drawStyle(ctx: CanvasRenderingContext2D): void {
    if (this.fill) {
      ctx.fillStyle = this.colorToString(this.fill);
      ctx.fill();
    }
    
    if (this.stroke) {
      ctx.strokeStyle = this.colorToString(this.stroke);
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }
  }
  
  protected colorToString(color: Color): string {
    return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`;
  }
  
  public clone(): Shape {
    const Constructor = this.constructor as new (data: any) => Shape;
    const clone = new Constructor(this.toJSON());
    clone.id = this.generateId();
    return clone;
  }
}

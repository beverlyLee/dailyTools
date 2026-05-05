import { Matrix2D } from './Matrix2D';
import type { Point, TransformData } from '../types';

export class Transform {
  private _x: number;
  private _y: number;
  private _rotation: number;
  private _scaleX: number;
  private _scaleY: number;
  private _skewX: number;
  private _skewY: number;
  
  private _matrix: Matrix2D;
  private _inverseMatrix: Matrix2D;
  private _matrixDirty: boolean;
  private _inverseDirty: boolean;
  
  constructor(data: Partial<TransformData> = {}) {
    this._x = data.x ?? 0;
    this._y = data.y ?? 0;
    this._rotation = data.rotation ?? 0;
    this._scaleX = data.scaleX ?? 1;
    this._scaleY = data.scaleY ?? 1;
    this._skewX = data.skewX ?? 0;
    this._skewY = data.skewY ?? 0;
    
    this._matrix = new Matrix2D();
    this._inverseMatrix = new Matrix2D();
    this._matrixDirty = true;
    this._inverseDirty = true;
  }
  
  get x(): number { return this._x; }
  set x(value: number) {
    this._x = value;
    this._markDirty();
  }
  
  get y(): number { return this._y; }
  set y(value: number) {
    this._y = value;
    this._markDirty();
  }
  
  get rotation(): number { return this._rotation; }
  set rotation(value: number) {
    this._rotation = value;
    this._markDirty();
  }
  
  get scaleX(): number { return this._scaleX; }
  set scaleX(value: number) {
    this._scaleX = value;
    this._markDirty();
  }
  
  get scaleY(): number { return this._scaleY; }
  set scaleY(value: number) {
    this._scaleY = value;
    this._markDirty();
  }
  
  get skewX(): number { return this._skewX; }
  set skewX(value: number) {
    this._skewX = value;
    this._markDirty();
  }
  
  get skewY(): number { return this._skewY; }
  set skewY(value: number) {
    this._skewY = value;
    this._markDirty();
  }
  
  private _markDirty(): void {
    this._matrixDirty = true;
    this._inverseDirty = true;
  }
  
  private _updateMatrix(): void {
    if (!this._matrixDirty) return;
    
    this._matrix.reset()
      .translate(this._x, this._y)
      .rotate(this._rotation)
      .scale(this._scaleX, this._scaleY)
      .skew(this._skewX, this._skewY);
    
    this._matrixDirty = false;
  }
  
  private _updateInverseMatrix(): void {
    if (!this._inverseDirty) return;
    
    this._updateMatrix();
    this._inverseMatrix = this._matrix.inverse();
    this._inverseDirty = false;
  }
  
  get matrix(): Matrix2D {
    this._updateMatrix();
    return this._matrix;
  }
  
  get inverseMatrix(): Matrix2D {
    this._updateInverseMatrix();
    return this._inverseMatrix;
  }
  
  translate(tx: number, ty: number): this {
    this._x += tx;
    this._y += ty;
    this._markDirty();
    return this;
  }
  
  rotate(angle: number): this {
    this._rotation += angle;
    this._markDirty();
    return this;
  }
  
  scale(sx: number, sy: number): this {
    this._scaleX *= sx;
    this._scaleY *= sy;
    this._markDirty();
    return this;
  }
  
  set(x?: number, y?: number, rotation?: number, scaleX?: number, scaleY?: number, skewX?: number, skewY?: number): this {
    if (x !== undefined) this._x = x;
    if (y !== undefined) this._y = y;
    if (rotation !== undefined) this._rotation = rotation;
    if (scaleX !== undefined) this._scaleX = scaleX;
    if (scaleY !== undefined) this._scaleY = scaleY;
    if (skewX !== undefined) this._skewX = skewX;
    if (skewY !== undefined) this._skewY = skewY;
    this._markDirty();
    return this;
  }
  
  localToGlobal(point: Point): Point {
    this._updateMatrix();
    return this._matrix.transformPoint(point);
  }
  
  globalToLocal(point: Point): Point {
    this._updateInverseMatrix();
    return this._inverseMatrix.transformPoint(point);
  }
  
  applyToContext(ctx: CanvasRenderingContext2D): void {
    this._updateMatrix();
    ctx.setTransform(
      this._matrix.a, this._matrix.b,
      this._matrix.c, this._matrix.d,
      this._matrix.e, this._matrix.f
    );
  }
  
  toData(): TransformData {
    return {
      x: this._x,
      y: this._y,
      rotation: this._rotation,
      scaleX: this._scaleX,
      scaleY: this._scaleY,
      skewX: this._skewX,
      skewY: this._skewY,
    };
  }
  
  fromData(data: TransformData): this {
    return this.set(
      data.x,
      data.y,
      data.rotation,
      data.scaleX,
      data.scaleY,
      data.skewX,
      data.skewY
    );
  }
  
  clone(): Transform {
    return new Transform(this.toData());
  }
  
  copyFrom(other: Transform): this {
    return this.fromData(other.toData());
  }
  
  static fromData(data: TransformData): Transform {
    return new Transform(data);
  }
}

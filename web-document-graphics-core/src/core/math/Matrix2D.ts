import { Point } from '../utils/GeometryUtils';

export class Matrix2D {
  public a: number;
  public b: number;
  public c: number;
  public d: number;
  public tx: number;
  public ty: number;

  constructor(a: number = 1, b: number = 0, c: number = 0, d: number = 1, tx: number = 0, ty: number = 0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
  }

  static identity(): Matrix2D {
    return new Matrix2D();
  }

  static translate(x: number, y: number): Matrix2D {
    return new Matrix2D(1, 0, 0, 1, x, y);
  }

  static scale(sx: number, sy: number = sx): Matrix2D {
    return new Matrix2D(sx, 0, 0, sy, 0, 0);
  }

  static rotate(angle: number): Matrix2D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Matrix2D(cos, sin, -sin, cos, 0, 0);
  }

  static rotateDegrees(degrees: number): Matrix2D {
    return Matrix2D.rotate((degrees * Math.PI) / 180);
  }

  static shear(sx: number, sy: number): Matrix2D {
    return new Matrix2D(1, sy, sx, 1, 0, 0);
  }

  translate(x: number, y: number): this {
    this.tx += x;
    this.ty += y;
    return this;
  }

  scale(sx: number, sy: number = sx): this {
    this.a *= sx;
    this.b *= sx;
    this.c *= sy;
    this.d *= sy;
    return this;
  }

  rotate(angle: number): this {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const a = this.a;
    const b = this.b;
    const c = this.c;
    const d = this.d;
    const tx = this.tx;
    const ty = this.ty;
    this.a = a * cos - b * sin;
    this.b = a * sin + b * cos;
    this.c = c * cos - d * sin;
    this.d = c * sin + d * cos;
    this.tx = tx * cos - ty * sin;
    this.ty = tx * sin + ty * cos;
    return this;
  }

  rotateDegrees(degrees: number): this {
    return this.rotate((degrees * Math.PI) / 180);
  }

  shear(sx: number, sy: number): this {
    const a = this.a;
    const b = this.b;
    const c = this.c;
    const d = this.d;
    this.a = a + b * sx;
    this.b = a * sy + b;
    this.c = c + d * sx;
    this.d = c * sy + d;
    return this;
  }

  multiply(matrix: Matrix2D): this {
    const a = this.a;
    const b = this.b;
    const c = this.c;
    const d = this.d;
    const tx = this.tx;
    const ty = this.ty;
    const ma = matrix.a;
    const mb = matrix.b;
    const mc = matrix.c;
    const md = matrix.d;
    const mtx = matrix.tx;
    const mty = matrix.ty;
    this.a = a * ma + c * mb;
    this.b = b * ma + d * mb;
    this.c = a * mc + c * md;
    this.d = b * mc + d * md;
    this.tx = a * mtx + c * mty + tx;
    this.ty = b * mtx + d * mty + ty;
    return this;
  }

  prepend(matrix: Matrix2D): this {
    const a = this.a;
    const b = this.b;
    const c = this.c;
    const d = this.d;
    const tx = this.tx;
    const ty = this.ty;
    const ma = matrix.a;
    const mb = matrix.b;
    const mc = matrix.c;
    const md = matrix.d;
    const mtx = matrix.tx;
    const mty = matrix.ty;
    this.a = ma * a + mc * b;
    this.b = mb * a + md * b;
    this.c = ma * c + mc * d;
    this.d = mb * c + md * d;
    this.tx = ma * tx + mc * ty + mtx;
    this.ty = mb * tx + md * ty + mty;
    return this;
  }

  invert(): this {
    const a = this.a;
    const b = this.b;
    const c = this.c;
    const d = this.d;
    const tx = this.tx;
    const ty = this.ty;
    const determinant = a * d - b * c;
    if (Math.abs(determinant) < Number.EPSILON) {
      this.reset();
      return this;
    }
    const invDet = 1 / determinant;
    this.a = d * invDet;
    this.b = -b * invDet;
    this.c = -c * invDet;
    this.d = a * invDet;
    this.tx = (c * ty - d * tx) * invDet;
    this.ty = (b * tx - a * ty) * invDet;
    return this;
  }

  inverted(): Matrix2D {
    return this.clone().invert();
  }

  transformPoint(point: Point): Point {
    return {
      x: this.a * point.x + this.c * point.y + this.tx,
      y: this.b * point.x + this.d * point.y + this.ty,
    };
  }

  inverseTransformPoint(point: Point): Point {
    const inverse = this.inverted();
    return inverse.transformPoint(point);
  }

  transformPoints(points: Point[]): Point[] {
    return points.map((p) => this.transformPoint(p));
  }

  clone(): Matrix2D {
    return new Matrix2D(this.a, this.b, this.c, this.d, this.tx, this.ty);
  }

  copy(matrix: Matrix2D): this {
    this.a = matrix.a;
    this.b = matrix.b;
    this.c = matrix.c;
    this.d = matrix.d;
    this.tx = matrix.tx;
    this.ty = matrix.ty;
    return this;
  }

  reset(): this {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.tx = 0;
    this.ty = 0;
    return this;
  }

  isIdentity(): boolean {
    return (
      this.a === 1 &&
      this.b === 0 &&
      this.c === 0 &&
      this.d === 1 &&
      this.tx === 0 &&
      this.ty === 0
    );
  }

  equals(matrix: Matrix2D, epsilon: number = 0.0001): boolean {
    return (
      Math.abs(this.a - matrix.a) < epsilon &&
      Math.abs(this.b - matrix.b) < epsilon &&
      Math.abs(this.c - matrix.c) < epsilon &&
      Math.abs(this.d - matrix.d) < epsilon &&
      Math.abs(this.tx - matrix.tx) < epsilon &&
      Math.abs(this.ty - matrix.ty) < epsilon
    );
  }

  getDeterminant(): number {
    return this.a * this.d - this.b * this.c;
  }

  getScaleX(): number {
    return Math.sign(this.a) * Math.sqrt(this.a * this.a + this.b * this.b);
  }

  getScaleY(): number {
    return Math.sign(this.d) * Math.sqrt(this.c * this.c + this.d * this.d);
  }

  getRotation(): number {
    return Math.atan2(this.b, this.a);
  }

  getRotationDegrees(): number {
    return (this.getRotation() * 180) / Math.PI;
  }

  getTranslation(): Point {
    return { x: this.tx, y: this.ty };
  }

  applyToContext(ctx: CanvasRenderingContext2D): void {
    ctx.transform(this.a, this.b, this.c, this.d, this.tx, this.ty);
  }

  toArray(): [number, number, number, number, number, number] {
    return [this.a, this.b, this.c, this.d, this.tx, this.ty];
  }

  fromArray(arr: [number, number, number, number, number, number]): this {
    [this.a, this.b, this.c, this.d, this.tx, this.ty] = arr;
    return this;
  }

  toJSON(): { a: number; b: number; c: number; d: number; tx: number; ty: number } {
    return {
      a: this.a,
      b: this.b,
      c: this.c,
      d: this.d,
      tx: this.tx,
      ty: this.ty,
    };
  }

  fromJSON(json: { a: number; b: number; c: number; d: number; tx: number; ty: number }): this {
    this.a = json.a;
    this.b = json.b;
    this.c = json.c;
    this.d = json.d;
    this.tx = json.tx;
    this.ty = json.ty;
    return this;
  }

  static multiplyMatrices(m1: Matrix2D, m2: Matrix2D): Matrix2D {
    return m1.clone().multiply(m2);
  }

  static rotateAround(angle: number, pivot: Point): Matrix2D {
    return Matrix2D.translate(-pivot.x, -pivot.y)
      .rotate(angle)
      .translate(pivot.x, pivot.y);
  }

  static scaleAround(sx: number, sy: number, pivot: Point): Matrix2D {
    return Matrix2D.translate(-pivot.x, -pivot.y)
      .scale(sx, sy)
      .translate(pivot.x, pivot.y);
  }
}

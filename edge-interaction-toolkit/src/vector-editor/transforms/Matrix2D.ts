import type { Point } from '../types';

export class Matrix2D {
  public a: number;
  public b: number;
  public c: number;
  public d: number;
  public e: number;
  public f: number;
  
  constructor(a: number = 1, b: number = 0, c: number = 0, d: number = 1, e: number = 0, f: number = 0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }
  
  static identity(): Matrix2D {
    return new Matrix2D(1, 0, 0, 1, 0, 0);
  }
  
  static translation(tx: number, ty: number): Matrix2D {
    return new Matrix2D(1, 0, 0, 1, tx, ty);
  }
  
  static rotation(angle: number): Matrix2D {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Matrix2D(c, s, -s, c, 0, 0);
  }
  
  static scaling(sx: number, sy: number): Matrix2D {
    return new Matrix2D(sx, 0, 0, sy, 0, 0);
  }
  
  static skewing(skewX: number, skewY: number): Matrix2D {
    return new Matrix2D(1, Math.tan(skewY), Math.tan(skewX), 1, 0, 0);
  }
  
  reset(): Matrix2D {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
    return this;
  }
  
  translate(tx: number, ty: number): Matrix2D {
    const mat = Matrix2D.translation(tx, ty);
    return this.multiply(mat);
  }
  
  rotate(angle: number): Matrix2D {
    const mat = Matrix2D.rotation(angle);
    return this.multiply(mat);
  }
  
  scale(sx: number, sy: number): Matrix2D {
    const mat = Matrix2D.scaling(sx, sy);
    return this.multiply(mat);
  }
  
  skew(skewX: number, skewY: number): Matrix2D {
    const mat = Matrix2D.skewing(skewX, skewY);
    return this.multiply(mat);
  }
  
  multiply(other: Matrix2D): Matrix2D {
    const a = this.a * other.a + this.b * other.c;
    const b = this.a * other.b + this.b * other.d;
    const c = this.c * other.a + this.d * other.c;
    const d = this.c * other.b + this.d * other.d;
    const e = this.e * other.a + this.f * other.c + other.e;
    const f = this.e * other.b + this.f * other.d + other.f;
    
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    
    return this;
  }
  
  preMultiply(other: Matrix2D): Matrix2D {
    const a = other.a * this.a + other.b * this.c;
    const b = other.a * this.b + other.b * this.d;
    const c = other.c * this.a + other.d * this.c;
    const d = other.c * this.b + other.d * this.d;
    const e = other.e * this.a + other.f * this.c + this.e;
    const f = other.e * this.b + other.f * this.d + this.f;
    
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    
    return this;
  }
  
  invert(): Matrix2D {
    const det = this.a * this.d - this.b * this.c;
    
    if (Math.abs(det) < 1e-10) {
      return this.reset();
    }
    
    const invDet = 1 / det;
    
    const a = this.d * invDet;
    const b = -this.b * invDet;
    const c = -this.c * invDet;
    const d = this.a * invDet;
    const e = (this.c * this.f - this.d * this.e) * invDet;
    const f = (this.b * this.e - this.a * this.f) * invDet;
    
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    
    return this;
  }
  
  inverse(): Matrix2D {
    return this.clone().invert();
  }
  
  transpose(): Matrix2D {
    const temp = this.b;
    this.b = this.c;
    this.c = temp;
    return this;
  }
  
  transformPoint(point: Point): Point {
    return {
      x: this.a * point.x + this.c * point.y + this.e,
      y: this.b * point.x + this.d * point.y + this.f,
    };
  }
  
  transformPoints(points: Point[]): Point[] {
    return points.map(p => this.transformPoint(p));
  }
  
  transformVector(v: Point): Point {
    return {
      x: this.a * v.x + this.c * v.y,
      y: this.b * v.x + this.d * v.y,
    };
  }
  
  get translation(): Point {
    return { x: this.e, y: this.f };
  }
  
  get rotation(): number {
    return Math.atan2(this.b, this.a);
  }
  
  get scaleX(): number {
    return Math.sqrt(this.a * this.a + this.b * this.b);
  }
  
  get scaleY(): number {
    return Math.sqrt(this.c * this.c + this.d * this.d);
  }
  
  get determinant(): number {
    return this.a * this.d - this.b * this.c;
  }
  
  clone(): Matrix2D {
    return new Matrix2D(this.a, this.b, this.c, this.d, this.e, this.f);
  }
  
  toArray(): number[] {
    return [this.a, this.b, this.c, this.d, this.e, this.f];
  }
  
  fromArray(arr: number[]): Matrix2D {
    this.a = arr[0] ?? 1;
    this.b = arr[1] ?? 0;
    this.c = arr[2] ?? 0;
    this.d = arr[3] ?? 1;
    this.e = arr[4] ?? 0;
    this.f = arr[5] ?? 0;
    return this;
  }
  
  equals(other: Matrix2D, epsilon: number = 1e-10): boolean {
    return (
      Math.abs(this.a - other.a) <= epsilon &&
      Math.abs(this.b - other.b) <= epsilon &&
      Math.abs(this.c - other.c) <= epsilon &&
      Math.abs(this.d - other.d) <= epsilon &&
      Math.abs(this.e - other.e) <= epsilon &&
      Math.abs(this.f - other.f) <= epsilon
    );
  }
  
  static multiply(a: Matrix2D, b: Matrix2D): Matrix2D {
    return a.clone().multiply(b);
  }
  
  static lerp(a: Matrix2D, b: Matrix2D, t: number): Matrix2D {
    return new Matrix2D(
      a.a + (b.a - a.a) * t,
      a.b + (b.b - a.b) * t,
      a.c + (b.c - a.c) * t,
      a.d + (b.d - a.d) * t,
      a.e + (b.e - a.e) * t,
      a.f + (b.f - a.f) * t
    );
  }
}

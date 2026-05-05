import { Shape } from './Shape';
import type { EllipseData, BoundingBox, Point } from '../types';

export class Ellipse extends Shape {
  public cx: number;
  public cy: number;
  public rx: number;
  public ry: number;
  public rotation: number;
  
  constructor(data: Partial<EllipseData> = {}) {
    super(data);
    this.cx = data.cx ?? 50;
    this.cy = data.cy ?? 50;
    this.rx = data.rx ?? 50;
    this.ry = data.ry ?? 50;
    this.rotation = data.rotation ?? 0;
    this.name = data.name || 'Ellipse';
  }
  
  public getBoundingBox(): BoundingBox {
    const a = this.rx;
    const b = this.ry;
    const phi = this.rotation;
    
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    
    const width = 2 * Math.sqrt(a * a * c * c + b * b * s * s);
    const height = 2 * Math.sqrt(a * a * s * s + b * b * c * c);
    
    const localCenter = { x: this.cx, y: this.cy };
    const globalCenter = this.localToGlobal(localCenter);
    
    return {
      x: globalCenter.x - width / 2,
      y: globalCenter.y - height / 2,
      width,
      height,
    };
  }
  
  public containsPoint(point: Point): boolean {
    const localPoint = this.globalToLocal(point);
    
    const dx = localPoint.x - this.cx;
    const dy = localPoint.y - this.cy;
    
    const c = Math.cos(-this.rotation);
    const s = Math.sin(-this.rotation);
    
    const rx = dx * c - dy * s;
    const ry = dx * s + dy * c;
    
    return (rx * rx) / (this.rx * this.rx) + (ry * ry) / (this.ry * this.ry) <= 1;
  }
  
  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    
    ctx.save();
    this.applyTransform(ctx);
    
    ctx.beginPath();
    ctx.ellipse(
      this.cx,
      this.cy,
      this.rx,
      this.ry,
      this.rotation,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    
    this.drawStyle(ctx);
    
    ctx.restore();
  }
  
  public toJSON(): EllipseData {
    return {
      id: this.id,
      type: 'ellipse',
      transform: { ...this.transform },
      fill: this.fill ? { ...this.fill } : undefined,
      stroke: this.stroke ? { ...this.stroke } : undefined,
      strokeWidth: this.strokeWidth,
      visible: this.visible,
      locked: this.locked,
      layerIndex: this.layerIndex,
      name: this.name,
      cx: this.cx,
      cy: this.cy,
      rx: this.rx,
      ry: this.ry,
      rotation: this.rotation,
    };
  }
  
  static fromJSON(data: EllipseData): Ellipse {
    return new Ellipse(data);
  }
}

import { Shape } from './Shape';
import type { RectData, BoundingBox, Point } from '../types';

export class Rect extends Shape {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public cornerRadius: number;
  
  constructor(data: Partial<RectData> = {}) {
    super(data);
    this.x = data.x ?? 0;
    this.y = data.y ?? 0;
    this.width = data.width ?? 100;
    this.height = data.height ?? 100;
    this.cornerRadius = data.cornerRadius ?? 0;
    this.name = data.name || 'Rectangle';
  }
  
  public getBoundingBox(): BoundingBox {
    const corners = [
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x + this.width, y: this.y + this.height },
      { x: this.x, y: this.y + this.height },
    ];
    
    const globalCorners = corners.map(c => this.localToGlobal(c));
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const corner of globalCorners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
  
  public containsPoint(point: Point): boolean {
    const localPoint = this.globalToLocal(point);
    
    return (
      localPoint.x >= this.x &&
      localPoint.x <= this.x + this.width &&
      localPoint.y >= this.y &&
      localPoint.y <= this.y + this.height
    );
  }
  
  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    
    ctx.save();
    this.applyTransform(ctx);
    
    ctx.beginPath();
    
    if (this.cornerRadius > 0) {
      const r = Math.min(this.cornerRadius, this.width / 2, this.height / 2);
      
      ctx.moveTo(this.x + r, this.y);
      ctx.lineTo(this.x + this.width - r, this.y);
      ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + r);
      ctx.lineTo(this.x + this.width, this.y + this.height - r);
      ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - r, this.y + this.height);
      ctx.lineTo(this.x + r, this.y + this.height);
      ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - r);
      ctx.lineTo(this.x, this.y + r);
      ctx.quadraticCurveTo(this.x, this.y, this.x + r, this.y);
    } else {
      ctx.rect(this.x, this.y, this.width, this.height);
    }
    
    ctx.closePath();
    this.drawStyle(ctx);
    
    ctx.restore();
  }
  
  public toJSON(): RectData {
    return {
      id: this.id,
      type: 'rect',
      transform: { ...this.transform },
      fill: this.fill ? { ...this.fill } : undefined,
      stroke: this.stroke ? { ...this.stroke } : undefined,
      strokeWidth: this.strokeWidth,
      visible: this.visible,
      locked: this.locked,
      layerIndex: this.layerIndex,
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      cornerRadius: this.cornerRadius,
    };
  }
  
  static fromJSON(data: RectData): Rect {
    return new Rect(data);
  }
}

import { Shape } from './Shape';
import type { TextData, BoundingBox, Point } from '../types';

export class Text extends Shape {
  public x: number;
  public y: number;
  public content: string;
  public fontSize: number;
  public fontFamily: string;
  public textAlign: CanvasTextAlign;
  public textBaseline: CanvasTextBaseline;
  
  constructor(data: Partial<TextData> = {}) {
    super(data);
    this.x = data.x ?? 0;
    this.y = data.y ?? 0;
    this.content = data.content ?? 'Text';
    this.fontSize = data.fontSize ?? 16;
    this.fontFamily = data.fontFamily ?? 'Arial, sans-serif';
    this.textAlign = data.textAlign ?? 'left';
    this.textBaseline = data.textBaseline ?? 'alphabetic';
    this.name = data.name || 'Text';
  }
  
  public getBoundingBox(): BoundingBox {
    const localBounds = this.measureText();
    const corners = [
      { x: localBounds.x, y: localBounds.y },
      { x: localBounds.x + localBounds.width, y: localBounds.y },
      { x: localBounds.x + localBounds.width, y: localBounds.y + localBounds.height },
      { x: localBounds.x, y: localBounds.y + localBounds.height },
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
  
  private measureText(): BoundingBox {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { x: this.x, y: this.y, width: 100, height: this.fontSize };
    }
    
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;
    
    const metrics = ctx.measureText(this.content);
    
    let x = this.x;
    let y = this.y;
    
    switch (this.textAlign) {
      case 'center':
        x -= metrics.width / 2;
        break;
      case 'right':
        x -= metrics.width;
        break;
    }
    
    switch (this.textBaseline) {
      case 'top':
      case 'hanging':
        break;
      case 'middle':
        y -= this.fontSize / 2;
        break;
      case 'alphabetic':
      case 'ideographic':
      case 'bottom':
        y -= this.fontSize;
        break;
    }
    
    return {
      x,
      y,
      width: metrics.width,
      height: this.fontSize,
    };
  }
  
  public containsPoint(point: Point): boolean {
    const localBounds = this.measureText();
    const localPoint = this.globalToLocal(point);
    
    return (
      localPoint.x >= localBounds.x &&
      localPoint.x <= localBounds.x + localBounds.width &&
      localPoint.y >= localBounds.y &&
      localPoint.y <= localBounds.y + localBounds.height
    );
  }
  
  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    
    ctx.save();
    this.applyTransform(ctx);
    
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;
    
    if (this.fill) {
      ctx.fillStyle = this.colorToString(this.fill);
      ctx.fillText(this.content, this.x, this.y);
    }
    
    if (this.stroke) {
      ctx.strokeStyle = this.colorToString(this.stroke);
      ctx.lineWidth = this.strokeWidth;
      ctx.strokeText(this.content, this.x, this.y);
    }
    
    ctx.restore();
  }
  
  public toJSON(): TextData {
    return {
      id: this.id,
      type: 'text',
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
      content: this.content,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
    };
  }
  
  static fromJSON(data: TextData): Text {
    return new Text(data);
  }
}

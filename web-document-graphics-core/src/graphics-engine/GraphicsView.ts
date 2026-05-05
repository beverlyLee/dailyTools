import { View, Matrix2D, Point, GeometryUtils, Bounds } from '../core';
import { GraphicsModel } from './GraphicsModel';
import { Graphics, RectGraphics, EllipseGraphics, PathGraphics, TextGraphics, Transform } from './types';

export class GraphicsView extends View<GraphicsModel> {
  private _transform: Matrix2D;

  constructor(model: GraphicsModel, canvas: HTMLCanvasElement) {
    super(model, undefined, canvas);
    this._transform = Matrix2D.identity();
    this.setupCanvas();
  }

  private setupCanvas(): void {
    if (!this._canvas) return;

    const canvasState = this._model.canvasState;
    this.resizeCanvas(canvasState.width, canvasState.height);
  }

  override resizeCanvas(width: number, height: number): this {
    if (!this._canvas || !this._context) return this;

    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = Math.floor(width * dpr);
    this._canvas.height = Math.floor(height * dpr);
    this._canvas.style.width = `${Math.floor(width)}px`;
    this._canvas.style.height = `${Math.floor(height)}px`;

    this._context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return this;
  }

  get transform(): Matrix2D {
    return this._transform.clone();
  }

  set transform(matrix: Matrix2D) {
    this._transform = matrix.clone();
  }

  screenToWorld(point: Point): Point {
    return this._transform.inverted().transformPoint(point);
  }

  worldToScreen(point: Point): Point {
    return this._transform.transformPoint(point);
  }

  protected onRender(): void {
    if (!this._canvas || !this._context) return;

    const ctx = this._context;
    const canvasState = this._model.canvasState;

    ctx.save();
    this._transform.applyToContext(ctx);

    ctx.fillStyle = canvasState.backgroundColor;
    ctx.fillRect(0, 0, canvasState.width, canvasState.height);

    const graphics = this._model.getSortedGraphics();
    for (const g of graphics) {
      if (g.visible) {
        this.renderGraphics(ctx, g);
      }
    }

    for (const g of graphics) {
      if (g.selected && g.visible) {
        this.renderSelectionBounds(ctx, g);
      }
    }

    ctx.restore();
  }

  private renderGraphics(ctx: CanvasRenderingContext2D, graphics: Graphics): void {
    ctx.save();

    this.applyTransform(ctx, graphics.transform);

    if (graphics.fill) {
      ctx.fillStyle = graphics.fill.color;
      ctx.globalAlpha = graphics.fill.opacity;
    }

    if (graphics.stroke) {
      ctx.strokeStyle = graphics.stroke.color;
      ctx.lineWidth = graphics.stroke.width;
      ctx.globalAlpha = graphics.stroke.opacity;
      if (graphics.stroke.lineCap) ctx.lineCap = graphics.stroke.lineCap;
      if (graphics.stroke.lineJoin) ctx.lineJoin = graphics.stroke.lineJoin;
      if (graphics.stroke.dashPattern) ctx.setLineDash(graphics.stroke.dashPattern);
    }

    switch (graphics.type) {
      case 'rect':
        this.renderRect(ctx, graphics);
        break;
      case 'ellipse':
        this.renderEllipse(ctx, graphics);
        break;
      case 'path':
        this.renderPath(ctx, graphics);
        break;
      case 'text':
        this.renderText(ctx, graphics);
        break;
    }

    ctx.restore();
  }

  private applyTransform(ctx: CanvasRenderingContext2D, transform: Transform): void {
    if (transform.x !== 0 || transform.y !== 0) {
      ctx.translate(transform.x, transform.y);
    }
    if (transform.rotation !== 0) {
      ctx.rotate(transform.rotation);
    }
    if (transform.scaleX !== 1 || transform.scaleY !== 1) {
      ctx.scale(transform.scaleX, transform.scaleY);
    }
  }

  private renderRect(ctx: CanvasRenderingContext2D, graphics: RectGraphics): void {
    const { width, height, cornerRadius } = graphics;

    if (cornerRadius > 0) {
      this.drawRoundedRect(ctx, 0, 0, width, height, cornerRadius);
    } else {
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
    }

    if (graphics.fill) ctx.fill();
    if (graphics.stroke) ctx.stroke();
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    radius: number
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private renderEllipse(ctx: CanvasRenderingContext2D, graphics: EllipseGraphics): void {
    const { radiusX, radiusY } = graphics;

    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);

    if (graphics.fill) ctx.fill();
    if (graphics.stroke) ctx.stroke();
  }

  private renderPath(ctx: CanvasRenderingContext2D, graphics: PathGraphics): void {
    if (graphics.points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(graphics.points[0].x, graphics.points[0].y);

    for (let i = 1; i < graphics.points.length; i++) {
      ctx.lineTo(graphics.points[i].x, graphics.points[i].y);
    }

    if (graphics.closed) {
      ctx.closePath();
      if (graphics.fill) ctx.fill();
    }

    if (graphics.stroke) ctx.stroke();
  }

  private renderText(ctx: CanvasRenderingContext2D, graphics: TextGraphics): void {
    const { content, textStyle } = graphics;

    let fontString = '';
    if (textStyle.fontStyle) fontString += `${textStyle.fontStyle} `;
    if (textStyle.fontWeight) fontString += `${textStyle.fontWeight} `;
    fontString += `${textStyle.fontSize}px ${textStyle.fontFamily}`;

    ctx.font = fontString;
    ctx.textAlign = textStyle.textAlign || 'left';
    ctx.textBaseline = textStyle.textBaseline || 'top';

    if (graphics.fill) {
      ctx.fillStyle = graphics.fill.color;
      ctx.globalAlpha = graphics.fill.opacity;
      ctx.fillText(content, 0, 0);
    }

    if (graphics.stroke) {
      ctx.strokeStyle = graphics.stroke.color;
      ctx.lineWidth = graphics.stroke.width;
      ctx.globalAlpha = graphics.stroke.opacity;
      ctx.strokeText(content, 0, 0);
    }
  }

  private renderSelectionBounds(ctx: CanvasRenderingContext2D, graphics: Graphics): void {
    const bounds = this.getGraphicsBounds(graphics);
    if (!bounds) return;

    ctx.save();
    this.applyTransform(ctx, graphics.transform);

    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2 / this._transform.getScaleX();
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 1;

    const padding = 5 / this._transform.getScaleX();
    const x = bounds.minX - padding;
    const y = bounds.minY - padding;
    const width = bounds.maxX - bounds.minX + padding * 2;
    const height = bounds.maxY - bounds.minY + padding * 2;

    ctx.strokeRect(x, y, width, height);

    this.renderResizeHandles(ctx, x, y, width, height);

    ctx.restore();
  }

  private renderResizeHandles(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number
  ): void {
    const handleSize = 8 / this._transform.getScaleX();
    const halfHandle = handleSize / 2;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 1 / this._transform.getScaleX();
    ctx.setLineDash([]);

    const handles = [
      { x: x - halfHandle, y: y - halfHandle },
      { x: x + width / 2 - halfHandle, y: y - halfHandle },
      { x: x + width - halfHandle, y: y - halfHandle },
      { x: x + width - halfHandle, y: y + height / 2 - halfHandle },
      { x: x + width - halfHandle, y: y + height - halfHandle },
      { x: x + width / 2 - halfHandle, y: y + height - halfHandle },
      { x: x - halfHandle, y: y + height - halfHandle },
      { x: x - halfHandle, y: y + height / 2 - halfHandle },
    ];

    for (const handle of handles) {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    }
  }

  getGraphicsBounds(graphics: Graphics): Bounds | null {
    switch (graphics.type) {
      case 'rect':
        return {
          minX: 0,
          minY: 0,
          maxX: graphics.width,
          maxY: graphics.height,
        };

      case 'ellipse':
        return {
          minX: -graphics.radiusX,
          minY: -graphics.radiusY,
          maxX: graphics.radiusX,
          maxY: graphics.radiusY,
        };

      case 'path':
        if (graphics.points.length === 0) return null;
        return GeometryUtils.createBoundsFromPoints(graphics.points);

      case 'text':
        if (!this._context) return null;
        const metrics = this._context.measureText(graphics.content);
        return {
          minX: 0,
          minY: 0,
          maxX: metrics.width,
          maxY: graphics.textStyle.fontSize,
        };

      default:
        return null;
    }
  }

  hitTest(graphics: Graphics, point: Point): boolean {
    const bounds = this.getGraphicsBounds(graphics);
    if (!bounds) return false;

    const localPoint = this.transformPointToLocal(graphics.transform, point);

    if (graphics.type === 'ellipse') {
      const ellipse = graphics as EllipseGraphics;
      const rx = ellipse.radiusX;
      const ry = ellipse.radiusY;
      const dx = localPoint.x / rx;
      const dy = localPoint.y / ry;
      return dx * dx + dy * dy <= 1;
    }

    if (graphics.type === 'path') {
      return this.hitTestPath(graphics as PathGraphics, localPoint);
    }

    return GeometryUtils.pointInBounds(localPoint, bounds);
  }

  private transformPointToLocal(transform: Transform, worldPoint: Point): Point {
    let point = { ...worldPoint };

    point.x -= transform.x;
    point.y -= transform.y;

    if (transform.rotation !== 0) {
      const cos = Math.cos(-transform.rotation);
      const sin = Math.sin(-transform.rotation);
      const x = point.x * cos - point.y * sin;
      const y = point.x * sin + point.y * cos;
      point = { x, y };
    }

    if (transform.scaleX !== 1) point.x /= transform.scaleX;
    if (transform.scaleY !== 1) point.y /= transform.scaleY;

    return point;
  }

  private hitTestPath(path: PathGraphics, point: Point): boolean {
    const points = path.points;
    if (points.length < 3 && !path.closed) {
      const strokeWidth = path.stroke?.width || 2;
      for (let i = 1; i < points.length; i++) {
        const dist = this.distanceToLineSegment(point, points[i - 1], points[i]);
        if (dist <= strokeWidth) return true;
      }
      return false;
    }

    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  private distanceToLineSegment(p: Point, v: Point, w: Point): number {
    const l2 = GeometryUtils.distanceSquared(v, w);
    if (l2 === 0) return GeometryUtils.distance(p, v);
    
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    
    return GeometryUtils.distance(p, {
      x: v.x + t * (w.x - v.x),
      y: v.y + t * (w.y - v.y),
    });
  }

  async redraw(): Promise<void> {
    this.render();
  }
}

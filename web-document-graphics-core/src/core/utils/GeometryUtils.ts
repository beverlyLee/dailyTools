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

export class GeometryUtils {
  static distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static distanceSquared(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return dx * dx + dy * dy;
  }

  static midpoint(p1: Point, p2: Point): Point {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  }

  static angle(p1: Point, p2: Point): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  static angleInDegrees(p1: Point, p2: Point): number {
    return (this.angle(p1, p2) * 180) / Math.PI;
  }

  static pointInRect(point: Point, rect: Rect): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  static pointInBounds(point: Point, bounds: Bounds): boolean {
    return (
      point.x >= bounds.minX &&
      point.x <= bounds.maxX &&
      point.y >= bounds.minY &&
      point.y <= bounds.maxY
    );
  }

  static rectsOverlap(rect1: Rect, rect2: Rect): boolean {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    );
  }

  static boundsOverlap(bounds1: Bounds, bounds2: Bounds): boolean {
    return !(
      bounds1.maxX < bounds2.minX ||
      bounds2.maxX < bounds1.minX ||
      bounds1.maxY < bounds2.minY ||
      bounds2.maxY < bounds1.minY
    );
  }

  static expandBounds(bounds: Bounds, point: Point): Bounds {
    return {
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    };
  }

  static unionBounds(bounds1: Bounds, bounds2: Bounds): Bounds {
    return {
      minX: Math.min(bounds1.minX, bounds2.minX),
      minY: Math.min(bounds1.minY, bounds2.minY),
      maxX: Math.max(bounds1.maxX, bounds2.maxX),
      maxY: Math.max(bounds1.maxY, bounds2.maxY),
    };
  }

  static rectToBounds(rect: Rect): Bounds {
    return {
      minX: rect.x,
      minY: rect.y,
      maxX: rect.x + rect.width,
      maxY: rect.y + rect.height,
    };
  }

  static boundsToRect(bounds: Bounds): Rect {
    return {
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
    };
  }

  static normalizeAngle(angle: number): number {
    angle = angle % (2 * Math.PI);
    if (angle < 0) {
      angle += 2 * Math.PI;
    }
    return angle;
  }

  static normalizeAngleDegrees(angle: number): number {
    angle = angle % 360;
    if (angle < 0) {
      angle += 360;
    }
    return angle;
  }

  static lerp(p1: Point, p2: Point, t: number): Point {
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    };
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static degToRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  static radToDeg(radians: number): number {
    return (radians * 180) / Math.PI;
  }

  static getMousePosition(canvas: HTMLCanvasElement, event: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  static createBoundsFromPoints(points: Point[]): Bounds {
    if (points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }
}

import { Position, Tile, TileType, MapData, Room } from '../types';

export class MapUtils {
  static createEmptyMap(width: number, height: number, tileType: TileType = TileType.WALL): Tile[][] {
    const tiles: Tile[][] = [];
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = {
          type: tileType,
          passable: tileType === TileType.FLOOR || tileType === TileType.DOOR,
          visible: false,
          explored: false,
        };
      }
    }
    return tiles;
  }

  static isInBounds(x: number, y: number, width: number, height: number): boolean {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  static isPassable(x: number, y: number, map: MapData): boolean {
    if (!this.isInBounds(x, y, map.width, map.height)) {
      return false;
    }
    return map.tiles[y][x].passable;
  }

  static getNeighbors(x: number, y: number, width: number, height: number): Position[] {
    const neighbors: Position[] = [];
    const directions = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (this.isInBounds(nx, ny, width, height)) {
        neighbors.push({ x: nx, y: ny });
      }
    }
    return neighbors;
  }

  static get8Neighbors(x: number, y: number, width: number, height: number): Position[] {
    const neighbors: Position[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (this.isInBounds(nx, ny, width, height)) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }
    return neighbors;
  }

  static countNeighborType(
    x: number, 
    y: number, 
    tiles: Tile[][], 
    tileType: TileType, 
    width: number, 
    height: number,
    includeDiagonals: boolean = true
  ): number {
    let count = 0;
    const neighbors = includeDiagonals 
      ? this.get8Neighbors(x, y, width, height) 
      : this.getNeighbors(x, y, width, height);
    
    for (const neighbor of neighbors) {
      if (tiles[neighbor.y][neighbor.x].type === tileType) {
        count++;
      }
    }
    return count;
  }

  static findPassableTiles(map: MapData): Position[] {
    const passable: Position[] = [];
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.tiles[y][x].passable) {
          passable.push({ x, y });
        }
      }
    }
    return passable;
  }

  static isMapConnected(map: MapData): boolean {
    const passableTiles = this.findPassableTiles(map);
    if (passableTiles.length === 0) return false;

    const visited = new Set<string>();
    const queue: Position[] = [passableTiles[0]];
    visited.add(`${passableTiles[0].x},${passableTiles[0].y}`);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.getNeighbors(current.x, current.y, map.width, map.height);
      
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key) && map.tiles[neighbor.y][neighbor.x].passable) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    return visited.size === passableTiles.length;
  }

  static getDistance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  static getEuclideanDistance(a: Position, b: Position): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  static lineOfSight(
    from: Position, 
    to: Position, 
    map: MapData, 
    maxRadius: number = 10
  ): boolean {
    const distance = this.getDistance(from, to);
    if (distance > maxRadius) return false;

    let x0 = from.x;
    let y0 = from.y;
    const x1 = to.x;
    const y1 = to.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x0 === x1 && y0 === y1) return true;
      if (!map.tiles[y0][x0].passable && !(x0 === from.x && y0 === from.y)) {
        return false;
      }

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  static calculateFOV(
    center: Position, 
    map: MapData, 
    radius: number = 8
  ): void {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        map.tiles[y][x].visible = false;
      }
    }

    for (let i = 0; i < 360; i += 0.5) {
      const angle = (i * Math.PI) / 180;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      
      let x = center.x + 0.5;
      let y = center.y + 0.5;
      
      for (let j = 0; j < radius; j++) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        
        if (!this.isInBounds(ix, iy, map.width, map.height)) break;
        
        map.tiles[iy][ix].visible = true;
        map.tiles[iy][ix].explored = true;
        
        if (!map.tiles[iy][ix].passable) break;
        
        x += dx;
        y += dy;
      }
    }
  }
}

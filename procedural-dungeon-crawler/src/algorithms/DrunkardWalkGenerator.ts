import { MapData, TileType, Room, Position, Tile } from '../types';
import { MapUtils } from './MapUtils';

export interface DrunkardWalkConfig {
  width: number;
  height: number;
  startPosition?: Position;
  walkLength?: number;
  minFloorRatio?: number;
}

export class DrunkardWalkGenerator {
  private config: Required<DrunkardWalkConfig>;

  constructor(config: DrunkardWalkConfig) {
    this.config = {
      width: config.width,
      height: config.height,
      startPosition: config.startPosition || {
        x: Math.floor(config.width / 2),
        y: Math.floor(config.height / 2),
      },
      walkLength: config.walkLength || Math.floor(config.width * config.height * 0.4),
      minFloorRatio: config.minFloorRatio || 0.25,
    };
  }

  generate(): MapData {
    const tiles = MapUtils.createEmptyMap(this.config.width, this.config.height, TileType.WALL);
    const floorTiles = new Set<string>();
    
    let currentPos = { ...this.config.startPosition };
    floorTiles.add(`${currentPos.x},${currentPos.y}`);
    tiles[currentPos.y][currentPos.x] = {
      type: TileType.FLOOR,
      passable: true,
      visible: false,
      explored: false,
    };

    const directions = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
    ];

    let steps = 0;
    let lastDir = directions[Math.floor(Math.random() * directions.length)];

    while (steps < this.config.walkLength || floorTiles.size < this.config.width * this.config.height * this.config.minFloorRatio) {
      const useLastDir = Math.random() < 0.5;
      const dir = useLastDir ? lastDir : directions[Math.floor(Math.random() * directions.length)];
      lastDir = dir;

      const newX = currentPos.x + dir.dx;
      const newY = currentPos.y + dir.dy;

      if (MapUtils.isInBounds(newX, newY, this.config.width, this.config.height)) {
        currentPos = { x: newX, y: newY };
        const key = `${currentPos.x},${currentPos.y}`;
        
        if (!floorTiles.has(key)) {
          floorTiles.add(key);
          tiles[currentPos.y][currentPos.x] = {
            type: TileType.FLOOR,
            passable: true,
            visible: false,
            explored: false,
          };
        }
      }

      steps++;
      
      if (steps > this.config.walkLength * 5) {
        break;
      }
    }

    const rooms = this.detectRooms(tiles);
    this.addStairs(tiles, rooms);

    return {
      width: this.config.width,
      height: this.config.height,
      tiles,
      rooms,
    };
  }

  private detectRooms(tiles: Tile[][]): Room[] {
    const rooms: Room[] = [];
    const visited = new Set<string>();

    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const key = `${x},${y}`;
        if (!visited.has(key) && tiles[y][x].type === TileType.FLOOR) {
          const roomTiles = this.floodFill(x, y, tiles, visited);
          if (roomTiles.length >= 4) {
            const room = this.createRoomFromTiles(roomTiles);
            rooms.push(room);
          }
        }
      }
    }

    return rooms;
  }

  private floodFill(
    startX: number,
    startY: number,
    tiles: Tile[][],
    visited: Set<string>
  ): Position[] {
    const queue: Position[] = [{ x: startX, y: startY }];
    const roomTiles: Position[] = [];
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const current = queue.shift()!;
      roomTiles.push(current);

      const neighbors = MapUtils.getNeighbors(
        current.x,
        current.y,
        this.config.width,
        this.config.height
      );

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key) && tiles[neighbor.y][neighbor.x].type === TileType.FLOOR) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    return roomTiles;
  }

  private createRoomFromTiles(tiles: Position[]): Room {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0;

    for (const tile of tiles) {
      minX = Math.min(minX, tile.x);
      maxX = Math.max(maxX, tile.x);
      minY = Math.min(minY, tile.y);
      maxY = Math.max(maxY, tile.y);
      sumX += tile.x;
      sumY += tile.y;
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    return {
      x: minX,
      y: minY,
      width,
      height,
      center: {
        x: Math.floor(sumX / tiles.length),
        y: Math.floor(sumY / tiles.length),
      },
    };
  }

  private addStairs(tiles: Tile[][], rooms: Room[]): void {
    if (rooms.length < 2) return;

    const floorTiles: Position[] = [];
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (tiles[y][x].type === TileType.FLOOR) {
          floorTiles.push({ x, y });
        }
      }
    }

    if (floorTiles.length > 0) {
      const stairsPos = floorTiles[Math.floor(Math.random() * floorTiles.length)];
      tiles[stairsPos.y][stairsPos.x].type = TileType.STAIRS;
      tiles[stairsPos.y][stairsPos.x].passable = true;
    }
  }
}

import { MapData, TileType, Room, Position } from '../types';
import { MapUtils } from './MapUtils';

export interface CellularAutomataConfig {
  width: number;
  height: number;
  fillProbability?: number;
  smoothIterations?: number;
  deathLimit?: number;
  birthLimit?: number;
  minRoomSize?: number;
}

export class CellularAutomataGenerator {
  private config: Required<CellularAutomataConfig>;

  constructor(config: CellularAutomataConfig) {
    this.config = {
      width: config.width,
      height: config.height,
      fillProbability: config.fillProbability || 0.45,
      smoothIterations: config.smoothIterations || 5,
      deathLimit: config.deathLimit || 3,
      birthLimit: config.birthLimit || 4,
      minRoomSize: config.minRoomSize || 20,
    };
  }

  generate(): MapData {
    let tiles = this.initializeMap();
    
    for (let i = 0; i < this.config.smoothIterations; i++) {
      tiles = this.smoothMap(tiles);
    }

    this.addBorder(tiles);
    
    const mapData = this.convertToMapData(tiles);
    const rooms = this.detectAndConnectRooms(mapData);
    
    this.addStairs(mapData, rooms);

    return {
      width: this.config.width,
      height: this.config.height,
      tiles: mapData.tiles,
      rooms,
    };
  }

  private initializeMap(): TileType[][] {
    const tiles: TileType[][] = [];
    
    for (let y = 0; y < this.config.height; y++) {
      tiles[y] = [];
      for (let x = 0; x < this.config.width; x++) {
        if (x === 0 || x === this.config.width - 1 || y === 0 || y === this.config.height - 1) {
          tiles[y][x] = TileType.WALL;
        } else {
          tiles[y][x] = Math.random() < this.config.fillProbability 
            ? TileType.WALL 
            : TileType.FLOOR;
        }
      }
    }
    
    return tiles;
  }

  private smoothMap(tiles: TileType[][]): TileType[][] {
    const newTiles: TileType[][] = [];
    
    for (let y = 0; y < this.config.height; y++) {
      newTiles[y] = [];
      for (let x = 0; x < this.config.width; x++) {
        const neighbors = MapUtils.countNeighborType(
          x, y, tiles as any, TileType.WALL, 
          this.config.width, this.config.height, true
        );

        if (tiles[y][x] === TileType.WALL) {
          newTiles[y][x] = neighbors >= this.config.deathLimit ? TileType.WALL : TileType.FLOOR;
        } else {
          newTiles[y][x] = neighbors >= this.config.birthLimit ? TileType.WALL : TileType.FLOOR;
        }
      }
    }
    
    return newTiles;
  }

  private addBorder(tiles: TileType[][]): void {
    for (let x = 0; x < this.config.width; x++) {
      tiles[0][x] = TileType.WALL;
      tiles[this.config.height - 1][x] = TileType.WALL;
    }
    for (let y = 0; y < this.config.height; y++) {
      tiles[y][0] = TileType.WALL;
      tiles[y][this.config.width - 1] = TileType.WALL;
    }
  }

  private convertToMapData(tiles: TileType[][]): MapData {
    const mapTiles = MapUtils.createEmptyMap(this.config.width, this.config.height);
    
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        mapTiles[y][x] = {
          type: tiles[y][x],
          passable: tiles[y][x] === TileType.FLOOR || tiles[y][x] === TileType.DOOR,
          visible: false,
          explored: false,
        };
      }
    }

    return {
      width: this.config.width,
      height: this.config.height,
      tiles: mapTiles,
      rooms: [],
    };
  }

  private detectAndConnectRooms(mapData: MapData): Room[] {
    const rooms: Room[] = [];
    const visited = new Set<string>();

    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const key = `${x},${y}`;
        if (!visited.has(key) && mapData.tiles[y][x].passable) {
          const roomTiles = this.floodFill(x, y, mapData, visited);
          
          if (roomTiles.length >= this.config.minRoomSize) {
            const room = this.createRoomFromTiles(roomTiles);
            rooms.push(room);
          } else {
            for (const tile of roomTiles) {
              mapData.tiles[tile.y][tile.x] = {
                type: TileType.WALL,
                passable: false,
                visible: false,
                explored: false,
              };
            }
          }
        }
      }
    }

    if (rooms.length > 1) {
      this.connectRooms(rooms, mapData);
    }

    return rooms;
  }

  private floodFill(
    startX: number,
    startY: number,
    mapData: MapData,
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
        if (!visited.has(key) && mapData.tiles[neighbor.y][neighbor.x].passable) {
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

  private connectRooms(rooms: Room[], mapData: MapData): void {
    const sortedRooms = [...rooms].sort((a, b) => 
      MapUtils.getDistance(a.center, rooms[0].center) - 
      MapUtils.getDistance(b.center, rooms[0].center)
    );

    for (let i = 1; i < sortedRooms.length; i++) {
      const roomA = sortedRooms[i - 1];
      const roomB = sortedRooms[i];
      
      this.createCorridor(roomA.center, roomB.center, mapData);
    }
  }

  private createCorridor(start: Position, end: Position, mapData: MapData): void {
    let current = { ...start };
    
    while (current.x !== end.x) {
      if (current.x < end.x) {
        current.x++;
      } else {
        current.x--;
      }
      
      this.setFloor(current, mapData);
    }
    
    while (current.y !== end.y) {
      if (current.y < end.y) {
        current.y++;
      } else {
        current.y--;
      }
      
      this.setFloor(current, mapData);
    }
  }

  private setFloor(pos: Position, mapData: MapData): void {
    if (MapUtils.isInBounds(pos.x, pos.y, this.config.width, this.config.height)) {
      mapData.tiles[pos.y][pos.x] = {
        type: TileType.FLOOR,
        passable: true,
        visible: false,
        explored: false,
      };
    }
  }

  private addStairs(mapData: MapData, rooms: Room[]): void {
    if (rooms.length < 2) return;

    const lastRoom = rooms[rooms.length - 1];
    mapData.tiles[lastRoom.center.y][lastRoom.center.x] = {
      type: TileType.STAIRS,
      passable: true,
      visible: false,
      explored: false,
    };
  }
}

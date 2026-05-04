import { MapData, TileType, Room, Position, Tile } from '../types';
import { MapUtils } from './MapUtils';

export interface BSPTreeConfig {
  width: number;
  height: number;
  minRoomSize?: number;
  roomSizeVariance?: number;
  splitMode?: 'horizontal' | 'vertical' | 'random';
  minSplitRatio?: number;
  maxSplitRatio?: number;
}

interface BSPNode {
  x: number;
  y: number;
  width: number;
  height: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
  isLeaf: boolean;
}

export class BSPTreeGenerator {
  private config: Required<BSPTreeConfig>;

  constructor(config: BSPTreeConfig) {
    this.config = {
      width: config.width,
      height: config.height,
      minRoomSize: config.minRoomSize || 6,
      roomSizeVariance: config.roomSizeVariance || 0.2,
      splitMode: config.splitMode || 'random',
      minSplitRatio: config.minSplitRatio || 0.4,
      maxSplitRatio: config.maxSplitRatio || 0.6,
    };
  }

  generate(): MapData {
    const tiles = MapUtils.createEmptyMap(this.config.width, this.config.height, TileType.WALL);
    
    const root: BSPNode = {
      x: 1,
      y: 1,
      width: this.config.width - 2,
      height: this.config.height - 2,
      isLeaf: false,
    };

    this.splitNode(root);
    const rooms = this.createRooms(root);
    this.createCorridors(root, tiles);
    this.placeRooms(rooms, tiles);
    this.addStairs(tiles, rooms);

    return {
      width: this.config.width,
      height: this.config.height,
      tiles,
      rooms,
    };
  }

  private splitNode(node: BSPNode): void {
    if (node.width < this.config.minRoomSize * 2 && node.height < this.config.minRoomSize * 2) {
      node.isLeaf = true;
      return;
    }

    let splitHorizontal: boolean;
    
    if (this.config.splitMode === 'horizontal') {
      splitHorizontal = true;
    } else if (this.config.splitMode === 'vertical') {
      splitHorizontal = false;
    } else {
      if (node.width > node.height * 1.25) {
        splitHorizontal = false;
      } else if (node.height > node.width * 1.25) {
        splitHorizontal = true;
      } else {
        splitHorizontal = Math.random() < 0.5;
      }
    }

    if (splitHorizontal) {
      if (node.height < this.config.minRoomSize * 2) {
        node.isLeaf = true;
        return;
      }

      const splitRatio = this.randomBetween(
        this.config.minSplitRatio,
        this.config.maxSplitRatio
      );
      const splitPosition = Math.floor(node.y + node.height * splitRatio);
      const topHeight = splitPosition - node.y;
      const bottomHeight = node.y + node.height - splitPosition;

      if (topHeight < this.config.minRoomSize || bottomHeight < this.config.minRoomSize) {
        node.isLeaf = true;
        return;
      }

      node.left = {
        x: node.x,
        y: node.y,
        width: node.width,
        height: topHeight,
        isLeaf: false,
      };

      node.right = {
        x: node.x,
        y: splitPosition,
        width: node.width,
        height: bottomHeight,
        isLeaf: false,
      };
    } else {
      if (node.width < this.config.minRoomSize * 2) {
        node.isLeaf = true;
        return;
      }

      const splitRatio = this.randomBetween(
        this.config.minSplitRatio,
        this.config.maxSplitRatio
      );
      const splitPosition = Math.floor(node.x + node.width * splitRatio);
      const leftWidth = splitPosition - node.x;
      const rightWidth = node.x + node.width - splitPosition;

      if (leftWidth < this.config.minRoomSize || rightWidth < this.config.minRoomSize) {
        node.isLeaf = true;
        return;
      }

      node.left = {
        x: node.x,
        y: node.y,
        width: leftWidth,
        height: node.height,
        isLeaf: false,
      };

      node.right = {
        x: splitPosition,
        y: node.y,
        width: rightWidth,
        height: node.height,
        isLeaf: false,
      };
    }

    this.splitNode(node.left!);
    this.splitNode(node.right!);
  }

  private createRooms(node: BSPNode): Room[] {
    const rooms: Room[] = [];

    if (node.isLeaf) {
      const roomWidth = Math.floor(
        this.randomBetween(
          this.config.minRoomSize * (1 - this.config.roomSizeVariance),
          Math.min(node.width, this.config.minRoomSize * (1 + this.config.roomSizeVariance))
        )
      );
      const roomHeight = Math.floor(
        this.randomBetween(
          this.config.minRoomSize * (1 - this.config.roomSizeVariance),
          Math.min(node.height, this.config.minRoomSize * (1 + this.config.roomSizeVariance))
        )
      );

      const roomX = node.x + Math.floor(Math.random() * (node.width - roomWidth));
      const roomY = node.y + Math.floor(Math.random() * (node.height - roomHeight));

      const room: Room = {
        x: roomX,
        y: roomY,
        width: roomWidth,
        height: roomHeight,
        center: {
          x: Math.floor(roomX + roomWidth / 2),
          y: Math.floor(roomY + roomHeight / 2),
        },
      };

      node.room = room;
      rooms.push(room);
    } else {
      if (node.left) {
        rooms.push(...this.createRooms(node.left));
      }
      if (node.right) {
        rooms.push(...this.createRooms(node.right));
      }
    }

    return rooms;
  }

  private createCorridors(node: BSPNode, tiles: Tile[][]): void {
    if (node.isLeaf || !node.left || !node.right) return;

    this.createCorridors(node.left, tiles);
    this.createCorridors(node.right, tiles);

    const leftRoom = this.getLeftmostRoom(node.left);
    const rightRoom = this.getLeftmostRoom(node.right);

    if (leftRoom && rightRoom) {
      this.connectRooms(leftRoom, rightRoom, tiles);
    }
  }

  private getLeftmostRoom(node: BSPNode): Room | null {
    if (node.room) return node.room;
    if (node.left) return this.getLeftmostRoom(node.left);
    return null;
  }

  private connectRooms(roomA: Room, roomB: Room, tiles: Tile[][]): void {
    const start = roomA.center;
    const end = roomB.center;

    this.carveHorizontalCorridor(start.x, end.x, start.y, tiles);
    this.carveVerticalCorridor(start.y, end.y, end.x, tiles);
  }

  private carveHorizontalCorridor(x1: number, x2: number, y: number, tiles: Tile[][]): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);

    for (let x = minX; x <= maxX; x++) {
      if (MapUtils.isInBounds(x, y, this.config.width, this.config.height)) {
        tiles[y][x].type = TileType.FLOOR;
        tiles[y][x].passable = true;
      }
    }
  }

  private carveVerticalCorridor(y1: number, y2: number, x: number, tiles: Tile[][]): void {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (let y = minY; y <= maxY; y++) {
      if (MapUtils.isInBounds(x, y, this.config.width, this.config.height)) {
        tiles[y][x].type = TileType.FLOOR;
        tiles[y][x].passable = true;
      }
    }
  }

  private placeRooms(rooms: Room[], tiles: Tile[][]): void {
    for (const room of rooms) {
      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          if (MapUtils.isInBounds(x, y, this.config.width, this.config.height)) {
            tiles[y][x].type = TileType.FLOOR;
            tiles[y][x].passable = true;
          }
        }
      }
    }
  }

  private addStairs(tiles: Tile[][], rooms: Room[]): void {
    if (rooms.length < 2) return;

    const lastRoom = rooms[rooms.length - 1];
    const stairsX = lastRoom.center.x;
    const stairsY = lastRoom.center.y;

    if (MapUtils.isInBounds(stairsX, stairsY, this.config.width, this.config.height)) {
      tiles[stairsY][stairsX].type = TileType.STAIRS;
      tiles[stairsY][stairsX].passable = true;
    }
  }

  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}

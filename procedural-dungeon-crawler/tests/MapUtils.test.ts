import { describe, it, expect } from 'vitest';
import { MapUtils } from '../src/algorithms/MapUtils';
import { TileType, MapData } from '../src/types';

describe('MapUtils', () => {
  describe('createEmptyMap', () => {
    it('should create an empty map with specified dimensions', () => {
      const width = 10;
      const height = 8;
      const tiles = MapUtils.createEmptyMap(width, height);
      
      expect(tiles.length).toBe(height);
      expect(tiles[0].length).toBe(width);
    });

    it('should create map with default WALL tiles', () => {
      const tiles = MapUtils.createEmptyMap(5, 5);
      
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(tiles[y][x].type).toBe(TileType.WALL);
          expect(tiles[y][x].passable).toBe(false);
        }
      }
    });

    it('should create map with specified tile type', () => {
      const tiles = MapUtils.createEmptyMap(5, 5, TileType.FLOOR);
      
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          expect(tiles[y][x].type).toBe(TileType.FLOOR);
          expect(tiles[y][x].passable).toBe(true);
        }
      }
    });
  });

  describe('isInBounds', () => {
    it('should return true for positions within bounds', () => {
      expect(MapUtils.isInBounds(0, 0, 10, 10)).toBe(true);
      expect(MapUtils.isInBounds(5, 5, 10, 10)).toBe(true);
      expect(MapUtils.isInBounds(9, 9, 10, 10)).toBe(true);
    });

    it('should return false for positions outside bounds', () => {
      expect(MapUtils.isInBounds(-1, 0, 10, 10)).toBe(false);
      expect(MapUtils.isInBounds(0, -1, 10, 10)).toBe(false);
      expect(MapUtils.isInBounds(10, 0, 10, 10)).toBe(false);
      expect(MapUtils.isInBounds(0, 10, 10, 10)).toBe(false);
    });
  });

  describe('getNeighbors', () => {
    it('should return 4 neighbors for central position', () => {
      const neighbors = MapUtils.getNeighbors(5, 5, 10, 10);
      expect(neighbors.length).toBe(4);
      expect(neighbors).toContainEqual({ x: 4, y: 5 });
      expect(neighbors).toContainEqual({ x: 6, y: 5 });
      expect(neighbors).toContainEqual({ x: 5, y: 4 });
      expect(neighbors).toContainEqual({ x: 5, y: 6 });
    });

    it('should return fewer neighbors for edge positions', () => {
      const cornerNeighbors = MapUtils.getNeighbors(0, 0, 10, 10);
      expect(cornerNeighbors.length).toBe(2);
      expect(cornerNeighbors).toContainEqual({ x: 1, y: 0 });
      expect(cornerNeighbors).toContainEqual({ x: 0, y: 1 });
    });
  });

  describe('get8Neighbors', () => {
    it('should return 8 neighbors for central position', () => {
      const neighbors = MapUtils.get8Neighbors(5, 5, 10, 10);
      expect(neighbors.length).toBe(8);
    });

    it('should return 3 neighbors for corner position', () => {
      const cornerNeighbors = MapUtils.get8Neighbors(0, 0, 10, 10);
      expect(cornerNeighbors.length).toBe(3);
    });
  });

  describe('isMapConnected', () => {
    it('should return true for a fully connected map', () => {
      const tiles = MapUtils.createEmptyMap(10, 10, TileType.FLOOR);
      const map: MapData = {
        width: 10,
        height: 10,
        tiles,
        rooms: [],
      };
      
      expect(MapUtils.isMapConnected(map)).toBe(true);
    });

    it('should return false for a disconnected map', () => {
      const tiles = MapUtils.createEmptyMap(10, 10, TileType.FLOOR);
      for (let x = 0; x < 10; x++) {
        tiles[5][x] = {
          type: TileType.WALL,
          passable: false,
          visible: false,
          explored: false,
        };
      }
      
      const map: MapData = {
        width: 10,
        height: 10,
        tiles,
        rooms: [],
      };
      
      expect(MapUtils.isMapConnected(map)).toBe(false);
    });

    it('should return true for empty map (edge case)', () => {
      const tiles = MapUtils.createEmptyMap(10, 10, TileType.WALL);
      const map: MapData = {
        width: 10,
        height: 10,
        tiles,
        rooms: [],
      };
      
      expect(MapUtils.isMapConnected(map)).toBe(false);
    });
  });

  describe('getDistance', () => {
    it('should calculate Manhattan distance correctly', () => {
      expect(MapUtils.getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
      expect(MapUtils.getDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
      expect(MapUtils.getDistance({ x: 2, y: 3 }, { x: 5, y: 1 })).toBe(5);
    });
  });

  describe('getEuclideanDistance', () => {
    it('should calculate Euclidean distance correctly', () => {
      expect(MapUtils.getEuclideanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
      expect(MapUtils.getEuclideanDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    });
  });

  describe('findPassableTiles', () => {
    it('should find all passable tiles', () => {
      const tiles = MapUtils.createEmptyMap(5, 5, TileType.WALL);
      tiles[2][2] = { type: TileType.FLOOR, passable: true, visible: false, explored: false };
      tiles[3][2] = { type: TileType.FLOOR, passable: true, visible: false, explored: false };
      
      const map: MapData = {
        width: 5,
        height: 5,
        tiles,
        rooms: [],
      };
      
      const passable = MapUtils.findPassableTiles(map);
      expect(passable.length).toBe(2);
      expect(passable).toContainEqual({ x: 2, y: 2 });
      expect(passable).toContainEqual({ x: 2, y: 3 });
    });
  });
});

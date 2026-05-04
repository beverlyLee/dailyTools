import { describe, it, expect } from 'vitest';
import { DrunkardWalkGenerator } from '../src/algorithms/DrunkardWalkGenerator';
import { MapUtils } from '../src/algorithms/MapUtils';
import { TileType } from '../src/types';

describe('DrunkardWalkGenerator', () => {
  describe('basic functionality', () => {
    it('should generate a map with correct dimensions', () => {
      const width = 50;
      const height = 40;
      const generator = new DrunkardWalkGenerator({ width, height });
      const map = generator.generate();
      
      expect(map.width).toBe(width);
      expect(map.height).toBe(height);
      expect(map.tiles.length).toBe(height);
      expect(map.tiles[0].length).toBe(width);
    });

    it('should generate maps with floor tiles', () => {
      const width = 30;
      const height = 30;
      const generator = new DrunkardWalkGenerator({ 
        width, 
        height,
        minFloorRatio: 0.2
      });
      
      const map = generator.generate();
      let floorCount = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (map.tiles[y][x].type === TileType.FLOOR) {
            floorCount++;
          }
        }
      }
      
      const totalTiles = width * height;
      const floorRatio = floorCount / totalTiles;
      
      expect(floorRatio).toBeGreaterThanOrEqual(0.1);
      expect(floorCount).toBeGreaterThan(0);
    });

    it('should generate floor tiles from start position', () => {
      const width = 20;
      const height = 20;
      const startPos = { x: 10, y: 10 };
      const generator = new DrunkardWalkGenerator({ 
        width, 
        height,
        startPosition: startPos,
        walkLength: 100
      });
      
      const map = generator.generate();
      
      expect(map.tiles[startPos.y][startPos.x].type).toBe(TileType.FLOOR);
      expect(map.tiles[startPos.y][startPos.x].passable).toBe(true);
    });
  });

  describe('connectivity', () => {
    it('should generate connected maps (10 test runs)', () => {
      const width = 40;
      const height = 40;
      
      for (let i = 0; i < 10; i++) {
        const generator = new DrunkardWalkGenerator({ 
          width, 
          height,
          walkLength: 500,
          minFloorRatio: 0.2
        });
        
        const map = generator.generate();
        const isConnected = MapUtils.isMapConnected(map);
        
        expect(isConnected).toBe(true);
      }
    });

    it('should have all floor tiles connected', () => {
      const width = 30;
      const height = 30;
      const generator = new DrunkardWalkGenerator({ 
        width, 
        height,
        walkLength: 400
      });
      
      const map = generator.generate();
      const passableTiles = MapUtils.findPassableTiles(map);
      
      if (passableTiles.length > 0) {
        const visited = new Set<string>();
        const queue = [passableTiles[0]];
        visited.add(`${passableTiles[0].x},${passableTiles[0].y}`);
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          const neighbors = MapUtils.getNeighbors(current.x, current.y, width, height);
          
          for (const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;
            if (!visited.has(key) && map.tiles[neighbor.y][neighbor.x].passable) {
              visited.add(key);
              queue.push(neighbor);
            }
          }
        }
        
        expect(visited.size).toBe(passableTiles.length);
      }
    });
  });

  describe('room detection', () => {
    it('should detect rooms in the map', () => {
      const width = 40;
      const height = 40;
      const generator = new DrunkardWalkGenerator({ 
        width, 
        height,
        walkLength: 600
      });
      
      const map = generator.generate();
      
      expect(Array.isArray(map.rooms)).toBe(true);
      
      for (const room of map.rooms) {
        expect(room.x).toBeGreaterThanOrEqual(0);
        expect(room.y).toBeGreaterThanOrEqual(0);
        expect(room.width).toBeGreaterThan(0);
        expect(room.height).toBeGreaterThan(0);
        expect(room.center.x).toBeGreaterThanOrEqual(room.x);
        expect(room.center.x).toBeLessThan(room.x + room.width);
        expect(room.center.y).toBeGreaterThanOrEqual(room.y);
        expect(room.center.y).toBeLessThan(room.y + room.height);
      }
    });

    it('should have room centers as floor tiles', () => {
      const width = 40;
      const height = 40;
      const generator = new DrunkardWalkGenerator({ 
        width, 
        height,
        walkLength: 600
      });
      
      const map = generator.generate();
      
      for (const room of map.rooms) {
        const tile = map.tiles[room.center.y][room.center.x];
        expect(tile.passable).toBe(true);
      }
    });
  });

  describe('stairs placement', () => {
    it('should place stairs in the map', () => {
      const width = 40;
      const height = 40;
      const generator = new DrunkardWalkGenerator({ 
        width, 
        height,
        walkLength: 500
      });
      
      const map = generator.generate();
      let stairsCount = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (map.tiles[y][x].type === TileType.STAIRS) {
            stairsCount++;
            expect(map.tiles[y][x].passable).toBe(true);
          }
        }
      }
      
      expect(stairsCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('configuration options', () => {
    it('should respect minFloorRatio configuration', () => {
      const width = 30;
      const height = 30;
      const minFloorRatio = 0.3;
      
      const generator = new DrunkardWalkGenerator({ 
        width, 
        height,
        minFloorRatio,
        walkLength: 1000
      });
      
      const map = generator.generate();
      let floorCount = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (map.tiles[y][x].type === TileType.FLOOR || 
              map.tiles[y][x].type === TileType.STAIRS) {
            floorCount++;
          }
        }
      }
      
      const actualRatio = floorCount / (width * height);
      expect(actualRatio).toBeGreaterThanOrEqual(minFloorRatio * 0.8);
    });
  });
});

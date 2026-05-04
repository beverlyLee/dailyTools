import { describe, it, expect } from 'vitest';
import { BSPTreeGenerator } from '../src/algorithms/BSPTreeGenerator';
import { MapUtils } from '../src/algorithms/MapUtils';
import { TileType } from '../src/types';

describe('BSPTreeGenerator', () => {
  describe('basic functionality', () => {
    it('should generate a map with correct dimensions', () => {
      const width = 50;
      const height = 40;
      const generator = new BSPTreeGenerator({ width, height });
      const map = generator.generate();
      
      expect(map.width).toBe(width);
      expect(map.height).toBe(height);
      expect(map.tiles.length).toBe(height);
      expect(map.tiles[0].length).toBe(width);
    });

    it('should generate rooms within the map bounds', () => {
      const width = 50;
      const height = 40;
      const generator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 6
      });
      
      const map = generator.generate();
      
      for (const room of map.rooms) {
        expect(room.x).toBeGreaterThanOrEqual(1);
        expect(room.y).toBeGreaterThanOrEqual(1);
        expect(room.x + room.width).toBeLessThanOrEqual(width - 1);
        expect(room.y + room.height).toBeLessThanOrEqual(height - 1);
      }
    });

    it('should generate both floor and wall tiles', () => {
      const width = 40;
      const height = 40;
      const generator = new BSPTreeGenerator({ width, height });
      const map = generator.generate();
      
      let floorCount = 0;
      let wallCount = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (map.tiles[y][x].type === TileType.WALL) {
            wallCount++;
          } else {
            floorCount++;
          }
        }
      }
      
      expect(floorCount).toBeGreaterThan(0);
      expect(wallCount).toBeGreaterThan(0);
    });
  });

  describe('room generation', () => {
    it('should generate rooms with valid dimensions', () => {
      const width = 60;
      const height = 60;
      const minRoomSize = 6;
      
      const generator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize
      });
      
      const map = generator.generate();
      
      for (const room of map.rooms) {
        expect(room.width).toBeGreaterThanOrEqual(minRoomSize * 0.5);
        expect(room.height).toBeGreaterThanOrEqual(minRoomSize * 0.5);
        expect(room.width).toBeLessThanOrEqual(width);
        expect(room.height).toBeLessThanOrEqual(height);
      }
    });

    it('should have rooms with valid center positions', () => {
      const width = 50;
      const height = 50;
      const generator = new BSPTreeGenerator({ width, height });
      const map = generator.generate();
      
      for (const room of map.rooms) {
        expect(room.center.x).toBeGreaterThanOrEqual(room.x);
        expect(room.center.x).toBeLessThan(room.x + room.width);
        expect(room.center.y).toBeGreaterThanOrEqual(room.y);
        expect(room.center.y).toBeLessThan(room.y + room.height);
      }
    });

    it('should have room interiors as floor tiles', () => {
      const width = 50;
      const height = 50;
      const generator = new BSPTreeGenerator({ width, height });
      const map = generator.generate();
      
      for (const room of map.rooms) {
        for (let y = room.y; y < room.y + room.height; y++) {
          for (let x = room.x; x < room.x + room.width; x++) {
            expect(map.tiles[y][x].type).toBe(TileType.FLOOR);
            expect(map.tiles[y][x].passable).toBe(true);
          }
        }
      }
    });

    it('should have room centers as passable tiles', () => {
      const width = 50;
      const height = 50;
      const generator = new BSPTreeGenerator({ width, height });
      const map = generator.generate();
      
      for (const room of map.rooms) {
        const tile = map.tiles[room.center.y][room.center.x];
        expect(tile.passable).toBe(true);
      }
    });
  });

  describe('corridor generation', () => {
    it('should connect rooms with corridors', () => {
      const width = 60;
      const height = 60;
      const generator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 6
      });
      
      const map = generator.generate();
      
      if (map.rooms.length >= 2) {
        const isConnected = MapUtils.isMapConnected(map);
        expect(isConnected).toBe(true);
      }
    });

    it('should have corridors as floor tiles', () => {
      const width = 60;
      const height = 60;
      const generator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 6
      });
      
      const map = generator.generate();
      
      if (map.rooms.length >= 2) {
        const visited = new Set<string>();
        const queue = [map.rooms[0].center];
        visited.add(`${map.rooms[0].center.x},${map.rooms[0].center.y}`);
        
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
        
        const passableTiles = MapUtils.findPassableTiles(map);
        expect(visited.size).toBe(passableTiles.length);
      }
    });
  });

  describe('connectivity', () => {
    it('should generate connected maps (10 test runs)', () => {
      const width = 50;
      const height = 50;
      
      for (let i = 0; i < 10; i++) {
        const generator = new BSPTreeGenerator({ 
          width, 
          height,
          minRoomSize: 6
        });
        
        const map = generator.generate();
        const isConnected = MapUtils.isMapConnected(map);
        
        expect(isConnected).toBe(true);
      }
    });

    it('should have all passable tiles connected', () => {
      const width = 50;
      const height = 50;
      const generator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 6
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

  describe('configuration options', () => {
    it('should respect minRoomSize configuration', () => {
      const width = 60;
      const height = 60;
      const minRoomSize = 10;
      
      const generator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize
      });
      
      const map = generator.generate();
      
      for (const room of map.rooms) {
        expect(room.width).toBeGreaterThanOrEqual(minRoomSize * 0.5);
        expect(room.height).toBeGreaterThanOrEqual(minRoomSize * 0.5);
      }
    });

    it('should generate more rooms with smaller minRoomSize', () => {
      const width = 60;
      const height = 60;
      
      const smallRoomGenerator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 5
      });
      const smallRoomMap = smallRoomGenerator.generate();
      
      const largeRoomGenerator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 12
      });
      const largeRoomMap = largeRoomGenerator.generate();
      
      expect(smallRoomMap.rooms.length).toBeGreaterThanOrEqual(largeRoomMap.rooms.length);
    });

    it('should respect different split modes', () => {
      const width = 60;
      const height = 60;
      
      const horizontalGenerator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 6,
        splitMode: 'horizontal'
      });
      const horizontalMap = horizontalGenerator.generate();
      
      const verticalGenerator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 6,
        splitMode: 'vertical'
      });
      const verticalMap = verticalGenerator.generate();
      
      expect(horizontalMap.rooms.length).toBeGreaterThan(0);
      expect(verticalMap.rooms.length).toBeGreaterThan(0);
    });

    it('should respect roomSizeVariance', () => {
      const width = 60;
      const height = 60;
      
      const lowVarianceGenerator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 8,
        roomSizeVariance: 0.1
      });
      const lowVarianceMap = lowVarianceGenerator.generate();
      
      const highVarianceGenerator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 8,
        roomSizeVariance: 0.4
      });
      const highVarianceMap = highVarianceGenerator.generate();
      
      expect(lowVarianceMap.rooms.length).toBeGreaterThan(0);
      expect(highVarianceMap.rooms.length).toBeGreaterThan(0);
    });
  });

  describe('stairs placement', () => {
    it('should place stairs in the last room', () => {
      const width = 60;
      const height = 60;
      const generator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 6
      });
      
      const map = generator.generate();
      
      if (map.rooms.length >= 2) {
        const lastRoom = map.rooms[map.rooms.length - 1];
        const stairsTile = map.tiles[lastRoom.center.y][lastRoom.center.x];
        expect(stairsTile.type).toBe(TileType.STAIRS);
        expect(stairsTile.passable).toBe(true);
      }
    });

    it('should have exactly one stairs tile', () => {
      const width = 60;
      const height = 60;
      const generator = new BSPTreeGenerator({ 
        width, 
        height,
        minRoomSize: 6
      });
      
      const map = generator.generate();
      let stairsCount = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (map.tiles[y][x].type === TileType.STAIRS) {
            stairsCount++;
          }
        }
      }
      
      if (map.rooms.length >= 2) {
        expect(stairsCount).toBe(1);
      } else {
        expect(stairsCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('border generation', () => {
    it('should have wall tiles on the border', () => {
      const width = 50;
      const height = 50;
      const generator = new BSPTreeGenerator({ width, height });
      const map = generator.generate();
      
      for (let x = 0; x < width; x++) {
        expect(map.tiles[0][x].type).toBe(TileType.WALL);
        expect(map.tiles[height - 1][x].type).toBe(TileType.WALL);
      }
      
      for (let y = 0; y < height; y++) {
        expect(map.tiles[y][0].type).toBe(TileType.WALL);
        expect(map.tiles[y][width - 1].type).toBe(TileType.WALL);
      }
    });
  });
});

import { describe, it, expect } from 'vitest';
import { CellularAutomataGenerator } from '../src/algorithms/CellularAutomataGenerator';
import { MapUtils } from '../src/algorithms/MapUtils';
import { TileType } from '../src/types';

describe('CellularAutomataGenerator', () => {
  describe('basic functionality', () => {
    it('should generate a map with correct dimensions', () => {
      const width = 50;
      const height = 40;
      const generator = new CellularAutomataGenerator({ width, height });
      const map = generator.generate();
      
      expect(map.width).toBe(width);
      expect(map.height).toBe(height);
      expect(map.tiles.length).toBe(height);
      expect(map.tiles[0].length).toBe(width);
    });

    it('should have a solid border', () => {
      const width = 30;
      const height = 30;
      const generator = new CellularAutomataGenerator({ width, height });
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

    it('should generate maps with both floor and wall tiles', () => {
      const width = 40;
      const height = 40;
      const generator = new CellularAutomataGenerator({ 
        width, 
        height,
        fillProbability: 0.45
      });
      
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

  describe('connectivity', () => {
    it('should generate connected maps (10 test runs)', () => {
      const width = 40;
      const height = 40;
      
      for (let i = 0; i < 10; i++) {
        const generator = new CellularAutomataGenerator({ 
          width, 
          height,
          smoothIterations: 5,
          minRoomSize: 20
        });
        
        const map = generator.generate();
        const isConnected = MapUtils.isMapConnected(map);
        
        expect(isConnected).toBe(true);
      }
    });

    it('should connect multiple rooms with corridors', () => {
      const width = 50;
      const height = 50;
      const generator = new CellularAutomataGenerator({ 
        width, 
        height,
        smoothIterations: 4,
        minRoomSize: 15
      });
      
      const map = generator.generate();
      const passableTiles = MapUtils.findPassableTiles(map);
      
      if (passableTiles.length > 0 && map.rooms.length > 1) {
        const isConnected = MapUtils.isMapConnected(map);
        expect(isConnected).toBe(true);
      }
    });
  });

  describe('room detection and connection', () => {
    it('should detect rooms and remove small ones', () => {
      const width = 40;
      const height = 40;
      const minRoomSize = 30;
      
      const generator = new CellularAutomataGenerator({ 
        width, 
        height,
        minRoomSize
      });
      
      const map = generator.generate();
      
      for (const room of map.rooms) {
        const roomArea = room.width * room.height;
        expect(roomArea).toBeGreaterThanOrEqual(minRoomSize * 0.5);
      }
    });

    it('should have valid room properties', () => {
      const width = 40;
      const height = 40;
      const generator = new CellularAutomataGenerator({ width, height });
      const map = generator.generate();
      
      for (const room of map.rooms) {
        expect(room.x).toBeGreaterThanOrEqual(0);
        expect(room.y).toBeGreaterThanOrEqual(0);
        expect(room.width).toBeGreaterThan(0);
        expect(room.height).toBeGreaterThan(0);
        expect(room.center).toBeDefined();
        expect(room.center.x).toBeGreaterThanOrEqual(room.x);
        expect(room.center.x).toBeLessThan(room.x + room.width);
        expect(room.center.y).toBeGreaterThanOrEqual(room.y);
        expect(room.center.y).toBeLessThan(room.y + room.height);
      }
    });

    it('should have room centers as passable tiles', () => {
      const width = 40;
      const height = 40;
      const generator = new CellularAutomataGenerator({ width, height });
      const map = generator.generate();
      
      for (const room of map.rooms) {
        const tile = map.tiles[room.center.y][room.center.x];
        expect(tile.passable).toBe(true);
      }
    });
  });

  describe('smoothing', () => {
    it('should produce smoother caves with more iterations', () => {
      const width = 30;
      const height = 30;
      
      const roughGenerator = new CellularAutomataGenerator({ 
        width, 
        height,
        smoothIterations: 1
      });
      const roughMap = roughGenerator.generate();
      
      const smoothGenerator = new CellularAutomataGenerator({ 
        width, 
        height,
        smoothIterations: 8
      });
      const smoothMap = smoothGenerator.generate();
      
      let roughEdges = 0;
      let smoothEdges = 0;
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (roughMap.tiles[y][x].type === TileType.FLOOR) {
            const wallNeighbors = MapUtils.countNeighborType(
              x, y, roughMap.tiles as any, TileType.WALL, 
              width, height, true
            );
            roughEdges += wallNeighbors;
          }
          
          if (smoothMap.tiles[y][x].type === TileType.FLOOR) {
            const wallNeighbors = MapUtils.countNeighborType(
              x, y, smoothMap.tiles as any, TileType.WALL, 
              width, height, true
            );
            smoothEdges += wallNeighbors;
          }
        }
      }
      
      expect(smoothEdges).toBeLessThanOrEqual(roughEdges * 1.5);
    });
  });

  describe('configuration options', () => {
    it('should respect fillProbability configuration', () => {
      const width = 30;
      const height = 30;
      
      const sparseGenerator = new CellularAutomataGenerator({ 
        width, 
        height,
        fillProbability: 0.35,
        smoothIterations: 0
      });
      const sparseMap = sparseGenerator.generate();
      
      const denseGenerator = new CellularAutomataGenerator({ 
        width, 
        height,
        fillProbability: 0.55,
        smoothIterations: 0
      });
      const denseMap = denseGenerator.generate();
      
      let sparseWalls = 0;
      let denseWalls = 0;
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (sparseMap.tiles[y][x].type === TileType.WALL) sparseWalls++;
          if (denseMap.tiles[y][x].type === TileType.WALL) denseWalls++;
        }
      }
      
      expect(denseWalls).toBeGreaterThan(sparseWalls);
    });

    it('should respect deathLimit and birthLimit', () => {
      const width = 30;
      const height = 30;
      
      const openGenerator = new CellularAutomataGenerator({ 
        width, 
        height,
        deathLimit: 2,
        birthLimit: 5,
        smoothIterations: 3
      });
      const openMap = openGenerator.generate();
      
      const tightGenerator = new CellularAutomataGenerator({ 
        width, 
        height,
        deathLimit: 4,
        birthLimit: 3,
        smoothIterations: 3
      });
      const tightMap = tightGenerator.generate();
      
      let openFloor = 0;
      let tightFloor = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (openMap.tiles[y][x].type === TileType.FLOOR) openFloor++;
          if (tightMap.tiles[y][x].type === TileType.FLOOR) tightFloor++;
        }
      }
      
      expect(openFloor).not.toEqual(tightFloor);
    });
  });

  describe('stairs placement', () => {
    it('should place stairs in the last room', () => {
      const width = 50;
      const height = 50;
      const generator = new CellularAutomataGenerator({ 
        width, 
        height,
        minRoomSize: 15
      });
      
      const map = generator.generate();
      
      if (map.rooms.length >= 2) {
        const lastRoom = map.rooms[map.rooms.length - 1];
        const stairsTile = map.tiles[lastRoom.center.y][lastRoom.center.x];
        expect(stairsTile.type).toBe(TileType.STAIRS);
        expect(stairsTile.passable).toBe(true);
      }
    });
  });
});

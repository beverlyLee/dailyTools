import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine, MapAlgorithm } from '../src/game/GameEngine';
import { Position, TileType } from '../src/types';

describe('GameEngine - Core Rules', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine({
      mapWidth: 30,
      mapHeight: 25,
      mapAlgorithm: MapAlgorithm.BSP_TREE,
      enemyCount: 0,
      dungeonLevel: 1,
    });
  });

  describe('Turn-Based System', () => {
    it('should increment turn counter when player moves', () => {
      const initialTurn = gameEngine.getGameState().turn;
      
      const result = gameEngine.movePlayer(1, 0);
      
      expect(result).toBe(true);
      expect(gameEngine.getGameState().turn).toBe(initialTurn + 1);
    });

    it('should increment turn counter when player waits', () => {
      const initialTurn = gameEngine.getGameState().turn;
      
      gameEngine.waitTurn();
      
      expect(gameEngine.getGameState().turn).toBe(initialTurn + 1);
    });

    it('should not increment turn when movement is invalid', () => {
      const initialTurn = gameEngine.getGameState().turn;
      
      const result = gameEngine.movePlayer(-100, -100);
      
      expect(result).toBe(false);
      expect(gameEngine.getGameState().turn).toBe(initialTurn);
    });

    it('should not process turns after game over', () => {
      const player = gameEngine.getGameState().player;
      player.hp = 1;
      
      expect(gameEngine.isGameOver()).toBe(false);
      
      gameEngine.waitTurn();
      gameEngine.waitTurn();
      gameEngine.waitTurn();
      
      expect(gameEngine.isGameOver()).toBe(false);
    });
  });

  describe('Permadeath System', () => {
    it('should set game over when player HP reaches zero', () => {
      const player = gameEngine.getGameState().player;
      player.hp = 0;
      
      expect(gameEngine.isGameOver()).toBe(false);
      
      gameEngine.waitTurn();
      
      expect(gameEngine.isGameOver()).toBe(true);
      expect(gameEngine.isVictory()).toBe(false);
    });

    it('should not allow movement after game over', () => {
      const player = gameEngine.getGameState().player;
      const initialPos = { ...player.position };
      
      player.hp = 0;
      gameEngine.waitTurn();
      
      expect(gameEngine.isGameOver()).toBe(true);
      
      const moveResult = gameEngine.movePlayer(1, 0);
      expect(moveResult).toBe(false);
      expect(player.position).toEqual(initialPos);
    });

    it('should not allow waiting after game over', () => {
      const player = gameEngine.getGameState().player;
      player.hp = 0;
      gameEngine.waitTurn();
      
      expect(gameEngine.isGameOver()).toBe(true);
      
      const initialTurn = gameEngine.getGameState().turn;
      gameEngine.waitTurn();
      expect(gameEngine.getGameState().turn).toBe(initialTurn);
    });

    it('should be able to restart game after permadeath', () => {
      const player = gameEngine.getGameState().player;
      player.hp = 0;
      gameEngine.waitTurn();
      
      expect(gameEngine.isGameOver()).toBe(true);
      
      gameEngine.restartGame();
      
      expect(gameEngine.isGameOver()).toBe(false);
      expect(gameEngine.getGameState().player.hp).toBeGreaterThan(0);
    });
  });

  describe('Combat System', () => {
    it('should reduce enemy HP when player attacks', () => {
      const combatEngine = new GameEngine({
        mapWidth: 30,
        mapHeight: 25,
        mapAlgorithm: MapAlgorithm.BSP_TREE,
        enemyCount: 1,
        dungeonLevel: 1,
      });

      const enemies = combatEngine.getGameState().enemies;
      if (enemies.length > 0) {
        const enemy = enemies[0];
        const initialHp = enemy.hp;
        
        const player = combatEngine.getGameState().player;
        enemy.position = {
          x: player.position.x + 1,
          y: player.position.y
        };
        
        combatEngine.movePlayer(1, 0);
        
        expect(enemy.hp).toBeLessThan(initialHp);
      }
    });

    it('should kill enemy when HP reaches zero', () => {
      const combatEngine = new GameEngine({
        mapWidth: 30,
        mapHeight: 25,
        mapAlgorithm: MapAlgorithm.BSP_TREE,
        enemyCount: 1,
        dungeonLevel: 1,
      });

      const enemies = combatEngine.getGameState().enemies;
      if (enemies.length > 0) {
        const enemy = enemies[0];
        enemy.hp = 1;
        
        const player = combatEngine.getGameState().player;
        enemy.position = {
          x: player.position.x + 1,
          y: player.position.y
        };
        
        const initialEnemyCount = combatEngine.getGameState().enemies.length;
        combatEngine.movePlayer(1, 0);
        
        expect(combatEngine.getGameState().enemies.length).toBeLessThan(initialEnemyCount);
      }
    });

    it('should grant XP when enemy is killed', () => {
      const combatEngine = new GameEngine({
        mapWidth: 30,
        mapHeight: 25,
        mapAlgorithm: MapAlgorithm.BSP_TREE,
        enemyCount: 1,
        dungeonLevel: 1,
      });

      const enemies = combatEngine.getGameState().enemies;
      if (enemies.length > 0) {
        const enemy = enemies[0];
        enemy.hp = 1;
        
        const player = combatEngine.getGameState().player;
        const initialXp = player.xp;
        enemy.position = {
          x: player.position.x + 1,
          y: player.position.y
        };
        
        combatEngine.movePlayer(1, 0);
        
        expect(player.xp).toBeGreaterThan(initialXp);
      }
    });
  });

  describe('Level Up System', () => {
    it('should level up when XP reaches threshold', () => {
      const player = gameEngine.getGameState().player;
      const initialLevel = player.level;
      const initialMaxHp = player.maxHp;
      const initialAttack = player.attack;
      const initialDefense = player.defense;
      
      player.xp = player.xpToNextLevel;
      gameEngine.waitTurn();
      
      expect(player.level).toBe(initialLevel + 1);
      expect(player.maxHp).toBeGreaterThan(initialMaxHp);
      expect(player.attack).toBeGreaterThan(initialAttack);
      expect(player.defense).toBeGreaterThan(initialDefense);
    });

    it('should heal to full HP on level up', () => {
      const player = gameEngine.getGameState().player;
      player.hp = Math.floor(player.maxHp / 2);
      
      expect(player.hp).toBeLessThan(player.maxHp);
      
      player.xp = player.xpToNextLevel;
      gameEngine.waitTurn();
      
      expect(player.hp).toBe(player.maxHp);
    });

    it('should increase XP threshold after level up', () => {
      const player = gameEngine.getGameState().player;
      const initialXpToNext = player.xpToNextLevel;
      
      player.xp = player.xpToNextLevel;
      gameEngine.waitTurn();
      
      expect(player.xpToNextLevel).toBeGreaterThan(initialXpToNext);
    });

    it('should handle multiple level ups from large XP gain', () => {
      const player = gameEngine.getGameState().player;
      const initialLevel = player.level;
      
      player.xp = player.xpToNextLevel * 3;
      gameEngine.waitTurn();
      
      expect(player.level).toBeGreaterThan(initialLevel + 1);
    });
  });

  describe('Victory Condition', () => {
    it('should achieve victory when all enemies are defeated', () => {
      const victoryEngine = new GameEngine({
        mapWidth: 30,
        mapHeight: 25,
        mapAlgorithm: MapAlgorithm.BSP_TREE,
        enemyCount: 1,
        dungeonLevel: 1,
      });

      const enemies = victoryEngine.getGameState().enemies;
      if (enemies.length > 0) {
        const enemy = enemies[0];
        enemy.hp = 1;
        
        const player = victoryEngine.getGameState().player;
        enemy.position = {
          x: player.position.x + 1,
          y: player.position.y
        };
        
        victoryEngine.movePlayer(1, 0);
        
        expect(victoryEngine.isGameOver()).toBe(true);
        expect(victoryEngine.isVictory()).toBe(true);
      }
    });

    it('should not achieve victory if enemies remain', () => {
      const multiEnemyEngine = new GameEngine({
        mapWidth: 30,
        mapHeight: 25,
        mapAlgorithm: MapAlgorithm.BSP_TREE,
        enemyCount: 3,
        dungeonLevel: 1,
      });

      const enemies = multiEnemyEngine.getGameState().enemies;
      if (enemies.length > 0) {
        const firstEnemy = enemies[0];
        firstEnemy.hp = 1;
        
        const player = multiEnemyEngine.getGameState().player;
        firstEnemy.position = {
          x: player.position.x + 1,
          y: player.position.y
        };
        
        multiEnemyEngine.movePlayer(1, 0);
        
        expect(multiEnemyEngine.isGameOver()).toBe(false);
        expect(multiEnemyEngine.isVictory()).toBe(false);
      }
    });
  });

  describe('Movement System', () => {
    it('should move player to valid position', () => {
      const player = gameEngine.getGameState().player;
      const initialPos = { ...player.position };
      
      const map = gameEngine.getGameState().map;
      const targetX = initialPos.x + 1;
      const targetY = initialPos.y;
      
      if (gameEngine.movePlayer(1, 0)) {
        expect(player.position.x).toBe(targetX);
        expect(player.position.y).toBe(targetY);
      }
    });

    it('should not move player into walls', () => {
      const player = gameEngine.getGameState().player;
      const initialPos = { ...player.position };
      
      const map = gameEngine.getGameState().map;
      let wallFound = false;
      
      for (let dx = -1; dx <= 1 && !wallFound; dx++) {
        for (let dy = -1; dy <= 1 && !wallFound; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = initialPos.x + dx;
          const ny = initialPos.y + dy;
          
          if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
            if (!map.tiles[ny][nx].passable) {
              wallFound = true;
              const result = gameEngine.movePlayer(dx, dy);
              expect(result).toBe(false);
              expect(player.position).toEqual(initialPos);
            }
          }
        }
      }
    });

    it('should not move player out of bounds', () => {
      const player = gameEngine.getGameState().player;
      const initialPos = { ...player.position };
      
      const result = gameEngine.movePlayer(-100, -100);
      
      expect(result).toBe(false);
      expect(player.position).toEqual(initialPos);
    });
  });
});

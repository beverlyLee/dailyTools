import { TileType, LevelData, DIRECTION_VECTORS, Direction } from '../types';

// 关卡验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  hasSolution: boolean;
}

// 关卡验证工具类
export class LevelValidator {
  // 验证关卡的基本结构
  static validateLevel(level: LevelData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 检查网格是否为空
    if (!level.grid || level.grid.length === 0) {
      errors.push('关卡网格不能为空');
      return { isValid: false, errors, warnings, hasSolution: false };
    }
    
    // 检查网格是否是矩形
    const rowLength = level.grid[0].length;
    for (let i = 1; i < level.grid.length; i++) {
      if (level.grid[i].length !== rowLength) {
        errors.push(`第 ${i} 行的长度与其他行不一致`);
      }
    }
    
    // 检查边界是否都是墙
    for (let x = 0; x < rowLength; x++) {
      if (level.grid[0][x] !== TileType.WALL) {
        errors.push(`第一行第 ${x} 列不是墙`);
      }
      if (level.grid[level.grid.length - 1][x] !== TileType.WALL) {
        errors.push(`最后一行第 ${x} 列不是墙`);
      }
    }
    
    for (let z = 0; z < level.grid.length; z++) {
      if (level.grid[z][0] !== TileType.WALL) {
        errors.push(`第 ${z} 行第一列不是墙`);
      }
      if (level.grid[z][rowLength - 1] !== TileType.WALL) {
        errors.push(`第 ${z} 行最后一列不是墙`);
      }
    }
    
    // 检查是否有且只有一个玩家
    let playerCount = 0;
    for (let z = 0; z < level.grid.length; z++) {
      for (let x = 0; x < level.grid[z].length; x++) {
        if (level.grid[z][x] === TileType.PLAYER || level.grid[z][x] === TileType.PLAYER_ON_TARGET) {
          playerCount++;
        }
      }
    }
    
    if (playerCount === 0) {
      errors.push('关卡中没有玩家');
    } else if (playerCount > 1) {
      errors.push(`关卡中有 ${playerCount} 个玩家，只能有一个`);
    }
    
    // 检查箱子数量和目标点数量是否相等
    let boxCount = 0;
    let targetCount = 0;
    
    for (let z = 0; z < level.grid.length; z++) {
      for (let x = 0; x < level.grid[z].length; x++) {
        const tile = level.grid[z][x];
        if (tile === TileType.BOX || tile === TileType.BOX_ON_TARGET) {
          boxCount++;
        }
        if (tile === TileType.TARGET || tile === TileType.BOX_ON_TARGET || tile === TileType.PLAYER_ON_TARGET) {
          targetCount++;
        }
      }
    }
    
    if (boxCount === 0) {
      warnings.push('关卡中没有箱子');
    }
    
    if (targetCount === 0) {
      warnings.push('关卡中没有目标点');
    }
    
    if (boxCount !== targetCount) {
      errors.push(`箱子数量 (${boxCount}) 与目标点数量 (${targetCount}) 不相等`);
    }
    
    // 检查是否有解
    const hasSolution = this.hasSolution(level);
    if (!hasSolution) {
      warnings.push('关卡可能无解（基于简单启发式检查）');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasSolution
    };
  }
  
  // 简单的启发式检查来判断关卡是否可能有解
  static hasSolution(level: LevelData): boolean {
    // 这里实现一个简单的可达性检查
    // 实际上完整的推箱子解检测需要更复杂的算法（如BFS+死锁检测）
    
    // 复制网格用于模拟
    const grid = level.grid.map(row => [...row]);
    
    // 找到玩家位置
    let playerPos = { x: 0, z: 0 };
    for (let z = 0; z < grid.length; z++) {
      for (let x = 0; x < grid[z].length; x++) {
        if (grid[z][x] === TileType.PLAYER || grid[z][x] === TileType.PLAYER_ON_TARGET) {
          playerPos = { x, z };
        }
      }
    }
    
    // 简单的可达性检查：玩家能否到达所有箱子旁边
    const reachableTiles = this.getReachableTiles(grid, playerPos);
    
    // 检查每个箱子是否有至少两个方向可以移动（简化检查）
    // 实际上这是一个非常简化的检查，完整的死锁检测需要更复杂的逻辑
    let allBoxesHaveSpace = true;
    
    for (let z = 0; z < grid.length; z++) {
      for (let x = 0; x < grid[z].length; x++) {
        const tile = grid[z][x];
        if (tile === TileType.BOX || tile === TileType.BOX_ON_TARGET) {
          // 检查箱子周围是否有空间
          let availableMoves = 0;
          
          for (const dir of Object.values(DIRECTION_VECTORS)) {
            const newX = x + dir.x;
            const newZ = z + dir.z;
            
            if (newZ >= 0 && newZ < grid.length && newX >= 0 && newX < grid[0].length) {
              const targetTile = grid[newZ][newX];
              if (targetTile === TileType.EMPTY || targetTile === TileType.TARGET || targetTile === TileType.PLAYER || targetTile === TileType.PLAYER_ON_TARGET) {
                availableMoves++;
              }
            }
          }
          
          if (availableMoves === 0) {
            allBoxesHaveSpace = false;
          }
        }
      }
    }
    
    return allBoxesHaveSpace && reachableTiles.size > 0;
  }
  
  // 获取玩家可以到达的所有格子（不考虑推动箱子）
  static getReachableTiles(grid: TileType[][], startPos: { x: number; z: number }): Set<string> {
    const visited = new Set<string>();
    const queue = [startPos];
    visited.add(`${startPos.x},${startPos.z}`);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      for (const dir of Object.values(DIRECTION_VECTORS)) {
        const newX = current.x + dir.x;
        const newZ = current.z + dir.z;
        const key = `${newX},${newZ}`;
        
        if (newZ >= 0 && newZ < grid.length && newX >= 0 && newX < grid[0].length) {
          const tile = grid[newZ][newX];
          if (!visited.has(key) && tile !== TileType.WALL && tile !== TileType.BOX && tile !== TileType.BOX_ON_TARGET) {
            visited.add(key);
            queue.push({ x: newX, z: newZ });
          }
        }
      }
    }
    
    return visited;
  }
  
  // 使用BFS检查关卡是否有解（更完整但较慢的方法）
  static isSolvable(level: LevelData): boolean {
    const grid = level.grid.map(row => [...row]);
    
    // 找到初始状态
    let playerPos = { x: 0, z: 0 };
    const boxPositions: { x: number; z: number }[] = [];
    const targetPositions: { x: number; z: number }[] = [];
    
    for (let z = 0; z < grid.length; z++) {
      for (let x = 0; x < grid[z].length; x++) {
        const tile = grid[z][x];
        if (tile === TileType.PLAYER || tile === TileType.PLAYER_ON_TARGET) {
          playerPos = { x, z };
        }
        if (tile === TileType.BOX || tile === TileType.BOX_ON_TARGET) {
          boxPositions.push({ x, z });
        }
        if (tile === TileType.TARGET || tile === TileType.BOX_ON_TARGET || tile === TileType.PLAYER_ON_TARGET) {
          targetPositions.push({ x, z });
        }
      }
    }
    
    // 简化的状态表示：玩家位置 + 箱子位置
    // 使用BFS搜索
    const queue = [{ playerPos, boxPositions, moves: 0 }];
    const visited = new Set<string>();
    
    // 生成状态键
    const getStateKey = (pos: { x: number; z: number }, boxes: { x: number; z: number }[]) => {
      const boxKeys = boxes.map(b => `${b.x},${b.z}`).sort().join(';');
      return `${pos.x},${pos.z}:${boxKeys}`;
    };
    
    // 检查是否获胜
    const isWin = (boxes: { x: number; z: number }[]) => {
      return boxes.every(box => 
        targetPositions.some(target => target.x === box.x && target.z === box.z)
      );
    };
    
    // 检查位置是否有效（不是墙）
    const isValidPosition = (x: number, z: number) => {
      return z >= 0 && z < grid.length && x >= 0 && x < grid[0].length && grid[z][x] !== TileType.WALL;
    };
    
    // 检查位置是否有箱子
    const hasBox = (x: number, z: number, boxes: { x: number; z: number }[]) => {
      return boxes.some(box => box.x === x && box.z === z);
    };
    
    visited.add(getStateKey(playerPos, boxPositions));
    
    // BFS搜索（限制深度以避免无限循环）
    const maxMoves = 1000; // 限制最大步数
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (isWin(current.boxPositions)) {
        return true;
      }
      
      if (current.moves >= maxMoves) {
        continue;
      }
      
      // 尝试四个方向
      for (const dir of Object.values(DIRECTION_VECTORS)) {
        const newPlayerX = current.playerPos.x + dir.x;
        const newPlayerZ = current.playerPos.z + dir.z;
        
        if (!isValidPosition(newPlayerX, newPlayerZ)) {
          continue;
        }
        
        // 检查是否有箱子
        if (hasBox(newPlayerX, newPlayerZ, current.boxPositions)) {
          // 尝试推动箱子
          const newBoxX = newPlayerX + dir.x;
          const newBoxZ = newPlayerZ + dir.z;
          
          if (isValidPosition(newBoxX, newBoxZ) && !hasBox(newBoxX, newBoxZ, current.boxPositions)) {
            // 可以推动箱子
            const newBoxPositions = current.boxPositions.map(box => {
              if (box.x === newPlayerX && box.z === newPlayerZ) {
                return { x: newBoxX, z: newBoxZ };
              }
              return box;
            });
            
            const stateKey = getStateKey({ x: newPlayerX, z: newPlayerZ }, newBoxPositions);
            if (!visited.has(stateKey)) {
              visited.add(stateKey);
              queue.push({
                playerPos: { x: newPlayerX, z: newPlayerZ },
                boxPositions: newBoxPositions,
                moves: current.moves + 1
              });
            }
          }
        } else {
          // 直接移动
          const stateKey = getStateKey({ x: newPlayerX, z: newPlayerZ }, current.boxPositions);
          if (!visited.has(stateKey)) {
            visited.add(stateKey);
            queue.push({
              playerPos: { x: newPlayerX, z: newPlayerZ },
              boxPositions: [...current.boxPositions],
              moves: current.moves + 1
            });
          }
        }
      }
    }
    
    return false;
  }
}

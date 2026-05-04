import { TileType, Direction, DIRECTION_VECTORS, GameState, LevelData, MoveCommandData } from '../types';
import { levels } from '../levels';
import { LevelValidator } from '../utils/LevelValidator';
import { SceneManager } from './SceneManager';
import { CommandManager, MoveCommand } from './CommandManager';

// LocalStorage键名
const STORAGE_KEY = '3d-sokoban-save';

export class GameEngine {
  private sceneManager: SceneManager;
  private commandManager: CommandManager;
  
  // 游戏状态
  private grid: TileType[][] = [];
  private playerPos: { x: number; z: number } = { x: 0, z: 0 };
  private boxPositions: { x: number; z: number }[] = [];
  private targetPositions: { x: number; z: number }[] = [];
  private moveCount: number = 0;
  private currentLevel: number = 0;
  private isGameWon: boolean = false;
  
  // 回调函数
  private onMoveCallback?: () => void;
  private onWinCallback?: () => void;
  private onLevelChangeCallback?: () => void;
  
  constructor(container: HTMLElement) {
    this.sceneManager = new SceneManager(container);
    this.commandManager = new CommandManager(100);
    
    // 绑定命令的执行和撤销回调
    this.setupCommandCallbacks();
  }
  
  private setupCommandCallbacks(): void {
    // 这些回调将在命令创建时绑定
  }
  
  // 初始化关卡
  public loadLevel(levelIndex: number): void {
    if (levelIndex < 0 || levelIndex >= levels.length) {
      console.error('Invalid level index');
      return;
    }
    
    const level = levels[levelIndex];
    
    // 验证关卡
    const validation = LevelValidator.validateLevel(level);
    if (!validation.isValid) {
      console.error('Level validation failed:', validation.errors);
      return;
    }
    
    // 重置游戏状态
    this.currentLevel = levelIndex;
    this.moveCount = 0;
    this.isGameWon = false;
    this.commandManager.clear();
    
    // 复制网格
    this.grid = level.grid.map(row => [...row]);
    
    // 解析网格，找到玩家、箱子、目标点位置
    this.parseGrid();
    
    // 更新3D场景
    this.sceneManager.updateTheme(level.theme);
    this.sceneManager.createLevel(this.grid);
    
    // 更新箱子颜色（如果在目标点上）
    this.updateBoxColors();
    
    // 触发回调
    if (this.onLevelChangeCallback) {
      this.onLevelChangeCallback();
    }
  }
  
  private parseGrid(): void {
    this.playerPos = { x: 0, z: 0 };
    this.boxPositions = [];
    this.targetPositions = [];
    
    for (let z = 0; z < this.grid.length; z++) {
      for (let x = 0; x < this.grid[z].length; x++) {
        const tile = this.grid[z][x];
        
        if (tile === TileType.PLAYER || tile === TileType.PLAYER_ON_TARGET) {
          this.playerPos = { x, z };
        }
        
        if (tile === TileType.BOX || tile === TileType.BOX_ON_TARGET) {
          this.boxPositions.push({ x, z });
        }
        
        if (tile === TileType.TARGET || tile === TileType.BOX_ON_TARGET || tile === TileType.PLAYER_ON_TARGET) {
          this.targetPositions.push({ x, z });
        }
      }
    }
  }
  
  // 移动玩家
  public move(direction: Direction): boolean {
    if (this.isGameWon) return false;
    
    const dirVector = DIRECTION_VECTORS[direction];
    const newPlayerX = this.playerPos.x + dirVector.x;
    const newPlayerZ = this.playerPos.z + dirVector.z;
    
    // 检查目标位置是否有效
    if (!this.isValidPosition(newPlayerX, newPlayerZ)) {
      return false;
    }
    
    // 检查是否有箱子
    const boxAtNewPos = this.getBoxAt(newPlayerX, newPlayerZ);
    
    if (boxAtNewPos) {
      // 尝试推动箱子
      const newBoxX = newPlayerX + dirVector.x;
      const newBoxZ = newPlayerZ + dirVector.z;
      
      // 检查箱子的目标位置是否有效且没有其他箱子
      if (!this.isValidPosition(newBoxX, newBoxZ) || this.getBoxAt(newBoxX, newBoxZ)) {
        return false;
      }
      
      // 创建移动命令（推动箱子）
      const commandData: MoveCommandData = {
        direction,
        playerPos: { ...this.playerPos },
        boxPos: { x: newPlayerX, z: newPlayerZ },
        pushedBox: true
      };
      
      const command = new MoveCommand(
        commandData,
        (data) => this.executeMoveWithBox(data),
        (data) => this.undoMoveWithBox(data)
      );
      
      this.commandManager.executeCommand(command);
      
      return true;
    } else {
      // 直接移动（不推动箱子）
      const commandData: MoveCommandData = {
        direction,
        playerPos: { ...this.playerPos },
        pushedBox: false
      };
      
      const command = new MoveCommand(
        commandData,
        (data) => this.executeMoveWithoutBox(data),
        (data) => this.undoMoveWithoutBox(data)
      );
      
      this.commandManager.executeCommand(command);
      
      return true;
    }
  }
  
  // 检查位置是否有效（不是墙）
  private isValidPosition(x: number, z: number): boolean {
    if (z < 0 || z >= this.grid.length || x < 0 || x >= this.grid[0].length) {
      return false;
    }
    return this.grid[z][x] !== TileType.WALL;
  }
  
  // 获取指定位置的箱子
  private getBoxAt(x: number, z: number): { x: number; z: number } | undefined {
    return this.boxPositions.find(box => box.x === x && box.z === z);
  }
  
  // 检查位置是否是目标点
  private isTarget(x: number, z: number): boolean {
    return this.targetPositions.some(target => target.x === x && target.z === z);
  }
  
  // 执行移动（不推动箱子）
  private executeMoveWithoutBox(data: MoveCommandData): void {
    const dirVector = DIRECTION_VECTORS[data.direction];
    const newX = this.playerPos.x + dirVector.x;
    const newZ = this.playerPos.z + dirVector.z;
    
    // 更新网格
    const oldTile = this.grid[this.playerPos.z][this.playerPos.x];
    const newTile = this.grid[newZ][newX];
    
    if (oldTile === TileType.PLAYER_ON_TARGET) {
      this.grid[this.playerPos.z][this.playerPos.x] = TileType.TARGET;
    } else {
      this.grid[this.playerPos.z][this.playerPos.x] = TileType.EMPTY;
    }
    
    if (newTile === TileType.TARGET) {
      this.grid[newZ][newX] = TileType.PLAYER_ON_TARGET;
    } else {
      this.grid[newZ][newX] = TileType.PLAYER;
    }
    
    // 更新位置
    this.playerPos = { x: newX, z: newZ };
    this.moveCount++;
    
    // 更新3D场景
    this.sceneManager.movePlayer(newX, newZ);
    
    // 触发回调
    if (this.onMoveCallback) {
      this.onMoveCallback();
    }
  }
  
  // 撤销移动（不推动箱子）
  private undoMoveWithoutBox(data: MoveCommandData): void {
    // 恢复到之前的位置
    const oldX = data.playerPos.x;
    const oldZ = data.playerPos.z;
    
    // 更新网格
    const oldTile = this.grid[this.playerPos.z][this.playerPos.x];
    const newTile = this.grid[oldZ][oldX];
    
    if (oldTile === TileType.PLAYER_ON_TARGET) {
      this.grid[this.playerPos.z][this.playerPos.x] = TileType.TARGET;
    } else {
      this.grid[this.playerPos.z][this.playerPos.x] = TileType.EMPTY;
    }
    
    if (newTile === TileType.TARGET) {
      this.grid[oldZ][oldX] = TileType.PLAYER_ON_TARGET;
    } else {
      this.grid[oldZ][oldX] = TileType.PLAYER;
    }
    
    // 更新位置
    this.playerPos = { x: oldX, z: oldZ };
    this.moveCount--;
    
    // 更新3D场景
    this.sceneManager.movePlayer(oldX, oldZ, false);
    
    // 触发回调
    if (this.onMoveCallback) {
      this.onMoveCallback();
    }
  }
  
  // 执行移动（推动箱子）
  private executeMoveWithBox(data: MoveCommandData): void {
    if (!data.boxPos) return;
    
    const dirVector = DIRECTION_VECTORS[data.direction];
    const newPlayerX = data.boxPos.x;
    const newPlayerZ = data.boxPos.z;
    const newBoxX = newPlayerX + dirVector.x;
    const newBoxZ = newPlayerZ + dirVector.z;
    
    // 更新箱子位置
    const boxIndex = this.boxPositions.findIndex(box => box.x === data.boxPos!.x && box.z === data.boxPos!.z);
    if (boxIndex !== -1) {
      this.boxPositions[boxIndex] = { x: newBoxX, z: newBoxZ };
    }
    
    // 更新网格
    // 玩家原位置
    const playerOldTile = this.grid[this.playerPos.z][this.playerPos.x];
    if (playerOldTile === TileType.PLAYER_ON_TARGET) {
      this.grid[this.playerPos.z][this.playerPos.x] = TileType.TARGET;
    } else {
      this.grid[this.playerPos.z][this.playerPos.x] = TileType.EMPTY;
    }
    
    // 箱子原位置（现在玩家的新位置）
    const boxOldTile = this.grid[newPlayerZ][newPlayerX];
    if (boxOldTile === TileType.BOX_ON_TARGET) {
      this.grid[newPlayerZ][newPlayerX] = TileType.PLAYER_ON_TARGET;
    } else {
      this.grid[newPlayerZ][newPlayerX] = TileType.PLAYER;
    }
    
    // 箱子新位置
    const boxNewTile = this.grid[newBoxZ][newBoxX];
    if (boxNewTile === TileType.TARGET) {
      this.grid[newBoxZ][newBoxX] = TileType.BOX_ON_TARGET;
    } else {
      this.grid[newBoxZ][newBoxX] = TileType.BOX;
    }
    
    // 更新玩家位置
    this.playerPos = { x: newPlayerX, z: newPlayerZ };
    this.moveCount++;
    
    // 更新3D场景
    this.sceneManager.movePlayer(newPlayerX, newPlayerZ);
    this.sceneManager.moveBox(data.boxPos.x, data.boxPos.z, newBoxX, newBoxZ);
    
    // 更新箱子颜色
    this.updateBoxColors();
    
    // 检查是否获胜
    this.checkWin();
    
    // 触发回调
    if (this.onMoveCallback) {
      this.onMoveCallback();
    }
  }
  
  // 撤销移动（推动箱子）
  private undoMoveWithBox(data: MoveCommandData): void {
    if (!data.boxPos) return;
    
    const dirVector = DIRECTION_VECTORS[data.direction];
    const newPlayerX = data.playerPos.x + dirVector.x;
    const newPlayerZ = data.playerPos.z + dirVector.z;
    const newBoxX = newPlayerX + dirVector.x;
    const newBoxZ = newPlayerZ + dirVector.z;
    
    // 更新箱子位置
    const boxIndex = this.boxPositions.findIndex(box => box.x === newBoxX && box.z === newBoxZ);
    if (boxIndex !== -1) {
      this.boxPositions[boxIndex] = { x: newPlayerX, z: newPlayerZ };
    }
    
    // 更新网格
    // 箱子新位置（恢复）
    const boxNewTile = this.grid[newBoxZ][newBoxX];
    if (boxNewTile === TileType.BOX_ON_TARGET) {
      this.grid[newBoxZ][newBoxX] = TileType.TARGET;
    } else {
      this.grid[newBoxZ][newBoxX] = TileType.EMPTY;
    }
    
    // 玩家新位置（现在是箱子位置）
    const playerNewTile = this.grid[newPlayerZ][newPlayerX];
    if (playerNewTile === TileType.PLAYER_ON_TARGET) {
      this.grid[newPlayerZ][newPlayerX] = TileType.BOX_ON_TARGET;
    } else {
      this.grid[newPlayerZ][newPlayerX] = TileType.BOX;
    }
    
    // 玩家原位置
    const playerOldTile = this.grid[data.playerPos.z][data.playerPos.x];
    if (playerOldTile === TileType.TARGET) {
      this.grid[data.playerPos.z][data.playerPos.x] = TileType.PLAYER_ON_TARGET;
    } else {
      this.grid[data.playerPos.z][data.playerPos.x] = TileType.PLAYER;
    }
    
    // 更新玩家位置
    this.playerPos = { x: data.playerPos.x, z: data.playerPos.z };
    this.moveCount--;
    
    // 更新3D场景
    this.sceneManager.movePlayer(data.playerPos.x, data.playerPos.z, false);
    this.sceneManager.moveBox(newBoxX, newBoxZ, newPlayerX, newPlayerZ);
    
    // 更新箱子颜色
    this.updateBoxColors();
    
    // 取消获胜状态
    this.isGameWon = false;
    
    // 触发回调
    if (this.onMoveCallback) {
      this.onMoveCallback();
    }
  }
  
  // 更新箱子颜色
  private updateBoxColors(): void {
    for (const box of this.boxPositions) {
      const isOnTarget = this.isTarget(box.x, box.z);
      this.sceneManager.setBoxOnTarget(box.x, box.z, isOnTarget);
    }
  }
  
  // 检查是否获胜
  private checkWin(): void {
    const allBoxesOnTarget = this.boxPositions.every(box => 
      this.isTarget(box.x, box.z)
    );
    
    if (allBoxesOnTarget && !this.isGameWon) {
      this.isGameWon = true;
      if (this.onWinCallback) {
        this.onWinCallback();
      }
    }
  }
  
  // 撤销
  public undo(): boolean {
    if (this.commandManager.canUndo()) {
      const result = this.commandManager.undo();
      if (result) {
        this.isGameWon = false;
      }
      return result;
    }
    return false;
  }
  
  // 重做
  public redo(): boolean {
    if (this.commandManager.canRedo()) {
      const result = this.commandManager.redo();
      if (result) {
        this.checkWin();
      }
      return result;
    }
    return false;
  }
  
  // 重置关卡
  public resetLevel(): void {
    this.loadLevel(this.currentLevel);
  }
  
  // 下一关
  public nextLevel(): void {
    if (this.currentLevel < levels.length - 1) {
      this.loadLevel(this.currentLevel + 1);
    }
  }
  
  // 保存游戏状态到LocalStorage
  public saveGame(): void {
    const gameState: GameState = {
      grid: this.grid.map(row => [...row]),
      playerPos: { ...this.playerPos },
      boxPositions: this.boxPositions.map(box => ({ ...box })),
      moveCount: this.moveCount,
      currentLevel: this.currentLevel
    };
    
    const saveData = {
      gameState,
      commandHistory: this.commandManager.serialize()
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      console.log('Game saved successfully');
    } catch (e) {
      console.error('Failed to save game:', e);
    }
  }
  
  // 从LocalStorage加载游戏状态
  public loadGame(): boolean {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) {
        console.log('No saved game found');
        return false;
      }
      
      const data = JSON.parse(savedData);
      const gameState: GameState = data.gameState;
      
      // 先加载关卡
      this.loadLevel(gameState.currentLevel);
      
      // 恢复游戏状态
      this.grid = gameState.grid.map(row => [...row]);
      this.playerPos = { ...gameState.playerPos };
      this.boxPositions = gameState.boxPositions.map(box => ({ ...box }));
      this.moveCount = gameState.moveCount;
      
      // 重新解析目标点位置
      this.targetPositions = [];
      for (let z = 0; z < this.grid.length; z++) {
        for (let x = 0; x < this.grid[z].length; x++) {
          const tile = this.grid[z][x];
          if (tile === TileType.TARGET || tile === TileType.BOX_ON_TARGET || tile === TileType.PLAYER_ON_TARGET) {
            this.targetPositions.push({ x, z });
          }
        }
      }
      
      // 重新创建3D场景
      const level = levels[this.currentLevel];
      this.sceneManager.updateTheme(level.theme);
      this.sceneManager.createLevel(this.grid);
      
      // 更新箱子位置（因为save可能移动了）
      for (const box of this.boxPositions) {
        // 检查箱子是否在目标点上
        const isOnTarget = this.isTarget(box.x, box.z);
        this.sceneManager.setBoxOnTarget(box.x, box.z, isOnTarget);
      }
      
      // 恢复命令历史
      if (data.commandHistory) {
        this.commandManager.deserialize(
          data.commandHistory,
          (cmdData: MoveCommandData) => {
            if (cmdData.pushedBox) {
              return new MoveCommand(
                cmdData,
                (data) => this.executeMoveWithBox(data),
                (data) => this.undoMoveWithBox(data)
              );
            } else {
              return new MoveCommand(
                cmdData,
                (data) => this.executeMoveWithoutBox(data),
                (data) => this.undoMoveWithoutBox(data)
              );
            }
          }
        );
      }
      
      // 检查是否获胜
      this.checkWin();
      
      // 触发回调
      if (this.onLevelChangeCallback) {
        this.onLevelChangeCallback();
      }
      
      console.log('Game loaded successfully');
      return true;
    } catch (e) {
      console.error('Failed to load game:', e);
      return false;
    }
  }
  
  // 渲染
  public render(): void {
    this.sceneManager.render();
  }
  
  // 设置回调
  public setOnMoveCallback(callback: () => void): void {
    this.onMoveCallback = callback;
  }
  
  public setOnWinCallback(callback: () => void): void {
    this.onWinCallback = callback;
  }
  
  public setOnLevelChangeCallback(callback: () => void): void {
    this.onLevelChangeCallback = callback;
  }
  
  // 获取游戏状态
  public getMoveCount(): number {
    return this.moveCount;
  }
  
  public getCurrentLevel(): number {
    return this.currentLevel;
  }
  
  public getBoxesOnTargetCount(): number {
    return this.boxPositions.filter(box => this.isTarget(box.x, box.z)).length;
  }
  
  public getTotalBoxes(): number {
    return this.boxPositions.length;
  }
  
  public getIsGameWon(): boolean {
    return this.isGameWon;
  }
  
  public canUndo(): boolean {
    return this.commandManager.canUndo();
  }
  
  public canRedo(): boolean {
    return this.commandManager.canRedo();
  }
  
  // 销毁
  public dispose(): void {
    this.sceneManager.dispose();
  }
}

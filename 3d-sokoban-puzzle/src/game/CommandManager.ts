import { Command, MoveCommandData, Direction, DIRECTION_VECTORS } from '../types';

// 移动命令实现
export class MoveCommand implements Command {
  private data: MoveCommandData;
  private executeCallback: (data: MoveCommandData) => void;
  private undoCallback: (data: MoveCommandData) => void;
  
  constructor(
    data: MoveCommandData,
    executeCallback: (data: MoveCommandData) => void,
    undoCallback: (data: MoveCommandData) => void
  ) {
    this.data = { ...data };
    this.executeCallback = executeCallback;
    this.undoCallback = undoCallback;
  }
  
  execute(): void {
    this.executeCallback(this.data);
  }
  
  undo(): void {
    this.undoCallback(this.data);
  }
  
  redo(): void {
    this.execute();
  }
  
  // 获取命令数据（用于序列化）
  getData(): MoveCommandData {
    return {
      direction: this.data.direction,
      playerPos: { ...this.data.playerPos },
      boxPos: this.data.boxPos ? { ...this.data.boxPos } : undefined,
      pushedBox: this.data.pushedBox
    };
  }
}

// 命令管理器
export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize: number = 100; // 最大历史记录数
  
  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }
  
  // 执行并记录命令
  executeCommand(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    
    // 清空重做栈
    this.redoStack = [];
    
    // 限制历史记录大小
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }
  
  // 撤销
  undo(): boolean {
    if (this.canUndo()) {
      const command = this.undoStack.pop()!;
      command.undo();
      this.redoStack.push(command);
      return true;
    }
    return false;
  }
  
  // 重做
  redo(): boolean {
    if (this.canRedo()) {
      const command = this.redoStack.pop()!;
      command.redo();
      this.undoStack.push(command);
      return true;
    }
    return false;
  }
  
  // 检查是否可以撤销
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  // 检查是否可以重做
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  // 获取撤销栈大小
  getUndoCount(): number {
    return this.undoStack.length;
  }
  
  // 获取重做栈大小
  getRedoCount(): number {
    return this.redoStack.length;
  }
  
  // 清空历史记录
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
  
  // 序列化历史记录（用于保存到LocalStorage）
  serialize(): string {
    // 只序列化移动命令的数据
    const undoData = this.undoStack.map(cmd => {
      if (cmd instanceof MoveCommand) {
        return cmd.getData();
      }
      return null;
    }).filter(Boolean);
    
    const redoData = this.redoStack.map(cmd => {
      if (cmd instanceof MoveCommand) {
        return cmd.getData();
      }
      return null;
    }).filter(Boolean);
    
    return JSON.stringify({
      undoStack: undoData,
      redoStack: redoData
    });
  }
  
  // 反序列化历史记录（从LocalStorage恢复）
  deserialize(
    json: string,
    createMoveCommand: (data: MoveCommandData) => MoveCommand
  ): void {
    try {
      const data = JSON.parse(json);
      
      this.undoStack = (data.undoStack || []).map((cmdData: MoveCommandData) => 
        createMoveCommand(cmdData)
      );
      
      this.redoStack = (data.redoStack || []).map((cmdData: MoveCommandData) => 
        createMoveCommand(cmdData)
      );
      
      // 限制大小
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack = this.undoStack.slice(-this.maxHistorySize);
      }
    } catch (e) {
      console.error('Failed to deserialize command history:', e);
      this.clear();
    }
  }
}

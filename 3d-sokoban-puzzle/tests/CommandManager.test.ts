import { CommandManager, MoveCommand } from '../src/game/CommandManager';
import { MoveCommandData, Direction } from '../src/types';

// 模拟命令
class MockCommand {
  private executed: boolean = false;
  private executeCount: number = 0;
  private undoCount: number = 0;
  
  execute(): void {
    this.executed = true;
    this.executeCount++;
  }
  
  undo(): void {
    this.executed = false;
    this.undoCount++;
  }
  
  redo(): void {
    this.execute();
  }
  
  isExecuted(): boolean {
    return this.executed;
  }
  
  getExecuteCount(): number {
    return this.executeCount;
  }
  
  getUndoCount(): number {
    return this.undoCount;
  }
}

describe('CommandManager', () => {
  let commandManager: CommandManager;
  
  beforeEach(() => {
    commandManager = new CommandManager(10);
  });
  
  describe('executeCommand', () => {
    it('should execute and store command', () => {
      const command = new MockCommand();
      commandManager.executeCommand(command as any);
      
      expect(command.isExecuted()).toBe(true);
      expect(commandManager.canUndo()).toBe(true);
      expect(commandManager.getUndoCount()).toBe(1);
    });
    
    it('should clear redo stack after new command', () => {
      // 执行一个命令并撤销
      const command1 = new MockCommand();
      commandManager.executeCommand(command1 as any);
      commandManager.undo();
      
      expect(commandManager.canRedo()).toBe(true);
      expect(commandManager.getRedoCount()).toBe(1);
      
      // 执行新命令
      const command2 = new MockCommand();
      commandManager.executeCommand(command2 as any);
      
      expect(commandManager.canRedo()).toBe(false);
      expect(commandManager.getRedoCount()).toBe(0);
    });
    
    it('should limit history size', () => {
      const smallManager = new CommandManager(3);
      
      for (let i = 0; i < 5; i++) {
        const command = new MockCommand();
        smallManager.executeCommand(command as any);
      }
      
      // 应该只有最后3个命令
      expect(smallManager.getUndoCount()).toBe(3);
    });
  });
  
  describe('undo', () => {
    it('should undo last command', () => {
      const command = new MockCommand();
      commandManager.executeCommand(command as any);
      
      expect(commandManager.undo()).toBe(true);
      expect(command.isExecuted()).toBe(false);
      expect(command.getUndoCount()).toBe(1);
    });
    
    it('should move command to redo stack', () => {
      const command = new MockCommand();
      commandManager.executeCommand(command as any);
      
      expect(commandManager.canUndo()).toBe(true);
      expect(commandManager.canRedo()).toBe(false);
      
      commandManager.undo();
      
      expect(commandManager.canUndo()).toBe(false);
      expect(commandManager.canRedo()).toBe(true);
    });
    
    it('should return false when nothing to undo', () => {
      expect(commandManager.undo()).toBe(false);
    });
  });
  
  describe('redo', () => {
    it('should redo last undone command', () => {
      const command = new MockCommand();
      commandManager.executeCommand(command as any);
      commandManager.undo();
      
      expect(commandManager.redo()).toBe(true);
      expect(command.isExecuted()).toBe(true);
      expect(command.getExecuteCount()).toBe(2);
    });
    
    it('should move command back to undo stack', () => {
      const command = new MockCommand();
      commandManager.executeCommand(command as any);
      commandManager.undo();
      
      expect(commandManager.canUndo()).toBe(false);
      expect(commandManager.canRedo()).toBe(true);
      
      commandManager.redo();
      
      expect(commandManager.canUndo()).toBe(true);
      expect(commandManager.canRedo()).toBe(false);
    });
    
    it('should return false when nothing to redo', () => {
      expect(commandManager.redo()).toBe(false);
    });
  });
  
  describe('clear', () => {
    it('should clear all history', () => {
      const command1 = new MockCommand();
      const command2 = new MockCommand();
      
      commandManager.executeCommand(command1 as any);
      commandManager.executeCommand(command2 as any);
      commandManager.undo();
      
      expect(commandManager.getUndoCount()).toBe(1);
      expect(commandManager.getRedoCount()).toBe(1);
      
      commandManager.clear();
      
      expect(commandManager.getUndoCount()).toBe(0);
      expect(commandManager.getRedoCount()).toBe(0);
      expect(commandManager.canUndo()).toBe(false);
      expect(commandManager.canRedo()).toBe(false);
    });
  });
  
  describe('MoveCommand', () => {
    it('should execute with correct callback', () => {
      let executed = false;
      let undone = false;
      
      const data: MoveCommandData = {
        direction: Direction.RIGHT,
        playerPos: { x: 1, z: 1 },
        pushedBox: false
      };
      
      const command = new MoveCommand(
        data,
        () => { executed = true; },
        () => { undone = true; }
      );
      
      command.execute();
      expect(executed).toBe(true);
      expect(undone).toBe(false);
    });
    
    it('should undo with correct callback', () => {
      let executed = false;
      let undone = false;
      
      const data: MoveCommandData = {
        direction: Direction.RIGHT,
        playerPos: { x: 1, z: 1 },
        pushedBox: false
      };
      
      const command = new MoveCommand(
        data,
        () => { executed = true; },
        () => { undone = true; }
      );
      
      command.undo();
      expect(executed).toBe(false);
      expect(undone).toBe(true);
    });
    
    it('should return copy of data', () => {
      const data: MoveCommandData = {
        direction: Direction.RIGHT,
        playerPos: { x: 1, z: 1 },
        pushedBox: false
      };
      
      const command = new MoveCommand(
        data,
        () => {},
        () => {}
      );
      
      const returnedData = command.getData();
      
      // 应该是深拷贝
      expect(returnedData).not.toBe(data);
      expect(returnedData.playerPos).not.toBe(data.playerPos);
      expect(returnedData.direction).toBe(data.direction);
      expect(returnedData.playerPos.x).toBe(data.playerPos.x);
    });
  });
  
  describe('serialization', () => {
    it('should serialize empty history', () => {
      const json = commandManager.serialize();
      const data = JSON.parse(json);
      
      expect(data.undoStack).toBeDefined();
      expect(data.redoStack).toBeDefined();
      expect(data.undoStack).toHaveLength(0);
      expect(data.redoStack).toHaveLength(0);
    });
    
    it('should deserialize and restore history', () => {
      const createCommand = (data: MoveCommandData) => {
        return new MoveCommand(
          data,
          () => {},
          () => {}
        );
      };
      
      const testData = {
        undoStack: [
          {
            direction: Direction.RIGHT,
            playerPos: { x: 1, z: 1 },
            pushedBox: false
          },
          {
            direction: Direction.UP,
            playerPos: { x: 2, z: 1 },
            boxPos: { x: 2, z: 0 },
            pushedBox: true
          }
        ],
        redoStack: [
          {
            direction: Direction.LEFT,
            playerPos: { x: 3, z: 1 },
            pushedBox: false
          }
        ]
      };
      
      commandManager.deserialize(JSON.stringify(testData), createCommand);
      
      expect(commandManager.getUndoCount()).toBe(2);
      expect(commandManager.getRedoCount()).toBe(1);
    });
    
    it('should handle invalid JSON gracefully', () => {
      const createCommand = (data: MoveCommandData) => {
        return new MoveCommand(
          data,
          () => {},
          () => {}
        );
      };
      
      // 不应该抛出异常
      expect(() => {
        commandManager.deserialize('invalid json', createCommand);
      }).not.toThrow();
      
      expect(commandManager.getUndoCount()).toBe(0);
    });
  });
});

import { SAVE_CONFIG } from '../config';

class SaveManager {
  constructor() {
    this.localStorageKey = SAVE_CONFIG.localStorageKey;
    this.currentVersion = SAVE_CONFIG.currentVersion;
    this.migrations = this.initMigrations();
  }
  
  initMigrations() {
    return {
      1: (data) => data // 版本1是初始版本，不需要迁移
    };
  }
  
  saveGame(gameState) {
    const saveData = {
      version: this.currentVersion,
      timestamp: Date.now(),
      gameState: gameState
    };
    
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }
  
  loadGame() {
    try {
      const saveDataString = localStorage.getItem(this.localStorageKey);
      
      if (!saveDataString) {
        return null;
      }
      
      const saveData = JSON.parse(saveDataString);
      
      // 执行数据迁移
      const migratedData = this.migrateData(saveData);
      
      return migratedData;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }
  
  migrateData(saveData) {
    let data = { ...saveData };
    const savedVersion = data.version || 0;
    
    if (savedVersion < this.currentVersion) {
      console.log(`Migrating save data from version ${savedVersion} to ${this.currentVersion}`);
      
      // 按顺序执行所有需要的迁移
      for (let version = savedVersion + 1; version <= this.currentVersion; version++) {
        if (this.migrations[version]) {
          data = this.migrations[version](data);
          data.version = version;
        }
      }
    }
    
    return data;
  }
  
  hasSaveData() {
    return localStorage.getItem(this.localStorageKey) !== null;
  }
  
  deleteSaveData() {
    try {
      localStorage.removeItem(this.localStorageKey);
      return true;
    } catch (error) {
      console.error('Failed to delete save data:', error);
      return false;
    }
  }
  
  getSaveInfo() {
    const saveData = this.loadGame();
    
    if (!saveData) {
      return null;
    }
    
    return {
      version: saveData.version,
      timestamp: saveData.timestamp,
      level: saveData.gameState?.level || 1,
      coins: saveData.gameState?.coins || 0,
      lives: saveData.gameState?.lives || 3
    };
  }
}

export default SaveManager;

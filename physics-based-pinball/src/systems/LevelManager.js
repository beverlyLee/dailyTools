const STORAGE_KEY = 'pinball_levels';

export const LevelSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Pinball Level",
  "description": "Schema for pinball game level data",
  "type": "object",
  "required": ["name", "version"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the level",
      "minLength": 1
    },
    "version": {
      "type": "string",
      "description": "Version of the level format",
      "default": "1.0"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp when level was created"
    },
    "bumpers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["x", "y"],
        "properties": {
          "x": { "type": "number", "description": "X position" },
          "y": { "type": "number", "description": "Y position" },
          "radius": { "type": "number", "description": "Radius of bumper", "default": 30 },
          "points": { "type": "number", "description": "Points awarded", "default": 100 }
        }
      }
    },
    "walls": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["x", "y", "width", "height"],
        "properties": {
          "x": { "type": "number", "description": "X position of center" },
          "y": { "type": "number", "description": "Y position of center" },
          "width": { "type": "number", "description": "Width of wall" },
          "height": { "type": "number", "description": "Height of wall" },
          "angle": { "type": "number", "description": "Rotation angle in radians", "default": 0 }
        }
      }
    },
    "flippers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["x", "y", "side"],
        "properties": {
          "x": { "type": "number", "description": "X position" },
          "y": { "type": "number", "description": "Y position" },
          "side": { "type": "string", "enum": ["left", "right"], "description": "Which side of playfield" },
          "length": { "type": "number", "description": "Length of flipper", "default": 120 }
        }
      }
    },
    "goals": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["x", "y"],
        "properties": {
          "x": { "type": "number", "description": "X position" },
          "y": { "type": "number", "description": "Y position" },
          "radius": { "type": "number", "description": "Radius of goal", "default": 25 },
          "points": { "type": "number", "description": "Points awarded", "default": 500 }
        }
      }
    }
  }
};

export class LevelManager {
  constructor() {
    this.levels = this.loadAllLevels();
  }

  loadAllLevels() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load levels:', e);
    }
    return [];
  }

  saveAllLevels() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.levels));
    } catch (e) {
      console.warn('Failed to save levels:', e);
    }
  }

  validateLevel(levelData) {
    if (!levelData || typeof levelData !== 'object') {
      return { valid: false, errors: ['Level data must be an object'] };
    }

    const errors = [];

    if (!levelData.name || typeof levelData.name !== 'string') {
      errors.push('Level name is required and must be a string');
    }

    if (levelData.bumpers && !Array.isArray(levelData.bumpers)) {
      errors.push('Bumpers must be an array');
    }

    if (levelData.walls && !Array.isArray(levelData.walls)) {
      errors.push('Walls must be an array');
    }

    if (levelData.flippers && !Array.isArray(levelData.flippers)) {
      errors.push('Flippers must be an array');
    }

    if (levelData.goals && !Array.isArray(levelData.goals)) {
      errors.push('Goals must be an array');
    }

    if (levelData.bumpers) {
      levelData.bumpers.forEach((bumper, index) => {
        if (typeof bumper.x !== 'number' || typeof bumper.y !== 'number') {
          errors.push(`Bumper ${index}: x and y must be numbers`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  saveLevel(levelData) {
    const validation = this.validateLevel(levelData);
    if (!validation.valid) {
      console.error('Invalid level data:', validation.errors);
      return false;
    }

    const existingIndex = this.levels.findIndex(l => l.name === levelData.name);
    
    if (existingIndex >= 0) {
      this.levels[existingIndex] = levelData;
    } else {
      this.levels.push(levelData);
    }

    this.saveAllLevels();
    return true;
  }

  getLevel(name) {
    return this.levels.find(l => l.name === name) || null;
  }

  getAllLevels() {
    return [...this.levels];
  }

  deleteLevel(name) {
    const index = this.levels.findIndex(l => l.name === name);
    if (index >= 0) {
      this.levels.splice(index, 1);
      this.saveAllLevels();
      return true;
    }
    return false;
  }

  exportLevel(levelData) {
    return JSON.stringify(levelData, null, 2);
  }

  importLevel(jsonString) {
    try {
      const levelData = JSON.parse(jsonString);
      const validation = this.validateLevel(levelData);
      
      if (validation.valid) {
        return levelData;
      } else {
        console.error('Invalid imported level:', validation.errors);
        return null;
      }
    } catch (e) {
      console.error('Failed to parse level JSON:', e);
      return null;
    }
  }
}

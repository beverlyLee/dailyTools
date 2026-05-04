import Phaser from 'phaser';
import { PHYSICS_CONFIG, GAME_STATE } from '../config.js';
import { LevelManager } from '../systems/LevelManager.js';

export default class EditorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EditorScene' });
    this.levelData = {
      name: '自定义关卡',
      version: '1.0',
      createdAt: null,
      bumpers: [],
      walls: [],
      flippers: [],
      goals: []
    };
    this.currentTool = 'bumper';
    this.selectedObject = null;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.objects = [];
  }

  create() {
    this.matter.world.disableGravity();
    this.matter.world.setBounds(
      0, 0,
      this.scale.width,
      this.scale.height
    );

    this.levelManager = new LevelManager();

    this.createGrid();
    this.createWalls();
    this.setupControls();
    this.setupEventListeners();

    this.editorGraphics = this.add.graphics();
  }

  createGrid() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x333333, 0.5);

    const gridSize = 50;
    
    for (let x = 0; x < this.scale.width; x += gridSize) {
      graphics.beginPath();
      graphics.moveTo(x, 0);
      graphics.lineTo(x, this.scale.height);
      graphics.strokePath();
    }

    for (let y = 0; y < this.scale.height; y += gridSize) {
      graphics.beginPath();
      graphics.moveTo(0, y);
      graphics.lineTo(this.scale.width, y);
      graphics.strokePath();
    }
  }

  createWalls() {
    const thickness = PHYSICS_CONFIG.wall.thickness;
    const wallConfig = {
      isStatic: true,
      label: 'editor_wall'
    };

    this.matter.add.rectangle(
      thickness / 2,
      this.scale.height / 2,
      thickness,
      this.scale.height,
      wallConfig
    );

    this.matter.add.rectangle(
      this.scale.width - thickness / 2,
      this.scale.height / 2,
      thickness,
      this.scale.height,
      wallConfig
    );

    this.matter.add.rectangle(
      this.scale.width / 2,
      thickness / 2,
      this.scale.width,
      thickness,
      wallConfig
    );
  }

  setupControls() {
    document.querySelectorAll('.editor-tool').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.editor-tool').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentTool = e.target.dataset.tool;
      });
    });

    document.getElementById('save-level').addEventListener('click', () => {
      this.saveLevel();
    });

    document.getElementById('play-level').addEventListener('click', () => {
      this.playLevel();
    });

    document.getElementById('exit-editor').addEventListener('click', () => {
      this.exitEditor();
    });
  }

  setupEventListeners() {
    this.input.on('pointerdown', (pointer) => {
      const worldPoint = pointer;
      
      const clickedObject = this.findObjectAt(worldPoint.x, worldPoint.y);
      
      if (clickedObject) {
        if (pointer.rightButtonDown() || pointer.button === 2) {
          this.deleteObject(clickedObject);
        } else {
          this.selectedObject = clickedObject;
          this.isDragging = true;
          this.dragStart = { x: worldPoint.x, y: worldPoint.y };
        }
      } else {
        this.placeObject(worldPoint.x, worldPoint.y);
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this.isDragging && this.selectedObject) {
        const dx = pointer.x - this.dragStart.x;
        const dy = pointer.y - this.dragStart.y;
        
        this.selectedObject.x += dx;
        this.selectedObject.y += dy;
        
        this.dragStart = { x: pointer.x, y: pointer.y };
        
        this.updateObjectPosition(this.selectedObject);
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.selectedObject = null;
    });

    this.input.keyboard.on('keydown-DELETE', () => {
      if (this.selectedObject) {
        this.deleteObject(this.selectedObject);
      }
    });
  }

  findObjectAt(x, y) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      const distance = Math.sqrt((obj.x - x) ** 2 + (obj.y - y) ** 2);
      
      if (obj.type === 'bumper' || obj.type === 'goal') {
        if (distance < obj.radius) return obj;
      } else if (obj.type === 'flipper') {
        if (distance < 30) return obj;
      } else if (obj.type === 'wall') {
        if (x >= obj.x - obj.width/2 && x <= obj.x + obj.width/2 &&
            y >= obj.y - obj.height/2 && y <= obj.y + obj.height/2) {
          return obj;
        }
      }
    }
    return null;
  }

  placeObject(x, y) {
    const newObject = {
      type: this.currentTool,
      x: x,
      y: y,
      id: Date.now()
    };

    switch (this.currentTool) {
      case 'bumper':
        newObject.radius = PHYSICS_CONFIG.bumper.radius;
        newObject.points = PHYSICS_CONFIG.bumper.points;
        newObject.color = 0xe94560;
        break;
      case 'goal':
        newObject.radius = PHYSICS_CONFIG.goal.radius;
        newObject.points = PHYSICS_CONFIG.goal.points;
        newObject.color = 0x00ff00;
        break;
      case 'flipper':
        newObject.side = x < this.scale.width / 2 ? 'left' : 'right';
        newObject.length = PHYSICS_CONFIG.flipper.length;
        newObject.color = 0x4a9eff;
        break;
      case 'wall':
        newObject.width = 100;
        newObject.height = 20;
        newObject.angle = 0;
        newObject.color = 0x888888;
        break;
    }

    this.objects.push(newObject);
    this.updateLevelData();
    this.renderEditorObjects();
  }

  updateObjectPosition(obj) {
    this.updateLevelData();
    this.renderEditorObjects();
  }

  deleteObject(obj) {
    const index = this.objects.indexOf(obj);
    if (index > -1) {
      this.objects.splice(index, 1);
      this.updateLevelData();
      this.renderEditorObjects();
    }
  }

  updateLevelData() {
    this.levelData.bumpers = this.objects
      .filter(o => o.type === 'bumper')
      .map(o => ({ x: o.x, y: o.y, radius: o.radius, points: o.points }));
    
    this.levelData.walls = this.objects
      .filter(o => o.type === 'wall')
      .map(o => ({ x: o.x, y: o.y, width: o.width, height: o.height, angle: o.angle }));
    
    this.levelData.flippers = this.objects
      .filter(o => o.type === 'flipper')
      .map(o => ({ x: o.x, y: o.y, side: o.side, length: o.length }));
    
    this.levelData.goals = this.objects
      .filter(o => o.type === 'goal')
      .map(o => ({ x: o.x, y: o.y, radius: o.radius, points: o.points }));
  }

  renderEditorObjects() {
    this.editorGraphics.clear();
    
    this.objects.forEach(obj => {
      this.editorGraphics.lineStyle(2, 0xffffff, 1);
      
      switch (obj.type) {
        case 'bumper':
        case 'goal':
          this.editorGraphics.fillStyle(obj.color, 0.7);
          this.editorGraphics.beginPath();
          this.editorGraphics.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
          this.editorGraphics.closePath();
          this.editorGraphics.fillPath();
          this.editorGraphics.strokePath();
          break;
          
        case 'flipper':
          this.editorGraphics.fillStyle(obj.color, 0.7);
          this.editorGraphics.save();
          this.editorGraphics.translate(obj.x, obj.y);
          this.editorGraphics.rotate(obj.side === 'left' ? -0.3 : 0.3);
          this.editorGraphics.fillRect(-obj.length/2, -10, obj.length, 20);
          this.editorGraphics.strokeRect(-obj.length/2, -10, obj.length, 20);
          this.editorGraphics.restore();
          
          this.editorGraphics.fillStyle(0xffff00, 1);
          this.editorGraphics.beginPath();
          this.editorGraphics.arc(obj.x, obj.y, 5, 0, Math.PI * 2);
          this.editorGraphics.closePath();
          this.editorGraphics.fillPath();
          break;
          
        case 'wall':
          this.editorGraphics.fillStyle(obj.color, 0.7);
          this.editorGraphics.save();
          this.editorGraphics.translate(obj.x, obj.y);
          this.editorGraphics.rotate(obj.angle);
          this.editorGraphics.fillRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
          this.editorGraphics.strokeRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
          this.editorGraphics.restore();
          break;
      }
    });
  }

  saveLevel() {
    const name = prompt('输入关卡名称:', this.levelData.name);
    if (name) {
      this.levelData.name = name;
      this.levelData.createdAt = new Date().toISOString();
      this.levelManager.saveLevel(this.levelData);
      alert('关卡已保存!');
    }
  }

  playLevel() {
    document.getElementById('editor-tools').style.display = 'none';
    this.scene.stop('EditorScene');
    this.scene.start('GameScene', { levelData: this.levelData });
  }

  exitEditor() {
    document.getElementById('editor-tools').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
    this.scene.stop('EditorScene');
    this.scene.start('MainMenuScene');
  }

  update() {
  }
}

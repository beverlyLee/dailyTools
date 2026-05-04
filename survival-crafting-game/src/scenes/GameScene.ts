import Phaser from 'phaser';
import { GAME_CONFIG, GATHERABLE_TYPES, BUILDING_TYPES, ITEM_TYPES, BuildingType, GatherableType } from '../config';
import { SurvivalSystem } from '../systems/SurvivalSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { GatheringSystem } from '../systems/GatheringSystem';
import { BuildingSystem } from '../systems/BuildingSystem';
import { Item, Position } from '../types';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private survivalSystem!: SurvivalSystem;
  private inventorySystem!: InventorySystem;
  private gatheringSystem!: GatheringSystem;
  private buildingSystem!: BuildingSystem;
  private selectedBuildingType: BuildingType | null = null;
  private isGathering: boolean = false;
  private gatheringProgress: number = 0;
  private gatheringTarget: string | null = null;
  private gatherableSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private buildingSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private placementPreview!: Phaser.GameObjects.Rectangle;
  private uiTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('GameScene');
  }

  init(): void {
    this.survivalSystem = new SurvivalSystem();
    this.inventorySystem = new InventorySystem();
    this.gatheringSystem = new GatheringSystem();
    this.buildingSystem = new BuildingSystem();
  }

  preload(): void {
    // 这里可以预加载资源，暂时使用简单的图形
  }

  create(): void {
    // 创建玩家
    this.player = this.physics.add.sprite(
      GAME_CONFIG.width / 2,
      GAME_CONFIG.height / 2,
      ''
    );
    this.player.setSize(32, 32);
    this.player.setCollideWorldBounds(true);

    // 使用圆形表示玩家
    const playerCircle = this.add.circle(this.player.x, this.player.y, 16, 0x00ff00);
    this.player.on('destroy', () => playerCircle.destroy());

    // 每帧更新圆形位置
    this.events.on('update', () => {
      playerCircle.setPosition(this.player.x, this.player.y);
    });

    // 创建键盘控制
    this.cursors = this.input.keyboard!.createCursorKeys();

    // 创建初始采集物
    this.createInitialGatherables();

    // 创建放置预览
    this.placementPreview = this.add.rectangle(0, 0, 32, 32, 0x00ff00, 0.3);
    this.placementPreview.setVisible(false);
    this.placementPreview.setStrokeStyle(2, 0x00ff00);

    // 创建UI文本
    this.createUI();

    // 设置输入事件
    this.setupInputEvents();
  }

  private createInitialGatherables(): void {
    // 创建树
    const treePositions: Position[] = [
      { x: 100, y: 100 },
      { x: 200, y: 150 },
      { x: 400, y: 200 },
      { x: 600, y: 300 },
      { x: 800, y: 400 },
      { x: 1000, y: 200 },
      { x: 1100, y: 500 },
      { x: 300, y: 400 },
      { x: 500, y: 550 },
      { x: 900, y: 150 }
    ];

    for (const pos of treePositions) {
      this.addGatherable('tree', pos);
    }

    // 创建岩石
    const rockPositions: Position[] = [
      { x: 150, y: 300 },
      { x: 350, y: 100 },
      { x: 550, y: 450 },
      { x: 750, y: 250 },
      { x: 950, y: 550 },
      { x: 1050, y: 350 }
    ];

    for (const pos of rockPositions) {
      this.addGatherable('rock', pos);
    }

    // 创建浆果丛
    const bushPositions: Position[] = [
      { x: 250, y: 500 },
      { x: 650, y: 150 },
      { x: 850, y: 600 },
      { x: 1150, y: 100 }
    ];

    for (const pos of bushPositions) {
      this.addGatherable('berryBush', pos);
    }
  }

  private addGatherable(type: GatherableType, position: Position): void {
    const id = this.gatheringSystem.addGatherable(type, position);
    const gatherableType = GATHERABLE_TYPES[type];
    
    const sprite = this.add.text(position.x, position.y, gatherableType.icon, {
      fontSize: '32px'
    });
    sprite.setOrigin(0.5);

    this.gatherableSprites.set(id, sprite as unknown as Phaser.GameObjects.Sprite);
  }

  private createUI(): void {
    // 生存指标UI
    const hungerText = this.add.text(10, 10, '饥饿: 100%', {
      fontSize: '16px',
      color: '#ffff00'
    });
    this.uiTexts.push(hungerText);

    const thirstText = this.add.text(10, 35, '口渴: 100%', {
      fontSize: '16px',
      color: '#00ffff'
    });
    this.uiTexts.push(thirstText);

    const healthText = this.add.text(10, 60, '生命值: 100%', {
      fontSize: '16px',
      color: '#ff0000'
    });
    this.uiTexts.push(healthText);

    // 控制说明
    const controlsText = this.add.text(10, GAME_CONFIG.height - 80, 
      'WASD移动 | 点击采集物采集 | 数字键1-6选择建筑 | 右键取消', {
      fontSize: '14px',
      color: '#ffffff'
    });
    this.uiTexts.push(controlsText);

    // 背包状态
    const inventoryText = this.add.text(GAME_CONFIG.width - 200, 10, '背包: 0/36', {
      fontSize: '16px',
      color: '#ffffff'
    });
    this.uiTexts.push(inventoryText);

    // 选中建筑类型
    const buildingText = this.add.text(GAME_CONFIG.width - 200, 35, '', {
      fontSize: '14px',
      color: '#ffaa00'
    });
    this.uiTexts.push(buildingText);
  }

  private setupInputEvents(): void {
    // 鼠标点击事件
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.selectedBuildingType = null;
        this.placementPreview.setVisible(false);
        this.updateBuildingText();
        return;
      }

      if (this.selectedBuildingType) {
        this.tryPlaceBuilding(pointer);
      } else {
        this.tryGather(pointer);
      }
    });

    // 鼠标移动事件
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.selectedBuildingType) {
        this.updatePlacementPreview(pointer);
      }
    });

    // 数字键选择建筑
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const buildingTypes: BuildingType[] = ['campfire', 'woodWall', 'stoneWall', 'woodFloor', 'chest', 'bed'];
      const keyIndex = parseInt(event.key) - 1;
      
      if (keyIndex >= 0 && keyIndex < buildingTypes.length) {
        this.selectedBuildingType = buildingTypes[keyIndex];
        this.placementPreview.setVisible(true);
        this.updateBuildingText();
      }
    });
  }

  private tryGather(pointer: Phaser.Input.Pointer): void {
    const clickPosition: Position = { x: pointer.x, y: pointer.y };
    const playerPosition: Position = { x: this.player.x, y: this.player.y };

    // 查找附近的采集物
    const nearbyGatherables = this.gatheringSystem.findNearbyGatherables(playerPosition, 64);
    
    for (const gatherable of nearbyGatherables) {
      const sprite = this.gatherableSprites.get(gatherable.id);
      if (!sprite) continue;

      // 检查点击是否在采集物范围内
      const distance = this.gatheringSystem.getDistance(clickPosition, gatherable.position);
      if (distance < 32) {
        // 开始采集
        this.startGathering(gatherable.id);
        break;
      }
    }
  }

  private startGathering(targetId: string): void {
    if (this.isGathering) return;
    
    this.isGathering = true;
    this.gatheringProgress = 0;
    this.gatheringTarget = targetId;
    
    // 显示采集进度
    this.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.isGathering) return;
        
        this.gatheringProgress += 100;
        const gatherTime = this.gatheringSystem.getGatheringTime();
        
        if (this.gatheringProgress >= gatherTime) {
          this.completeGathering();
        }
      },
      loop: true
    });
  }

  private completeGathering(): void {
    if (!this.gatheringTarget) return;

    const drops = this.gatheringSystem.gather(this.gatheringTarget);
    
    if (drops && drops.length > 0) {
      for (const drop of drops) {
        this.inventorySystem.addItem(drop);
      }
      console.log('获得物品:', drops);
    }

    // 更新采集物显示
    const gatherable = this.gatheringSystem.getGatherable(this.gatheringTarget);
    if (gatherable && gatherable.isDepleted) {
      const sprite = this.gatherableSprites.get(this.gatheringTarget);
      if (sprite) {
        sprite.setVisible(false);
      }
    }

    this.isGathering = false;
    this.gatheringProgress = 0;
    this.gatheringTarget = null;
  }

  private tryPlaceBuilding(pointer: Phaser.Input.Pointer): void {
    if (!this.selectedBuildingType) return;

    const worldPosition: Position = { x: pointer.x, y: pointer.y };
    const gridPosition = this.buildingSystem.getGridPosition(worldPosition);
    const playerPosition: Position = { x: this.player.x, y: this.player.y };

    const building = this.buildingSystem.placeBuilding(
      this.selectedBuildingType,
      gridPosition,
      playerPosition,
      this.inventorySystem
    );

    if (building) {
      this.createBuildingSprite(building.id, this.selectedBuildingType, gridPosition);
      console.log('放置建筑:', this.selectedBuildingType);
    }
  }

  private createBuildingSprite(id: string, type: BuildingType, gridPosition: any): void {
    const worldPosition = this.buildingSystem.getWorldPosition(gridPosition);
    const buildingType = BUILDING_TYPES[type];
    
    const sprite = this.add.text(worldPosition.x, worldPosition.y, buildingType.icon, {
      fontSize: '32px'
    });
    sprite.setOrigin(0.5);

    this.buildingSprites.set(id, sprite as unknown as Phaser.GameObjects.Sprite);
  }

  private updatePlacementPreview(pointer: Phaser.Input.Pointer): void {
    if (!this.selectedBuildingType) return;

    const worldPosition: Position = { x: pointer.x, y: pointer.y };
    const gridPosition = this.buildingSystem.getGridPosition(worldPosition);
    const playerPosition: Position = { x: this.player.x, y: this.player.y };

    const buildingType = BUILDING_TYPES[this.selectedBuildingType];
    const canPlace = this.buildingSystem.canPlace(
      this.selectedBuildingType,
      gridPosition,
      playerPosition,
      this.inventorySystem
    );

    this.placementPreview.setPosition(
      gridPosition.gridX * this.buildingSystem.getGridSize() + this.buildingSystem.getGridSize() / 2,
      gridPosition.gridY * this.buildingSystem.getGridSize() + this.buildingSystem.getGridSize() / 2
    );
    this.placementPreview.setSize(
      buildingType.size.width * this.buildingSystem.getGridSize(),
      buildingType.size.height * this.buildingSystem.getGridSize()
    );
    this.placementPreview.setFillStyle(canPlace ? 0x00ff00 : 0xff0000, 0.3);
    this.placementPreview.setStrokeStyle(2, canPlace ? 0x00ff00 : 0xff0000);
  }

  private updateBuildingText(): void {
    const buildingText = this.uiTexts[5];
    if (this.selectedBuildingType) {
      const buildingType = BUILDING_TYPES[this.selectedBuildingType];
      buildingText.setText(`选中: ${buildingType.name}`);
    } else {
      buildingText.setText('');
    }
  }

  update(time: number, delta: number): void {
    // 更新玩家移动
    const speed = GAME_CONFIG.player.speed;
    this.player.setVelocity(0);

    if (this.cursors.left!.isDown || this.input.keyboard!.addKey('A').isDown) {
      this.player.setVelocityX(-speed);
    }
    if (this.cursors.right!.isDown || this.input.keyboard!.addKey('D').isDown) {
      this.player.setVelocityX(speed);
    }
    if (this.cursors.up!.isDown || this.input.keyboard!.addKey('W').isDown) {
      this.player.setVelocityY(-speed);
    }
    if (this.cursors.down!.isDown || this.input.keyboard!.addKey('S').isDown) {
      this.player.setVelocityY(speed);
    }

    // 归一化速度
    if (this.player.body!.velocity.x !== 0 && this.player.body!.velocity.y !== 0) {
      this.player.setVelocity(
        this.player.body!.velocity.x * 0.707,
        this.player.body!.velocity.y * 0.707
      );
    }

    // 更新生存系统
    this.survivalSystem.update();

    // 更新采集系统（处理重生）
    this.gatheringSystem.update(delta / 1000);

    // 检查采集物重生
    const gatherables = this.gatheringSystem.getAllGatherables();
    for (const gatherable of gatherables) {
      const sprite = this.gatherableSprites.get(gatherable.id);
      if (sprite && !gatherable.isDepleted && !sprite.visible) {
        sprite.setVisible(true);
      }
    }

    // 更新UI
    this.updateUI();
  }

  private updateUI(): void {
    const stats = this.survivalSystem.getStats();
    
    this.uiTexts[0].setText(`饥饿: ${Math.round(stats.hunger)}%`);
    this.uiTexts[1].setText(`口渴: ${Math.round(stats.thirst)}%`);
    this.uiTexts[2].setText(`生命值: ${Math.round(stats.health)}%`);

    const inventory = this.inventorySystem.getInventory();
    const usedSlots = inventory.slots.filter(s => s.item !== null).length;
    this.uiTexts[4].setText(`背包: ${usedSlots}/${inventory.maxSlots}`);
  }
}

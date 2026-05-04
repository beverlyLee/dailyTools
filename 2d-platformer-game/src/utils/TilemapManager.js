import { TILEMAP_CONFIG } from '../config';

class TilemapManager {
  constructor(scene) {
    this.scene = scene;
    this.tileWidth = TILEMAP_CONFIG.tileWidth;
    this.tileHeight = TILEMAP_CONFIG.tileHeight;
    this.layers = TILEMAP_CONFIG.layers;
  }
  
  createTilemap(levelData) {
    const { width, height, tilesets, layers } = levelData;
    
    const map = this.scene.make.tilemap({
      tileWidth: this.tileWidth,
      tileHeight: this.tileHeight,
      width: width,
      height: height
    });
    
    // 加载瓦片集
    const tilesetObjects = {};
    for (const tileset of tilesets) {
      tilesetObjects[tileset.name] = map.addTilesetImage(
        tileset.name, 
        tileset.imageKey
      );
    }
    
    // 创建图层
    const layerObjects = {};
    
    if (layers.background) {
      layerObjects.background = map.createLayer(
        this.layers.background,
        Object.values(tilesetObjects),
        0,
        0
      );
    }
    
    if (layers.platforms) {
      layerObjects.platforms = map.createLayer(
        this.layers.platforms,
        Object.values(tilesetObjects),
        0,
        0
      );
      layerObjects.platforms.setCollisionByProperty({ collides: true });
    }
    
    if (layers.collectibles) {
      this.createCollectibles(layers.collectibles, map, tilesetObjects);
    }
    
    if (layers.hazards) {
      this.createHazards(layers.hazards, map, tilesetObjects);
    }
    
    return {
      map,
      layers: layerObjects,
      tilesets: tilesetObjects
    };
  }
  
  createCollectibles(collectibleData, map, tilesets) {
    // 这里可以创建收集品（如金币）
    // 实际项目中可能需要使用对象层
    // 这里简化处理，直接使用瓦片数据
  }
  
  createHazards(hazardData, map, tilesets) {
    // 这里可以创建危险物（如尖刺）
    // 实际项目中可能需要使用对象层
    // 这里简化处理，直接使用瓦片数据
  }
  
  generateLevelData() {
    // 生成一个简单的关卡数据
    const width = 50;
    const height = 19;
    
    // 初始化所有瓦片为0（空）
    const backgroundLayer = Array(height).fill().map(() => Array(width).fill(0));
    const platformsLayer = Array(height).fill().map(() => Array(width).fill(0));
    
    // 创建地面
    for (let x = 0; x < width; x++) {
      platformsLayer[height - 1][x] = 1; // 地面瓦片
      platformsLayer[height - 2][x] = 1; // 地面瓦片
    }
    
    // 创建一些平台
    // 平台1
    for (let x = 10; x < 15; x++) {
      platformsLayer[height - 6][x] = 1;
    }
    
    // 平台2
    for (let x = 20; x < 25; x++) {
      platformsLayer[height - 9][x] = 1;
    }
    
    // 平台3
    for (let x = 30; x < 35; x++) {
      platformsLayer[height - 12][x] = 1;
    }
    
    // 平台4
    for (let x = 40; x < 45; x++) {
      platformsLayer[height - 6][x] = 1;
    }
    
    return {
      width,
      height,
      tilesets: [
        {
          name: 'ground',
          imageKey: 'ground',
          tileWidth: this.tileWidth,
          tileHeight: this.tileHeight
        }
      ],
      layers: {
        background: backgroundLayer,
        platforms: platformsLayer
      },
      objects: {
        playerStart: { x: 100, y: 500 },
        coins: [
          { x: 400, y: 400 },
          { x: 600, y: 300 },
          { x: 800, y: 200 },
          { x: 1000, y: 300 },
          { x: 1200, y: 400 }
        ],
        spikes: [
          { x: 300, y: 530 },
          { x: 700, y: 530 },
          { x: 1100, y: 530 }
        ]
      }
    };
  }
}

export default TilemapManager;

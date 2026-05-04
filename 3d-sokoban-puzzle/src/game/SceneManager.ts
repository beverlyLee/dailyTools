import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GameConfig, TileType, LevelData } from '../types';
import { themeConfig } from '../levels';

// 游戏配置
const DEFAULT_CONFIG: GameConfig = {
  tileSize: 2,
  wallHeight: 2,
  boxSize: 1.8,
  playerSize: 1.6,
  targetSize: 1.5,
  backgroundColor: 0x1a1a2e,
  ambientLightIntensity: 0.5,
  directionalLightIntensity: 0.8
};

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private config: GameConfig;
  
  // 游戏对象
  private walls: THREE.Mesh[] = [];
  private floors: THREE.Mesh[] = [];
  private boxes: THREE.Mesh[] = [];
  private targets: THREE.Mesh[] = [];
  private player: THREE.Mesh | null = null;
  
  // 材质
  private wallMaterial: THREE.MeshStandardMaterial;
  private floorMaterial: THREE.MeshStandardMaterial;
  private boxMaterial: THREE.MeshStandardMaterial;
  private playerMaterial: THREE.MeshStandardMaterial;
  private targetMaterial: THREE.MeshStandardMaterial;
  
  constructor(container: HTMLElement, config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 初始化场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor);
    this.scene.fog = new THREE.Fog(this.config.backgroundColor, 20, 50);
    
    // 初始化相机
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 15, 15);
    
    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    
    // 初始化控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 40;
    
    // 初始化材质
    this.wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7 });
    this.floorMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 });
    this.boxMaterial = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.5 });
    this.playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff5722, roughness: 0.4 });
    this.targetMaterial = new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.3, emissive: 0xffeb3b, emissiveIntensity: 0.3 });
    
    // 设置灯光
    this.setupLights();
    
    // 窗口大小调整
    window.addEventListener('resize', () => this.onWindowResize(container));
  }
  
  private setupLights(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, this.config.ambientLightIntensity);
    this.scene.add(ambientLight);
    
    // 方向光（主光源）
    const directionalLight = new THREE.DirectionalLight(0xffffff, this.config.directionalLightIntensity);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);
    
    // 补光灯
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);
  }
  
  // 更新主题颜色
  public updateTheme(theme: LevelData['theme']): void {
    const colors = themeConfig[theme];
    
    this.wallMaterial.color.setHex(colors.wallColor);
    this.floorMaterial.color.setHex(colors.floorColor);
    this.boxMaterial.color.setHex(colors.boxColor);
    this.playerMaterial.color.setHex(colors.playerColor);
    this.targetMaterial.color.setHex(colors.targetColor);
    this.targetMaterial.emissive.setHex(colors.targetColor);
    
    // 更新场景背景色
    let bgColor = 0x1a1a2e;
    if (theme === 'ice') bgColor = 0x1a237e;
    if (theme === 'desert') bgColor = 0x3e2723;
    if (theme === 'space') bgColor = 0x000000;
    
    this.scene.background = new THREE.Color(bgColor);
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).color.setHex(bgColor);
    }
  }
  
  // 创建关卡
  public createLevel(grid: TileType[][]): void {
    // 清除现有对象
    this.clearLevel();
    
    const tileSize = this.config.tileSize;
    const width = grid[0].length;
    const depth = grid.length;
    
    // 计算中心点
    const centerX = (width - 1) * tileSize / 2;
    const centerZ = (depth - 1) * tileSize / 2;
    
    // 创建地板（整个关卡底部）
    const floorGeometry = new THREE.BoxGeometry(width * tileSize, 0.2, depth * tileSize);
    const mainFloor = new THREE.Mesh(floorGeometry, this.floorMaterial);
    mainFloor.position.set(centerX, -0.1, centerZ);
    mainFloor.receiveShadow = true;
    this.scene.add(mainFloor);
    this.floors.push(mainFloor);
    
    // 遍历网格创建对象
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const tile = grid[z][x];
        const worldX = x * tileSize;
        const worldZ = z * tileSize;
        
        // 创建墙
        if (tile === TileType.WALL) {
          this.createWall(worldX, worldZ);
        }
        
        // 创建目标点
        if (tile === TileType.TARGET || tile === TileType.BOX_ON_TARGET || tile === TileType.PLAYER_ON_TARGET) {
          this.createTarget(worldX, worldZ);
        }
        
        // 创建箱子
        if (tile === TileType.BOX || tile === TileType.BOX_ON_TARGET) {
          this.createBox(worldX, worldZ);
        }
        
        // 创建玩家
        if (tile === TileType.PLAYER || tile === TileType.PLAYER_ON_TARGET) {
          this.createPlayer(worldX, worldZ);
        }
      }
    }
    
    // 调整相机位置以适应关卡大小
    this.adjustCameraForLevel(width, depth, centerX, centerZ);
  }
  
  private createWall(x: number, z: number): void {
    const tileSize = this.config.tileSize;
    const geometry = new THREE.BoxGeometry(tileSize * 0.95, this.config.wallHeight, tileSize * 0.95);
    const wall = new THREE.Mesh(geometry, this.wallMaterial);
    wall.position.set(x, this.config.wallHeight / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.walls.push(wall);
  }
  
  private createTarget(x: number, z: number): void {
    const geometry = new THREE.CylinderGeometry(this.config.targetSize / 2, this.config.targetSize / 2, 0.1, 16);
    const target = new THREE.Mesh(geometry, this.targetMaterial);
    target.position.set(x, 0.06, z);
    target.rotation.x = Math.PI / 2;
    target.receiveShadow = true;
    this.scene.add(target);
    this.targets.push(target);
  }
  
  private createBox(x: number, z: number): void {
    const size = this.config.boxSize;
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    // 为箱子添加边缘高亮效果
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    
    // 为每个箱子创建独立的材质，这样每个箱子可以有独立的颜色
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: this.boxMaterial.color.getHex(),
      roughness: this.boxMaterial.roughness,
      metalness: this.boxMaterial.metalness
    });
    
    const box = new THREE.Mesh(geometry, boxMaterial);
    box.position.set(x, size / 2, z);
    box.castShadow = true;
    box.receiveShadow = true;
    
    // 添加高亮线框
    wireframe.position.copy(box.position);
    
    this.scene.add(box);
    this.scene.add(wireframe);
    
    // 存储时将线框作为子对象的方式处理
    (box as any).wireframe = wireframe;
    this.boxes.push(box);
  }
  
  private createPlayer(x: number, z: number): void {
    const size = this.config.playerSize;
    
    // 玩家身体（胶囊形状）
    const bodyGeometry = new THREE.CapsuleGeometry(size / 2.5, size / 2, 8, 8);
    this.player = new THREE.Mesh(bodyGeometry, this.playerMaterial);
    this.player.position.set(x, size / 2 + 0.5, z);
    this.player.castShadow = true;
    this.player.receiveShadow = true;
    
    // 玩家眼睛
    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, size / 2 + 0.7, -0.2);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, size / 2 + 0.7, -0.2);
    
    // 瞳孔
    const pupilGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.15, size / 2 + 0.7, -0.28);
    
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.15, size / 2 + 0.7, -0.28);
    
    this.scene.add(this.player);
    this.scene.add(leftEye);
    this.scene.add(rightEye);
    this.scene.add(leftPupil);
    this.scene.add(rightPupil);
    
    // 存储眼睛引用
    (this.player as any).leftEye = leftEye;
    (this.player as any).rightEye = rightEye;
    (this.player as any).leftPupil = leftPupil;
    (this.player as any).rightPupil = rightPupil;
  }
  
  private clearLevel(): void {
    // 清除墙
    this.walls.forEach(wall => this.scene.remove(wall));
    this.walls = [];
    
    // 清除地板
    this.floors.forEach(floor => this.scene.remove(floor));
    this.floors = [];
    
    // 清除箱子（包括线框）
    this.boxes.forEach(box => {
      this.scene.remove(box);
      if ((box as any).wireframe) {
        this.scene.remove((box as any).wireframe);
      }
    });
    this.boxes = [];
    
    // 清除目标点
    this.targets.forEach(target => this.scene.remove(target));
    this.targets = [];
    
    // 清除玩家（包括眼睛）
    if (this.player) {
      this.scene.remove(this.player);
      if ((this.player as any).leftEye) {
        this.scene.remove((this.player as any).leftEye);
        this.scene.remove((this.player as any).rightEye);
        this.scene.remove((this.player as any).leftPupil);
        this.scene.remove((this.player as any).rightPupil);
      }
      this.player = null;
    }
  }
  
  private adjustCameraForLevel(width: number, depth: number, centerX: number, centerZ: number): void {
    const tileSize = this.config.tileSize;
    const maxDim = Math.max(width, depth) * tileSize;
    
    // 调整相机位置
    const distance = maxDim * 1.2;
    this.camera.position.set(centerX + distance * 0.7, distance, centerZ + distance * 0.7);
    
    // 调整控制器目标
    this.controls.target.set(centerX, 0, centerZ);
    
    // 调整相机裁剪距离
    this.controls.minDistance = maxDim * 0.5;
    this.controls.maxDistance = maxDim * 3;
  }
  
  // 移动玩家
  public movePlayer(targetX: number, targetZ: number, animate: boolean = true): void {
    if (!this.player) return;
    
    const tileSize = this.config.tileSize;
    const worldX = targetX * tileSize;
    const worldZ = targetZ * tileSize;
    
    if (animate) {
      // 简单的动画效果
      const startPos = this.player.position.clone();
      const endPos = new THREE.Vector3(worldX, this.config.playerSize / 2 + 0.5, worldZ);
      
      // 移动眼睛和瞳孔
      if ((this.player as any).leftEye) {
        const eyeOffset = this.player.position.clone().sub((this.player as any).leftEye.position);
        (this.player as any).leftEye.position.copy(endPos).sub(eyeOffset);
        (this.player as any).rightEye.position.copy(endPos).sub(new THREE.Vector3(-eyeOffset.x, eyeOffset.y, eyeOffset.z));
        (this.player as any).leftPupil.position.copy((this.player as any).leftEye.position).add(new THREE.Vector3(0, 0, -0.08));
        (this.player as any).rightPupil.position.copy((this.player as any).rightEye.position).add(new THREE.Vector3(0, 0, -0.08));
      }
      
      this.player.position.copy(endPos);
    } else {
      this.player.position.set(worldX, this.config.playerSize / 2 + 0.5, worldZ);
      
      // 移动眼睛和瞳孔
      if ((this.player as any).leftEye) {
        (this.player as any).leftEye.position.set(worldX - 0.15, this.config.playerSize / 2 + 0.7, worldZ - 0.2);
        (this.player as any).rightEye.position.set(worldX + 0.15, this.config.playerSize / 2 + 0.7, worldZ - 0.2);
        (this.player as any).leftPupil.position.set(worldX - 0.15, this.config.playerSize / 2 + 0.7, worldZ - 0.28);
        (this.player as any).rightPupil.position.set(worldX + 0.15, this.config.playerSize / 2 + 0.7, worldZ - 0.28);
      }
    }
  }
  
  // 移动箱子
  public moveBox(fromX: number, fromZ: number, toX: number, toZ: number): void {
    const tileSize = this.config.tileSize;
    const fromWorldX = fromX * tileSize;
    const fromWorldZ = fromZ * tileSize;
    const toWorldX = toX * tileSize;
    const toWorldZ = toZ * tileSize;
    
    // 找到对应的箱子
    for (const box of this.boxes) {
      if (Math.abs(box.position.x - fromWorldX) < 0.1 && Math.abs(box.position.z - fromWorldZ) < 0.1) {
        box.position.set(toWorldX, this.config.boxSize / 2, toWorldZ);
        
        // 移动线框
        if ((box as any).wireframe) {
          (box as any).wireframe.position.copy(box.position);
        }
        break;
      }
    }
  }
  
  // 设置箱子颜色（用于显示是否在目标点上）
  public setBoxOnTarget(x: number, z: number, isOnTarget: boolean): void {
    const tileSize = this.config.tileSize;
    const worldX = x * tileSize;
    const worldZ = z * tileSize;
    
    for (const box of this.boxes) {
      if (Math.abs(box.position.x - worldX) < 0.1 && Math.abs(box.position.z - worldZ) < 0.1) {
        if (isOnTarget) {
          // 在目标点上时显示为绿色
          (box.material as THREE.MeshStandardMaterial).color.setHex(0x4caf50);
        } else {
          // 恢复原色
          (box.material as THREE.MeshStandardMaterial).color.copy(this.boxMaterial.color);
        }
        break;
      }
    }
  }
  
  // 渲染
  public render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  private onWindowResize(container: HTMLElement): void {
    const aspect = container.clientWidth / container.clientHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }
  
  // 销毁
  public dispose(): void {
    window.removeEventListener('resize', () => this.onWindowResize);
    this.renderer.dispose();
    this.controls.dispose();
  }
}

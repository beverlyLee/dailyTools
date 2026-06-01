import * as THREE from 'three';

export class SandTable {
  public mesh: THREE.Mesh;
  public obstacles: THREE.Group;
  public size: number;

  constructor(size: number = 40) {
    this.size = size;
    this.mesh = this.createSandPlane();
    this.obstacles = new THREE.Group();
    this.createBorderObstacles();
  }

  private createSandPlane(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(this.size, this.size, 64, 64);
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#e8d4a8');
    gradient.addColorStop(0.5, '#d4b896');
    gradient.addColorStop(1, '#c9a882');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 1.5 + 0.5;
      const alpha = Math.random() * 0.3 + 0.1;
      ctx.fillStyle = `rgba(${180 + Math.random() * 40}, ${150 + Math.random() * 40}, ${100 + Math.random() * 40}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.05,
    });
    
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    
    return plane;
  }

  private createBorderObstacles(): void {
    const half = this.size / 2;
    const obstacleHeight = 1.5;
    const obstacleWidth = 1;

    const obstacleMat = new THREE.MeshStandardMaterial({
      color: 0x5a4a3a,
      roughness: 0.9,
      metalness: 0.1,
    });

    for (let i = -half + 2; i <= half - 2; i += 3) {
      const northObs = this.createObstacle(obstacleMat, obstacleHeight);
      northObs.position.set(i, obstacleHeight / 2, -half + 0.5);
      this.obstacles.add(northObs);

      const southObs = this.createObstacle(obstacleMat, obstacleHeight);
      southObs.position.set(i, obstacleHeight / 2, half - 0.5);
      this.obstacles.add(southObs);

      const westObs = this.createObstacle(obstacleMat, obstacleHeight);
      westObs.position.set(-half + 0.5, obstacleHeight / 2, i);
      westObs.rotation.y = Math.PI / 2;
      this.obstacles.add(westObs);

      const eastObs = this.createObstacle(obstacleMat, obstacleHeight);
      eastObs.position.set(half - 0.5, obstacleHeight / 2, i);
      eastObs.rotation.y = Math.PI / 2;
      this.obstacles.add(eastObs);
    }

    const cornerMat = new THREE.MeshStandardMaterial({
      color: 0x6a5a4a,
      roughness: 0.8,
      metalness: 0.2,
    });

    const corners = [
      { x: -half + 1, z: -half + 1 },
      { x: half - 1, z: -half + 1 },
      { x: -half + 1, z: half - 1 },
      { x: half - 1, z: half - 1 },
    ];

    for (const corner of corners) {
      const tower = this.createCornerTower(cornerMat);
      tower.position.set(corner.x, 1, corner.z);
      this.obstacles.add(tower);
    }
  }

  private createObstacle(material: THREE.MeshStandardMaterial, height: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(2.5, height, 0.8);
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    return obstacle;
  }

  private createCornerTower(material: THREE.MeshStandardMaterial): THREE.Group {
    const group = new THREE.Group();

    const baseGeom = new THREE.CylinderGeometry(1, 1.2, 2, 8);
    const base = new THREE.Mesh(baseGeom, material);
    base.position.y = 1;
    base.castShadow = true;
    group.add(base);

    const topGeom = new THREE.ConeGeometry(0.8, 1, 8);
    const top = new THREE.Mesh(topGeom, material);
    top.position.y = 2.5;
    top.castShadow = true;
    group.add(top);

    return group;
  }

  public getRandomPosition(): THREE.Vector3 {
    const half = this.size / 2 - 3;
    return new THREE.Vector3(
      (Math.random() - 0.5) * this.size * 0.85,
      0.5,
      (Math.random() - 0.5) * this.size * 0.85
    );
  }

  public clampPosition(pos: THREE.Vector3): THREE.Vector3 {
    const half = this.size / 2 - 2;
    pos.x = Math.max(-half, Math.min(half, pos.x));
    pos.z = Math.max(-half, Math.min(half, pos.z));
    return pos;
  }
}

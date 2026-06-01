import * as THREE from 'three';

export type Faction = 'red' | 'blue';

export interface SoldierOptions {
  faction: Faction;
  position: THREE.Vector3;
  health?: number;
  speed?: number;
  damage?: number;
  attackRange?: number;
  attackCooldown?: number;
  detectionRange?: number;
}

export class Soldier {
  public faction: Faction;
  public mesh: THREE.Group;
  public health: number;
  public maxHealth: number;
  public speed: number;
  public damage: number;
  public attackRange: number;
  public attackCooldown: number;
  public detectionRange: number;
  public target: Soldier | null = null;
  public isAlive: boolean = true;
  public radius: number = 0.6;
  public id: string;

  private lastAttackTime: number = 0;
  private healthBar: THREE.Mesh | null = null;
  private healthBarBg: THREE.Mesh | null = null;
  private attackAnimationTime: number = 0;
  private hitFlashTime: number = 0;
  private hitReactionTime: number = 0;
  private originalBodyColor: number;
  private originalHeadColor: number;
  private bodyMesh: THREE.Mesh | null = null;
  private headMesh: THREE.Mesh | null = null;
  private weaponMesh: THREE.Mesh | null = null;
  private muzzleFlash: THREE.Mesh | null = null;
  private bodyGroup: THREE.Group | null = null;
  private deathAnimationTime: number = 0;
  private displayedHealth: number;

  private static idCounter: number = 0;

  constructor(options: SoldierOptions) {
    this.id = `soldier-${Soldier.idCounter++}`;
    this.faction = options.faction;
    this.health = options.health ?? 100;
    this.maxHealth = this.health;
    this.displayedHealth = this.health;
    this.speed = options.speed ?? 5;
    this.damage = options.damage ?? 15;
    this.attackRange = options.attackRange ?? 1.8;
    this.attackCooldown = options.attackCooldown ?? 0.8;
    this.detectionRange = options.detectionRange ?? 12;
    this.originalBodyColor = this.faction === 'red' ? 0xcc3333 : 0x3366cc;
    this.originalHeadColor = this.faction === 'red' ? 0xff6666 : 0x6699ff;

    this.mesh = this.createSoldierMesh();
    this.mesh.position.copy(options.position);
    this.createHealthBar();
  }

  private createSoldierMesh(): THREE.Group {
    const group = new THREE.Group();

    this.bodyGroup = new THREE.Group();
    group.add(this.bodyGroup);

    const bodyColor = this.faction === 'red' ? 0xcc3333 : 0x3366cc;
    const bodyGeom = new THREE.CapsuleGeometry(0.3, 0.6, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.7,
      metalness: 0.2,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    this.bodyMesh.position.y = 0.6;
    this.bodyMesh.castShadow = true;
    this.bodyGroup.add(this.bodyMesh);

    const headGeom = new THREE.SphereGeometry(0.25, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: this.faction === 'red' ? 0xff6666 : 0x6699ff,
      roughness: 0.5,
    });
    this.headMesh = new THREE.Mesh(headGeom, headMat);
    this.headMesh.position.y = 1.15;
    this.headMesh.castShadow = true;
    this.bodyGroup.add(this.headMesh);

    const helmetGeom = new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.3,
      metalness: 0.8,
    });
    const helmet = new THREE.Mesh(helmetGeom, helmetMat);
    helmet.position.y = 1.15;
    helmet.castShadow = true;
    this.bodyGroup.add(helmet);

    const weaponGeom = new THREE.BoxGeometry(0.08, 0.08, 0.9);
    const weaponMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.4,
      metalness: 0.9,
    });
    this.weaponMesh = new THREE.Mesh(weaponGeom, weaponMat);
    this.weaponMesh.position.set(0.5, 0.9, 0);
    this.weaponMesh.rotation.z = -Math.PI / 4;
    this.weaponMesh.castShadow = true;
    this.bodyGroup.add(this.weaponMesh);

    const flashGeom = new THREE.SphereGeometry(0.2, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0,
    });
    this.muzzleFlash = new THREE.Mesh(flashGeom, flashMat);
    this.muzzleFlash.position.set(1.0, 1.1, 0);
    this.bodyGroup.add(this.muzzleFlash);

    const baseGeom = new THREE.CylinderGeometry(0.4, 0.45, 0.1, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: this.faction === 'red' ? 0x990000 : 0x003399,
      roughness: 0.8,
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = 0.05;
    base.castShadow = true;
    group.add(base);

    return group;
  }

  private createHealthBar(): void {
    const barWidth = 1.4;
    const barHeight = 0.18;

    const bgGeom = new THREE.PlaneGeometry(barWidth + 0.1, barHeight + 0.1);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    this.healthBarBg = new THREE.Mesh(bgGeom, bgMat);
    this.healthBarBg.position.y = 2.2;
    this.healthBarBg.rotation.x = -Math.PI / 3;
    this.mesh.add(this.healthBarBg);

    const barGeom = new THREE.PlaneGeometry(barWidth, barHeight);
    const barMat = new THREE.MeshBasicMaterial({
      color: 0x44ff44,
      depthTest: false,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });
    this.healthBar = new THREE.Mesh(barGeom, barMat);
    this.healthBar.position.y = 2.2;
    this.healthBar.position.z = 0.02;
    this.healthBar.rotation.x = -Math.PI / 3;
    this.mesh.add(this.healthBar);
  }

  private updateHealthBar(deltaTime: number): void {
    if (!this.healthBar || !this.healthBarBg) return;

    const targetRatio = Math.max(0, this.health / this.maxHealth);
    const currentRatio = Math.max(0, this.displayedHealth / this.maxHealth);
    const newRatio = THREE.MathUtils.lerp(currentRatio, targetRatio, deltaTime * 8);

    this.displayedHealth = newRatio * this.maxHealth;

    this.healthBar.scale.x = Math.max(0.001, newRatio);
    this.healthBar.position.x = -(1 - newRatio) * 0.7;

    const mat = this.healthBar.material as THREE.MeshBasicMaterial;
    if (newRatio > 0.6) {
      mat.color.setHex(0x44ff44);
    } else if (newRatio > 0.3) {
      mat.color.setHex(0xffaa00);
    } else {
      mat.color.setHex(0xff4444);
    }
  }

  public getDisplayedHealth(): number {
    return this.displayedHealth;
  }

  public update(
    allSoldiers: Soldier[],
    deltaTime: number,
    currentTime: number,
    clampFn: (pos: THREE.Vector3) => THREE.Vector3
  ): void {
    if (!this.isAlive) {
      if (this.deathAnimationTime > 0) {
        this.deathAnimationTime -= deltaTime;
        this.updateDeathAnimation();
      }
      return;
    }

    if (!this.target || !this.target.isAlive) {
      this.findTarget(allSoldiers);
    }

    const separationForce = this.calculateSeparation(allSoldiers);
    let moveDirection = new THREE.Vector3();

    if (this.target && this.target.isAlive) {
      const toTarget = new THREE.Vector3().subVectors(
        this.target.mesh.position,
        this.mesh.position
      );
      const distance = toTarget.length();

      toTarget.y = 0;
      toTarget.normalize();

      const targetRotation = Math.atan2(toTarget.x, toTarget.z);
      const currentRotation = this.mesh.rotation.y;
      const rotationDiff = targetRotation - currentRotation;
      const normalizedDiff = Math.atan2(Math.sin(rotationDiff), Math.cos(rotationDiff));
      this.mesh.rotation.y += normalizedDiff * Math.min(1, deltaTime * 12);

      if (distance > this.attackRange) {
        const moveSpeed = this.speed * deltaTime;
        moveDirection.copy(toTarget);
        moveDirection.add(separationForce.multiplyScalar(0.5));
        moveDirection.normalize();
        
        this.mesh.position.x += moveDirection.x * moveSpeed;
        this.mesh.position.z += moveDirection.z * moveSpeed;
        clampFn(this.mesh.position);
        this.updateWalkAnimation(deltaTime, currentTime);
      } else {
        if (currentTime - this.lastAttackTime > this.attackCooldown) {
          this.attack(this.target);
          this.lastAttackTime = currentTime;
          this.attackAnimationTime = 0.4;
        }
      }
    } else {
      moveDirection.add(separationForce.multiplyScalar(0.3));
      if (moveDirection.length() > 0.1) {
        moveDirection.normalize();
        const moveSpeed = this.speed * deltaTime * 0.3;
        this.mesh.position.x += moveDirection.x * moveSpeed;
        this.mesh.position.z += moveDirection.z * moveSpeed;
        clampFn(this.mesh.position);
      }

      if (Math.random() < 0.01) {
        const randomDir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          0,
          (Math.random() - 0.5) * 2
        ).normalize();
        const targetRotation = Math.atan2(randomDir.x, randomDir.z);
        this.mesh.rotation.y = targetRotation;
      }
    }

    if (this.attackAnimationTime > 0) {
      this.attackAnimationTime -= deltaTime;
      this.updateAttackAnimation();
    }

    if (this.hitFlashTime > 0) {
      this.hitFlashTime -= deltaTime;
      this.updateHitFlash();
    }

    if (this.hitReactionTime > 0) {
      this.hitReactionTime -= deltaTime;
      this.updateHitReaction();
    }

    this.updateHealthBar(deltaTime);
  }

  private updateWalkAnimation(deltaTime: number, currentTime: number): void {
    if (!this.bodyGroup || this.attackAnimationTime > 0) return;
    const bobOffset = Math.sin(currentTime * 12) * 0.05;
    this.bodyGroup.position.y = bobOffset;
    this.bodyGroup.rotation.z = Math.sin(currentTime * 12) * 0.05;
  }

  private calculateSeparation(allSoldiers: Soldier[]): THREE.Vector3 {
    const separation = new THREE.Vector3();
    const minDistance = 1.2;

    for (const soldier of allSoldiers) {
      if (soldier !== this && soldier.isAlive) {
        const toOther = new THREE.Vector3().subVectors(
          this.mesh.position,
          soldier.mesh.position
        );
        const distance = toOther.length();
        
        if (distance < minDistance && distance > 0) {
          const force = (minDistance - distance) / minDistance;
          toOther.normalize();
          toOther.multiplyScalar(force * force);
          separation.add(toOther);
        }
      }
    }

    return separation;
  }

  private updateAttackAnimation(): void {
    if (!this.weaponMesh || !this.bodyGroup) return;

    const totalDuration = 0.4;
    const progress = 1 - this.attackAnimationTime / totalDuration;

    if (progress < 0.3) {
      const p = progress / 0.3;
      this.weaponMesh.rotation.z = -Math.PI / 4 - p * Math.PI / 3;
      this.weaponMesh.position.x = 0.5 + p * 0.3;
      this.bodyGroup.position.y = 0;
      this.bodyGroup.rotation.z = 0;
    } else if (progress < 0.5) {
      const p = (progress - 0.3) / 0.2;
      this.weaponMesh.rotation.z = -Math.PI / 4 - Math.PI / 3 + p * Math.PI * 0.8;
      this.weaponMesh.position.x = 0.8;
      this.bodyGroup.rotation.z = -p * 0.3;
      this.bodyGroup.position.y = p * 0.1;
    } else {
      const p = (progress - 0.5) / 0.5;
      this.weaponMesh.rotation.z = -Math.PI / 4 - Math.PI / 3 + Math.PI * 0.8 - p * Math.PI * 0.5;
      this.weaponMesh.position.x = 0.8 - p * 0.3;
      this.bodyGroup.rotation.z = -0.3 + p * 0.3;
      this.bodyGroup.position.y = 0.1 - p * 0.1;
    }

    if (this.muzzleFlash) {
      const mat = this.muzzleFlash.material as THREE.MeshBasicMaterial;
      if (progress > 0.25 && progress < 0.45) {
        mat.opacity = 1 - (progress - 0.25) / 0.2;
        this.muzzleFlash.scale.setScalar(1 + (progress - 0.25) * 2);
      } else {
        mat.opacity = 0;
      }
    }
  }

  private updateHitFlash(): void {
    const flashIntensity = this.hitFlashTime / 0.3;
    
    if (this.bodyMesh) {
      const mat = this.bodyMesh.material as THREE.MeshStandardMaterial;
      const bodyColor = new THREE.Color(this.originalBodyColor);
      bodyColor.lerp(new THREE.Color(0xffffff), flashIntensity);
      mat.color.copy(bodyColor);
      mat.emissive = new THREE.Color(0xff4444);
      mat.emissiveIntensity = flashIntensity * 0.5;
    }

    if (this.headMesh) {
      const mat = this.headMesh.material as THREE.MeshStandardMaterial;
      const headColor = new THREE.Color(this.originalHeadColor);
      headColor.lerp(new THREE.Color(0xffffff), flashIntensity);
      mat.color.copy(headColor);
      mat.emissive = new THREE.Color(0xff4444);
      mat.emissiveIntensity = flashIntensity * 0.5;
    }

    if (this.hitFlashTime <= 0 && this.bodyMesh && this.headMesh) {
      const bodyMat = this.bodyMesh.material as THREE.MeshStandardMaterial;
      bodyMat.emissiveIntensity = 0;
      const headMat = this.headMesh.material as THREE.MeshStandardMaterial;
      headMat.emissiveIntensity = 0;
    }
  }

  private updateHitReaction(): void {
    if (!this.bodyGroup) return;
    const intensity = this.hitReactionTime / 0.3;
    this.bodyGroup.position.x = Math.sin(this.hitReactionTime * 50) * 0.1 * intensity;
    this.bodyGroup.rotation.x = intensity * 0.3;
  }

  private findTarget(allSoldiers: Soldier[]): void {
    let nearestEnemy: Soldier | null = null;
    let nearestDistance = Infinity;

    for (const soldier of allSoldiers) {
      if (soldier.faction !== this.faction && soldier.isAlive) {
        const distance = this.mesh.position.distanceTo(soldier.mesh.position);
        if (distance < this.detectionRange && distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = soldier;
        }
      }
    }

    this.target = nearestEnemy;
  }

  private attack(target: Soldier): void {
    target.takeDamage(this.damage);
  }

  public takeDamage(damage: number): void {
    this.health -= damage;
    this.hitFlashTime = 0.3;
    this.hitReactionTime = 0.3;
    
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      this.deathAnimationTime = 1.0;
      this.onDeathStart();
    }
  }

  private onDeathStart(): void {
    if (this.healthBar) {
      this.healthBar.visible = false;
    }
    if (this.healthBarBg) {
      this.healthBarBg.visible = false;
    }

    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          mat.emissiveIntensity = 0;
        }
      }
    });
  }

  private updateDeathAnimation(): void {
    const progress = 1 - this.deathAnimationTime / 1.0;
    
    if (this.bodyGroup) {
      this.bodyGroup.rotation.x = progress * -Math.PI / 2;
      this.bodyGroup.position.y = -progress * 0.5;
    }

    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.color) {
          mat.color.multiplyScalar(1 - progress * 0.5);
        }
      }
    });
  }

  public isInAttackAnimation(): boolean {
    return this.attackAnimationTime > 0;
  }

  public dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }
}

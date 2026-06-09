import * as THREE from 'three';
import type { WindowType, WindowGap } from '../types';

export class WindowSystem {
  private scene: THREE.Scene;
  private windowGroup: THREE.Group;
  private currentType: WindowType = 'sliding';
  private windowFrame: THREE.Group;
  private glassPanes: THREE.Mesh[] = [];
  private gaps: WindowGap[] = [];
  private sealStrips: THREE.Mesh[] = [];
  
  private readonly windowWidth = 2.4;
  private readonly windowHeight = 2.0;
  private readonly frameThickness = 0.08;
  private readonly frameDepth = 0.15;
  private readonly glassThickness = 0.02;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.windowGroup = new THREE.Group();
    this.windowFrame = new THREE.Group();
    this.windowGroup.add(this.windowFrame);
    this.scene.add(this.windowGroup);
    
    this.createWindowFrame();
    this.createSlidingWindow();
  }

  private createWindowFrame(): void {
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.6,
      metalness: 0.2
    });

    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(this.windowWidth + this.frameThickness * 2, this.frameThickness, this.frameDepth),
      frameMaterial
    );
    topFrame.position.set(0, this.windowHeight / 2, 0);
    this.windowFrame.add(topFrame);

    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(this.windowWidth + this.frameThickness * 2, this.frameThickness, this.frameDepth),
      frameMaterial
    );
    bottomFrame.position.set(0, -this.windowHeight / 2, 0);
    this.windowFrame.add(bottomFrame);

    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(this.frameThickness, this.windowHeight + this.frameThickness * 2, this.frameDepth),
      frameMaterial
    );
    leftFrame.position.set(-this.windowWidth / 2 - this.frameThickness / 2, 0, 0);
    this.windowFrame.add(leftFrame);

    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(this.frameThickness, this.windowHeight + this.frameThickness * 2, this.frameDepth),
      frameMaterial
    );
    rightFrame.position.set(this.windowWidth / 2 + this.frameThickness / 2, 0, 0);
    this.windowFrame.add(rightFrame);
  }

  private clearWindowPanes(): void {
    this.glassPanes.forEach(pane => {
      this.windowGroup.remove(pane);
      pane.geometry.dispose();
      (pane.material as THREE.Material).dispose();
    });
    this.glassPanes = [];

    this.sealStrips.forEach(strip => {
      this.windowGroup.remove(strip);
      strip.geometry.dispose();
      (strip.material as THREE.Material).dispose();
    });
    this.sealStrips = [];

    this.gaps = [];
  }

  private createSlidingWindow(): void {
    this.clearWindowPanes();

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.02
    });

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x9a8570,
      roughness: 0.5,
      metalness: 0.3
    });

    const paneWidth = this.windowWidth / 2 + 0.02;
    const paneHeight = this.windowHeight - this.frameThickness * 0.5;

    const leftPaneFrame = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth + 0.06, paneHeight + 0.06, 0.04),
      frameMaterial
    );
    leftPaneFrame.position.set(-paneWidth / 2 + 0.02, 0, -0.03);
    this.windowGroup.add(leftPaneFrame);

    const leftGlass = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth, paneHeight, this.glassThickness),
      glassMaterial
    );
    leftGlass.position.set(-paneWidth / 2 + 0.02, 0, -0.03);
    this.windowGroup.add(leftGlass);
    this.glassPanes.push(leftGlass);

    const rightPaneFrame = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth + 0.06, paneHeight + 0.06, 0.04),
      frameMaterial
    );
    rightPaneFrame.position.set(paneWidth / 2 - 0.02, 0, 0.03);
    this.windowGroup.add(rightPaneFrame);

    const rightGlass = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth, paneHeight, this.glassThickness),
      glassMaterial
    );
    rightGlass.position.set(paneWidth / 2 - 0.02, 0, 0.03);
    this.windowGroup.add(rightGlass);
    this.glassPanes.push(rightGlass);

    const centerGap: WindowGap = {
      position: new THREE.Vector3(0, 0, 0),
      width: 0.008,
      height: paneHeight - 0.1,
      depth: 0.06,
      normal: new THREE.Vector3(0, 0, 1)
    };
    this.gaps.push(centerGap);

    const topGap: WindowGap = {
      position: new THREE.Vector3(0, this.windowHeight / 2 - this.frameThickness / 2 - 0.01, 0),
      width: this.windowWidth - 0.1,
      height: 0.005,
      depth: 0.06,
      normal: new THREE.Vector3(0, -1, 0)
    };
    this.gaps.push(topGap);

    const bottomGap: WindowGap = {
      position: new THREE.Vector3(0, -this.windowHeight / 2 + this.frameThickness / 2 + 0.01, 0),
      width: this.windowWidth - 0.1,
      height: 0.006,
      depth: 0.06,
      normal: new THREE.Vector3(0, 1, 0)
    };
    this.gaps.push(bottomGap);
  }

  private createCasementWindow(): void {
    this.clearWindowPanes();

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.02
    });

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x9a8570,
      roughness: 0.5,
      metalness: 0.3
    });

    const sealMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d2d2d,
      roughness: 0.8,
      metalness: 0.1
    });

    const paneWidth = this.windowWidth / 2 - 0.06;
    const paneHeight = this.windowHeight - this.frameThickness * 0.8;

    const centerMullion = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, paneHeight + 0.1, this.frameDepth * 0.8),
      frameMaterial
    );
    centerMullion.position.set(0, 0, 0);
    this.windowGroup.add(centerMullion);

    const leftPaneFrame = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth + 0.04, paneHeight + 0.04, 0.05),
      frameMaterial
    );
    leftPaneFrame.position.set(-paneWidth / 2 - 0.03, 0, 0.02);
    this.windowGroup.add(leftPaneFrame);

    const leftGlass = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth, paneHeight, this.glassThickness),
      glassMaterial
    );
    leftGlass.position.set(-paneWidth / 2 - 0.03, 0, 0.02);
    this.windowGroup.add(leftGlass);
    this.glassPanes.push(leftGlass);

    const rightPaneFrame = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth + 0.04, paneHeight + 0.04, 0.05),
      frameMaterial
    );
    rightPaneFrame.position.set(paneWidth / 2 + 0.03, 0, 0.02);
    this.windowGroup.add(rightPaneFrame);

    const rightGlass = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth, paneHeight, this.glassThickness),
      glassMaterial
    );
    rightGlass.position.set(paneWidth / 2 + 0.03, 0, 0.02);
    this.windowGroup.add(rightGlass);
    this.glassPanes.push(rightGlass);

    const leftSealTop = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth + 0.08, 0.012, 0.02),
      sealMaterial
    );
    leftSealTop.position.set(-paneWidth / 2 - 0.03, paneHeight / 2 + 0.02, 0.04);
    this.windowGroup.add(leftSealTop);
    this.sealStrips.push(leftSealTop);

    const leftSealBottom = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth + 0.08, 0.012, 0.02),
      sealMaterial
    );
    leftSealBottom.position.set(-paneWidth / 2 - 0.03, -paneHeight / 2 - 0.02, 0.04);
    this.windowGroup.add(leftSealBottom);
    this.sealStrips.push(leftSealBottom);

    const leftSealLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, paneHeight + 0.08, 0.02),
      sealMaterial
    );
    leftSealLeft.position.set(-paneWidth - 0.05, 0, 0.04);
    this.windowGroup.add(leftSealLeft);
    this.sealStrips.push(leftSealLeft);

    const leftSealRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, paneHeight + 0.08, 0.02),
      sealMaterial
    );
    leftSealRight.position.set(-0.01, 0, 0.04);
    this.windowGroup.add(leftSealRight);
    this.sealStrips.push(leftSealRight);

    const rightSealTop = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth + 0.08, 0.012, 0.02),
      sealMaterial
    );
    rightSealTop.position.set(paneWidth / 2 + 0.03, paneHeight / 2 + 0.02, 0.04);
    this.windowGroup.add(rightSealTop);
    this.sealStrips.push(rightSealTop);

    const rightSealBottom = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth + 0.08, 0.012, 0.02),
      sealMaterial
    );
    rightSealBottom.position.set(paneWidth / 2 + 0.03, -paneHeight / 2 - 0.02, 0.04);
    this.windowGroup.add(rightSealBottom);
    this.sealStrips.push(rightSealBottom);

    const rightSealRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, paneHeight + 0.08, 0.02),
      sealMaterial
    );
    rightSealRight.position.set(paneWidth + 0.05, 0, 0.04);
    this.windowGroup.add(rightSealRight);
    this.sealStrips.push(rightSealRight);

    const rightSealLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, paneHeight + 0.08, 0.02),
      sealMaterial
    );
    rightSealLeft.position.set(0.01, 0, 0.04);
    this.windowGroup.add(rightSealLeft);
    this.sealStrips.push(rightSealLeft);

    const tinyGap: WindowGap = {
      position: new THREE.Vector3(0, 0, 0.02),
      width: 0.001,
      height: paneHeight * 0.3,
      depth: 0.02,
      normal: new THREE.Vector3(0, 0, 1)
    };
    this.gaps.push(tinyGap);
  }

  setWindowType(type: WindowType): void {
    this.currentType = type;
    if (type === 'sliding') {
      this.createSlidingWindow();
    } else {
      this.createCasementWindow();
    }
  }

  getWindowType(): WindowType {
    return this.currentType;
  }

  getGaps(): WindowGap[] {
    return this.gaps;
  }

  getWindowGroup(): THREE.Group {
    return this.windowGroup;
  }

  getDimensions() {
    return {
      width: this.windowWidth,
      height: this.windowHeight,
      depth: this.frameDepth
    };
  }

  isPointInsideWindow(x: number, y: number): boolean {
    return Math.abs(x) < this.windowWidth / 2 && 
           Math.abs(y) < this.windowHeight / 2;
  }

  getBottomFrameY(): number {
    return -this.windowHeight / 2 + this.frameThickness / 2;
  }

  dispose(): void {
    this.clearWindowPanes();
    this.scene.remove(this.windowGroup);
  }
}

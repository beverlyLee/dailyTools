import * as THREE from 'three';

export const WHEELCHAIR_CONFIG = {
  width: 0.65,
  length: 1.20,
  height: 1.10,
  seatHeight: 0.50,
  wheelRadius: 0.30,
  wheelWidth: 0.08,
  casterRadius: 0.10,
  backrestHeight: 0.60,
  armrestHeight: 0.25,
  armrestWidth: 0.08,
  armrestDepth: 0.55,
  footrestHeight: 0.20
};

export class WheelchairGenerator {
  private group: THREE.Group;
  private collisionBoxes: THREE.Box3[] = [];
  private grabPoints: THREE.Vector3[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Wheelchair';
  }

  generate(): THREE.Group {
    this.createFrame();
    this.createSeat();
    this.createBackrest();
    this.createArmrests();
    this.createWheels();
    this.createFootrest();
    this.updateCollisionBoxes();
    this.updateGrabPoints();
    return this.group;
  }

  private createFrame(): void {
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50, metalness: 0.7, roughness: 0.4
    });
    
    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.03, WHEELCHAIR_CONFIG.length - 0.2),
      frameMaterial
    );
    leftFrame.position.set(-WHEELCHAIR_CONFIG.width / 2 + 0.05, WHEELCHAIR_CONFIG.seatHeight / 2, 0);
    
    const rightFrame = leftFrame.clone();
    rightFrame.position.x = WHEELCHAIR_CONFIG.width / 2 - 0.05;

    const frontFrame = new THREE.Mesh(
      new THREE.BoxGeometry(WHEELCHAIR_CONFIG.width - 0.1, 0.03, 0.03),
      frameMaterial
    );
    frontFrame.position.set(0, WHEELCHAIR_CONFIG.seatHeight / 2, WHEELCHAIR_CONFIG.length / 2 - 0.1);

    const rearFrame = frontFrame.clone();
    rearFrame.position.z = -WHEELCHAIR_CONFIG.length / 2 + 0.1;

    this.group.add(leftFrame, rightFrame, frontFrame, rearFrame);
  }

  private createSeat(): void {
    const seatMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d4037, metalness: 0.1, roughness: 0.8
    });
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(
        WHEELCHAIR_CONFIG.width - 0.1,
        0.08,
        WHEELCHAIR_CONFIG.length - 0.2
      ),
      seatMaterial
    );
    seat.position.set(0, WHEELCHAIR_CONFIG.seatHeight, 0);
    this.group.add(seat);
  }

  private createBackrest(): void {
    const backrestMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d4037, metalness: 0.1, roughness: 0.8
    });
    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(
        WHEELCHAIR_CONFIG.width - 0.1,
        WHEELCHAIR_CONFIG.backrestHeight,
        0.06
      ),
      backrestMaterial
    );
    backrest.position.set(
      0,
      WHEELCHAIR_CONFIG.seatHeight + WHEELCHAIR_CONFIG.backrestHeight / 2 + 0.04,
      -WHEELCHAIR_CONFIG.length / 2 + 0.1
    );
    this.group.add(backrest);
  }

  private createArmrests(): void {
    const armrestMaterial = new THREE.MeshStandardMaterial({
      color: 0x37474f, metalness: 0.5, roughness: 0.5
    });

    const leftArmrest = new THREE.Mesh(
      new THREE.BoxGeometry(
        WHEELCHAIR_CONFIG.armrestWidth,
        0.06,
        WHEELCHAIR_CONFIG.armrestDepth
      ),
      armrestMaterial
    );
    leftArmrest.position.set(
      -WHEELCHAIR_CONFIG.width / 2 + WHEELCHAIR_CONFIG.armrestWidth / 2,
      WHEELCHAIR_CONFIG.seatHeight + WHEELCHAIR_CONFIG.armrestHeight + 0.03,
      0
    );

    const rightArmrest = leftArmrest.clone();
    rightArmrest.position.x = WHEELCHAIR_CONFIG.width / 2 - WHEELCHAIR_CONFIG.armrestWidth / 2;

    this.group.add(leftArmrest, rightArmrest);
  }

  private createWheels(): void {
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, metalness: 0.3, roughness: 0.7
    });
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x607d8b, metalness: 0.8, roughness: 0.3
    });

    const wheelGeom = new THREE.CylinderGeometry(
      WHEELCHAIR_CONFIG.wheelRadius,
      WHEELCHAIR_CONFIG.wheelRadius,
      WHEELCHAIR_CONFIG.wheelWidth,
      24
    );

    const createMainWheel = (x: number) => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(
        x,
        WHEELCHAIR_CONFIG.wheelRadius,
        -WHEELCHAIR_CONFIG.length / 2 + 0.15
      );

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(
          WHEELCHAIR_CONFIG.wheelRadius - 0.03,
          0.015,
          8,
          24
        ),
        rimMaterial
      );
      rim.rotation.y = Math.PI / 2;
      rim.position.copy(wheel.position);

      this.group.add(wheel, rim);
    };

    createMainWheel(-WHEELCHAIR_CONFIG.width / 2 + WHEELCHAIR_CONFIG.wheelWidth / 2);
    createMainWheel(WHEELCHAIR_CONFIG.width / 2 - WHEELCHAIR_CONFIG.wheelWidth / 2);

    const casterGeom = new THREE.CylinderGeometry(
      WHEELCHAIR_CONFIG.casterRadius,
      WHEELCHAIR_CONFIG.casterRadius,
      0.05,
      16
    );

    const createCasterWheel = (x: number) => {
      const wheel = new THREE.Mesh(casterGeom, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(
        x,
        WHEELCHAIR_CONFIG.casterRadius,
        WHEELCHAIR_CONFIG.length / 2 - 0.08
      );
      this.group.add(wheel);
    };

    createCasterWheel(-WHEELCHAIR_CONFIG.width / 2 + 0.08);
    createCasterWheel(WHEELCHAIR_CONFIG.width / 2 - 0.08);
  }

  private createFootrest(): void {
    const footrestMaterial = new THREE.MeshStandardMaterial({
      color: 0x37474f, metalness: 0.6, roughness: 0.4
    });
    const footrest = new THREE.Mesh(
      new THREE.BoxGeometry(
        WHEELCHAIR_CONFIG.width - 0.15,
        0.03,
        0.3
      ),
      footrestMaterial
    );
    footrest.position.set(
      0,
      WHEELCHAIR_CONFIG.footrestHeight,
      WHEELCHAIR_CONFIG.length / 2 + 0.05
    );
    this.group.add(footrest);

    const footplate = new THREE.Mesh(
      new THREE.BoxGeometry(
        WHEELCHAIR_CONFIG.width - 0.2,
        0.10,
        0.02
      ),
      footrestMaterial
    );
    footplate.position.set(
      0,
      WHEELCHAIR_CONFIG.footrestHeight + 0.05,
      WHEELCHAIR_CONFIG.length / 2 + 0.2
    );
    this.group.add(footplate);
  }

  private updateCollisionBoxes(): void {
    this.collisionBoxes = [];
    
    const bodyBox = new THREE.Box3(
      new THREE.Vector3(
        -WHEELCHAIR_CONFIG.width / 2,
        0,
        -WHEELCHAIR_CONFIG.length / 2
      ),
      new THREE.Vector3(
        WHEELCHAIR_CONFIG.width / 2,
        WHEELCHAIR_CONFIG.height,
        WHEELCHAIR_CONFIG.length / 2
      )
    );
    this.collisionBoxes.push(bodyBox);

    const mainWheelBox = new THREE.Box3(
      new THREE.Vector3(
        -WHEELCHAIR_CONFIG.width / 2 - 0.05,
        0,
        -WHEELCHAIR_CONFIG.length / 2
      ),
      new THREE.Vector3(
        -WHEELCHAIR_CONFIG.width / 2 + 0.05,
        WHEELCHAIR_CONFIG.wheelRadius * 2,
        -WHEELCHAIR_CONFIG.length / 2 + 0.3
      )
    );
    this.collisionBoxes.push(mainWheelBox);

    const rightWheelBox = mainWheelBox.clone();
    rightWheelBox.min.x = WHEELCHAIR_CONFIG.width / 2 - 0.05;
    rightWheelBox.max.x = WHEELCHAIR_CONFIG.width / 2 + 0.05;
    this.collisionBoxes.push(rightWheelBox);
  }

  private updateGrabPoints(): void {
    this.grabPoints = [
      new THREE.Vector3(
        -WHEELCHAIR_CONFIG.width / 2 + WHEELCHAIR_CONFIG.armrestWidth / 2,
        WHEELCHAIR_CONFIG.seatHeight + WHEELCHAIR_CONFIG.armrestHeight + 0.03,
        0
      ),
      new THREE.Vector3(
        WHEELCHAIR_CONFIG.width / 2 - WHEELCHAIR_CONFIG.armrestWidth / 2,
        WHEELCHAIR_CONFIG.seatHeight + WHEELCHAIR_CONFIG.armrestHeight + 0.03,
        0
      ),
      new THREE.Vector3(
        0,
        WHEELCHAIR_CONFIG.seatHeight + WHEELCHAIR_CONFIG.backrestHeight / 2,
        -WHEELCHAIR_CONFIG.length / 2 + 0.15
      )
    ];
  }

  getCollisionBoxes(): THREE.Box3[] {
    return this.collisionBoxes;
  }

  getGrabPoints(): THREE.Vector3[] {
    return this.grabPoints;
  }

  getCollisionBoxesWorld(): THREE.Box3[] {
    return this.collisionBoxes.map(box => {
      const worldBox = box.clone();
      worldBox.applyMatrix4(this.group.matrixWorld);
      return worldBox;
    });
  }
}

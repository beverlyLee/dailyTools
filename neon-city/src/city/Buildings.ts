import * as THREE from 'three';

export function createBuildings(): THREE.Group {
  const group = new THREE.Group();

  const buildingConfigs = [
    { x: -15, width: 6, depth: 6, height: 25, color: 0x1a1a2e },
    { x: -5, width: 5, depth: 5, height: 35, color: 0x16213e },
    { x: 5, width: 7, depth: 7, height: 30, color: 0x0f3460 },
    { x: 15, width: 5, depth: 5, height: 40, color: 0x1a1a2e },
    { x: -22, width: 4, depth: 4, height: 20, color: 0x16213e },
    { x: 22, width: 4, depth: 4, height: 22, color: 0x0f3460 },
  ];

  for (const config of buildingConfigs) {
    const building = createBuilding(config.width, config.depth, config.height, config.color);
    building.position.set(config.x, config.height / 2, 0);
    group.add(building);
  }

  return group;
}

function createBuilding(width: number, depth: number, height: number, color: number): THREE.Group {
  const group = new THREE.Group();

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.3,
  });
  const building = new THREE.Mesh(geometry, material);
  group.add(building);

  addWindows(group, width, depth, height);

  return group;
}

function addWindows(group: THREE.Group, width: number, depth: number, height: number): void {
  const windowGeometry = new THREE.PlaneGeometry(0.5, 0.8);
  const windowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffee88,
    transparent: true,
    opacity: 0.8,
  });

  const floors = Math.floor(height / 2);
  const windowsPerFloor = Math.floor(width / 1.5);

  for (let floor = 1; floor < floors; floor++) {
    for (let w = 0; w < windowsPerFloor; w++) {
      if (Math.random() > 0.3) {
        const windowFront = new THREE.Mesh(windowGeometry, windowMaterial.clone());
        windowFront.position.set(
          -width / 2 + 0.75 + w * 1.5,
          -height / 2 + floor * 2,
          depth / 2 + 0.01
        );
        group.add(windowFront);

        const windowBack = new THREE.Mesh(windowGeometry, windowMaterial.clone());
        windowBack.position.set(
          -width / 2 + 0.75 + w * 1.5,
          -height / 2 + floor * 2,
          -depth / 2 - 0.01
        );
        windowBack.rotation.y = Math.PI;
        group.add(windowBack);
      }
    }
  }
}

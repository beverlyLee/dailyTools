import * as THREE from 'three';

export interface BillboardConfig {
  text: string;
  position: THREE.Vector3;
  color: number;
  width?: number;
  height?: number;
}

export function createNeonBillboard(config: BillboardConfig): THREE.Group {
  const group = new THREE.Group();
  const { text, position, color, width = 6, height = 3 } = config;

  const bgGeometry = new THREE.PlaneGeometry(width, height);
  const bgMaterial = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  const bgPlane = new THREE.Mesh(bgGeometry, bgMaterial);
  bgPlane.position.z = 0;
  bgPlane.renderOrder = 0;
  group.add(bgPlane);

  const textAlphaMap = createTextAlphaMap(text);
  const textMaterial = new THREE.MeshBasicMaterial({
    color: 0x111111,
    alphaMap: textAlphaMap,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const textPlane = new THREE.Mesh(bgGeometry, textMaterial);
  textPlane.position.z = 0.02;
  textPlane.renderOrder = 1;
  group.add(textPlane);

  addGlowLayers(group, width, height, color);

  const mainLight = new THREE.PointLight(color, 3, 45, 1.5);
  mainLight.position.set(0, 0, 2);
  group.add(mainLight);

  const fillLight = new THREE.PointLight(color, 1.2, 30, 2);
  fillLight.position.set(1, 0, 1);
  group.add(fillLight);

  group.position.copy(position);

  return group;
}

function addGlowLayers(group: THREE.Group, width: number, height: number, color: number): void {
  const glowConfigs = [
    { scale: 1.08, opacity: 0.4, z: 0.05 },
    { scale: 1.2, opacity: 0.25, z: 0.08 },
    { scale: 1.4, opacity: 0.12, z: 0.11 },
    { scale: 1.65, opacity: 0.06, z: 0.14 },
    { scale: 1.95, opacity: 0.03, z: 0.17 },
  ];

  for (let i = 0; i < glowConfigs.length; i++) {
    const cfg = glowConfigs[i];
    const glowGeometry = new THREE.PlaneGeometry(width * cfg.scale, height * cfg.scale);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: cfg.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = cfg.z;
    glow.renderOrder = i + 2;
    group.add(glow);
  }
}

function createTextAlphaMap(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const width = 512;
  const height = 256;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  ctx.font = 'bold 120px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.strokeText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

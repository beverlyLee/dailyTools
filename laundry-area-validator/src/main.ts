import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DeviceModel, getDeviceModel } from './modules/DeviceModelLibrary';
import { HeatVentilationDetector } from './modules/HeatVentilationDetector';
import { DoorInterferenceDetector } from './modules/DoorInterferenceDetector';
import { DrainSlopeAnalyzer } from './modules/DrainSlopeAnalyzer';
import { FaucetCollisionDetector } from './modules/FaucetCollisionDetector';
import { StackSafetyDetector } from './modules/StackSafetyDetector';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

let washerMesh: THREE.Mesh | null = null;
let dryerMesh: THREE.Mesh | null = null;
let washerDoorMesh: THREE.Mesh | null = null;
let dryerDoorMesh: THREE.Mesh | null = null;
let faucetMesh: THREE.Group | null = null;
let drainMesh: THREE.Mesh | null = null;
let backWallMesh: THREE.Mesh | null = null;
let floorMesh: THREE.Mesh | null = null;
let sideWallLeftMesh: THREE.Mesh | null = null;
let sideWallRightMesh: THREE.Mesh | null = null;

let currentWasherModel: DeviceModel | null = null;
let currentDryerModel: DeviceModel | null = null;
let showDoors = true;
let hasBracket = false;

const config = {
  layoutMode: 'stacked' as 'stacked' | 'sidebyside' | 'washer_only',
  washerModelId: 'siemens_wm14p2680w',
  dryerModelId: 'siemens_wt47w5680w',
  balconyDepth: 150,
  balconyWidth: 200,
  backWallDist: 5,
  faucetHeight: 110,
  faucetDepth: 8,
  drainX: 60,
  drainZ: 40
};

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 500, 1000);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(200, 180, 250);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 80;
  controls.maxDistance = 500;
  controls.maxPolarAngle = Math.PI / 2 - 0.1;

  createLights();
  createFloor();
  createBackWall();
  createSideWalls();
  createFaucet();
  createDrain();

  loadWasherModel();
  loadDryerModel();

  setupEventListeners();

  animate();
}

function createLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 200, 100);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 1000;
  directionalLight.shadow.camera.left = -300;
  directionalLight.shadow.camera.right = 300;
  directionalLight.shadow.camera.top = 300;
  directionalLight.shadow.camera.bottom = -300;
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0x81d4fa, 0.3);
  fillLight.position.set(-50, 100, -50);
  scene.add(fillLight);
}

function createFloor() {
  const geometry = new THREE.PlaneGeometry(config.balconyWidth, config.balconyDepth);
  const material = new THREE.MeshStandardMaterial({
    color: 0x37474f,
    roughness: 0.8,
    metalness: 0.2
  });
  floorMesh = new THREE.Mesh(geometry, material);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const gridHelper = new THREE.GridHelper(Math.max(config.balconyWidth, config.balconyDepth), 20, 0x455a64, 0x263238);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
}

function createBackWall() {
  const geometry = new THREE.PlaneGeometry(config.balconyWidth, 250);
  const material = new THREE.MeshStandardMaterial({
    color: 0x546e7a,
    roughness: 0.7,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  backWallMesh = new THREE.Mesh(geometry, material);
  backWallMesh.position.set(config.balconyWidth / 2, 125, -config.backWallDist);
  scene.add(backWallMesh);
}

function createSideWalls() {
  const leftGeometry = new THREE.PlaneGeometry(config.balconyDepth + config.backWallDist * 2, 250);
  const leftMaterial = new THREE.MeshStandardMaterial({
    color: 0x607d8b,
    roughness: 0.7,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  sideWallLeftMesh = new THREE.Mesh(leftGeometry, leftMaterial);
  sideWallLeftMesh.position.set(0, 125, config.balconyDepth / 2 - config.backWallDist);
  sideWallLeftMesh.rotation.y = Math.PI / 2;
  scene.add(sideWallLeftMesh);

  const rightGeometry = new THREE.PlaneGeometry(config.balconyDepth + config.backWallDist * 2, 250);
  const rightMaterial = new THREE.MeshStandardMaterial({
    color: 0x607d8b,
    roughness: 0.7,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  sideWallRightMesh = new THREE.Mesh(rightGeometry, rightMaterial);
  sideWallRightMesh.position.set(config.balconyWidth, 125, config.balconyDepth / 2 - config.backWallDist);
  sideWallRightMesh.rotation.y = -Math.PI / 2;
  scene.add(sideWallRightMesh);
}

function createFaucet() {
  const group = new THREE.Group();

  const pipeGeometry = new THREE.CylinderGeometry(3, 3, config.faucetHeight - 50, 16);
  const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.8, roughness: 0.2 });
  const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
  pipe.position.y = (config.faucetHeight - 50) / 2;
  pipe.position.x = config.balconyWidth / 2;
  pipe.position.z = -config.backWallDist + 2;
  group.add(pipe);

  const spoutGeometry = new THREE.CylinderGeometry(2, 2, config.faucetDepth, 16);
  const spoutMaterial = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.8, roughness: 0.2 });
  const spout = new THREE.Mesh(spoutGeometry, spoutMaterial);
  spout.position.y = config.faucetHeight - 25;
  spout.position.x = config.balconyWidth / 2;
  spout.position.z = -config.backWallDist + 2 + config.faucetDepth / 2;
  spout.rotation.z = Math.PI / 2;
  group.add(spout);

  const handleGeometry = new THREE.BoxGeometry(10, 2, 8);
  const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xff9800, metalness: 0.9, roughness: 0.1 });
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.y = config.faucetHeight - 15;
  handle.position.x = config.balconyWidth / 2 + 8;
  handle.position.z = -config.backWallDist + 2;
  group.add(handle);

  faucetMesh = group;
  scene.add(group);
}

function createDrain() {
  const ringGeometry = new THREE.RingGeometry(8, 12, 32);
  const ringMaterial = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.8, metalness: 0.3, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.set(config.drainX, 0.02, config.drainZ - config.backWallDist);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  const drainGeometry = new THREE.CylinderGeometry(6, 8, 5, 32);
  const drainMaterial = new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.9, metalness: 0.1 });
  drainMesh = new THREE.Mesh(drainGeometry, drainMaterial);
  drainMesh.position.set(config.drainX, -2.5, config.drainZ - config.backWallDist);
  scene.add(drainMesh);
}

function createApplianceMesh(model: DeviceModel, color: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(
    model.dimensions.width,
    model.dimensions.height,
    model.dimensions.depth
  );
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.6
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createDoorMesh(model: DeviceModel, color: number): THREE.Mesh {
  const doorWidth = 3;
  const doorHeight = model.dimensions.height * 0.8;
  const doorDepth = model.door.doorRadius * 2;

  const geometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.4,
    metalness: 0.7,
    transparent: true,
    opacity: 0.7
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

function loadWasherModel() {
  if (washerMesh) {
    scene.remove(washerMesh);
  }
  if (washerDoorMesh) {
    scene.remove(washerDoorMesh);
  }

  currentWasherModel = getDeviceModel('washer', config.washerModelId);
  if (!currentWasherModel) return;

  washerMesh = createApplianceMesh(currentWasherModel, 0x42a5f5);
  updateWasherPosition();
  scene.add(washerMesh);

  if (showDoors) {
    washerDoorMesh = createDoorMesh(currentWasherModel, 0x64b5f6);
    updateWasherDoorPosition();
    scene.add(washerDoorMesh);
  }

  updateDeviceInfo('washer', currentWasherModel);
}

function loadDryerModel() {
  if (dryerMesh) {
    scene.remove(dryerMesh);
  }
  if (dryerDoorMesh) {
    scene.remove(dryerDoorMesh);
  }

  currentDryerModel = getDeviceModel('dryer', config.dryerModelId);
  if (!currentDryerModel) return;

  if (config.layoutMode !== 'washer_only') {
    dryerMesh = createApplianceMesh(currentDryerModel, 0xffa726);
    updateDryerPosition();
    scene.add(dryerMesh);

    if (showDoors) {
      dryerDoorMesh = createDoorMesh(currentDryerModel, 0xffb74d);
      updateDryerDoorPosition();
      scene.add(dryerDoorMesh);
    }
  }

  updateDeviceInfo('dryer', currentDryerModel);
}

function updateWasherPosition() {
  if (!washerMesh || !currentWasherModel) return;

  let x: number, y: number, z: number;

  if (config.layoutMode === 'stacked') {
    x = (config.balconyWidth - currentWasherModel.dimensions.width) / 2;
    y = currentWasherModel.dimensions.height / 2;
    z = config.backWallDist + currentWasherModel.dimensions.depth / 2;
  } else if (config.layoutMode === 'sidebyside') {
    x = (config.balconyWidth - currentWasherModel.dimensions.width - currentDryerModel!.dimensions.width) / 3;
    y = currentWasherModel.dimensions.height / 2;
    z = config.backWallDist + currentWasherModel.dimensions.depth / 2;
  } else {
    x = (config.balconyWidth - currentWasherModel.dimensions.width) / 2;
    y = currentWasherModel.dimensions.height / 2;
    z = config.backWallDist + currentWasherModel.dimensions.depth / 2;
  }

  washerMesh.position.set(x, y, z);
}

function updateDryerPosition() {
  if (!dryerMesh || !currentDryerModel) return;

  let x: number, y: number, z: number;

  if (config.layoutMode === 'stacked') {
    x = (config.balconyWidth - currentDryerModel.dimensions.width) / 2;
    y = currentWasherModel!.dimensions.height + currentDryerModel.dimensions.height / 2;
    z = config.backWallDist + currentDryerModel.dimensions.depth / 2;
  } else if (config.layoutMode === 'sidebyside') {
    x = (config.balconyWidth - currentWasherModel!.dimensions.width - currentDryerModel.dimensions.width) / 3 * 2 + currentWasherModel!.dimensions.width;
    y = currentDryerModel.dimensions.height / 2;
    z = config.backWallDist + currentDryerModel.dimensions.depth / 2;
  } else {
    return;
  }

  dryerMesh.position.set(x, y, z);
}

function updateWasherDoorPosition() {
  if (!washerDoorMesh || !washerMesh || !currentWasherModel) return;

  const door = currentWasherModel.door;
  washerDoorMesh.position.set(
    washerMesh.position.x + currentWasherModel.dimensions.width / 2 + door.interferenceRadius,
    washerMesh.position.y,
    washerMesh.position.z
  );
  washerDoorMesh.rotation.y = Math.PI / 2;
}

function updateDryerDoorPosition() {
  if (!dryerDoorMesh || !dryerMesh || !currentDryerModel) return;

  const door = currentDryerModel.door;
  dryerDoorMesh.position.set(
    dryerMesh.position.x + currentDryerModel.dimensions.width / 2 + door.interferenceRadius,
    dryerMesh.position.y,
    dryerMesh.position.z
  );
  dryerDoorMesh.rotation.y = Math.PI / 2;
}

function updateDeviceInfo(type: 'washer' | 'dryer', model: DeviceModel) {
  const element = document.getElementById(type === 'washer' ? 'washerInfo' : 'dryerInfo');
  if (!element) return;

  element.innerHTML = `
    <div><span>品牌</span><span>${model.brand}</span></div>
    <div><span>型号</span><span>${model.model}</span></div>
    <div><span>尺寸</span><span>${model.dimensions.width}×${model.dimensions.depth}×${model.dimensions.height} cm</span></div>
    <div><span>重量</span><span>${model.weight} kg</span></div>
    <div><span>描述</span><span>${model.description}</span></div>
  `;
}

function runAllChecks() {
  if (!currentWasherModel) return;

  const washerPos = washerMesh?.position || { x: 0, y: 0, z: 0 };
  const dryerPos = dryerMesh?.position || { x: 0, y: 0, z: 0 };

  const faucetPos = {
    x: config.balconyWidth / 2,
    y: config.faucetHeight,
    z: -config.backWallDist + 2 + config.faucetDepth
  };

  const results = [];

  const heatResult = HeatVentilationDetector.check(currentDryerModel, config.backWallDist);
  results.push({ ...heatResult, category: '散热检测' });

  const washerDoorResult = DoorInterferenceDetector.checkWasherDoor(
    currentWasherModel,
    washerPos,
    faucetPos,
    5,
    config.balconyWidth
  );
  results.push({ ...washerDoorResult, category: '洗衣机门干涉' });

  const dryerDoorResult = DoorInterferenceDetector.checkDryerDoor(
    currentDryerModel,
    dryerPos,
    faucetPos,
    5,
    config.balconyWidth
  );
  results.push({ ...dryerDoorResult, category: '烘干机门干涉' });

  const drainResult = DrainSlopeAnalyzer.analyze(
    config.balconyWidth,
    config.balconyDepth,
    { x: config.drainX, z: config.drainZ },
    { x: washerPos.x, z: washerPos.z },
    currentWasherModel.dimensions,
    config.layoutMode !== 'washer_only' ? { x: dryerPos.x, z: dryerPos.z } : undefined,
    currentDryerModel?.dimensions
  );
  results.push({ ...drainResult, category: '地漏坡度' });

  const faucetResult = FaucetCollisionDetector.check(
    currentWasherModel,
    washerPos,
    faucetPos,
    5,
    currentDryerModel,
    config.layoutMode !== 'washer_only' ? dryerPos : undefined
  );
  results.push({ ...faucetResult, category: '龙头碰撞' });

  const stackResult = StackSafetyDetector.check(currentWasherModel, currentDryerModel, hasBracket);
  results.push({ ...stackResult, category: '叠放安全' });

  displayResults(results);
}

function displayResults(results: Array<{ riskLevel: 'safe' | 'warning' | 'danger'; message: string; detail: string; category: string }>) {
  const resultList = document.getElementById('resultList');
  const overallStatus = document.getElementById('overallStatus');
  if (!resultList || !overallStatus) return;

  resultList.innerHTML = '';

  const hasError = results.some(r => r.riskLevel === 'danger');
  const hasWarning = results.some(r => r.riskLevel === 'warning') && !hasError;

  if (hasError) {
    overallStatus.className = 'overall-status overall-error';
    overallStatus.textContent = '❌ 存在严重风险';
  } else if (hasWarning) {
    overallStatus.className = 'overall-status overall-warn';
    overallStatus.textContent = '⚠️ 存在警告项';
  } else {
    overallStatus.className = 'overall-status overall-pass';
    overallStatus.textContent = '✅ 检测通过';
  }

  results.forEach(result => {
    const item = document.createElement('div');
    item.className = `result-item result-${result.riskLevel}`;
    item.innerHTML = `
      <span class="icon">${result.riskLevel === 'safe' ? '✓' : result.riskLevel === 'warning' ? '⚠' : '✕'}</span>
      <span><strong>${result.category}</strong>: ${result.message}</span>
      <div class="detail">${result.detail}</div>
    `;
    resultList.appendChild(item);
  });
}

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);

  document.getElementById('layoutMode')?.addEventListener('change', (e) => {
    config.layoutMode = (e.target as HTMLSelectElement).value as 'stacked' | 'sidebyside' | 'washer_only';
    const dryerSection = document.getElementById('dryerSection');
    if (dryerSection) {
      dryerSection.style.display = config.layoutMode === 'washer_only' ? 'none' : 'block';
    }
    updatePositions();
  });

  document.getElementById('washerModel')?.addEventListener('change', (e) => {
    config.washerModelId = (e.target as HTMLSelectElement).value;
    loadWasherModel();
  });

  document.getElementById('dryerModel')?.addEventListener('change', (e) => {
    config.dryerModelId = (e.target as HTMLSelectElement).value;
    loadDryerModel();
  });

  document.getElementById('balconyDepth')?.addEventListener('input', (e) => {
    config.balconyDepth = parseFloat((e.target as HTMLInputElement).value);
    document.getElementById('depthValue')!.textContent = `${config.balconyDepth} cm`;
    updateFloorAndWalls();
  });

  document.getElementById('balconyWidth')?.addEventListener('input', (e) => {
    config.balconyWidth = parseFloat((e.target as HTMLInputElement).value);
    document.getElementById('widthValue')!.textContent = `${config.balconyWidth} cm`;
    updateFloorAndWalls();
    updatePositions();
    updateFaucetPosition();
  });

  document.getElementById('backWallDist')?.addEventListener('input', (e) => {
    config.backWallDist = parseFloat((e.target as HTMLInputElement).value);
    document.getElementById('backWallValue')!.textContent = `${config.backWallDist} cm`;
    updateBackWallPosition();
    updatePositions();
    updateFaucetPosition();
    updateDrainPosition();
  });

  document.getElementById('faucetHeight')?.addEventListener('input', (e) => {
    config.faucetHeight = parseFloat((e.target as HTMLInputElement).value);
    document.getElementById('faucetHeightValue')!.textContent = `${config.faucetHeight} cm`;
    updateFaucetPosition();
  });

  document.getElementById('faucetDepth')?.addEventListener('input', (e) => {
    config.faucetDepth = parseFloat((e.target as HTMLInputElement).value);
    document.getElementById('faucetDepthValue')!.textContent = `${config.faucetDepth} cm`;
    updateFaucetPosition();
  });

  document.getElementById('drainX')?.addEventListener('input', (e) => {
    config.drainX = parseFloat((e.target as HTMLInputElement).value);
    document.getElementById('drainXValue')!.textContent = `${config.drainX} cm`;
    updateDrainPosition();
  });

  document.getElementById('drainZ')?.addEventListener('input', (e) => {
    config.drainZ = parseFloat((e.target as HTMLInputElement).value);
    document.getElementById('drainZValue')!.textContent = `${config.drainZ} cm`;
    updateDrainPosition();
  });

  document.getElementById('showDoors')?.addEventListener('change', (e) => {
    showDoors = (e.target as HTMLInputElement).checked;
    if (showDoors) {
      if (!washerDoorMesh && currentWasherModel) {
        washerDoorMesh = createDoorMesh(currentWasherModel, 0x64b5f6);
        updateWasherDoorPosition();
        scene.add(washerDoorMesh);
      }
      if (!dryerDoorMesh && currentDryerModel && config.layoutMode !== 'washer_only') {
        dryerDoorMesh = createDoorMesh(currentDryerModel, 0xffb74d);
        updateDryerDoorPosition();
        scene.add(dryerDoorMesh);
      }
    } else {
      if (washerDoorMesh) {
        scene.remove(washerDoorMesh);
        washerDoorMesh = null;
      }
      if (dryerDoorMesh) {
        scene.remove(dryerDoorMesh);
        dryerDoorMesh = null;
      }
    }
  });

  document.getElementById('hasBracket')?.addEventListener('change', (e) => {
    hasBracket = (e.target as HTMLInputElement).checked;
  });

  document.getElementById('runCheckBtn')?.addEventListener('click', runAllChecks);

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    config.layoutMode = 'stacked';
    config.washerModelId = 'siemens_wm14p2680w';
    config.dryerModelId = 'siemens_wt47w5680w';
    config.balconyDepth = 150;
    config.balconyWidth = 200;
    config.backWallDist = 5;
    config.faucetHeight = 110;
    config.faucetDepth = 8;
    config.drainX = 60;
    config.drainZ = 40;
    showDoors = true;
    hasBracket = false;

    (document.getElementById('layoutMode') as HTMLSelectElement).value = 'stacked';
    (document.getElementById('washerModel') as HTMLSelectElement).value = 'siemens_wm14p2680w';
    (document.getElementById('dryerModel') as HTMLSelectElement).value = 'siemens_wt47w5680w';
    (document.getElementById('balconyDepth') as HTMLInputElement).value = '150';
    (document.getElementById('balconyWidth') as HTMLInputElement).value = '200';
    (document.getElementById('backWallDist') as HTMLInputElement).value = '5';
    (document.getElementById('faucetHeight') as HTMLInputElement).value = '110';
    (document.getElementById('faucetDepth') as HTMLInputElement).value = '8';
    (document.getElementById('drainX') as HTMLInputElement).value = '60';
    (document.getElementById('drainZ') as HTMLInputElement).value = '40';
    (document.getElementById('showDoors') as HTMLInputElement).checked = true;
    (document.getElementById('hasBracket') as HTMLInputElement).checked = false;

    document.getElementById('depthValue')!.textContent = '150 cm';
    document.getElementById('widthValue')!.textContent = '200 cm';
    document.getElementById('backWallValue')!.textContent = '5 cm';
    document.getElementById('faucetHeightValue')!.textContent = '110 cm';
    document.getElementById('faucetDepthValue')!.textContent = '8 cm';
    document.getElementById('drainXValue')!.textContent = '60 cm';
    document.getElementById('drainZValue')!.textContent = '40 cm';

    const dryerSection = document.getElementById('dryerSection');
    if (dryerSection) {
      dryerSection.style.display = 'block';
    }

    loadWasherModel();
    loadDryerModel();
    updateFloorAndWalls();
    updateBackWallPosition();
    updateFaucetPosition();
    updateDrainPosition();
  });
}

function updateFloorAndWalls() {
  if (floorMesh) {
    floorMesh.geometry.dispose();
    floorMesh.geometry = new THREE.PlaneGeometry(config.balconyWidth, config.balconyDepth);
  }

  if (backWallMesh) {
    backWallMesh.geometry.dispose();
    backWallMesh.geometry = new THREE.PlaneGeometry(config.balconyWidth, 250);
    backWallMesh.position.x = config.balconyWidth / 2;
  }

  if (sideWallLeftMesh) {
    sideWallLeftMesh.geometry.dispose();
    sideWallLeftMesh.geometry = new THREE.PlaneGeometry(config.balconyDepth + config.backWallDist * 2, 250);
    sideWallLeftMesh.position.z = config.balconyDepth / 2 - config.backWallDist;
  }

  if (sideWallRightMesh) {
    sideWallRightMesh.geometry.dispose();
    sideWallRightMesh.geometry = new THREE.PlaneGeometry(config.balconyDepth + config.backWallDist * 2, 250);
    sideWallRightMesh.position.x = config.balconyWidth;
    sideWallRightMesh.position.z = config.balconyDepth / 2 - config.backWallDist;
  }
}

function updateBackWallPosition() {
  if (backWallMesh) {
    backWallMesh.position.z = -config.backWallDist;
  }
}

function updateFaucetPosition() {
  if (!faucetMesh) return;

  faucetMesh.position.x = config.balconyWidth / 2;
  faucetMesh.children[0].position.y = (config.faucetHeight - 50) / 2;
  faucetMesh.children[0].position.z = -config.backWallDist + 2;
  faucetMesh.children[1].position.y = config.faucetHeight - 25;
  faucetMesh.children[1].position.z = -config.backWallDist + 2 + config.faucetDepth / 2;
  faucetMesh.children[2].position.y = config.faucetHeight - 15;
  faucetMesh.children[2].position.x = config.balconyWidth / 2 + 8;
  faucetMesh.children[2].position.z = -config.backWallDist + 2;
}

function updateDrainPosition() {
  if (drainMesh) {
    drainMesh.position.x = config.drainX;
    drainMesh.position.z = config.drainZ - config.backWallDist;
  }
}

function updatePositions() {
  updateWasherPosition();
  updateDryerPosition();
  updateWasherDoorPosition();
  updateDryerDoorPosition();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();

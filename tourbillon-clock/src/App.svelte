<script>
import { onMount, onDestroy } from 'svelte';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import TourbillonCage from './components/TourbillonCage.svelte';
import EscapeWheel from './components/EscapeWheel.svelte';
import WatchHands from './components/WatchHands.svelte';

let canvasContainer;
let scene;
let camera;
let renderer;
let controls;
let animationId;
let clock;

let cageUpdateFn = $state(null);
let escapeUpdateFn = $state(null);
let handsUpdateFn = $state(null);
let getFourthWheelRotationFn = $state(null);

let currentTime = $state('');
let cageSpeed = $state('1.00');
let fps = $state('60');
let fourthWheelRotation = $state(0);
let totalElapsed = $state(0);

const cageRotationSpeed = 2 * Math.PI;
const escapeWheelSpeed = cageRotationSpeed * 60;

const SECOND_TO_MINUTE_RATIO = 60;
const MINUTE_TO_HOUR_RATIO = 12;
const SECOND_TO_HOUR_RATIO = SECOND_TO_MINUTE_RATIO * MINUTE_TO_HOUR_RATIO;

function initThreeJS() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);
  scene.fog = new THREE.FogExp2(0x0a0a0f, 0.08);

  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 2.5, 3.5);
  camera.lookAt(0, 0.1, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvasContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI / 2 + 0.2;
  controls.target.set(0, 0.1, 0);
  controls.enablePan = false;

  setupLighting();
  createEnvironment();

  clock = new THREE.Clock();
}

function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0x404050, 0.4);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(3, 5, 3);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 15;
  mainLight.shadow.camera.left = -3;
  mainLight.shadow.camera.right = 3;
  mainLight.shadow.camera.top = 3;
  mainLight.shadow.camera.bottom = -3;
  mainLight.shadow.bias = -0.0001;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xb76e79, 0.5);
  fillLight.position.set(-3, 2, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x4488ff, 0.4);
  rimLight.position.set(0, 3, -4);
  scene.add(rimLight);

  const pointLight1 = new THREE.PointLight(0xffcc88, 0.6, 5);
  pointLight1.position.set(1.5, 1.5, 1.5);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x88aaff, 0.4, 4);
  pointLight2.position.set(-1.5, 1, -1);
  scene.add(pointLight2);
}

function createEnvironment() {
  const basePlateGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.15, 64);
  const basePlateMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a3a,
    metalness: 0.8,
    roughness: 0.3,
    envMapIntensity: 0.8
  });
  const basePlate = new THREE.Mesh(basePlateGeo, basePlateMat);
  basePlate.position.y = -0.6;
  basePlate.receiveShadow = true;
  scene.add(basePlate);

  const ringGeo = new THREE.TorusGeometry(1.5, 0.02, 16, 100);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xb76e79,
    metalness: 0.9,
    roughness: 0.2,
    envMapIntensity: 1.2
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.5;
  scene.add(ring);

  const innerRingGeo = new THREE.TorusGeometry(1.1, 0.015, 12, 80);
  const innerRingMat = new THREE.MeshStandardMaterial({
    color: 0x8899aa,
    metalness: 0.95,
    roughness: 0.15,
    envMapIntensity: 1.3
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = -0.52;
  scene.add(innerRing);

  const dialMarkersGroup = new THREE.Group();
  dialMarkersGroup.position.y = -0.48;
  
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const isHour = i % 5 === 0;
    const length = isHour ? 0.08 : 0.04;
    const width = isHour ? 0.012 : 0.004;
    const radius = 1.35;
    
    const markerGeo = new THREE.BoxGeometry(width, 0.01, length);
    const markerMat = new THREE.MeshStandardMaterial({
      color: isHour ? 0xb76e79 : 0x8899aa,
      metalness: 0.9,
      roughness: 0.2
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    
    marker.position.set(
      Math.cos(angle) * (radius - length/2),
      0,
      Math.sin(angle) * (radius - length/2)
    );
    marker.rotation.y = -angle;
    marker.castShadow = true;
    dialMarkersGroup.add(marker);
  }
  scene.add(dialMarkersGroup);

  const groundGeo = new THREE.PlaneGeometry(30, 30);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0f,
    metalness: 0.1,
    roughness: 0.9
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.5;
  ground.receiveShadow = true;
  scene.add(ground);

  const backPlateGeo = new THREE.CircleGeometry(3, 64);
  const backPlateMat = new THREE.MeshStandardMaterial({
    color: 0x0f0f18,
    metalness: 0.3,
    roughness: 0.8
  });
  const backPlate = new THREE.Mesh(backPlateGeo, backPlateMat);
  backPlate.position.set(0, 0.5, -2.5);
  backPlate.receiveShadow = true;
  scene.add(backPlate);
}

function animate() {
  animationId = requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);
  totalElapsed += deltaTime;

  if (cageUpdateFn) cageUpdateFn(deltaTime);
  
  if (getFourthWheelRotationFn) {
    fourthWheelRotation = getFourthWheelRotationFn();
  }
  
  if (escapeUpdateFn) escapeUpdateFn(deltaTime);
  if (handsUpdateFn) handsUpdateFn(deltaTime);

  controls.update();
  renderer.render(scene, camera);

  fps = Math.round(1 / deltaTime).toString();
  
  const secondAngle = fourthWheelRotation;
  const totalSeconds = (secondAngle / (Math.PI * 2)) * 60;
  const displaySeconds = totalSeconds % 43200;
  
  const h = Math.floor(displaySeconds / 3600);
  const m = Math.floor((displaySeconds % 3600) / 60);
  const s = Math.floor(displaySeconds % 60);
  currentTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  
  cageSpeed = (1).toFixed(2);
}

function handleResize() {
  if (!canvasContainer || !camera || !renderer) return;
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

onMount(() => {
  initThreeJS();
  animate();
  window.addEventListener('resize', handleResize);
});

onDestroy(() => {
  window.removeEventListener('resize', handleResize);
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  if (renderer) {
    renderer.dispose();
    if (renderer.domElement && canvasContainer) {
      canvasContainer.removeChild(renderer.domElement);
    }
  }
  if (controls) {
    controls.dispose();
  }
});
</script>

<div class="app-container">
  <div class="canvas-container" bind:this={canvasContainer}></div>
  
  {#if scene}
    <TourbillonCage 
      {scene} 
      position={new THREE.Vector3(0, 0, 0)}
      cageRotationSpeed={cageRotationSpeed}
      bind:updateFn={cageUpdateFn}
      bind:getFourthWheelRotationFn={getFourthWheelRotationFn}
    />
    
    <EscapeWheel 
      {scene} 
      position={new THREE.Vector3(0, 0, 0)}
      escapeWheelSpeed={escapeWheelSpeed}
      bind:updateFn={escapeUpdateFn}
    />
    
    <WatchHands 
      {scene} 
      position={new THREE.Vector3(0, 0, 0)}
      fourthWheelRotation={fourthWheelRotation}
      bind:updateFn={handsUpdateFn}
    />
  {/if}
  
  <div class="ui-overlay">
    <div class="title-panel">
      <h1 class="title">TOURBILLON</h1>
      <p class="subtitle">精密机械艺术展示</p>
    </div>
    
    <div class="info-panel">
      <div class="info-row">
        <span class="label">时间</span>
        <span class="value">{currentTime}</span>
      </div>
      <div class="info-row">
        <span class="label">笼架转速</span>
        <span class="value">{cageSpeed} rps</span>
      </div>
      <div class="info-row">
        <span class="label">传动比</span>
        <span class="value">80:60→60:1</span>
      </div>
      <div class="info-row">
        <span class="label">帧率</span>
        <span class="value">{fps} FPS</span>
      </div>
    </div>
    
    <div class="hint-panel">
      <span>拖拽旋转 · 滚轮缩放</span>
    </div>
  </div>
</div>

<style>
.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #0a0a0f;
}

.canvas-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.title-panel {
  position: absolute;
  top: 32px;
  left: 32px;
  pointer-events: none;
}

.title {
  font-family: 'Playfair Display', 'Times New Roman', serif;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 8px;
  color: #b76e79;
  margin: 0;
  text-shadow: 0 2px 20px rgba(183, 110, 121, 0.3);
}

.subtitle {
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px;
  letter-spacing: 4px;
  color: #8899aa;
  margin: 8px 0 0 2px;
  font-style: italic;
}

.info-panel {
  position: absolute;
  bottom: 32px;
  right: 32px;
  background: rgba(15, 15, 24, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(136, 153, 170, 0.2);
  border-radius: 12px;
  padding: 20px 24px;
  min-width: 220px;
  pointer-events: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(136, 153, 170, 0.1);
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 12px;
  color: #667788;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.value {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 13px;
  color: #c0c0c0;
  font-weight: 500;
}

.hint-panel {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Cormorant Garamond', serif;
  font-size: 13px;
  color: #556677;
  letter-spacing: 2px;
  pointer-events: none;
  opacity: 0.7;
}

:global(body) {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #0a0a0f;
}

:global(#app) {
  width: 100vw;
  height: 100vh;
}
</style>

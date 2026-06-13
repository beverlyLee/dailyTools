import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLASS_TYPES, createGlassMaterial } from './modules/glassMaterialLib.js';
import { computeBatchRefraction } from './modules/lightTransmission.js';
import { performPrivacyCheck } from './modules/privacyDetection.js';
import { BlurProcessor } from './modules/blurProcessor.js';
import { evaluateDaylight } from './modules/daylightEval.js';

let scene, camera, renderer, controls;
let glassMesh, glassMaterial;
let humanGroup;
let blurProcessor;
let currentGlassType = 'ribbed';
let privacyDynamicLevel = 0;
let glassPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let windowArea = 2.0 * 2.5;
let sunDirection = new THREE.Vector3(0.3, -0.5, -0.8).normalize();
let lastAnalysisTime = 0;
const ANALYSIS_THROTTLE_MS = 80;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.FogExp2(0x0d1117, 0.03);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.7, 4.5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.2, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 12;
  controls.update();

  blurProcessor = new BlurProcessor(renderer, scene, camera);

  createEnvironment();
  createBathroom();
  createHumanModel();
  createGlassWindow();
  createLighting();
  setupUI();

  controls.addEventListener('change', onControlsChange);

  updateAnalysis();

  window.addEventListener('resize', onResize);
  animate();
}

function createEnvironment() {
  const groundGeo = new THREE.PlaneGeometry(40, 40);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a22, roughness: 0.9, metalness: 0.0
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  const skyGeo = new THREE.SphereGeometry(20, 32, 32);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x0d1117, side: THREE.BackSide
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
}

function createBathroom() {
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe8e0d4, roughness: 0.8, metalness: 0.0, side: THREE.BackSide
  });
  const wallThick = 0.15;
  const roomW = 4, roomH = 3, roomD = 3.5;

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, wallThick), wallMat);
  backWall.position.set(0, roomH / 2, -roomD / 2);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, roomH, roomD), wallMat);
  leftWall.position.set(-roomW / 2, roomH / 2, 0);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, roomH, roomD), wallMat);
  rightWall.position.set(roomW / 2, roomH / 2, 0);
  scene.add(rightWall);

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xb8a898, roughness: 0.7, metalness: 0.1
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e8, roughness: 0.9, side: THREE.BackSide
  });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = roomH;
  scene.add(ceiling);

  const showerMat = new THREE.MeshStandardMaterial({
    color: 0x90a0b0, roughness: 0.4, metalness: 0.3
  });
  const showerHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.04, 16), showerMat
  );
  showerHead.position.set(-1.2, 2.7, -1.2);
  scene.add(showerHead);

  const showerArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8), showerMat
  );
  showerArm.rotation.z = Math.PI / 2;
  showerArm.position.set(-1.0, 2.7, -1.2);
  scene.add(showerArm);

  const towelMat = new THREE.MeshStandardMaterial({ color: 0xc05050, roughness: 0.9 });
  const towel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.05), towelMat);
  towel.position.set(1.8, 1.5, -1.65);
  scene.add(towel);

  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x606060, metalness: 0.5, roughness: 0.3 });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.15), shelfMat);
  shelf.position.set(1.8, 1.8, -1.6);
  scene.add(shelf);
}

function createHumanModel() {
  humanGroup = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd4a574, roughness: 0.7, metalness: 0.0
  });

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x3a5f8a, roughness: 0.6, metalness: 0.0
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), skinMat);
  head.position.set(0, 1.72, 0);
  head.castShadow = true;
  humanGroup.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8), skinMat);
  neck.position.set(0, 1.6, 0);
  humanGroup.add(neck);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.55, 12), bodyMat);
  torso.position.set(0, 1.28, 0);
  torso.castShadow = true;
  humanGroup.add(torso);

  const hip = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.15, 12), bodyMat);
  hip.position.set(0, 0.93, 0);
  humanGroup.add(hip);

  const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.3, 8), bodyMat);
  leftUpperArm.position.set(-0.25, 1.35, 0);
  leftUpperArm.rotation.z = 0.15;
  humanGroup.add(leftUpperArm);

  const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.3, 8), bodyMat);
  rightUpperArm.position.set(0.25, 1.35, 0);
  rightUpperArm.rotation.z = -0.15;
  humanGroup.add(rightUpperArm);

  const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.28, 8), skinMat);
  leftForearm.position.set(-0.3, 1.08, 0);
  leftForearm.rotation.z = 0.1;
  humanGroup.add(leftForearm);

  const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.28, 8), skinMat);
  rightForearm.position.set(0.3, 1.08, 0);
  rightForearm.rotation.z = -0.1;
  humanGroup.add(rightForearm);

  const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.4, 8), bodyMat);
  leftThigh.position.set(-0.09, 0.65, 0);
  humanGroup.add(leftThigh);

  const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.4, 8), bodyMat);
  rightThigh.position.set(0.09, 0.65, 0);
  humanGroup.add(rightThigh);

  const leftCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.38, 8), skinMat);
  leftCalf.position.set(-0.09, 0.26, 0);
  humanGroup.add(leftCalf);

  const rightCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.38, 8), skinMat);
  rightCalf.position.set(0.09, 0.26, 0);
  humanGroup.add(rightCalf);

  humanGroup.position.set(0, 0, -0.8);
  scene.add(humanGroup);
}

function createGlassWindow() {
  const glassGeo = new THREE.PlaneGeometry(2.0, 2.5, 1, 1);
  glassMaterial = createGlassMaterial(currentGlassType);
  glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
  glassMesh.position.set(0, 1.25, 0.01);
  scene.add(glassMesh);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x505050, metalness: 0.6, roughness: 0.3
  });
  const frameThick = 0.06;
  const frameDepth = 0.08;
  const winW = 2.0, winH = 2.5;

  const topFrame = new THREE.Mesh(
    new THREE.BoxGeometry(winW + frameThick * 2, frameThick, frameDepth), frameMat
  );
  topFrame.position.set(0, winH + frameThick / 2, 0);
  scene.add(topFrame);

  const bottomFrame = new THREE.Mesh(
    new THREE.BoxGeometry(winW + frameThick * 2, frameThick, frameDepth), frameMat
  );
  bottomFrame.position.set(0, -frameThick / 2, 0);
  scene.add(bottomFrame);

  const leftFrame = new THREE.Mesh(
    new THREE.BoxGeometry(frameThick, winH, frameDepth), frameMat
  );
  leftFrame.position.set(-winW / 2 - frameThick / 2, winH / 2, 0);
  scene.add(leftFrame);

  const rightFrame = new THREE.Mesh(
    new THREE.BoxGeometry(frameThick, winH, frameDepth), frameMat
  );
  rightFrame.position.set(winW / 2 + frameThick / 2, winH / 2, 0);
  scene.add(rightFrame);

  const midFrame = new THREE.Mesh(
    new THREE.BoxGeometry(winW, 0.03, frameDepth), frameMat
  );
  midFrame.position.set(0, winH / 2, 0.01);
  scene.add(midFrame);
}

function createLighting() {
  const ambient = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambient);

  const sunLight = new THREE.DirectionalLight(0xffeedd, 2.0);
  sunLight.position.set(3, 5, 4);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 20;
  sunLight.shadow.camera.left = -5;
  sunLight.shadow.camera.right = 5;
  sunLight.shadow.camera.top = 5;
  sunLight.shadow.camera.bottom = -5;
  scene.add(sunLight);

  const bathLight = new THREE.PointLight(0xffeedd, 1.0, 8);
  bathLight.position.set(0, 2.8, -1.0);
  bathLight.castShadow = true;
  scene.add(bathLight);

  const fillLight = new THREE.PointLight(0x6688aa, 0.3, 10);
  fillLight.position.set(0, 1.5, 3);
  scene.add(fillLight);
}

function setupUI() {
  const btns = document.querySelectorAll('.glass-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGlassType = btn.dataset.type;
      switchGlass(currentGlassType);
    });
  });
}

function onControlsChange() {
  const now = performance.now();
  if (now - lastAnalysisTime >= ANALYSIS_THROTTLE_MS) {
    lastAnalysisTime = now;
    updateAnalysis();
  }
}

function switchGlass(type) {
  scene.remove(glassMesh);
  glassMaterial.dispose();
  glassMaterial = createGlassMaterial(type);
  glassMesh = new THREE.Mesh(glassMesh.geometry, glassMaterial);
  glassMesh.position.set(0, 1.25, 0.01);
  scene.add(glassMesh);
  updateAnalysis();
}

function updateAnalysis() {
  const glass = GLASS_TYPES[currentGlassType];

  const privacyEl = document.getElementById('privacy-level');
  const privacyBarFill = document.getElementById('privacy-bar-fill');
  const lightRateEl = document.getElementById('light-rate');
  const silhouetteVisEl = document.getElementById('silhouette-vis');
  const refractionOffsetEl = document.getElementById('refraction-offset');
  const blurRadiusEl = document.getElementById('blur-radius');
  const privacyAlertBox = document.getElementById('privacy-alert-box');
  const lightAlertBox = document.getElementById('light-alert-box');
  const viewAngleEl = document.getElementById('view-angle');
  const penetrationProbEl = document.getElementById('penetration-prob');

  const humanBounds = {
    min: new THREE.Vector3(-0.3, 0, -1.2),
    max: new THREE.Vector3(0.3, 1.85, -0.4)
  };
  const observerOrigin = camera.position.clone();
  const observerDir = new THREE.Vector3();
  camera.getWorldDirection(observerDir);
  const privacyResult = performPrivacyCheck(
    observerOrigin, observerDir, glassPlane, humanBounds, currentGlassType
  );

  const privacyScore = privacyResult.privacyScore;
  privacyDynamicLevel = privacyScore;
  const privacyPercent = (privacyScore * 100).toFixed(0);
  privacyEl.textContent = `${privacyPercent}%`;

  if (privacyScore >= 0.65) {
    privacyEl.className = 'metric-value safe';
  } else if (privacyScore >= 0.4) {
    privacyEl.className = 'metric-value warn';
  } else {
    privacyEl.className = 'metric-value danger';
  }

  privacyBarFill.style.width = `${privacyPercent}%`;
  if (privacyScore >= 0.65) privacyBarFill.style.background = '#4cdf8a';
  else if (privacyScore >= 0.4) privacyBarFill.style.background = '#f0c040';
  else privacyBarFill.style.background = '#ff5566';

  const daylightResult = evaluateDaylight(currentGlassType, windowArea, sunDirection, glassPlane);
  lightRateEl.textContent = `${(daylightResult.effectiveTransmittance * 100).toFixed(1)}%`;
  if (daylightResult.effectiveTransmittance >= 0.6) lightRateEl.className = 'metric-value safe';
  else if (daylightResult.effectiveTransmittance >= 0.4) lightRateEl.className = 'metric-value warn';
  else lightRateEl.className = 'metric-value danger';

  const dynamicSilhouette = privacyResult.penetrationRatio;
  silhouetteVisEl.textContent = `${(dynamicSilhouette * 100).toFixed(0)}%`;
  if (dynamicSilhouette <= 0.2) silhouetteVisEl.className = 'metric-value safe';
  else if (dynamicSilhouette <= 0.5) silhouetteVisEl.className = 'metric-value warn';
  else silhouetteVisEl.className = 'metric-value danger';

  const refractionResult = computeBatchRefraction(
    camera.position.clone(),
    observerDir.clone(),
    glassPlane,
    currentGlassType,
    32,
    true
  );
  const offsetDeg = refractionResult
    ? (refractionResult.avgDeviation * 180 / Math.PI).toFixed(1)
    : '0.0';
  refractionOffsetEl.textContent = `${offsetDeg}°`;

  blurRadiusEl.textContent = `${glass.blurRadius.toFixed(1)}px`;

  const glassNormal = new THREE.Vector3(0, 0, 1);
  const camToGlass = new THREE.Vector3().subVectors(
    new THREE.Vector3(0, 1.25, 0),
    camera.position
  ).normalize();
  const incidenceAngle = Math.acos(Math.min(1, Math.max(-1, camToGlass.dot(glassNormal)))) * 180 / Math.PI;
  viewAngleEl.textContent = `${incidenceAngle.toFixed(0)}°`;

  penetrationProbEl.textContent = `${(privacyResult.penetrationRatio * 100).toFixed(1)}%`;
  if (privacyResult.penetrationRatio <= 0.1) penetrationProbEl.className = 'metric-value safe';
  else if (privacyResult.penetrationRatio <= 0.3) penetrationProbEl.className = 'metric-value warn';
  else penetrationProbEl.className = 'metric-value danger';

  privacyAlertBox.className = 'alert-box';
  if (privacyScore < 0.4) {
    privacyAlertBox.className = 'alert-box privacy-alert';
    privacyAlertBox.innerHTML = `⚠️ <b>隐私警报</b>：当前${glass.name}动态隐私等级为 <b>${privacyResult.privacyGrade}</b>，穿透概率 ${(privacyResult.penetrationRatio * 100).toFixed(0)}%，室外可直接辨认室内人体轮廓！建议更换为长虹玻璃或磨砂玻璃。`;
  } else if (privacyScore < 0.65) {
    privacyAlertBox.className = 'alert-box privacy-warn';
    privacyAlertBox.innerHTML = `⚡ <b>隐私一般</b>：${glass.name}动态隐私等级 <b>${privacyResult.privacyGrade}</b>，穿透概率 ${(privacyResult.penetrationRatio * 100).toFixed(0)}%，室外可辨认模糊轮廓，建议搭配窗帘使用。`;
  } else {
    privacyAlertBox.className = 'alert-box privacy-safe';
    privacyAlertBox.innerHTML = `✅ <b>隐私达标</b>：${glass.name}动态隐私等级 <b>${privacyResult.privacyGrade}</b>，穿透概率 ${(privacyResult.penetrationRatio * 100).toFixed(0)}%，室外仅能见到模糊色块，无法辨认形态。`;
  }

  lightAlertBox.className = 'alert-box';
  if (daylightResult.needsAuxLight) {
    lightAlertBox.className = 'alert-box light-warn';
    lightAlertBox.innerHTML = `💡 <b>采光提示</b>：当前${glass.name}导致进光量损失 ${daylightResult.lightLossPercent}%，室内平均照度约 <b>${daylightResult.luxIndoor} lux</b>（窗地比 ${daylightResult.windowToFloorRatio}%）。${daylightResult.auxLightSuggestion}。`;
  } else {
    lightAlertBox.className = 'alert-box light-safe';
    lightAlertBox.innerHTML = `☀️ <b>采光良好</b>：${glass.name}有效透光率 ${(daylightResult.effectiveTransmittance * 100).toFixed(0)}%，室内平均照度 <b>${daylightResult.luxIndoor} lux</b>（${daylightResult.daylightGrade}）。`;
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const glass = GLASS_TYPES[currentGlassType];
  const blurRadius = glass.blurRadius;
  const effectivePrivacy = privacyDynamicLevel ?? glass.privacyLevel;

  let glassTint;
  switch (currentGlassType) {
    case 'ribbed': glassTint = new THREE.Color(0.92, 0.95, 1.0); break;
    case 'frosted': glassTint = new THREE.Color(0.95, 0.95, 0.97); break;
    case 'embossed': glassTint = new THREE.Color(0.93, 0.93, 0.96); break;
    case 'wired': glassTint = new THREE.Color(0.88, 0.9, 0.92); break;
    default: glassTint = new THREE.Color(0.98, 0.98, 1.0);
  }

  blurProcessor.process([glassMesh], blurRadius, effectivePrivacy, glassTint);
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  blurProcessor.resize(w, h);
}

init();

window.__glassSim = {
  get camera() { return camera; },
  get controls() { return controls; },
  updateAnalysis
};

import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { CSVLoader, DataPoint } from './data/CSVLoader';
import { Launcher } from './fireworks/Launcher';
import { getCategoryColor } from './fireworks/Firework';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.fog = new THREE.FogExp2(0x050510, 0.008);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 40, 35);
camera.lookAt(0, -5, 0);

export { camera };

function computeBottomY(): number {
  const vFov = (camera.fov * Math.PI) / 180;
  const dist = camera.position.z;
  const halfHeight = Math.tan(vFov / 2) * dist;
  const halfWidth = halfHeight * camera.aspect;

  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const lookDist = 5;
  const lookAt = camera.position.clone().addScaledVector(camDir, lookDist);

  const up = new THREE.Vector3(0, -1, 0);
  const bottomPoint = lookAt.clone().addScaledVector(up, halfHeight * 0.92);

  return Math.max(bottomPoint.y, -1.8);
}

let launchY = -1.8;
camera.updateMatrixWorld();
launchY = computeBottomY();

export function getLaunchY(): number {
  return launchY;
}

const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshBasicMaterial({
  color: 0x0a0a1a,
  transparent: true,
  opacity: 0.9,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2;
scene.add(ground);

const starsGeo = new THREE.BufferGeometry();
const starCount = 2000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 200;
  starPositions[i * 3 + 1] = Math.random() * 80 + 10;
  starPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
}
starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.6 });
scene.add(new THREE.Points(starsGeo, starsMat));

const launcher = new Launcher(scene);

const hud = document.getElementById('region-info')!;

function buildLegend(data: DataPoint[]) {
  const categories = [...new Set(data.map((d) => d.category))];
  const categoryNames: Record<string, string> = {
    east: '华东',
    south: '华南',
    north: '华北',
    west: '西北',
    northeast: '东北',
    southwest: '西南',
    central: '华中',
  };
  const patternNames: Record<string, string> = {
    east: '水平圆盘',
    west: '水平圆盘',
    north: '细长锥形',
    south: '细长锥形',
    northeast: '定向喷射',
    southwest: '定向喷射',
    central: '完美球形',
  };

  let html = '<div class="legend-title">📊 数据烟花 — 地区图例</div>';
  html += '<div class="legend-items">';
  categories.forEach((cat) => {
    const color = new THREE.Color(getCategoryColor(cat));
    const hex = '#' + color.getHexString();
    const name = categoryNames[cat] || cat;
    const pattern = patternNames[cat] || '';
    const items = data.filter((d) => d.category === cat);
    const avgGdp = Math.round(items.reduce((s, d) => s + d.gdp, 0) / items.length);
    const avgPop = Math.round(items.reduce((s, d) => s + d.population, 0) / items.length);
    html += `<div class="legend-item">
      <span class="color-dot" style="background:${hex}"></span>
      <span class="region-name">${name}</span>
      <span class="region-detail">${pattern} · GDP: ${avgGdp}亿 · 人口: ${avgPop}万</span>
    </div>`;
  });
  html += '</div>';
  html += '<div class="legend-hint">🔴 飞行高度 = GDP 高度 &nbsp; 💥 爆炸规模 = 人口数量 &nbsp; ➤ 屏幕箭头 = 粒子扩散方向（显示于爆炸前100ms）</div>';
  hud.innerHTML = html;
}

async function init() {
  try {
    const data = await CSVLoader.load('/data.csv');
    console.log(`Loaded ${data.length} data points`);
    launcher.setData(data);
    buildLegend(data);
  } catch (err) {
    console.error('Failed to load CSV:', err);
    hud.innerHTML = '<div class="error">数据加载失败，请检查 data.csv 文件</div>';
  }
}

init();

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);

  TWEEN.update();

  launcher.update(dt);

  camera.position.x += (Math.sin(Date.now() * 0.0001) * 3 - camera.position.x) * 0.002;

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  launchY = Math.max(computeBottomY(), -1.8);
});

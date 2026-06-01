import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createBuildings } from './city/Buildings';
import { createNeonBillboard } from './lights/NeonBillboard';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.Fog(0x0a0a1a, 30, 80);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 15, 40);
camera.lookAt(0, 12, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
document.body.appendChild(renderer.domElement);

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.0,
  0.5,
  0.85
);
bloomPass.threshold = 0.1;
bloomPass.strength = 1.2;
bloomPass.radius = 0.7;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

const ambientLight = new THREE.AmbientLight(0x1a0a2e, 0.35);
scene.add(ambientLight);

const buildings = createBuildings();
scene.add(buildings);

const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x0a0a15,
  roughness: 0.9,
  metalness: 0.1,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

const billboards = [
  {
    text: 'OPEN',
    position: new THREE.Vector3(-15, 18, 4.2),
    color: 0xff0080,
    width: 6,
    height: 3,
  },
  {
    text: 'NEON',
    position: new THREE.Vector3(5, 22, 4.7),
    color: 0x00ffff,
    width: 5,
    height: 2.5,
  },
  {
    text: '24/7',
    position: new THREE.Vector3(15, 15, 3.7),
    color: 0xff0080,
    width: 4,
    height: 2.5,
  },
  {
    text: 'EAT',
    position: new THREE.Vector3(-22, 10, 3.2),
    color: 0xff0080,
    width: 4,
    height: 2,
  },
];

for (const config of billboards) {
  const billboard = createNeonBillboard(config);
  scene.add(billboard);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

let angle = 0;
function animate() {
  requestAnimationFrame(animate);

  angle += 0.002;
  camera.position.x = Math.sin(angle) * 40;
  camera.position.z = Math.cos(angle) * 40;
  camera.lookAt(0, 12, 0);

  composer.render();
}

animate();

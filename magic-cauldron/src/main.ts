import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Cauldron } from './objects/Cauldron';
import { Bubbles } from './effects/Bubbles';
import { IngredientDrop, INGREDIENTS } from './controls/IngredientDrop';
import { createNoise3D } from 'simplex-noise';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0514);
scene.fog = new THREE.FogExp2(0x0a0514, 0.05);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 4, 6);
camera.lookAt(0, -0.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.0,
  0.4,
  0.85
);
bloomPass.threshold = 0.1;
bloomPass.strength = 1.5;
bloomPass.radius = 0.6;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

const ambientLight = new THREE.AmbientLight(0x2a1a4a, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

const cauldronLight = new THREE.PointLight(0x8b0000, 2, 10);
cauldronLight.position.set(0, 0, 0);
scene.add(cauldronLight);

const groundGeometry = new THREE.CircleGeometry(15, 64);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a0f2a,
  roughness: 0.9,
  metalness: 0.1
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.2;
scene.add(ground);

const stoneGeometry = new THREE.CylinderGeometry(1.5, 1.7, 0.3, 32);
const stoneMaterial = new THREE.MeshStandardMaterial({
  color: 0x3a2a4a,
  roughness: 0.8,
  metalness: 0.2
});
const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
stone.position.y = -2.05;
scene.add(stone);

const runeGeometry = new THREE.TorusGeometry(1.6, 0.02, 8, 64);
const runeMaterial = new THREE.MeshBasicMaterial({
  color: 0x9932cc,
  transparent: true,
  opacity: 0.6
});
const rune = new THREE.Mesh(runeGeometry, runeMaterial);
rune.rotation.x = -Math.PI / 2;
rune.position.y = -1.89;
scene.add(rune);

const cauldron = new Cauldron();
scene.add(cauldron.group);

const liquidRadius = cauldron.getLiquidRadius();
const bubbles = new Bubbles(250, cauldron.getLiquidSurfaceY(), liquidRadius * 0.9);
scene.add(bubbles.group);

interface SmokeParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
  baseScale: number;
  targetColor: THREE.Color;
  currentColor: THREE.Color;
}

const smokeParticles: SmokeParticle[] = [];
const maxSmokeParticles = 60;
const baseSmokeGeometry = new THREE.SphereGeometry(0.4, 8, 8);

for (let i = 0; i < maxSmokeParticles; i++) {
  const smokeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3333,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  
  const smoke = new THREE.Mesh(baseSmokeGeometry, smokeMaterial);
  smoke.visible = false;
  
  smokeParticles.push({
    mesh: smoke,
    velocity: new THREE.Vector3(),
    life: 0,
    maxLife: 4,
    active: false,
    baseScale: 1,
    targetColor: new THREE.Color(),
    currentColor: new THREE.Color()
  });
  
  scene.add(smoke);
}

let smokeIntensity = 0.25;
let targetSmokeIntensity = 0.25;
let targetSmokeColor = new THREE.Color(0xff3333);
let currentSmokeColor = new THREE.Color(0xff3333);
let smokeSpawnTimer = 0;
let smokeSpeedMultiplier = 1;
let targetSmokeSpeedMultiplier = 1;
let smokeSizeMultiplier = 1;
let targetSmokeSizeMultiplier = 1;

const ingredientDrop = new IngredientDrop();
ingredientDrop.onIngredientDrop = (key, ingredient) => {
  cauldron.setLiquidColor(ingredient.color, ingredient.color2);
  
  const intensityFactor = ingredient.bubbleIntensity;
  bubbles.setIntensity(intensityFactor);
  bubbles.setColor(ingredient.color);
  
  cauldron.liquidMaterial.uniforms.uWaveHeight.value = ingredient.waveHeight;
  cauldron.liquidMaterial.uniforms.uGlowIntensity.value = ingredient.glowIntensity;
  cauldron.liquidMaterial.uniforms.uWaveSpeed.value = ingredient.waveSpeed;
  
  cauldron.setBoilIntensity(ingredient.boilIntensity);
  
  targetSmokeIntensity = ingredient.smokeIntensity;
  targetSmokeColor.copy(ingredient.smokeColor);
  targetSmokeSpeedMultiplier = 0.5 + ingredient.smokeIntensity * 1.5;
  targetSmokeSizeMultiplier = 0.6 + ingredient.smokeIntensity * 1.2;
  
  bloomPass.strength = 1.0 + ingredient.glowIntensity * 0.5;
  
  cauldronLight.color.copy(ingredient.color);
  cauldronLight.intensity = 1.5 + ingredient.glowIntensity;
  
  (runeMaterial as THREE.MeshBasicMaterial).color.copy(ingredient.color2);
  (runeMaterial as THREE.MeshBasicMaterial).opacity = 0.6 + ingredient.smokeIntensity * 0.3;
  
  const bgColor = new THREE.Color(0x0a0514);
  bgColor.lerp(ingredient.color, 0.05);
  scene.background = bgColor;
  scene.fog = new THREE.FogExp2(bgColor, 0.05);
};

const noise3D = createNoise3D();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let cameraAngle = 0;

function spawnSmoke() {
  const smoke = smokeParticles.find(s => !s.active);
  if (!smoke) return;
  
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * (liquidRadius * 0.8);
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  
  smoke.mesh.position.set(x, cauldron.getLiquidSurfaceY() + 0.1, z);
  
  const baseScale = (0.5 + Math.random() * 0.7) * smokeSizeMultiplier;
  smoke.mesh.scale.setScalar(baseScale);
  smoke.baseScale = baseScale;
  
  smoke.mesh.visible = true;
  smoke.active = true;
  smoke.life = 0;
  smoke.maxLife = (2.5 + Math.random() * 2.5) / smokeSpeedMultiplier;
  
  smoke.velocity.set(
    (Math.random() - 0.5) * 0.4,
    (0.4 + Math.random() * 0.6) * smokeSpeedMultiplier,
    (Math.random() - 0.5) * 0.4
  );
  
  smoke.targetColor.copy(targetSmokeColor);
  smoke.currentColor.copy(currentSmokeColor);
  
  const mat = smoke.mesh.material as THREE.MeshBasicMaterial;
  mat.color.copy(smoke.currentColor);
  mat.opacity = 0;
}

function animate() {
  requestAnimationFrame(animate);
  
  const time = clock.getElapsedTime();
  const delta = clock.getDelta();
  
  cauldron.update(time, delta);
  bubbles.update(time, delta);
  
  smokeIntensity += (targetSmokeIntensity - smokeIntensity) * delta * 2;
  currentSmokeColor.lerp(targetSmokeColor, delta * 2);
  smokeSpeedMultiplier += (targetSmokeSpeedMultiplier - smokeSpeedMultiplier) * delta * 2;
  smokeSizeMultiplier += (targetSmokeSizeMultiplier - smokeSizeMultiplier) * delta * 2;
  
  if (smokeIntensity > 0.05) {
    smokeSpawnTimer += delta;
    const spawnInterval = 1 / (smokeIntensity * 35);
    
    while (smokeSpawnTimer >= spawnInterval) {
      spawnSmoke();
      smokeSpawnTimer -= spawnInterval;
    }
  }
  
  for (const smoke of smokeParticles) {
    if (!smoke.active) continue;
    
    smoke.life += delta;
    
    smoke.currentColor.lerp(smoke.targetColor, delta * 5);
  const mat = smoke.mesh.material as THREE.MeshBasicMaterial;
  mat.color.copy(smoke.currentColor);
    
    const noiseScale = 2 + smokeIntensity * 3;
    const noise = noise3D(
      smoke.mesh.position.x * noiseScale,
      smoke.mesh.position.y * 0.3,
      time * (0.2 + smokeIntensity * 0.3)
    );
    
    const wobbleStrength = 0.5 + smokeIntensity;
    smoke.velocity.x += noise * delta * wobbleStrength;
    smoke.velocity.z += noise * delta * wobbleStrength;
    smoke.velocity.y += delta * (0.1 + smokeIntensity * 0.2);
    
    smoke.velocity.x *= 0.995;
    smoke.velocity.z *= 0.995;
    
    smoke.mesh.position.x += smoke.velocity.x * delta;
    smoke.mesh.position.y += smoke.velocity.y * delta;
    smoke.mesh.position.z += smoke.velocity.z * delta;
    
    const distFromCenter = Math.sqrt(
      smoke.mesh.position.x ** 2 + smoke.mesh.position.z ** 2
    );
    if (distFromCenter > liquidRadius * 1.2) {
      const pushFactor = (distFromCenter - liquidRadius * 1.2) * 0.5;
      smoke.mesh.position.x -= (smoke.mesh.position.x / distFromCenter) * pushFactor;
      smoke.mesh.position.z -= (smoke.mesh.position.z / distFromCenter) * pushFactor;
    }
    
    const growthRate = 0.3 + smokeIntensity * 0.5;
    smoke.mesh.scale.setScalar(smoke.baseScale * (1 + smoke.life * growthRate));
    
    const lifeRatio = smoke.life / smoke.maxLife;
    
    if (lifeRatio < 0.08) {
      mat.opacity = lifeRatio * 12.5 * smokeIntensity;
    } else if (lifeRatio > 0.85) {
      mat.opacity = (1 - lifeRatio) * 6.67 * smokeIntensity;
    } else {
      mat.opacity = smokeIntensity;
    }
    
    if (smoke.life > smoke.maxLife || smoke.mesh.position.y > 6) {
      smoke.active = false;
      smoke.mesh.visible = false;
    }
  }
  
  cameraAngle += delta * 0.08;
  const cameraDistance = 6 + Math.sin(time * 0.2) * 0.5;
  camera.position.x = Math.sin(cameraAngle) * cameraDistance;
  camera.position.z = Math.cos(cameraAngle) * cameraDistance;
  camera.position.y = 4 + Math.sin(time * 0.3) * 0.5;
  camera.lookAt(0, -0.3, 0);
  
  rune.rotation.z = time * 0.2;
  rune.position.y = -1.89 + Math.sin(time * 0.5) * 0.02;
  
  composer.render();
}

const defaultIngredient = INGREDIENTS.DEFAULT;
cauldron.setLiquidColor(defaultIngredient.color, defaultIngredient.color2);
bubbles.setColor(defaultIngredient.color);
bubbles.setIntensity(defaultIngredient.bubbleIntensity);
cauldron.setBoilIntensity(defaultIngredient.boilIntensity);

cauldron.liquidMaterial.uniforms.uWaveHeight.value = defaultIngredient.waveHeight;
cauldron.liquidMaterial.uniforms.uGlowIntensity.value = defaultIngredient.glowIntensity;
cauldron.liquidMaterial.uniforms.uWaveSpeed.value = defaultIngredient.waveSpeed;

cauldronLight.color.copy(defaultIngredient.color);
cauldronLight.intensity = 1.5 + defaultIngredient.glowIntensity;
(runeMaterial as THREE.MeshBasicMaterial).color.copy(defaultIngredient.color2);
(runeMaterial as THREE.MeshBasicMaterial).opacity = 0.6 + defaultIngredient.smokeIntensity * 0.3;

targetSmokeColor.copy(defaultIngredient.smokeColor);
currentSmokeColor.copy(defaultIngredient.smokeColor);
targetSmokeIntensity = defaultIngredient.smokeIntensity;
smokeIntensity = defaultIngredient.smokeIntensity;
targetSmokeSpeedMultiplier = 0.5 + defaultIngredient.smokeIntensity * 1.5;
targetSmokeSizeMultiplier = 0.6 + defaultIngredient.smokeIntensity * 1.2;

const defaultBgColor = new THREE.Color(0x0a0514);
defaultBgColor.lerp(defaultIngredient.color, 0.05);
scene.background = defaultBgColor;
scene.fog = new THREE.FogExp2(defaultBgColor, 0.05);

bloomPass.strength = 1.0 + defaultIngredient.glowIntensity * 0.5;

animate();

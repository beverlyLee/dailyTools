<script>
import * as THREE from 'three';
import { onMount, onDestroy } from 'svelte';
import { createCageGeometry, createGearGeometry, createRubyBearingGeometry, createWheelBridgeGeometry } from '../utils/gearUtils.js';

let {
  scene,
  position = new THREE.Vector3(0, 0, 0),
  cageRotationSpeed = 2 * Math.PI,
  updateFn = null,
  getFourthWheelRotationFn = null
} = $props();

const TEETH_THIRD_WHEEL = 80;
const TEETH_FOURTH_WHEEL = 60;
const TEETH_FOURTH_PINION = 15;
const TEETH_TRANSFER_WHEEL_1 = 45;
const TEETH_TRANSFER_PINION_1 = 12;
const TEETH_TRANSFER_WHEEL_2 = 36;
const TEETH_TRANSFER_PINION_2 = 10;
const TEETH_CENTER_WHEEL = 50;

const PLANET_GEAR_RATIO = TEETH_THIRD_WHEEL / TEETH_FOURTH_WHEEL;
const TARGET_RELATIVE_RATIO = 60;
const REQUIRED_TRANSFER_RATIO = TARGET_RELATIVE_RATIO / PLANET_GEAR_RATIO;

const STAGE_1_RATIO = TEETH_TRANSFER_WHEEL_1 / TEETH_FOURTH_PINION;
const STAGE_2_RATIO = TEETH_TRANSFER_WHEEL_2 / TEETH_TRANSFER_PINION_1;
const STAGE_3_RATIO = TEETH_CENTER_WHEEL / TEETH_TRANSFER_PINION_2;
const TOTAL_TRANSFER_RATIO = STAGE_1_RATIO * STAGE_2_RATIO * STAGE_3_RATIO;

const MODULE = 0.018;
function getPitchRadius(teeth) {
  return (teeth * MODULE) / 2;
}

const R_THIRD_WHEEL = getPitchRadius(TEETH_THIRD_WHEEL);
const R_FOURTH_WHEEL = getPitchRadius(TEETH_FOURTH_WHEEL);
const R_FOURTH_PINION = getPitchRadius(TEETH_FOURTH_PINION);
const R_TRANSFER_WHEEL_1 = getPitchRadius(TEETH_TRANSFER_WHEEL_1);
const R_TRANSFER_PINION_1 = getPitchRadius(TEETH_TRANSFER_PINION_1);
const R_TRANSFER_WHEEL_2 = getPitchRadius(TEETH_TRANSFER_WHEEL_2);
const R_TRANSFER_PINION_2 = getPitchRadius(TEETH_TRANSFER_PINION_2);
const R_CENTER_WHEEL = getPitchRadius(TEETH_CENTER_WHEEL);

const DIST_CENTER_TO_FOURTH = R_THIRD_WHEEL + R_FOURTH_WHEEL;
const DIST_FOURTH_TO_TRANSFER1 = R_FOURTH_PINION + R_TRANSFER_WHEEL_1;
const DIST_TRANSFER1_TO_TRANSFER2 = R_TRANSFER_PINION_1 + R_TRANSFER_WHEEL_2;
const DIST_TRANSFER2_TO_CENTER = R_TRANSFER_PINION_2 + R_CENTER_WHEEL;

let group;
let cage;
let cageBack;

let thirdWheel;
let fourthWheel;
let fourthPinion;
let transferWheel1;
let transferPinion1;
let transferWheel2;
let transferPinion2;
let centerWheel;

let upperBridge;
let lowerBridge;

let fourthWheelRotation = 0;
let cageRotation = 0;

const steelMaterial = new THREE.MeshStandardMaterial({
  color: 0xd0d0d0,
  metalness: 0.92,
  roughness: 0.18,
  envMapIntensity: 1.1
});

const brassMaterial = new THREE.MeshStandardMaterial({
  color: 0xb76e79,
  metalness: 0.85,
  roughness: 0.25,
  envMapIntensity: 0.9
});

const titaniumMaterial = new THREE.MeshStandardMaterial({
  color: 0x8899aa,
  metalness: 0.88,
  roughness: 0.22,
  envMapIntensity: 1.0
});

const rubyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xcc0040,
  metalness: 0.1,
  roughness: 0.05,
  transmission: 0.35,
  thickness: 0.1,
  clearcoat: 1.0,
  clearcoatRoughness: 0.08,
  envMapIntensity: 1.5
});

const screwMaterial = new THREE.MeshStandardMaterial({
  color: 0x556677,
  metalness: 0.95,
  roughness: 0.15,
  envMapIntensity: 1.2
});

function createGearWithAxle(teeth, outerRadius, innerRadius, thickness, x, z, zOffset, material, toothDepth = 0.08) {
  const gearGeo = createGearGeometry(teeth, outerRadius, innerRadius, thickness, toothDepth);
  gearGeo.center();
  const gear = new THREE.Mesh(gearGeo, material);
  gear.rotation.x = Math.PI / 2;
  gear.position.set(x, zOffset, z);
  gear.castShadow = true;
  gear.receiveShadow = true;
  group.add(gear);
  
  const axleGeo = new THREE.CylinderGeometry(innerRadius * 0.7, innerRadius * 0.7, thickness + 0.04, 16);
  const axle = new THREE.Mesh(axleGeo, steelMaterial);
  axle.position.set(x, zOffset, z);
  axle.castShadow = true;
  group.add(axle);
  
  const rubyGeo = createRubyBearingGeometry(innerRadius * 0.8);
  const rubyTop = new THREE.Mesh(rubyGeo, rubyMaterial);
  rubyTop.position.set(x, zOffset + thickness / 2 + 0.04, z);
  rubyTop.rotation.x = Math.PI / 2;
  group.add(rubyTop);
  
  const rubyBottom = new THREE.Mesh(rubyGeo, rubyMaterial);
  rubyBottom.position.set(x, zOffset - thickness / 2 - 0.04, z);
  rubyBottom.rotation.x = Math.PI / 2;
  group.add(rubyBottom);
  
  return gear;
}

function createTourbillonCage() {
  group = new THREE.Group();
  group.position.copy(position);
  group.position.y = -0.2;
  
  const cageGeo = createCageGeometry(1.1, 0.06);
  cageGeo.center();
  cage = new THREE.Mesh(cageGeo, titaniumMaterial);
  cage.rotation.x = Math.PI / 2;
  cage.position.y = 0;
  cage.castShadow = true;
  cage.receiveShadow = true;
  group.add(cage);
  
  const cageBackGeo = new THREE.RingGeometry(0.92, 1.05, 64);
  cageBack = new THREE.Mesh(cageBackGeo, titaniumMaterial);
  cageBack.rotation.x = -Math.PI / 2;
  cageBack.position.y = -0.05;
  cageBack.receiveShadow = true;
  group.add(cageBack);
  
  const Y_GEAR_PLANE = 0;
  const Z_THICKNESS = 0.06;
  
  thirdWheel = createGearWithAxle(
    TEETH_THIRD_WHEEL, R_THIRD_WHEEL * 1.1, 0.18, Z_THICKNESS,
    0, 0, Y_GEAR_PLANE, brassMaterial, 0.08
  );
  
  const fourthX = DIST_CENTER_TO_FOURTH * 0.85;
  const fourthZ = DIST_CENTER_TO_FOURTH * 0.35;
  fourthWheel = createGearWithAxle(
    TEETH_FOURTH_WHEEL, R_FOURTH_WHEEL * 1.1, 0.1, Z_THICKNESS,
    fourthX, fourthZ, Y_GEAR_PLANE, steelMaterial, 0.09
  );
  
  fourthPinion = createGearWithAxle(
    TEETH_FOURTH_PINION, R_FOURTH_PINION * 1.1, 0.06, Z_THICKNESS + 0.02,
    fourthX, fourthZ, Y_GEAR_PLANE + 0.05, steelMaterial, 0.1
  );
  
  const angle1 = Math.atan2(fourthZ, fourthX);
  const transfer1X = fourthX + Math.cos(angle1) * DIST_FOURTH_TO_TRANSFER1 * 0.9;
  const transfer1Z = fourthZ + Math.sin(angle1) * DIST_FOURTH_TO_TRANSFER1 * 0.9;
  transferWheel1 = createGearWithAxle(
    TEETH_TRANSFER_WHEEL_1, R_TRANSFER_WHEEL_1 * 1.1, 0.08, Z_THICKNESS,
    transfer1X, transfer1Z, Y_GEAR_PLANE + 0.05, brassMaterial, 0.08
  );
  
  transferPinion1 = createGearWithAxle(
    TEETH_TRANSFER_PINION_1, R_TRANSFER_PINION_1 * 1.1, 0.05, Z_THICKNESS + 0.02,
    transfer1X, transfer1Z, Y_GEAR_PLANE + 0.1, steelMaterial, 0.1
  );
  
  const angle2 = Math.atan2(transfer1Z, transfer1X);
  const transfer2X = transfer1X + Math.cos(angle2) * DIST_TRANSFER1_TO_TRANSFER2 * 0.85;
  const transfer2Z = transfer1Z + Math.sin(angle2) * DIST_TRANSFER1_TO_TRANSFER2 * 0.85;
  transferWheel2 = createGearWithAxle(
    TEETH_TRANSFER_WHEEL_2, R_TRANSFER_WHEEL_2 * 1.1, 0.08, Z_THICKNESS,
    transfer2X, transfer2Z, Y_GEAR_PLANE + 0.1, brassMaterial, 0.08
  );
  
  transferPinion2 = createGearWithAxle(
    TEETH_TRANSFER_PINION_2, R_TRANSFER_PINION_2 * 1.1, 0.05, Z_THICKNESS + 0.02,
    transfer2X, transfer2Z, Y_GEAR_PLANE + 0.15, steelMaterial, 0.1
  );
  
  centerWheel = createGearWithAxle(
    TEETH_CENTER_WHEEL, R_CENTER_WHEEL * 1.1, 0.1, Z_THICKNESS,
    0, 0, Y_GEAR_PLANE + 0.15, brassMaterial, 0.08
  );
  
  const centerAxleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 20);
  const centerAxle = new THREE.Mesh(centerAxleGeo, steelMaterial);
  centerAxle.position.set(0, Y_GEAR_PLANE + 0.1, 0);
  centerAxle.castShadow = true;
  group.add(centerAxle);
  
  const upperBridgeGeo = createWheelBridgeGeometry(2.0, 0.12, 0.04);
  upperBridgeGeo.center();
  upperBridge = new THREE.Mesh(upperBridgeGeo, titaniumMaterial);
  upperBridge.rotation.x = Math.PI / 2;
  upperBridge.position.y = Y_GEAR_PLANE + 0.3;
  upperBridge.castShadow = true;
  group.add(upperBridge);
  
  const lowerBridgeGeo = createWheelBridgeGeometry(1.8, 0.1, 0.04);
  lowerBridgeGeo.center();
  lowerBridge = new THREE.Mesh(lowerBridgeGeo, titaniumMaterial);
  lowerBridge.rotation.x = Math.PI / 2;
  lowerBridge.rotation.z = Math.PI / 2;
  lowerBridge.position.y = Y_GEAR_PLANE - 0.2;
  lowerBridge.castShadow = true;
  group.add(lowerBridge);
  
  const pillarPositions = [
    [0.85, 0.5],
    [-0.85, 0.5],
    [-0.85, -0.5],
    [0.85, -0.5]
  ];
  
  pillarPositions.forEach(pos => {
    const pillarGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.52, 12);
    const pillar = new THREE.Mesh(pillarGeo, steelMaterial);
    pillar.position.set(pos[0], Y_GEAR_PLANE + 0.05, pos[1]);
    pillar.castShadow = true;
    group.add(pillar);
    
    const screwGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8);
    const screw1 = new THREE.Mesh(screwGeo, screwMaterial);
    screw1.position.set(pos[0], Y_GEAR_PLANE + 0.32, pos[1]);
    group.add(screw1);
    
    const screw2 = new THREE.Mesh(screwGeo, screwMaterial);
    screw2.position.set(pos[0], Y_GEAR_PLANE - 0.22, pos[1]);
    group.add(screw2);
  });
  
  const bridgeScrewPositions = [
    [0, 0, Y_GEAR_PLANE + 0.28],
    [transfer1X, transfer1Z, Y_GEAR_PLANE + 0.28],
    [transfer2X, transfer2Z, Y_GEAR_PLANE + 0.28],
    [fourthX, fourthZ, Y_GEAR_PLANE + 0.28]
  ];
  
  bridgeScrewPositions.forEach(pos => {
    const smallScrewGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.05, 6);
    const screw = new THREE.Mesh(smallScrewGeo, screwMaterial);
    screw.position.set(pos[0], pos[2], pos[1]);
    group.add(screw);
  });
  
  if (scene) {
    scene.add(group);
  }
  
  return group;
}

function update(deltaTime) {
  if (!group) return;
  
  group.rotation.y += cageRotationSpeed * deltaTime;
  cageRotation += cageRotationSpeed * deltaTime;
  
  if (thirdWheel) {
    thirdWheel.rotation.z = -cageRotation;
  }
  
  const fourthVisualSpeed = cageRotationSpeed * TOTAL_RATIO;
  const fourthDelta = fourthVisualSpeed * deltaTime;
  
  if (fourthWheel) {
    fourthWheel.rotation.z -= fourthDelta;
  }
  if (fourthPinion) {
    fourthPinion.rotation.z -= fourthDelta;
  }
  
  const transfer1Delta = fourthDelta * (TEETH_FOURTH_PINION / TEETH_TRANSFER_WHEEL_1);
  if (transferWheel1) {
    transferWheel1.rotation.z += transfer1Delta;
  }
  if (transferPinion1) {
    transferPinion1.rotation.z += transfer1Delta;
  }
  
  const transfer2Delta = transfer1Delta * (TEETH_TRANSFER_PINION_1 / TEETH_TRANSFER_WHEEL_2);
  if (transferWheel2) {
    transferWheel2.rotation.z -= transfer2Delta;
  }
  if (transferPinion2) {
    transferPinion2.rotation.z -= transfer2Delta;
  }
  
  const centerDelta = transfer2Delta * (TEETH_TRANSFER_PINION_2 / TEETH_CENTER_WHEEL);
  if (centerWheel) {
    centerWheel.rotation.z += centerDelta;
  }
  
  fourthWheelRotation += 2 * Math.PI * deltaTime;
}

function getFourthWheelRotation() {
  return fourthWheelRotation;
}

function getCageRotation() {
  return cageRotation;
}

onMount(() => {
  createTourbillonCage();
  updateFn = update;
  getFourthWheelRotationFn = getFourthWheelRotation;
});

onDestroy(() => {
  if (group && scene) {
    scene.remove(group);
  }
  if (cage) cage.geometry.dispose();
  if (thirdWheel) thirdWheel.geometry.dispose();
  if (fourthWheel) fourthWheel.geometry.dispose();
  if (fourthPinion) fourthPinion.geometry.dispose();
  if (transferWheel1) transferWheel1.geometry.dispose();
  if (transferPinion1) transferPinion1.geometry.dispose();
  if (transferWheel2) transferWheel2.geometry.dispose();
  if (transferPinion2) transferPinion2.geometry.dispose();
  if (centerWheel) centerWheel.geometry.dispose();
  if (upperBridge) upperBridge.geometry.dispose();
  if (lowerBridge) lowerBridge.geometry.dispose();
});

export { getFourthWheelRotation, getCageRotation };
</script>

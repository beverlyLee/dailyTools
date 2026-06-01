<script>
import * as THREE from 'three';
import { onMount, onDestroy } from 'svelte';
import { createEscapeWheelGeometry, createAnchorGeometry, createRubyBearingGeometry } from '../utils/gearUtils.js';

let {
  scene,
  position = new THREE.Vector3(0, 0, 0),
  escapeWheelSpeed = 120 * Math.PI,
  updateFn = null,
  getEscapeWheelRotationFn = null
} = $props();

const TEETH_ESCAPE_WHEEL = 15;
const TOOTH_ANGLE = (Math.PI * 2) / TEETH_ESCAPE_WHEEL;
const SWING_ANGLE = 12 * Math.PI / 180;

const STATE = {
  LOCKED_ENTRY: 0,
  IMPULSE: 1,
  LOCKED_EXIT: 2,
  DROPPED: 3
};

let group;
let escapeWheel;
let anchor;
let escapeWheelAxle;
let anchorAxle;
let bridge;
let pallet1;
let pallet2;
let rubyBearing1;
let rubyBearing2;

let escapeWheelRotation = 0;
let currentState = STATE.LOCKED_ENTRY;
let stateProgress = 0;
let lastToothIndex = -1;
let currentAngle = -SWING_ANGLE;

const steelMaterial = new THREE.MeshStandardMaterial({
  color: 0xc0c0c0,
  metalness: 0.9,
  roughness: 0.2,
  envMapIntensity: 1.0
});

const brassMaterial = new THREE.MeshStandardMaterial({
  color: 0xb76e79,
  metalness: 0.85,
  roughness: 0.25,
  envMapIntensity: 0.9
});

const rubyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xcc0040,
  metalness: 0.1,
  roughness: 0.05,
  transmission: 0.3,
  thickness: 0.1,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.5
});

const titaniumMaterial = new THREE.MeshStandardMaterial({
  color: 0x8899aa,
  metalness: 0.88,
  roughness: 0.22,
  envMapIntensity: 1.0
});

const screwMaterial = new THREE.MeshStandardMaterial({
  color: 0x556677,
  metalness: 0.95,
  roughness: 0.15,
  envMapIntensity: 1.2
});

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function createEscapeWheelGroup() {
  group = new THREE.Group();
  group.position.copy(position);
  group.position.y = 0;
  
  const Y_PLANE = 0;
  
  const escapeWheelGeo = createEscapeWheelGeometry(TEETH_ESCAPE_WHEEL, 0.5, 0.12, 0.08);
  escapeWheelGeo.center();
  escapeWheel = new THREE.Mesh(escapeWheelGeo, steelMaterial);
  escapeWheel.rotation.x = Math.PI / 2;
  escapeWheel.position.set(0.55, Y_PLANE, 0.02);
  escapeWheel.castShadow = true;
  escapeWheel.receiveShadow = true;
  group.add(escapeWheel);
  
  const axleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.18, 16);
  escapeWheelAxle = new THREE.Mesh(axleGeo, steelMaterial);
  escapeWheelAxle.position.set(0.55, Y_PLANE, 0.02);
  escapeWheelAxle.castShadow = true;
  group.add(escapeWheelAxle);
  
  const anchorGeo = createAnchorGeometry(0.08);
  anchorGeo.center();
  anchor = new THREE.Mesh(anchorGeo, brassMaterial);
  anchor.rotation.x = Math.PI / 2;
  anchor.position.set(1.0, Y_PLANE, 0.02);
  anchor.castShadow = true;
  anchor.receiveShadow = true;
  group.add(anchor);
  
  const anchorAxleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.18, 16);
  anchorAxle = new THREE.Mesh(anchorAxleGeo, steelMaterial);
  anchorAxle.position.set(1.0, Y_PLANE, 0.02);
  anchorAxle.castShadow = true;
  group.add(anchorAxle);
  
  const rubyGeo1 = createRubyBearingGeometry(0.05);
  rubyBearing1 = new THREE.Mesh(rubyGeo1, rubyMaterial);
  rubyBearing1.position.set(0.55, Y_PLANE + 0.09, 0.02);
  rubyBearing1.rotation.x = Math.PI / 2;
  group.add(rubyBearing1);
  
  const rubyGeo2 = createRubyBearingGeometry(0.05);
  rubyBearing2 = new THREE.Mesh(rubyGeo2, rubyMaterial);
  rubyBearing2.position.set(1.0, Y_PLANE + 0.09, 0.02);
  rubyBearing2.rotation.x = Math.PI / 2;
  group.add(rubyBearing2);
  
  const palletGeo1 = new THREE.BoxGeometry(0.06, 0.08, 0.06);
  pallet1 = new THREE.Mesh(palletGeo1, rubyMaterial);
  pallet1.position.set(1.25, Y_PLANE, 0.06);
  pallet1.rotation.y = -0.3;
  group.add(pallet1);
  
  const palletGeo2 = new THREE.BoxGeometry(0.06, 0.08, 0.06);
  pallet2 = new THREE.Mesh(palletGeo2, rubyMaterial);
  pallet2.position.set(0.75, Y_PLANE, 0.06);
  pallet2.rotation.y = 0.3;
  group.add(pallet2);
  
  const bridgeGeo = new THREE.BoxGeometry(0.6, 0.04, 0.08);
  bridge = new THREE.Mesh(bridgeGeo, titaniumMaterial);
  bridge.position.set(0.775, Y_PLANE, 0.15);
  bridge.castShadow = true;
  group.add(bridge);
  
  const bridgeScrewGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.05, 6);
  const bridgeScrew1 = new THREE.Mesh(bridgeScrewGeo, screwMaterial);
  bridgeScrew1.position.set(0.55, Y_PLANE, 0.17);
  group.add(bridgeScrew1);
  
  const bridgeScrew2 = new THREE.Mesh(bridgeScrewGeo, screwMaterial);
  bridgeScrew2.position.set(1.0, Y_PLANE, 0.17);
  group.add(bridgeScrew2);
  
  if (scene) {
    scene.add(group);
  }
  
  return group;
}

function updateAnchor(deltaTime) {
  if (!anchor) return;
  
  const toothProgress = (escapeWheelRotation % TOOTH_ANGLE) / TOOTH_ANGLE;
  
  if (toothProgress < 0.25) {
    currentState = STATE.LOCKED_ENTRY;
    stateProgress = toothProgress / 0.25;
    currentAngle = -SWING_ANGLE;
  } else if (toothProgress < 0.5) {
    currentState = STATE.IMPULSE;
    const t = (toothProgress - 0.25) / 0.25;
    const smoothT = smoothstep(t);
    currentAngle = -SWING_ANGLE + smoothT * SWING_ANGLE * 2;
  } else if (toothProgress < 0.75) {
    currentState = STATE.LOCKED_EXIT;
    stateProgress = (toothProgress - 0.5) / 0.25;
    currentAngle = SWING_ANGLE;
  } else {
    currentState = STATE.DROPPED;
    const t = (toothProgress - 0.75) / 0.25;
    const smoothT = smoothstep(t);
    currentAngle = SWING_ANGLE - smoothT * SWING_ANGLE * 2;
  }
  
  anchor.rotation.z = currentAngle;
  
  if (pallet1 && pallet2) {
    pallet1.rotation.z = currentAngle * 0.1;
    pallet2.rotation.z = currentAngle * 0.1;
  }
}

function update(deltaTime) {
  if (!group) return;
  
  escapeWheel.rotation.z += escapeWheelSpeed * deltaTime;
  escapeWheelRotation += escapeWheelSpeed * deltaTime;
  
  const currentToothIndex = Math.floor(escapeWheelRotation / TOOTH_ANGLE);
  if (currentToothIndex !== lastToothIndex && lastToothIndex >= 0) {
    stateProgress = 0;
  }
  lastToothIndex = currentToothIndex;
  
  updateAnchor(deltaTime);
}

function getEscapeWheelRotation() {
  return escapeWheelRotation;
}

function getAnchorAngle() {
  return currentAngle;
}

function getState() {
  return {
    state: currentState,
    stateName: Object.keys(STATE)[currentState],
    progress: stateProgress,
    angle: currentAngle
  };
}

onMount(() => {
  createEscapeWheelGroup();
  updateFn = update;
  getEscapeWheelRotationFn = getEscapeWheelRotation;
});

onDestroy(() => {
  if (group && scene) {
    scene.remove(group);
  }
  if (escapeWheel) escapeWheel.geometry.dispose();
  if (anchor) anchor.geometry.dispose();
  if (escapeWheelAxle) escapeWheelAxle.geometry.dispose();
  if (anchorAxle) anchorAxle.geometry.dispose();
  if (bridge) bridge.geometry.dispose();
  if (pallet1) pallet1.geometry.dispose();
  if (pallet2) pallet2.geometry.dispose();
  if (rubyBearing1) rubyBearing1.geometry.dispose();
  if (rubyBearing2) rubyBearing2.geometry.dispose();
});

export { getEscapeWheelRotation, getAnchorAngle, getState };
</script>

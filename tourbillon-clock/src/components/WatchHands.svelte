<script>
import { onMount, onDestroy } from 'svelte';
import * as THREE from 'three';
import { createHandGeometry, createRubyBearingGeometry } from '../utils/gearUtils.js';

let {
  scene,
  position = new THREE.Vector3(0, 0, 0),
  fourthWheelRotation = 0,
  updateFn = null
} = $props();

const SECOND_TO_MINUTE_RATIO = 60;
const MINUTE_TO_HOUR_RATIO = 12;

let group;
let hourHand;
let minuteHand;
let secondHand;
let centerCap;

let localRotation = $state(0);

const hourHandMaterial = new THREE.MeshStandardMaterial({
  color: 0x1e3a5f,
  metalness: 0.7,
  roughness: 0.3,
  envMapIntensity: 1.0
});

const minuteHandMaterial = new THREE.MeshStandardMaterial({
  color: 0x1e3a5f,
  metalness: 0.75,
  roughness: 0.25,
  envMapIntensity: 1.0
});

const secondHandMaterial = new THREE.MeshStandardMaterial({
  color: 0xb76e79,
  metalness: 0.8,
  roughness: 0.2,
  envMapIntensity: 1.1
});

const capMaterial = new THREE.MeshStandardMaterial({
  color: 0xd0d0d0,
  metalness: 0.95,
  roughness: 0.15,
  envMapIntensity: 1.2
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

function createWatchHands() {
  group = new THREE.Group();
  group.position.copy(position);
  group.position.y = 0.3;
  
  const hourHandGeo = createHandGeometry(0.8, 0.08, 0.05);
  hourHandGeo.center();
  hourHand = new THREE.Mesh(hourHandGeo, hourHandMaterial);
  hourHand.rotation.x = Math.PI / 2;
  hourHand.rotation.z = -Math.PI / 2;
  hourHand.position.y = 0;
  hourHand.castShadow = true;
  group.add(hourHand);
  
  const minuteHandGeo = createHandGeometry(1.1, 0.06, 0.04);
  minuteHandGeo.center();
  minuteHand = new THREE.Mesh(minuteHandGeo, minuteHandMaterial);
  minuteHand.rotation.x = Math.PI / 2;
  minuteHand.rotation.z = -Math.PI / 2;
  minuteHand.position.y = 0.04;
  minuteHand.castShadow = true;
  group.add(minuteHand);
  
  const secondHandGeo = createHandGeometry(1.25, 0.025, 0.025);
  secondHandGeo.center();
  secondHand = new THREE.Mesh(secondHandGeo, secondHandMaterial);
  secondHand.rotation.x = Math.PI / 2;
  secondHand.rotation.z = -Math.PI / 2;
  secondHand.position.y = 0.08;
  secondHand.castShadow = true;
  group.add(secondHand);
  
  const counterweightGeo = new THREE.SphereGeometry(0.05, 16, 16);
  const counterweight = new THREE.Mesh(counterweightGeo, secondHandMaterial);
  counterweight.position.set(-0.35, 0.08, 0);
  counterweight.castShadow = true;
  group.add(counterweight);
  
  const capGeo1 = new THREE.CylinderGeometry(0.08, 0.09, 0.04, 24);
  centerCap = new THREE.Mesh(capGeo1, capMaterial);
  centerCap.position.y = 0.12;
  centerCap.castShadow = true;
  group.add(centerCap);
  
  const capGeo2 = new THREE.CylinderGeometry(0.05, 0.08, 0.03, 24);
  const centerCap2 = new THREE.Mesh(capGeo2, capMaterial);
  centerCap2.position.y = 0.155;
  centerCap2.castShadow = true;
  group.add(centerCap2);
  
  const rubyGeo = createRubyBearingGeometry(0.035);
  const rubyCap = new THREE.Mesh(rubyGeo, rubyMaterial);
  rubyCap.position.y = 0.19;
  rubyCap.rotation.x = Math.PI / 2;
  group.add(rubyCap);
  
  const centerColumnGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.3, 24);
  const centerColumnMat = new THREE.MeshStandardMaterial({
    color: 0x8899aa,
    metalness: 0.88,
    roughness: 0.22,
    envMapIntensity: 1.0
  });
  const centerColumn = new THREE.Mesh(centerColumnGeo, centerColumnMat);
  centerColumn.position.y = -0.15;
  centerColumn.castShadow = true;
  group.add(centerColumn);
  
  if (scene) {
    scene.add(group);
  }
  
  return group;
}

function updateHands() {
  if (!group) return;
  
  const secondHandAngle = localRotation;
  const minuteHandAngle = secondHandAngle / SECOND_TO_MINUTE_RATIO;
  const hourHandAngle = minuteHandAngle / MINUTE_TO_HOUR_RATIO;
  
  if (secondHand) {
    secondHand.rotation.z = -Math.PI / 2 + secondHandAngle;
  }
  
  if (minuteHand) {
    minuteHand.rotation.z = -Math.PI / 2 + minuteHandAngle;
  }
  
  if (hourHand) {
    hourHand.rotation.z = -Math.PI / 2 + hourHandAngle;
  }
}

function update(deltaTime) {
  localRotation = fourthWheelRotation;
  updateHands();
}

function setTime(hours, minutes, seconds) {
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  fourthWheelRotation = (totalSeconds / 60) * Math.PI * 2;
  localRotation = fourthWheelRotation;
}

$effect(() => {
  localRotation = fourthWheelRotation;
  updateHands();
});

onMount(() => {
  const now = new Date();
  setTime(now.getHours() % 12, now.getMinutes(), now.getSeconds());
  createWatchHands();
  updateFn = update;
});

onDestroy(() => {
  if (group && scene) {
    scene.remove(group);
  }
  if (hourHand) hourHand.geometry.dispose();
  if (minuteHand) minuteHand.geometry.dispose();
  if (secondHand) secondHand.geometry.dispose();
  if (centerCap) centerCap.geometry.dispose();
});

export { setTime };
</script>

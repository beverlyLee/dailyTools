import * as THREE from 'three';
import KaleidoRoom from './scene/KaleidoRoom';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 5, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0xff6b6b, 2, 50);
pointLight1.position.set(8, 8, 8);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x4ecdc4, 2, 50);
pointLight2.position.set(-8, -5, 8);
scene.add(pointLight2);

const pointLight3 = new THREE.PointLight(0xffe66d, 1.8, 50);
pointLight3.position.set(0, 8, -8);
scene.add(pointLight3);

const kaleidoRoom = new KaleidoRoom(renderer, scene);
scene.add(kaleidoRoom.group);

let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.008;

  const camRadius = 18;
  const camHeight = 6 + Math.sin(time * 0.5) * 2;
  camera.position.x = Math.cos(time * 0.3) * camRadius;
  camera.position.z = Math.sin(time * 0.3) * camRadius;
  camera.position.y = camHeight;
  camera.lookAt(0, 0, 0);

  kaleidoRoom.update(camera);

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

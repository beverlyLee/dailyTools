<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import FoodModel from './models/FoodModel.svelte';
  import SliceControl from './ui/SliceControl.svelte';

  let sliceY = 0.5;
  let scene;
  let container;

  function initScene() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.Fog(0x0a0a0f, 5, 15);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(3, 2, 4);
    camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0x404050, 0.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff6600, 0.6);
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x00ff88, 0.3, 10);
    fillLight.position.set(0, 2, 3);
    scene.add(fillLight);

    const plateGeom = new THREE.CylinderGeometry(2.05, 2.05, 0.08, 80);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a32,
      roughness: 0.35,
      metalness: 0.7
    });
    const plate = new THREE.Mesh(plateGeom, plateMat);
    plate.position.y = -1.27;
    plate.receiveShadow = true;
    scene.add(plate);

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraAngle = { theta: 0.5, phi: 1.0 };
    let cameraDistance = 5;

    renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cameraAngle.theta += deltaX * 0.01;
      cameraAngle.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.1, cameraAngle.phi - deltaY * 0.01));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('mouseup', () => {
      isDragging = false;
    });

    renderer.domElement.addEventListener('mouseleave', () => {
      isDragging = false;
    });

    renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      cameraDistance = Math.max(3, Math.min(10, cameraDistance + e.deltaY * 0.005));
    });

    function updateCamera() {
      camera.position.x = cameraDistance * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
      camera.position.y = cameraDistance * Math.cos(cameraAngle.phi);
      camera.position.z = cameraDistance * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
      camera.lookAt(0, 0, 0);
    }

    window.addEventListener('resize', () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    });

    function animate() {
      requestAnimationFrame(animate);
      updateCamera();
      renderer.render(scene, camera);
    }

    animate();
  }

  onMount(() => {
    initScene();
  });
</script>

<div class="app-container">
  <div class="canvas-container" bind:this={container}></div>
  <SliceControl bind:sliceY />
  <div class="title-overlay">
    <h1>分子厨房</h1>
    <p>MOLECULAR KITCHEN</p>
  </div>
  <div class="hint-overlay">
    <span>🖱️ 拖动旋转视角 · 滚轮缩放</span>
  </div>
  <FoodModel {scene} bind:sliceY />
</div>

<style>
  .app-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  .canvas-container {
    width: 100%;
    height: 100%;
  }

  .title-overlay {
    position: absolute;
    top: 20px;
    right: 20px;
    text-align: right;
    z-index: 100;
  }

  .title-overlay h1 {
    color: #ff6600;
    font-size: 28px;
    font-weight: 300;
    letter-spacing: 8px;
    margin: 0;
    text-shadow: 0 0 20px rgba(255, 102, 0, 0.5);
  }

  .title-overlay p {
    color: #666;
    font-size: 10px;
    letter-spacing: 4px;
    margin-top: 4px;
  }

  .hint-overlay {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
  }

  .hint-overlay span {
    color: #555;
    font-size: 12px;
    background: rgba(20, 20, 25, 0.7);
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid rgba(255, 102, 0, 0.2);
  }
</style>

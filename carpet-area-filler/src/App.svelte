<script>
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  
  import { sutherlandHodgman, getPolygonBounds, getPolygonArea, getPolygonCentroid, createRectanglePolygon, pointInPolygon } from './utils/polygonClipping.js';
  import { recommendCarpetSize, adjustCarpetPosition, findBestFitPosition } from './utils/sizeEngine.js';
  import { createCarpetMaterial, getCarpetTypes } from './utils/materialGenerator.js';
  import { checkCollision, createDoorSwingObstacle, createFurnitureLegObstacle, getObstaclePolygon, adjustCarpetToAvoidCollisions } from './utils/collisionDetector.js';
  import { createCarpetMesh, createRoomFloor, createWallLine, createObstacleMesh } from './utils/meshConverter.js';
  
  let canvasContainer;
  let topCanvas;
  let scene, camera, renderer, controls;
  let carpetMesh = null;
  let floorMesh = null;
  let wallGroup = null;
  let obstacleMeshes = [];
  let contourLine = null;
  
  let isDrawing = false;
  let contourPoints = [];
  let isClosed = false;
  let mouseWorldPos = { x: 0, y: 0 };
  
  let selectedCarpetType = 'wool';
  let selectedShape = 'rectangle';
  let carpetTypes = [];
  let recommendedSize = null;
  let allSizes = [];
  let selectedSizeIndex = 0;
  
  let showObstacles = true;
  let collisionInfo = null;
  
  const ROOM_WIDTH = 8;
  const ROOM_DEPTH = 6;
  const SCALE = 32;
  
  let obstacles = [];
  let roomContour = [];
  
  function initRoom() {
    roomContour = [
      { x: -4, y: -3 },
      { x: 2, y: -3 },
      { x: 2, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
      { x: -4, y: 3 }
    ];
    
    obstacles = [
      createDoorSwingObstacle(-4, -2, 1.0, Math.PI / 2, false),
      createDoorSwingObstacle(-1, 3, 0.9, Math.PI / 2, true),
      createFurnitureLegObstacle(1, 1.5, 0.06),
      createFurnitureLegObstacle(2.5, 1.5, 0.06),
      createFurnitureLegObstacle(1, 0.5, 0.06),
      createFurnitureLegObstacle(2.5, 0.5, 0.06),
      createFurnitureLegObstacle(-2, -1, 0.05),
      createFurnitureLegObstacle(-3, -1, 0.05),
    ];
  }
  
  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    camera.position.set(6, 7, 8);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasContainer.appendChild(renderer.domElement);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -6;
    dirLight.shadow.camera.right = 6;
    dirLight.shadow.camera.top = 6;
    dirLight.shadow.camera.bottom = -6;
    scene.add(dirLight);
    
    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);
    
    floorMesh = createRoomFloor(ROOM_WIDTH, ROOM_DEPTH);
    scene.add(floorMesh);
    
    wallGroup = createWallLine(roomContour, 2.8, 0xe8e8e8);
    scene.add(wallGroup);
    
    updateObstacleMeshes();
    
    animate();
  }
  
  function updateObstacleMeshes() {
    obstacleMeshes.forEach(m => scene.remove(m));
    obstacleMeshes = [];
    
    if (!showObstacles) return;
    
    obstacles.forEach(obs => {
      const color = obs.type === 'door' ? 0x4ecdc4 : 0xff6b6b;
      const mesh = createObstacleMesh(obs, color);
      scene.add(mesh);
      obstacleMeshes.push(mesh);
    });
  }
  
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  
  function initTopCanvas() {
    const ctx = topCanvas.getContext('2d');
    topCanvas.width = topCanvas.offsetWidth;
    topCanvas.height = topCanvas.offsetHeight;
    drawTopView();
  }
  
  function worldToScreen(wx, wy) {
    const cx = topCanvas.width / 2;
    const cy = topCanvas.height / 2;
    return {
      x: cx + wx * SCALE,
      y: cy + wy * SCALE
    };
  }
  
  function screenToWorld(sx, sy) {
    const cx = topCanvas.width / 2;
    const cy = topCanvas.height / 2;
    return {
      x: (sx - cx) / SCALE,
      y: (sy - cy) / SCALE
    };
  }
  
  function drawTopView() {
    const ctx = topCanvas.getContext('2d');
    const w = topCanvas.width;
    const h = topCanvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(0, 0, w, h);
    
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1;
    for (let x = -ROOM_WIDTH/2; x <= ROOM_WIDTH/2; x += 0.5) {
      const p1 = worldToScreen(x, -ROOM_DEPTH/2);
      const p2 = worldToScreen(x, ROOM_DEPTH/2);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let y = -ROOM_DEPTH/2; y <= ROOM_DEPTH/2; y += 0.5) {
      const p1 = worldToScreen(-ROOM_WIDTH/2, y);
      const p2 = worldToScreen(ROOM_WIDTH/2, y);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    
    ctx.fillStyle = '#3d3d5c';
    ctx.beginPath();
    const firstRoom = worldToScreen(roomContour[0].x, roomContour[0].y);
    ctx.moveTo(firstRoom.x, firstRoom.y);
    for (let i = 1; i < roomContour.length; i++) {
      const p = worldToScreen(roomContour[i].x, roomContour[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(firstRoom.x, firstRoom.y);
    for (let i = 1; i < roomContour.length; i++) {
      const p = worldToScreen(roomContour[i].x, roomContour[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
    
    if (showObstacles) {
      obstacles.forEach(obs => {
        const poly = getObstaclePolygon(obs);
        if (poly.length >= 3) {
          ctx.fillStyle = obs.type === 'door' ? 'rgba(78, 205, 196, 0.3)' : 'rgba(255, 107, 107, 0.5)';
          ctx.strokeStyle = obs.type === 'door' ? '#4ecdc4' : '#ff6b6b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const first = worldToScreen(poly[0].x, poly[0].y);
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < poly.length; i++) {
            const p = worldToScreen(poly[i].x, poly[i].y);
            ctx.lineTo(p.x, p.y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      });
    }
    
    if (recommendedSize && recommendedSize.clippedPolygon && recommendedSize.clippedPolygon.length >= 3) {
      const clipped = recommendedSize.clippedPolygon;
      ctx.fillStyle = 'rgba(255, 200, 100, 0.4)';
      ctx.strokeStyle = '#ffc864';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const first = worldToScreen(clipped[0].x, clipped[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < clipped.length; i++) {
        const p = worldToScreen(clipped[i].x, clipped[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    
    if (contourPoints.length > 0) {
      ctx.strokeStyle = '#00ff88';
      ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const first = worldToScreen(contourPoints[0].x, contourPoints[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < contourPoints.length; i++) {
        const p = worldToScreen(contourPoints[i].x, contourPoints[i].y);
        ctx.lineTo(p.x, p.y);
      }
      if (isClosed) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.stroke();
      
      contourPoints.forEach((p, i) => {
        const sp = worldToScreen(p.x, p.y);
        ctx.fillStyle = i === 0 ? '#00ff88' : '#ffffff';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      
      if (isDrawing && !isClosed && contourPoints.length > 0) {
        const last = worldToScreen(contourPoints[contourPoints.length - 1].x, contourPoints[contourPoints.length - 1].y);
        const mouse = worldToScreen(mouseWorldPos.x, mouseWorldPos.y);
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
  
  function onCanvasMouseDown(e) {
    const rect = topCanvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPos = screenToWorld(sx, sy);
    
    if (!pointInPolygon(worldPos, roomContour)) return;
    
    if (isClosed || contourPoints.length === 0) {
      contourPoints = [worldPos];
      isClosed = false;
      isDrawing = true;
      clearCarpet();
    } else {
      const firstPoint = contourPoints[0];
      const dist = Math.sqrt(Math.pow(worldPos.x - firstPoint.x, 2) + Math.pow(worldPos.y - firstPoint.y, 2));
      
      if (dist < 0.3 && contourPoints.length >= 3) {
        isClosed = true;
        isDrawing = false;
        contourPoints.push({ ...firstPoint });
        generateCarpet();
      } else {
        contourPoints.push(worldPos);
      }
    }
    
    drawTopView();
  }
  
  function onCanvasMouseMove(e) {
    const rect = topCanvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    mouseWorldPos = screenToWorld(sx, sy);
    
    if (isDrawing && !isClosed) {
      drawTopView();
    }
  }
  
  function onCanvasDblClick() {
    if (contourPoints.length >= 3 && !isClosed) {
      isClosed = true;
      isDrawing = false;
      contourPoints.push({ ...contourPoints[0] });
      generateCarpet();
      drawTopView();
    }
  }
  
  function generateCarpet() {
    if (contourPoints.length < 3 || !isClosed) return;
    
    const workingContour = contourPoints.slice(0, -1);
    
    const result = recommendCarpetSize(workingContour, selectedShape);
    recommendedSize = result.recommended;
    allSizes = result.allSizes;
    selectedSizeIndex = 0;
    
    updateCarpet3D();
  }
  
  function updateCarpet3D() {
    if (carpetMesh) {
      scene.remove(carpetMesh);
      carpetMesh = null;
    }
    
    if (!recommendedSize || !recommendedSize.clippedPolygon) return;
    
    let carpetPoly = recommendedSize.clippedPolygon;
    
    const collisionResult = checkCollision(carpetPoly, obstacles);
    collisionInfo = collisionResult;
    
    if (collisionResult.hasCollision) {
      const workingContour = contourPoints.slice(0, -1);
      const adjusted = adjustCarpetToAvoidCollisions(
        carpetPoly, obstacles, workingContour, 30
      );
      if (adjusted.adjusted) {
        carpetPoly = adjusted.polygon;
        collisionInfo = adjusted.result;
      }
    }
    
    const { material, pileHeight } = createCarpetMaterial(selectedCarpetType);
    carpetMesh = createCarpetMesh(carpetPoly, material, pileHeight);
    
    const bounds = getPolygonBounds(carpetPoly);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minY + bounds.maxY) / 2;
    carpetMesh.position.set(centerX, 0, centerZ);
    
    scene.add(carpetMesh);
    
    drawTopView();
  }
  
  function clearCarpet() {
    if (carpetMesh) {
      scene.remove(carpetMesh);
      carpetMesh = null;
    }
    recommendedSize = null;
    allSizes = [];
    selectedSizeIndex = 0;
    collisionInfo = null;
  }
  
  function resetDrawing() {
    contourPoints = [];
    isClosed = false;
    isDrawing = false;
    clearCarpet();
    drawTopView();
  }
  
  function selectSize(index) {
    selectedSizeIndex = index;
    recommendedSize = allSizes[index];
    updateCarpet3D();
  }
  
  function handleCarpetTypeChange(e) {
    selectedCarpetType = e.target.value;
    if (recommendedSize) {
      updateCarpet3D();
    }
  }
  
  function handleShapeChange(e) {
    selectedShape = e.target.value;
    if (contourPoints.length >= 3 && isClosed) {
      generateCarpet();
    }
  }
  
  function handleObstaclesToggle(e) {
    showObstacles = e.target.checked;
    updateObstacleMeshes();
    drawTopView();
  }
  
  function onWindowResize() {
    if (!canvasContainer || !renderer) return;
    
    const w = canvasContainer.clientWidth;
    const h = canvasContainer.clientHeight;
    
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    
    if (topCanvas) {
      topCanvas.width = topCanvas.offsetWidth;
      topCanvas.height = topCanvas.offsetHeight;
      drawTopView();
    }
  }
  
  onMount(() => {
    carpetTypes = getCarpetTypes();
    initRoom();
    initThree();
    initTopCanvas();
    
    window.addEventListener('resize', onWindowResize);
  });
  
  onDestroy(() => {
    window.removeEventListener('resize', onWindowResize);
    if (renderer) {
      renderer.dispose();
    }
  });
  
  $: if (recommendedSize) {
    // reactive update
  }
</script>

<div class="app">
  <div class="main-view">
    <div class="three-container" bind:this={canvasContainer}></div>
    
    <div class="top-view-panel">
      <div class="panel-title">平面图 - 绘制区域</div>
      <canvas 
        bind:this={topCanvas}
        class="top-canvas"
        on:mousedown={onCanvasMouseDown}
        on:mousemove={onCanvasMouseMove}
        on:dblclick={onCanvasDblClick}
      ></canvas>
      <div class="canvas-hint">
        点击添加顶点，双击或点击起点闭合轮廓
      </div>
    </div>
  </div>
  
  <div class="sidebar">
    <div class="sidebar-header">
      <h2>地毯区域填充器</h2>
      <p>Carpet Area Filler</p>
    </div>
    
    <div class="control-section">
      <h3>绘制控制</h3>
      <button class="btn btn-primary" on:click={resetDrawing}>
        重新绘制
      </button>
    </div>
    
    <div class="control-section">
      <h3>地毯形状</h3>
      <div class="shape-selector">
        <label class="radio-label">
          <input type="radio" value="rectangle" bind:group={selectedShape} on:change={handleShapeChange}>
          <span>矩形</span>
        </label>
        <label class="radio-label">
          <input type="radio" value="square" bind:group={selectedShape} on:change={handleShapeChange}>
          <span>正方形</span>
        </label>
        <label class="radio-label">
          <input type="radio" value="circle" bind:group={selectedShape} on:change={handleShapeChange}>
          <span>圆形</span>
        </label>
      </div>
    </div>
    
    <div class="control-section">
      <h3>地毯材质</h3>
      <div class="material-list">
        {#each carpetTypes as type}
          <label class="material-item">
            <input 
              type="radio" 
              value={type.id} 
              bind:group={selectedCarpetType}
              on:change={handleCarpetTypeChange}
            >
            <div class="material-preview" style="background: {type.color}"></div>
            <div class="material-info">
              <div class="material-name">{type.name}</div>
              <div class="material-desc">{type.description}</div>
            </div>
          </label>
        {/each}
      </div>
    </div>
    
    <div class="control-section">
      <h3>推荐尺寸</h3>
      {#if recommendedSize}
        <div class="size-info">
          <div class="current-size">
            <strong>{recommendedSize.name}</strong>
            {#if recommendedSize.shape === 'circle'}
              <span>直径 {recommendedSize.scaledWidth.toFixed(2)}m</span>
            {:else}
              <span>{recommendedSize.scaledWidth.toFixed(2)}m × {recommendedSize.scaledHeight.toFixed(2)}m</span>
            {/if}
          </div>
          <div class="size-score">
            匹配度: {(recommendedSize.score * 100).toFixed(1)}%
          </div>
        </div>
        
        <div class="size-list">
          {#each allSizes as size, index}
            <div 
              class="size-option {index === selectedSizeIndex ? 'active' : ''}"
              role="button"
              tabindex="0"
              on:click={() => selectSize(index)}
              on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectSize(index); }}
            >
              <span class="size-name">{size.name}</span>
              {#if size.shape === 'circle'}
                <span class="size-value">Ø{size.diameter}m</span>
              {:else}
                <span class="size-value">{size.width}×{size.height}m</span>
              {/if}
              <span class="size-match">{(size.score * 100).toFixed(0)}%</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="hint-text">请先在平面图上绘制区域轮廓</p>
      {/if}
    </div>
    
    <div class="control-section">
      <h3>碰撞检测</h3>
      <label class="toggle-label">
        <input type="checkbox" checked={showObstacles} on:change={handleObstaclesToggle}>
        <span>显示障碍物</span>
      </label>
      
      {#if collisionInfo}
        <div class="collision-info {collisionInfo.hasCollision ? 'warning' : 'safe'}">
          {#if collisionInfo.hasCollision}
            <div class="collision-status">⚠️ 存在碰撞</div>
            <div class="collision-detail">
              碰撞面积: {collisionInfo.totalCollidingArea.toFixed(4)} m²
            </div>
            <div class="collision-detail">
              碰撞比例: {(collisionInfo.collisionRatio * 100).toFixed(1)}%
            </div>
          {:else}
            <div class="collision-status">✅ 无碰撞</div>
          {/if}
        </div>
      {/if}
    </div>
    
    <div class="control-section info-section">
      <h3>操作说明</h3>
      <ul class="instructions">
        <li>在左下图平面图中点击绘制轮廓点</li>
        <li>点击起点或双击闭合多边形</li>
        <li>系统自动推荐最佳地毯尺寸</li>
        <li>红色圆点为家具腿，青色扇形为门开启路径</li>
        <li>鼠标拖拽旋转3D视图，滚轮缩放</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .app {
    display: flex;
    width: 100vw;
    height: 100vh;
    background: #1a1a2e;
    color: #fff;
    overflow: hidden;
  }
  
  .main-view {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  
  .three-container {
    flex: 1;
    position: relative;
  }
  
  .three-container :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }
  
  .top-view-panel {
    position: absolute;
    bottom: 20px;
    left: 20px;
    width: 300px;
    background: rgba(26, 26, 46, 0.95);
    border: 1px solid #3a3a5a;
    border-radius: 8px;
    padding: 12px;
    backdrop-filter: blur(10px);
  }
  
  .panel-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #a0a0c0;
  }
  
  .top-canvas {
    width: 100%;
    height: 220px;
    border-radius: 4px;
    cursor: crosshair;
    background: #2a2a4a;
  }
  
  .canvas-hint {
    font-size: 11px;
    color: #666;
    margin-top: 6px;
    text-align: center;
  }
  
  .sidebar {
    width: 320px;
    background: #16162a;
    border-left: 1px solid #2a2a4a;
    overflow-y: auto;
    padding: 20px;
  }
  
  .sidebar-header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #2a2a4a;
  }
  
  .sidebar-header h2 {
    font-size: 20px;
    margin: 0 0 4px 0;
    color: #fff;
  }
  
  .sidebar-header p {
    font-size: 12px;
    color: #666;
    margin: 0;
  }
  
  .control-section {
    margin-bottom: 24px;
  }
  
  .control-section h3 {
    font-size: 14px;
    margin: 0 0 12px 0;
    color: #a0a0c0;
    font-weight: 600;
  }
  
  .btn {
    width: 100%;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background: #4ecdc4;
    color: #1a1a2e;
  }
  
  .btn-primary:hover {
    background: #5dd5cc;
    transform: translateY(-1px);
  }
  
  .shape-selector {
    display: flex;
    gap: 8px;
  }
  
  .radio-label {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    background: #1e1e3a;
    border: 1px solid #2a2a4a;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }
  
  .radio-label:hover {
    border-color: #4ecdc4;
  }
  
  .radio-label input {
    margin: 0;
  }
  
  .radio-label span {
    color: #ccc;
  }
  
  .material-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .material-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #1e1e3a;
    border: 1px solid #2a2a4a;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .material-item:hover {
    border-color: #4ecdc4;
  }
  
  .material-item input {
    margin: 0;
  }
  
  .material-preview {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.2);
  }
  
  .material-info {
    flex: 1;
  }
  
  .material-name {
    font-size: 13px;
    font-weight: 500;
    color: #fff;
  }
  
  .material-desc {
    font-size: 11px;
    color: #888;
    margin-top: 2px;
  }
  
  .size-info {
    padding: 12px;
    background: linear-gradient(135deg, #2a2a4a, #1e1e3a);
    border-radius: 6px;
    margin-bottom: 12px;
    border: 1px solid #3a3a5a;
  }
  
  .current-size {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  
  .current-size strong {
    color: #4ecdc4;
    font-size: 14px;
  }
  
  .current-size span {
    font-size: 12px;
    color: #aaa;
  }
  
  .size-score {
    font-size: 12px;
    color: #ffc864;
  }
  
  .size-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .size-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: #1e1e3a;
    border: 1px solid #2a2a4a;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
  }
  
  .size-option:hover {
    border-color: #4ecdc4;
    background: #252545;
  }
  
  .size-option.active {
    border-color: #4ecdc4;
    background: rgba(78, 205, 196, 0.1);
  }
  
  .size-name {
    flex: 1;
    color: #ccc;
  }
  
  .size-value {
    color: #888;
  }
  
  .size-match {
    color: #ffc864;
    font-weight: 500;
    min-width: 40px;
    text-align: right;
  }
  
  .hint-text {
    font-size: 13px;
    color: #666;
    font-style: italic;
  }
  
  .toggle-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
    color: #ccc;
  }
  
  .collision-info {
    margin-top: 12px;
    padding: 10px;
    border-radius: 6px;
    font-size: 12px;
  }
  
  .collision-info.safe {
    background: rgba(78, 205, 196, 0.1);
    border: 1px solid rgba(78, 205, 196, 0.3);
  }
  
  .collision-info.warning {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
  }
  
  .collision-status {
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .safe .collision-status {
    color: #4ecdc4;
  }
  
  .warning .collision-status {
    color: #ff6b6b;
  }
  
  .collision-detail {
    color: #aaa;
    font-size: 11px;
    margin-top: 2px;
  }
  
  .info-section {
    border-top: 1px solid #2a2a4a;
    padding-top: 20px;
    margin-top: 20px;
  }
  
  .instructions {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 12px;
    color: #888;
  }
  
  .instructions li {
    padding: 4px 0 4px 16px;
    position: relative;
  }
  
  .instructions li::before {
    content: '•';
    position: absolute;
    left: 0;
    color: #4ecdc4;
  }
</style>

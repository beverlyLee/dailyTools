<script>
  import { onMount, onDestroy } from 'svelte'
  import * as THREE from 'three'
  import StoneSurface from './models/StoneSurface.svelte'

  let container
  let scene, camera, renderer
  let animationId
  let stoneSurfaceRef
  let cameraAngle = 0

  let updateFrame = 0
  const updateInterval = 2

  let mossCoverage = 0
  let lastCoverageUpdate = 0
  const coverageUpdateInterval = 30

  let paused = false
  let startTime = Date.now()
  let pausedElapsed = 0
  let pauseStartTime = 0

  function init() {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)
    scene.fog = new THREE.Fog(0x1a1a2e, 15, 30)

    const aspect = window.innerWidth / window.innerHeight
    camera = new THREE.PerspectiveCamera(
      55,
      aspect,
      0.1,
      100
    )
    updateCameraPosition()

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0x8899aa, 0.45)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffeedd, 0.85)
    directionalLight.position.set(4, 12, 6)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    scene.add(directionalLight)

    window.addEventListener('resize', onWindowResize)
  }

  function updateCameraPosition() {
    const radius = 12
    const height = 7
    camera.position.x = Math.cos(cameraAngle) * radius
    camera.position.z = Math.sin(cameraAngle) * radius
    camera.position.y = height
    camera.lookAt(0, 0, 0)
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  function getElapsedSeconds() {
    if (paused) {
      return (pauseStartTime - startTime - pausedElapsed) / 1000
    }
    return (Date.now() - startTime - pausedElapsed) / 1000
  }

  function togglePause() {
    if (paused) {
      pausedElapsed += Date.now() - pauseStartTime
      paused = false
    } else {
      pauseStartTime = Date.now()
      paused = true
    }
  }

  function resetSimulation() {
    if (stoneSurfaceRef && stoneSurfaceRef.reset) {
      stoneSurfaceRef.reset()
    }
    startTime = Date.now()
    pausedElapsed = 0
    paused = false
    mossCoverage = 0
  }

  function animate() {
    animationId = requestAnimationFrame(animate)

    cameraAngle += 0.0015
    updateCameraPosition()

    if (!paused) {
      updateFrame++
      if (updateFrame >= updateInterval) {
        updateFrame = 0
        if (stoneSurfaceRef && stoneSurfaceRef.update) {
          stoneSurfaceRef.update()
        }
      }

      lastCoverageUpdate++
      if (lastCoverageUpdate >= coverageUpdateInterval) {
        lastCoverageUpdate = 0
        if (stoneSurfaceRef && stoneSurfaceRef.getMossCoverage) {
          mossCoverage = stoneSurfaceRef.getMossCoverage()
        }
      }
    }

    renderer.render(scene, camera)
  }

  function handleStoneSurfaceMount(event) {
    stoneSurfaceRef = event.detail
  }

  $: coveragePercent = (mossCoverage * 100).toFixed(1)
  $: displayTime = Math.floor(getElapsedSeconds())
  $: pauseLabel = paused ? '继续' : '暂停'

  onMount(() => {
    init()
    requestAnimationFrame(() => {
      animate()
    })
  })

  onDestroy(() => {
    cancelAnimationFrame(animationId)
    window.removeEventListener('resize', onWindowResize)
    if (renderer) {
      renderer.dispose()
    }
  })
</script>

<div bind:this={container} class="canvas-container">
  {#if scene}
    <StoneSurface {scene} on:mount={handleStoneSurfaceMount} />
  {/if}
</div>

<div class="ui-overlay">
  <div class="ui-item">
    <span class="label">时间</span>
    <span class="value">{displayTime}s</span>
  </div>
  <div class="ui-item">
    <span class="label">苔藓覆盖率</span>
    <span class="value green">{coveragePercent}%</span>
  </div>
  <div class="ui-buttons">
    <button class="btn" on:click={togglePause}>{pauseLabel}</button>
    <button class="btn btn-reset" on:click={resetSimulation}>重置</button>
  </div>
</div>

<style>
  .canvas-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
  }

  .ui-overlay {
    position: fixed;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.6);
    padding: 15px 20px;
    border-radius: 10px;
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ui-item {
    position: relative;
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }

  .label {
    color: #aaa;
  }

  .value {
    font-weight: 600;
    min-width: 60px;
    text-align: right;
  }

  .green {
    color: #6bcb77;
  }

  .ui-buttons {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .btn {
    flex: 1;
    padding: 6px 14px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .btn-reset {
    border-color: rgba(255, 100, 100, 0.3);
  }

  .btn-reset:hover {
    background: rgba(255, 100, 100, 0.2);
  }
</style>
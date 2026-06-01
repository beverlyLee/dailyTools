<script>
  import { onMount, createEventDispatcher } from 'svelte'
  import * as THREE from 'three'
  import { GrowthSystem } from '../systems/GrowthSystem'

  export let scene

  const dispatch = createEventDispatcher()

  const gridSize = 80
  const planeSize = 8

  let growthSystem
  let mesh
  let geometry
  let material
  let heightMapData

  function generateHeightMap(width, height) {
    const map = []
    
    for (let y = 0; y < height; y++) {
      map[y] = []
      for (let x = 0; x < width; x++) {
        const nx = x / width
        const ny = y / height
        let h = 0
        h += Math.sin(nx * 6.28 * 2) * Math.cos(ny * 6.28 * 2) * 0.2
        h += Math.sin(nx * 6.28 * 4 + 1.7) * Math.cos(ny * 6.28 * 3 + 2.3) * 0.15
        h += Math.sin(nx * 6.28 * 1.5 + ny * 6.28 * 2.5) * 0.18
        h += (Math.random() - 0.5) * 0.08
        const edgeDist = Math.min(nx, ny, 1 - nx, 1 - ny)
        const edgeRise = edgeDist < 0.15 ? (0.15 - edgeDist) * 2 : 0
        h += edgeRise * 0.3
        h = (h + 0.8) / 1.6
        h = Math.max(0, Math.min(1, h))
        map[y][x] = h
      }
    }
    return map
  }

  function createStoneSurface() {
    heightMapData = generateHeightMap(gridSize, gridSize)
    
    growthSystem = new GrowthSystem(gridSize, gridSize, heightMapData)

    geometry = new THREE.PlaneGeometry(planeSize, planeSize, gridSize - 1, gridSize - 1)
    geometry.rotateX(-Math.PI / 2)

    const positions = geometry.attributes.position
    const colors = new Float32Array(positions.count * 3)

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const i = y * gridSize + x
        const h = heightMapData[y][x]
        positions.setY(i, h * 1.2)

        const darkness = 1.0 - h * 0.6
        const gray = (80 + h * 60) * darkness
        colors[i * 3] = gray / 255
        colors[i * 3 + 1] = gray / 255
        colors[i * 3 + 2] = gray / 255
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.computeVertexNormals()

    material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true
    })

    mesh = new THREE.Mesh(geometry, material)
    mesh.receiveShadow = true
    mesh.castShadow = true
    scene.add(mesh)
  }

  function updateColors() {
    const colors = geometry.attributes.color.array

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const i = y * gridSize + x
        const color = growthSystem.getMossColor(x, y)
        colors[i * 3] = color.r / 255
        colors[i * 3 + 1] = color.g / 255
        colors[i * 3 + 2] = color.b / 255
      }
    }

    geometry.attributes.color.needsUpdate = true
  }

  function update() {
    growthSystem.update()
    updateColors()
  }

  function getMossCoverage() {
    return growthSystem.getMossCoverage()
  }

  function reset() {
    growthSystem.reset()
    const colors = geometry.attributes.color.array
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const i = y * gridSize + x
        const h = heightMapData[y][x]
        const darkness = 1.0 - h * 0.5
        const gray = (80 + h * 60) * darkness
        colors[i * 3] = gray / 255
        colors[i * 3 + 1] = gray / 255
        colors[i * 3 + 2] = gray / 255
      }
    }
    geometry.attributes.color.needsUpdate = true
  }

  onMount(() => {
    createStoneSurface()
    dispatch('mount', { update, getMossCoverage, reset })
  })
</script>
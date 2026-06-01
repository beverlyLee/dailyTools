import * as THREE from 'three'

export interface CellMesh extends THREE.Mesh {
  userData: {
    originalPositions: Float32Array
    updateDeformation: (progress: number) => void
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function computeStage2(
  origX: number, origY: number, origZ: number,
  t: number
): [number, number, number] {
  let nx = origX
  let ny = origY
  let nz = origZ

  const maxX = 2.8
  const normX = Math.abs(nx) / maxX

  const waistWidth = 0.45 - t * 0.4
  const waistDepth = t * 0.98

  const waistMask = 1.0 - smoothstep(waistWidth, waistWidth + 0.35, normX)
  const pinchAmount = waistMask * waistDepth

  const signX = nx >= 0 ? 1 : -1
  const targetX = signX * waistWidth * maxX
  nx = nx * (1.0 - pinchAmount) + targetX * pinchAmount

  const yzPinch = 1.0 - waistMask * waistDepth * 0.75
  ny *= yzPinch
  nz *= yzPinch

  return [nx, ny, nz]
}

function deformVertex(x: number, y: number, z: number, progress: number): [number, number, number] {
  if (progress <= 0) return [x, y, z]

  if (progress <= 0.33) {
    const t = progress / 0.33
    const xScale = 1 + t * 1.8
    const yzScale = 1 - t * 0.25
    return [x * xScale, y * yzScale, z * yzScale]
  }

  const origX = x * 2.8
  const origY = y * 0.75
  const origZ = z * 0.75

  if (progress <= 0.66) {
    const t = (progress - 0.33) / 0.33
    return computeStage2(origX, origY, origZ, t)
  }

  const t = (progress - 0.66) / 0.34

  const [s2x, s2y, s2z] = computeStage2(origX, origY, origZ, 1.0)

  const signX = x >= 0 ? 1 : -1

  const maxX = 2.8
  const waistWidthFinal = 0.05
  const startCenterX = signX * waistWidthFinal * maxX

  const sepDist = t * 1.8
  const endCenterX = signX * (waistWidthFinal * maxX + sepDist)

  const curCenterX = startCenterX + (endCenterX - startCenterX) * t

  const localX0 = s2x - startCenterX
  const localY0 = s2y
  const localZ0 = s2z

  const dist0 = Math.sqrt(localX0 * localX0 + localY0 * localY0 + localZ0 * localZ0)

  const targetRadius = 1.1

  let nx: number, ny: number, nz: number

  if (dist0 > 0.001) {
    const dirX = localX0 / dist0
    const dirY = localY0 / dist0
    const dirZ = localZ0 / dist0

    const currentRadius = dist0
    const newRadius = currentRadius + (targetRadius - currentRadius) * t

    nx = curCenterX + dirX * newRadius
    ny = dirY * newRadius
    nz = dirZ * newRadius
  } else {
    nx = curCenterX
    ny = 0
    nz = 0
  }

  return [nx, ny, nz]
}

export function createCellMesh(): CellMesh {
  const geometry = new THREE.SphereGeometry(1, 96, 96)
  const material = new THREE.MeshPhongMaterial({
    color: 0x00d4ff,
    emissive: 0x003355,
    shininess: 100,
    specular: 0x66ddff,
    transparent: true,
    opacity: 0.92,
  })

  const originalPositions = new Float32Array(geometry.attributes.position.array)

  const mesh = new THREE.Mesh(geometry, material) as unknown as CellMesh
  mesh.userData.originalPositions = originalPositions
  mesh.userData.updateDeformation = (progress: number) => {
    const positions = geometry.attributes.position.array as Float32Array
    const orig = mesh.userData.originalPositions

    for (let i = 0; i < positions.length; i += 3) {
      const [nx, ny, nz] = deformVertex(orig[i], orig[i + 1], orig[i + 2], progress)
      positions[i] = nx
      positions[i + 1] = ny
      positions[i + 2] = nz
    }

    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
  }

  return mesh
}
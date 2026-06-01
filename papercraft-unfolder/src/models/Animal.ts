import * as THREE from 'three'

export function createDogModel(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const vertices: number[] = []
  const indices: number[] = []
  const colors: number[] = []

  const color = new THREE.Color(0xD4A574)

  addBox(vertices, indices, colors, 0, 0, 0, 1.5, 1, 1, color)

  addBox(vertices, indices, colors, 1.1, 0.2, 0, 0.9, 0.8, 0.9, color)

  addBox(vertices, indices, colors, 1.6, 0.9, 0.4, 0.3, 0.5, 0.15, color)
  addBox(vertices, indices, colors, 1.6, 0.9, -0.4, 0.3, 0.5, 0.15, color)

  addBox(vertices, indices, colors, 1.8, 0.5, 0, 0.3, 0.25, 0.2, color)

  addBox(vertices, indices, colors, -0.7, -0.3, 0.35, 0.4, 0.5, 0.4, color)
  addBox(vertices, indices, colors, -0.7, -0.3, -0.35, 0.4, 0.5, 0.4, color)
  addBox(vertices, indices, colors, 0.4, -0.3, 0.35, 0.4, 0.5, 0.4, color)
  addBox(vertices, indices, colors, 0.4, -0.3, -0.35, 0.4, 0.5, 0.4, color)

  addBox(vertices, indices, colors, -1.2, 0.1, 0, 0.6, 0.3, 0.3, color)

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
}

function addBox(
  vertices: number[],
  indices: number[],
  colors: number[],
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: THREE.Color
): void {
  const baseIndex = vertices.length / 3

  const hw = w / 2
  const hh = h / 2
  const hd = d / 2

  const v = [
    [x - hw, y - hh, z + hd],
    [x + hw, y - hh, z + hd],
    [x + hw, y + hh, z + hd],
    [x - hw, y + hh, z + hd],
    [x - hw, y - hh, z - hd],
    [x + hw, y - hh, z - hd],
    [x + hw, y + hh, z - hd],
    [x - hw, y + hh, z - hd],
  ]

  for (const vertex of v) {
    vertices.push(...vertex)
    colors.push(color.r, color.g, color.b)
  }

  const faces = [
    [0, 1, 2], [0, 2, 3],
    [5, 4, 7], [5, 7, 6],
    [4, 0, 3], [4, 3, 7],
    [1, 5, 6], [1, 6, 2],
    [3, 2, 6], [3, 6, 7],
    [4, 5, 1], [4, 1, 0],
  ]

  for (const face of faces) {
    indices.push(
      baseIndex + face[0],
      baseIndex + face[1],
      baseIndex + face[2]
    )
  }
}

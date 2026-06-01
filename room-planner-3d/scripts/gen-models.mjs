import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modelsDir = path.resolve(__dirname, '../public/models')
fs.mkdirSync(modelsDir, { recursive: true })

function pad4(n) { return ((n + 3) >> 2) << 2 }

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255]
}

function buildBoxMesh(pos, size) {
  const [w, h, d] = size
  const [cx, cy, cz] = pos
  const x0 = cx - w / 2, x1 = cx + w / 2
  const y0 = cy - h / 2, y1 = cy + h / 2
  const z0 = cz - d / 2, z1 = cz + d / 2

  const verts = [
    x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0,
    x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1,
  ]

  const faces = [
    [0, 1, 2, 3],
    [5, 4, 7, 6],
    [4, 0, 3, 7],
    [1, 5, 6, 2],
    [3, 2, 6, 7],
    [4, 5, 1, 0],
  ]

  const n_faces = [
    [0, 0, -1],
    [0, 0, 1],
    [-1, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
  ]

  const positions = []
  const normals = []
  const indices = []

  for (let i = 0; i < faces.length; i++) {
    const baseVert = positions.length / 3
    const f = faces[i]
    const n = n_faces[i]
    for (let j = 0; j < 4; j++) {
      const vi = f[j] * 3
      positions.push(verts[vi], verts[vi + 1], verts[vi + 2])
      normals.push(n[0], n[1], n[2])
    }
    indices.push(
      baseVert, baseVert + 1, baseVert + 2,
      baseVert, baseVert + 2, baseVert + 3,
    )
  }

  return { positions, normals, indices }
}

function buildGLB(meshes, materials) {
  const posArr = new Float32Array(meshes.reduce((a, m) => a + m.positions.length, 0))
  const normArr = new Float32Array(meshes.reduce((a, m) => a + m.normals.length, 0))
  const idxArr = new Uint32Array(meshes.reduce((a, m) => a + m.indices.length, 0))

  let posOff = 0, normOff = 0, idxOff = 0
  const meshMeta = []
  for (const m of meshes) {
    posArr.set(m.positions, posOff)
    normArr.set(m.normals, normOff)
    idxArr.set(m.indices, idxOff)
    meshMeta.push({
      posStart: posOff, posCount: m.positions.length / 3,
      normStart: normOff, normCount: m.normals.length / 3,
      idxStart: idxOff, idxCount: m.indices.length,
      material: m.material,
    })
    posOff += m.positions.length
    normOff += m.normals.length
    idxOff += m.indices.length
  }

  const posBytes = new Uint8Array(posArr.buffer, posArr.byteOffset, posArr.byteLength)
  const normBytes = new Uint8Array(normArr.buffer, normArr.byteOffset, normArr.byteLength)
  const idxBytes = new Uint8Array(idxArr.buffer, idxArr.byteOffset, idxArr.byteLength)

  const posLen = posBytes.byteLength
  const normLen = normBytes.byteLength
  const idxLen = idxBytes.byteLength
  const posPad = pad4(posLen)
  const normPad = pad4(normLen)
  const idxPad = pad4(idxLen)

  const binLen = posPad + normPad + idxPad
  const bin = new Uint8Array(binLen)
  bin.set(posBytes, 0)
  bin.set(normBytes, posPad)
  bin.set(idxBytes, posPad + normPad)

  const accessors = []
  const bufferViews = []
  const meshesOut = []

  bufferViews.push({ buffer: 0, byteOffset: 0, byteLength: posLen, target: 34962 })
  bufferViews.push({ buffer: 0, byteOffset: posPad, byteLength: normLen, target: 34962 })
  bufferViews.push({ buffer: 0, byteOffset: posPad + normPad, byteLength: idxLen, target: 34963 })

  meshMeta.forEach((mm, i) => {
    accessors.push({
      bufferView: 0, byteOffset: mm.posStart * 4,
      componentType: 5126, count: mm.posCount, type: 'VEC3',
    })
    accessors.push({
      bufferView: 1, byteOffset: mm.normStart * 4,
      componentType: 5126, count: mm.normCount, type: 'VEC3',
    })
    accessors.push({
      bufferView: 2, byteOffset: mm.idxStart * 4,
      componentType: 5125, count: mm.idxCount, type: 'SCALAR',
    })

    const posAccIdx = i * 3
    meshesOut.push({
      primitives: [{
        attributes: { POSITION: posAccIdx, NORMAL: posAccIdx + 1 },
        indices: posAccIdx + 2,
        material: mm.material,
      }],
    })
  })

  const json = {
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ children: meshesOut.map((_, i) => i + 1), name: 'root' }].concat(
      meshesOut.map((_, i) => ({ mesh: i, name: `mesh_${i}` }))
    ),
    meshes: meshesOut,
    materials,
    buffers: [{ byteLength: binLen }],
    bufferViews,
    accessors,
    asset: { version: '2.0', generator: 'room-planner-3d' },
  }

  let jsonStr = JSON.stringify(json)
  while (jsonStr.length % 4 !== 0) jsonStr += ' '
  const jsonBytes = new TextEncoder().encode(jsonStr)
  const jsonChunkLen = jsonBytes.byteLength

  const totalLen = 12 + 8 + jsonChunkLen + 8 + binLen
  const result = new Uint8Array(totalLen)
  const view = new DataView(result.buffer)

  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, totalLen, true)

  view.setUint32(12, jsonChunkLen, true)
  view.setUint32(16, 0x4e4f534a, true)
  result.set(jsonBytes, 20)

  const binOff = 20 + jsonChunkLen
  view.setUint32(binOff, binLen, true)
  view.setUint32(binOff + 4, 0x004e4942, true)
  result.set(bin, binOff + 8)

  return result
}

function makeModel(boxes) {
  const meshes = []
  const materialsMap = new Map()
  let matIndex = 0
  for (const b of boxes) {
    const key = b.color
    if (!materialsMap.has(key)) {
      materialsMap.set(key, matIndex++)
    }
    const matIdx = materialsMap.get(key)
    const mesh = buildBoxMesh(b.position, b.size)
    mesh.material = matIdx
    meshes.push(mesh)
  }
  const materials = []
  for (const [color] of materialsMap) {
    const [r, g, bl] = hexToRgb(color)
    materials.push({
      pbrMetallicRoughness: {
        baseColorFactor: [r, g, bl, 1],
        roughnessFactor: 0.7,
        metallicFactor: 0.05,
      },
    })
  }
  return buildGLB(meshes, materials)
}

const sofa = [
  { size: [1.8, 0.4, 0.9], position: [0, 0.4, 0], color: '#8B5E3C' },
  { size: [1.8, 0.45, 0.3], position: [0, 0.85, -0.3], color: '#8B5E3C' },
  { size: [0.25, 0.3, 0.9], position: [-0.775, 0.75, 0], color: '#8B5E3C' },
  { size: [0.25, 0.3, 0.9], position: [0.775, 0.75, 0], color: '#8B5E3C' },
]

const bed = [
  { size: [2.0, 0.5, 1.5], position: [0, 0.25, 0], color: '#C4A77D' },
  { size: [1.1, 0.2, 0.35], position: [0, 0.6, -0.57], color: '#ffffff' },
]

const table = [
  { size: [1.2, 0.05, 1.2], position: [0, 0.725, 0], color: '#5C4033' },
  { size: [0.06, 0.7, 0.06], position: [-0.52, 0.35, -0.52], color: '#5C4033' },
  { size: [0.06, 0.7, 0.06], position: [0.52, 0.35, -0.52], color: '#5C4033' },
  { size: [0.06, 0.7, 0.06], position: [-0.52, 0.35, 0.52], color: '#5C4033' },
  { size: [0.06, 0.7, 0.06], position: [0.52, 0.35, 0.52], color: '#5C4033' },
]

const chair = [
  { size: [0.5, 0.06, 0.5], position: [0, 0.48, 0], color: '#6B8E23' },
  { size: [0.05, 0.45, 0.05], position: [-0.21, 0.225, -0.21], color: '#6B8E23' },
  { size: [0.05, 0.45, 0.05], position: [0.21, 0.225, -0.21], color: '#6B8E23' },
  { size: [0.05, 0.45, 0.05], position: [-0.21, 0.225, 0.21], color: '#6B8E23' },
  { size: [0.05, 0.45, 0.05], position: [0.21, 0.225, 0.21], color: '#6B8E23' },
  { size: [0.5, 0.45, 0.04], position: [0, 0.735, -0.22], color: '#6B8E23' },
]

const models = { sofa, bed, table, chair }

for (const [name, boxes] of Object.entries(models)) {
  const glb = makeModel(boxes)
  fs.writeFileSync(path.join(modelsDir, `${name}.glb`), glb)
  console.log(`Generated ${name}.glb (${glb.length} bytes)`)
}

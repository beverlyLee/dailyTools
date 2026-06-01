import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function toBuffer(chunk) {
  if (Buffer.isBuffer(chunk)) return chunk
  if (chunk instanceof ArrayBuffer) return Buffer.from(chunk)
  if (ArrayBuffer.isView(chunk)) {
    return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)
  }
  if (typeof chunk === 'string') return Buffer.from(chunk, 'utf-8')
  return Buffer.from(String(chunk), 'utf-8')
}

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    const chunks = blob._parts.map(toBuffer)
    const totalLen = chunks.reduce((s, c) => s + c.length, 0)
    const buf = Buffer.alloc(totalLen)
    let off = 0
    for (const c of chunks) { c.copy(buf, off); off += c.length }
    this.result = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    process.nextTick(() => this.onloadend && this.onloadend({ target: this }))
  }
}
globalThis.Blob = class {
  constructor(parts) { this._parts = parts }
  get size() {
    return this._parts.reduce((s, p) => s + toBuffer(p).length, 0)
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, 'public', 'models')
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

const WOOD_COLOR = 0x8b5a2b
const TENON_DEPTH = 0.06
const TENON_SIZE = 0.055

function createWoodMaterial() {
  return new THREE.MeshStandardMaterial({
    color: WOOD_COLOR,
    roughness: 0.7,
    metalness: 0.05
  })
}

function createSeat() {
  const group = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 0.92), createWoodMaterial())
  main.castShadow = true
  main.receiveShadow = true
  group.add(main)

  const mortiseGeo = new THREE.BoxGeometry(TENON_SIZE, TENON_DEPTH, TENON_SIZE)
  const mortiseMat = new THREE.MeshStandardMaterial({ color: 0x3a2410, roughness: 0.8 })
  const mortisePositions = [
    [-0.32, -0.05, 0.42], [0.32, -0.05, 0.42],
    [-0.32, -0.05, -0.42], [0.32, -0.05, -0.42], [0, -0.05, -0.42]
  ]
  for (const p of mortisePositions) {
    const m = new THREE.Mesh(mortiseGeo, mortiseMat)
    m.position.set(...p)
    group.add(m)
  }
  return group
}

function createBack() {
  const group = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.9, 0.06), createWoodMaterial())
  main.castShadow = true
  main.receiveShadow = true
  group.add(main)

  const tenonGeo = new THREE.BoxGeometry(TENON_SIZE, TENON_DEPTH, TENON_SIZE)
  const tenon = new THREE.Mesh(tenonGeo, createWoodMaterial())
  tenon.position.set(0, -0.45 - TENON_DEPTH / 2, 0)
  tenon.castShadow = true
  group.add(tenon)

  const railMat = new THREE.MeshStandardMaterial({ color: 0x6b4020, roughness: 0.75 })
  const railGeo = new THREE.BoxGeometry(0.72, 0.04, 0.04)
  const r1 = new THREE.Mesh(railGeo, railMat)
  r1.position.set(0, -0.3, 0.02)
  r1.castShadow = true
  group.add(r1)
  const r2 = new THREE.Mesh(railGeo, railMat)
  r2.position.set(0, 0.2, 0.02)
  r2.castShadow = true
  group.add(r2)
  return group
}

function createLeg(isFront, isLeft) {
  const height = isFront ? 0.55 : 1.2
  const group = new THREE.Group()
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, height, 12), createWoodMaterial())
  leg.castShadow = true
  leg.receiveShadow = true
  group.add(leg)

  const tenonGeo = new THREE.BoxGeometry(TENON_SIZE, TENON_DEPTH, TENON_SIZE)
  const topTenon = new THREE.Mesh(tenonGeo, createWoodMaterial())
  topTenon.position.set(0, height / 2 + TENON_DEPTH / 2, 0)
  topTenon.castShadow = true
  group.add(topTenon)

  if (!isFront) {
    const armTenon = new THREE.Mesh(tenonGeo, createWoodMaterial())
    armTenon.position.set(0, height / 2 - 0.15, 0)
    armTenon.rotation.x = Math.PI / 2
    armTenon.castShadow = true
    group.add(armTenon)
  }
  return group
}

function createArm(isLeft) {
  const group = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), createWoodMaterial())
  main.castShadow = true
  main.receiveShadow = true
  group.add(main)

  const tenonGeo = new THREE.BoxGeometry(TENON_SIZE, TENON_SIZE, TENON_DEPTH)
  const t1 = new THREE.Mesh(tenonGeo, createWoodMaterial())
  t1.position.set(0, -0.02, 0.45 + TENON_DEPTH / 2)
  t1.castShadow = true
  group.add(t1)
  const t2 = new THREE.Mesh(tenonGeo, createWoodMaterial())
  t2.position.set(0, -0.02, -0.45 - TENON_DEPTH / 2)
  t2.castShadow = true
  group.add(t2)
  return group
}

function createStretcher() {
  const group = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.05), createWoodMaterial())
  main.castShadow = true
  main.receiveShadow = true
  group.add(main)

  const tenonGeo = new THREE.BoxGeometry(TENON_DEPTH, TENON_SIZE, TENON_SIZE)
  const t1 = new THREE.Mesh(tenonGeo, createWoodMaterial())
  t1.position.set(-0.275 - TENON_DEPTH / 2, 0, 0)
  t1.castShadow = true
  group.add(t1)
  const t2 = new THREE.Mesh(tenonGeo, createWoodMaterial())
  t2.position.set(0.275 + TENON_DEPTH / 2, 0, 0)
  t2.castShadow = true
  group.add(t2)
  return group
}

function createCompleteChair() {
  const chair = new THREE.Group()
  const seat = createSeat(); seat.position.set(0, 0.55, 0); chair.add(seat)
  const back = createBack(); back.position.set(0, 1.35, -0.42); back.rotation.x = 0.15; chair.add(back)
  const fl = createLeg(true, true); fl.position.set(-0.32, 0.275, 0.42); chair.add(fl)
  const fr = createLeg(true, false); fr.position.set(0.32, 0.275, 0.42); chair.add(fr)
  const bl = createLeg(false, true); bl.position.set(-0.32, 0.6, -0.42); chair.add(bl)
  const br = createLeg(false, false); br.position.set(0.32, 0.6, -0.42); chair.add(br)
  const al = createArm(true); al.position.set(-0.32, 1.05, 0); chair.add(al)
  const ar = createArm(false); ar.position.set(0.32, 1.05, 0); chair.add(ar)
  const st = createStretcher(); st.position.set(0, 0.2, 0.32); chair.add(st)
  return chair
}

const modelGenerators = {
  'chair-full': createCompleteChair,
  'seat': createSeat,
  'back': createBack,
  'armFrontLeft': () => createLeg(true, true),
  'armFrontRight': () => createLeg(true, false),
  'legBackLeft': () => createLeg(false, true),
  'legBackRight': () => createLeg(false, false),
  'armLeft': () => createArm(true),
  'armRight': () => createArm(false),
  'stretcher': createStretcher
}

const exporter = new GLTFExporter()

async function exportGLB(name, object) {
  return new Promise((resolve, reject) => {
    exporter.parse(
      object,
      (result) => {
        try {
          const path = join(OUTPUT_DIR, `${name}.glb`)
          const buffer = Buffer.from(result)
          writeFileSync(path, buffer)
          console.log(`✓ Exported ${name}.glb (${buffer.length} bytes)`)
          resolve(path)
        } catch (e) {
          console.error(`✗ Write failed for ${name}:`, e)
          reject(e)
        }
      },
      (err) => {
        console.error(`✗ Parse failed for ${name}:`, err)
        reject(err)
      },
      { binary: true, trs: false, onlyVisible: true }
    )
  })
}

async function main() {
  console.log('Generating chair models with mortise-tenon details...\n')
  for (const [name, gen] of Object.entries(modelGenerators)) {
    try {
      const obj = gen()
      await exportGLB(name, obj)
    } catch (e) {
      console.error(`Skipping ${name}:`, e.message)
    }
  }
  console.log('\n✅ All models generated in', OUTPUT_DIR)
}

main().catch(console.error)

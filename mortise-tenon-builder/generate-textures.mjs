import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, 'public', 'textures')
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

function generateWoodTexture(width = 1024, height = 1024) {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  const baseColor = { r: 139, g: 90, b: 43 }
  const darkColor = { r: 80, g: 50, b: 25 }
  const lightColor = { r: 180, g: 130, b: 70 }

  const imgData = ctx.createImageData(width, height)
  const data = imgData.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4

      const noise = (Math.sin(x * 0.02) * 0.3 + Math.sin(x * 0.05 + 1) * 0.2 + Math.sin(x * 0.008 + y * 0.01) * 0.15)
      const grainNoise = (Math.sin(x * 0.4 + y * 0.05) * 0.5 + 0.5) * 0.08

      let t = (noise + 1) / 2 + grainNoise
      t = Math.max(0, Math.min(1, t))

      const r = Math.floor(baseColor.r + (lightColor.r - darkColor.r) * (t - 0.5) * 1.5)
      const g = Math.floor(baseColor.g + (lightColor.g - darkColor.g) * (t - 0.5) * 1.5)
      const b = Math.floor(baseColor.b + (lightColor.b - darkColor.b) * (t - 0.5) * 1.5)

      data[idx] = Math.max(30, Math.min(220, r))
      data[idx + 1] = Math.max(20, Math.min(180, g))
      data[idx + 2] = Math.max(10, Math.min(120, b))
      data[idx + 3] = 255
    }
  }

  ctx.putImageData(imgData, 0, 0)

  for (let i = 0; i < 30; i++) {
    const y = Math.random() * height
    const w = 1 + Math.random() * 2
    ctx.strokeStyle = `rgba(60, 35, 15, ${0.08 + Math.random() * 0.12})`
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x < width; x += 20) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 8)
    }
    ctx.stroke()
  }

  for (let i = 0; i < 8; i++) {
    const cx = Math.random() * width
    const cy = Math.random() * height
    const r = 20 + Math.random() * 60
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    grad.addColorStop(0, 'rgba(70, 40, 20, 0.15)')
    grad.addColorStop(1, 'rgba(70, 40, 20, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  }

  return canvas.toBuffer('image/png')
}

function generateRoughnessMap(width = 512, height = 512) {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = Math.sin(x * 0.1) * 0.5 + Math.sin(y * 0.15) * 0.3 + Math.random() * 0.2
      const v = Math.floor(180 + n * 50)
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.fillRect(x, y, 1, 1)
    }
  }

  return canvas.toBuffer('image/png')
}

console.log('Generating wood textures...')
const woodDiffuse = generateWoodTexture(1024, 1024)
const woodRoughness = generateRoughnessMap(512, 512)

writeFileSync(join(OUTPUT_DIR, 'wood-diffuse.png'), woodDiffuse)
writeFileSync(join(OUTPUT_DIR, 'wood-roughness.png'), woodRoughness)

console.log(`✓ Generated wood-diffuse.png (${woodDiffuse.length} bytes)`)
console.log(`✓ Generated wood-roughness.png (${woodRoughness.length} bytes)`)
console.log('✅ Textures saved to', OUTPUT_DIR)

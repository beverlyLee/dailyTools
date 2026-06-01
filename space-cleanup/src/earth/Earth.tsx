import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function generateEarthTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!

  const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  oceanGradient.addColorStop(0, '#0a4e7a')
  oceanGradient.addColorStop(0.5, '#1a7ab8')
  oceanGradient.addColorStop(1, '#0a4e7a')
  ctx.fillStyle = oceanGradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const continents = [
    { x: 0.15, y: 0.3, w: 0.15, h: 0.15 },
    { x: 0.25, y: 0.2, w: 0.12, h: 0.12 },
    { x: 0.45, y: 0.25, w: 0.18, h: 0.2 },
    { x: 0.5, y: 0.55, w: 0.12, h: 0.15 },
    { x: 0.7, y: 0.3, w: 0.15, h: 0.12 },
    { x: 0.8, y: 0.55, w: 0.1, h: 0.1 },
    { x: 0.1, y: 0.6, w: 0.12, h: 0.18 },
    { x: 0.3, y: 0.7, w: 0.08, h: 0.08 },
    { x: 0.6, y: 0.75, w: 0.08, h: 0.06 },
    { x: 0.85, y: 0.15, w: 0.06, h: 0.06 },
    { x: 0.9, y: 0.35, w: 0.05, h: 0.05 },
    { x: 0.05, y: 0.15, w: 0.07, h: 0.07 },
  ]

  continents.forEach((cont, i) => {
    const centerX = cont.x * canvas.width
    const centerY = cont.y * canvas.height
    const radiusX = cont.w * canvas.width * 0.5
    const radiusY = cont.h * canvas.height * 0.5

    ctx.save()
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
    ctx.clip()

    const landGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, Math.max(radiusX, radiusY)
    )
    const hueVariation = (i * 17) % 30
    landGradient.addColorStop(0, `hsl(${120 + hueVariation}, 45%, 35%)`)
    landGradient.addColorStop(0.5, `hsl(${100 + hueVariation}, 40%, 28%)`)
    landGradient.addColorStop(1, `hsl(${90 + hueVariation}, 35%, 22%)`)
    ctx.fillStyle = landGradient
    ctx.fillRect(centerX - radiusX, centerY - radiusY, radiusX * 2, radiusY * 2)

    for (let j = 0; j < 50; j++) {
      const nx = centerX + (Math.random() - 0.5) * radiusX * 1.8
      const ny = centerY + (Math.random() - 0.5) * radiusY * 1.8
      const nr = Math.random() * 30 + 10
      const mountainGradient = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr)
      mountainGradient.addColorStop(0, `hsla(${60 + Math.random() * 20}, 30%, 50%, ${0.3 + Math.random() * 0.3})`)
      mountainGradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
      ctx.fillStyle = mountainGradient
      ctx.beginPath()
      ctx.arc(nx, ny, nr, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  })

  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const noise = Math.random() * 20 - 10
    ctx.fillStyle = `rgba(${noise > 0 ? 30 + noise : 10}, ${noise > 0 ? 80 + noise : 50}, ${noise > 0 ? 120 + noise : 90}, 0.1)`
    ctx.fillRect(x, y, 2, 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function generateCloudsTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 300; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const radius = Math.random() * 80 + 20
    const opacity = Math.random() * 0.4 + 0.1

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`)
    gradient.addColorStop(0.6, `rgba(255, 255, 255, ${opacity * 0.5})`)
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.ellipse(x, y, radius, radius * 0.6, Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function generateNormalTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  const imageData = ctx.createImageData(canvas.width, canvas.height)
  const data = imageData.data

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4
      const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 30 + Math.random() * 20 - 10
      data[i] = 128 + noise
      data[i + 1] = 128 + noise * 0.5
      data[i + 2] = 255
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

export default function Earth() {
  const earthRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)

  const earthTexture = useMemo(() => generateEarthTexture(), [])
  const cloudsTexture = useMemo(() => generateCloudsTexture(), [])
  const normalTexture = useMemo(() => generateNormalTexture(), [])

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.1
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.15
    }
  })

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          normalMap={normalTexture}
          normalScale={new THREE.Vector2(0.5, 0.5)}
        />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.05, 64, 64]} />
        <meshStandardMaterial
          map={cloudsTexture}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.25, 64]} />
        <meshBasicMaterial color="#4a90d9" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.15, 64, 64]} />
        <meshBasicMaterial
          color="#4fc3f7"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

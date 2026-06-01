import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PageData {
  front: string
  back: string
}

interface BendCurvePoints {
  x: Float32Array
  z: Float32Array
}

interface BookProps {
  pages: PageData[]
  currentPage: number
  turnProgress: number
  bendCurvePoints?: BendCurvePoints
  pageWidth?: number
  pageHeight?: number
}

const PAGE_COLORS = [
  '#f5e6d3',
  '#e8d5b7',
  '#f0e2cc',
  '#e5d4be',
  '#f2e4d0',
  '#ede0c8',
]

const generatePageTexture = (color: string, pageNumber: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 768
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = color
  ctx.fillRect(0, 0, 512, 768)

  ctx.strokeStyle = '#8b7355'
  ctx.lineWidth = 3
  ctx.strokeRect(15, 15, 482, 738)

  ctx.strokeStyle = '#a08060'
  ctx.lineWidth = 1
  ctx.strokeRect(25, 25, 462, 718)

  ctx.fillStyle = '#4a3728'
  ctx.font = 'bold 28px serif'
  ctx.textAlign = 'center'
  ctx.fillText('古籍宝典', 256, 70)

  ctx.strokeStyle = '#6b5344'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(100, 85)
  ctx.lineTo(412, 85)
  ctx.stroke()

  ctx.font = 'bold 18px serif'
  ctx.fillStyle = '#6b5344'
  ctx.fillText(`第 ${pageNumber} 页`, 256, 115)

  ctx.font = '22px serif'
  ctx.fillStyle = '#3d2914'

  const poems = [
    '天地玄黄，宇宙洪荒。',
    '日月盈昃，辰宿列张。',
    '寒来暑往，秋收冬藏。',
    '闰余成岁，律吕调阳。',
    '云腾致雨，露结为霜。',
    '金生丽水，玉出昆冈。',
    '剑号巨阙，珠称夜光。',
    '果珍李柰，菜重芥姜。',
    '海咸河淡，鳞潜羽翔。',
    '龙师火帝，鸟官人皇。',
    '始制文字，乃服衣裳。',
    '推位让国，有虞陶唐。',
    '吊民伐罪，周发殷汤。',
    '坐朝问道，垂拱平章。',
    '爱育黎首，臣伏戎羌。',
    '遐迩一体，率宾归王。',
  ]

  const startIdx = (pageNumber - 1) % poems.length
  for (let i = 0; i < 8; i++) {
    const poem = poems[(startIdx + i) % poems.length]
    ctx.fillText(poem, 256, 165 + i * 55)
  }

  ctx.font = 'italic 14px serif'
  ctx.fillStyle = '#8b7355'
  ctx.fillText('拖动翻页', 256, 730)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

const createPageGeometry = (width: number, height: number, segmentsW: number, segmentsH: number, side: 'left' | 'right') => {
  const geo = new THREE.PlaneGeometry(width, height, segmentsW, segmentsH)
  const pos = geo.attributes.position
  const shift = side === 'left' ? -width / 2 : width / 2
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) + shift)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

export default function Book({
  pages,
  currentPage,
  turnProgress,
  bendCurvePoints,
  pageWidth = 3,
  pageHeight = 4.5,
}: BookProps) {
  const bookRef = useRef<THREE.Group>(null)
  const turningPageRef = useRef<THREE.Mesh>(null)
  const turningBackRef = useRef<THREE.Mesh>(null)

  const segmentsW = 32
  const segmentsH = 64
  const totalPageCount = pages.length * 2

  const [textures] = useState(() => {
    const map = new Map<string, THREE.Texture>()
    const count = Math.min(totalPageCount + 4, 24)
    for (let i = 0; i < count; i++) {
      const color = PAGE_COLORS[i % PAGE_COLORS.length]
      map.set(`page-${i}`, generatePageTexture(color, i + 1))
    }
    return map
  })

  useEffect(() => {
    return () => {
      textures.forEach((tex) => tex.dispose())
    }
  }, [textures])

  const leftPageGeo = useMemo(
    () => createPageGeometry(pageWidth, pageHeight, segmentsW, segmentsH, 'left'),
    [pageWidth, pageHeight, segmentsW, segmentsH]
  )

  const rightPageGeo = useMemo(
    () => createPageGeometry(pageWidth, pageHeight, segmentsW, segmentsH, 'right'),
    [pageWidth, pageHeight, segmentsW, segmentsH]
  )

  const turningGeo = useMemo(
    () => createPageGeometry(pageWidth, pageHeight, segmentsW, segmentsH, 'right'),
    [pageWidth, pageHeight, segmentsW, segmentsH]
  )

  const isTurning = Math.abs(turnProgress) > 0.001
  const isForward = turnProgress > 0
  const absProgress = Math.abs(turnProgress)

  const leftIdx = currentPage * 2
  const rightIdx = currentPage * 2 + 1
  const maxSpread = Math.floor((totalPageCount - 1) / 2)
  const nextSpread = currentPage + 1 > maxSpread ? 0 : currentPage + 1
  const prevSpread = currentPage - 1 < 0 ? maxSpread : currentPage - 1

  const displayLeftIdx = isTurning && !isForward ? prevSpread * 2 : leftIdx
  const displayRightIdx = isTurning && isForward ? nextSpread * 2 + 1 : rightIdx

  const turningFrontIdx = isForward ? rightIdx : leftIdx
  const turningBackIdx = isForward ? nextSpread * 2 : prevSpread * 2 + 1

  const getBendPosition = (t: number, progress: number, forward: boolean): { x: number; z: number } => {
    if (bendCurvePoints && bendCurvePoints.x.length > 0) {
      const len = bendCurvePoints.x.length
      const floatIdx = t * (len - 1)
      const idx = Math.min(Math.floor(floatIdx), len - 2)
      const frac = floatIdx - idx
      const x = bendCurvePoints.x[idx] * (1 - frac) + bendCurvePoints.x[idx + 1] * frac
      const z = bendCurvePoints.z[idx] * (1 - frac) + bendCurvePoints.z[idx + 1] * frac
      return { x, z }
    }

    const direction = forward ? 1 : -1
    const angle = progress * Math.PI
    const localX = direction * t * pageWidth
    const bendAmount = Math.sin(progress * Math.PI) * 0.6

    const x = localX * Math.cos(angle)
    const z = localX * Math.sin(angle)

    const curveDepth = Math.sin(t * Math.PI) * bendAmount * pageWidth * 0.25
    const zCurve = curveDepth * Math.sin(progress * Math.PI)

    return { x, z: z + zCurve }
  }

  useFrame(() => {
    if (bookRef.current) {
      bookRef.current.rotation.y = Math.sin(Date.now() * 0.0002) * 0.03
    }

    if (!isTurning || absProgress >= 0.999) return

    const targets = [turningPageRef.current, turningBackRef.current]
    for (const mesh of targets) {
      if (!mesh) continue
      const pos = mesh.geometry.attributes.position
      const arr = pos.array as Float32Array

      for (let i = 0; i < pos.count; i++) {
        const col = i % (segmentsW + 1)
        const row = Math.floor(i / (segmentsW + 1))
        const t = col / segmentsW
        const originalY = (row / segmentsH - 0.5) * pageHeight

        const bendPos = getBendPosition(t, absProgress, isForward)

        arr[i * 3] = bendPos.x
        arr[i * 3 + 1] = originalY
        arr[i * 3 + 2] = bendPos.z
      }

      pos.needsUpdate = true
      mesh.geometry.computeVertexNormals()
    }

    if (turningBackRef.current) {
      const pos = turningBackRef.current.geometry.attributes.position
      const arr = pos.array as Float32Array
      for (let i = 0; i < pos.count; i++) {
        arr[i * 3 + 2] += 0.003
      }
      pos.needsUpdate = true
    }
  })

  const frontOpacity = absProgress < 0.5 ? 1 : Math.max(0, 1 - (absProgress - 0.5) * 2)
  const backOpacity = absProgress > 0.5 ? Math.min(1, (absProgress - 0.5) * 2) : 0

  return (
    <group ref={bookRef}>
      <mesh position={[0, 0, -0.08]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[pageHeight, 0.2, 0.12]} />
        <meshStandardMaterial color="#5c3d2e" roughness={0.85} />
      </mesh>

      <mesh position={[0, 0, -0.06]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[pageHeight - 0.1, 0.12, 0.08]} />
        <meshStandardMaterial color="#8b6914" roughness={0.7} />
      </mesh>

      <mesh geometry={leftPageGeo}>
        <meshStandardMaterial
          map={textures.get(`page-${displayLeftIdx}`)}
          side={THREE.DoubleSide}
          roughness={0.65}
          polygonOffset
          polygonOffsetFactor={1}
        />
      </mesh>

      <mesh geometry={rightPageGeo}>
        <meshStandardMaterial
          map={textures.get(`page-${displayRightIdx}`)}
          side={THREE.DoubleSide}
          roughness={0.65}
          polygonOffset
          polygonOffsetFactor={1}
        />
      </mesh>

      {isTurning && (
        <group>
          <mesh ref={turningPageRef} geometry={turningGeo}>
            <meshStandardMaterial
              map={textures.get(`page-${turningFrontIdx}`)}
              side={THREE.DoubleSide}
              roughness={0.65}
              transparent
              opacity={frontOpacity}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>
          <mesh ref={turningBackRef} geometry={turningGeo}>
            <meshStandardMaterial
              map={textures.get(`page-${turningBackIdx}`)}
              side={THREE.DoubleSide}
              roughness={0.65}
              transparent
              opacity={backOpacity}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
        </group>
      )}

      <mesh position={[0, -pageHeight / 2 - 0.15, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[pageWidth * 2 + 0.8, pageHeight + 0.6, 0.06]} />
        <meshStandardMaterial color="#3d2914" roughness={0.95} />
      </mesh>

      <mesh position={[0, -pageHeight / 2 - 0.08, -0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[pageWidth * 2 + 0.5, pageHeight + 0.3, 0.02]} />
        <meshStandardMaterial color="#5c3d2e" roughness={0.9} />
      </mesh>
    </group>
  )
}

export type { PageData, BookProps, BendCurvePoints }

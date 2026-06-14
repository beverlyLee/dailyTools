import { useMemo } from 'react'
import type { BayWindowConfig, DecorItem, MaterialOption } from '../../types'
import { toMeters } from '../../utils/calculations'
import { SeededRandom } from '../../utils/seededRandom'

interface DecorVisualizationProps {
  bayConfig: BayWindowConfig
  decorItems: DecorItem[]
  frameColor: string
}

export function DecorVisualization({ bayConfig, decorItems }: DecorVisualizationProps) {
  void bayConfig
  const SH = toMeters(bayConfig.sillHeight)
  const SD = toMeters(bayConfig.sillDepth)
  const cushionTop = SH + 0.08

  return (
    <group position={[0, 0, -SD / 2]}>
      {decorItems.map(item => (
        <DecorItemMesh key={item.id} item={item} baseY={cushionTop} />
      ))}
    </group>
  )
}

function DecorItemMesh({ item, baseY }: { item: DecorItem; baseY: number }) {
  const px = toMeters(item.position.x)
  const py = baseY + toMeters(item.position.y)
  const pz = toMeters(item.position.z)
  const rx = (item.rotation.x * Math.PI) / 180
  const ry = (item.rotation.y * Math.PI) / 180
  const rz = (item.rotation.z * Math.PI) / 180
  const sx = item.scale.x
  const sy = item.scale.y
  const sz = item.scale.z

  const materialProps = useMemo(() => {
    switch (item.material) {
      case 'velvet':
        return { roughness: 0.6, metalness: 0 }
      case 'linen':
        return { roughness: 0.9, metalness: 0 }
      case 'wood':
        return { roughness: 0.7, metalness: 0.05 }
      case 'ceramic':
        return { roughness: 0.3, metalness: 0 }
      case 'metal':
        return { roughness: 0.25, metalness: 0.85 }
      case 'cotton':
      default:
        return { roughness: 0.85, metalness: 0 }
    }
  }, [item.material])

  switch (item.type) {
    case 'pillow':
      return <PillowMesh position={[px, py, pz]} rotation={[rx, ry, rz]} scale={[sx, sy, sz]} color={item.color} materialProps={materialProps} />
    case 'table':
      return <SmallTableMesh position={[px, py, pz]} rotation={[rx, ry, rz]} scale={[sx, sy, sz]} color={item.color} materialProps={materialProps} />
    case 'blanket':
      return <BlanketMesh position={[px, py, pz]} rotation={[rx, ry, rz]} scale={[sx, sy, sz]} color={item.color} materialProps={materialProps} />
    case 'plant':
      return <PlantMesh position={[px, py, pz]} rotation={[rx, ry, rz]} scale={[sx, sy, sz]} />
    case 'lamp':
      return <LampMesh position={[px, py, pz]} rotation={[rx, ry, rz]} scale={[sx, sy, sz]} color={item.color} />
    default:
      return null
  }
}

function PillowMesh({
  position,
  rotation,
  scale,
  color,
  materialProps
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
  materialProps: { roughness: number; metalness: number }
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <sphereGeometry args={[0.14, 32, 32]} />
        <meshStandardMaterial color={color} {...materialProps} />
      </mesh>
      <mesh position={[0.03, 0.045, 0.02]} rotation={[0.1, 0.3, 0.1]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color={color} {...materialProps} />
      </mesh>
    </group>
  )
}

function SmallTableMesh({
  position,
  rotation,
  scale,
  color,
  materialProps
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
  materialProps: { roughness: number; metalness: number }
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.02, 32]} />
        <meshStandardMaterial color={color} {...materialProps} />
      </mesh>
      {[
        [-0.12, -0.12],
        [0.12, -0.12],
        [-0.12, 0.12],
        [0.12, 0.12]
      ].map(([x, z], idx) => (
        <mesh key={idx} position={[x, 0.08, z]} castShadow>
          <cylinderGeometry args={[0.012, 0.015, 0.16, 12]} />
          <meshStandardMaterial color={color} {...materialProps} />
        </mesh>
      ))}
    </group>
  )
}

function BlanketMesh({
  position,
  rotation,
  scale,
  color,
  materialProps
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
  materialProps: { roughness: number; metalness: number }
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.01, 0.05]} rotation={[-0.05, 0.2, 0.02]} castShadow>
        <boxGeometry args={[0.5, 0.015, 0.35]} />
        <meshStandardMaterial color={color} {...materialProps} />
      </mesh>
      <mesh position={[0.1, 0.005, 0.18]} rotation={[0.08, 0.3, -0.1]} castShadow>
        <boxGeometry args={[0.18, 0.01, 0.12]} />
        <meshStandardMaterial color={color} {...materialProps} />
      </mesh>
    </group>
  )
}

function PlantMesh({
  position,
  rotation,
  scale
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}) {
  const leafData = useMemo(() => {
    const seedStr = `plant-${position[0].toFixed(4)}-${position[1].toFixed(4)}-${position[2].toFixed(4)}`
    const plantRng = new SeededRandom(seedStr)
    const data: { angle: number; height: number; tilt: number }[] = []
    for (let i = 0; i < 8; i++) {
      plantRng.reset(1000 + i)
      const angle = (i / 8) * Math.PI * 2
      const height = 0.15 + plantRng.next() * 0.1
      plantRng.reset(2000 + i)
      const tilt = 0.2 + plantRng.next() * 0.2
      data.push({ angle, height, tilt })
    }
    return data
  }, [position[0], position[1], position[2]])

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.04, 0.08, 24]} />
        <meshStandardMaterial color="#d97706" roughness={0.8} />
      </mesh>
      {leafData.map(({ angle, height, tilt }, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(angle) * 0.02,
            0.08 + height / 2,
            Math.sin(angle) * 0.02
          ]}
          rotation={[
            Math.sin(angle) * tilt,
            angle,
            Math.cos(angle) * tilt
          ]}
          castShadow
        >
          <sphereGeometry args={[0.012, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#16a34a" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.18, 0]} castShadow>
        <sphereGeometry args={[0.05, 20, 20]} />
        <meshStandardMaterial color="#22c55e" roughness={0.85} />
      </mesh>
    </group>
  )
}

function LampMesh({
  position,
  rotation,
  scale,
  color
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.02, 24]} />
        <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.22, 12]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.12, 24, 1, true]} />
        <meshStandardMaterial color={color} side={2} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fef08a" emissiveIntensity={1.5} />
      </mesh>
    </group>
  )
}

export function getDefaultDecorItems(windowWidth: number): DecorItem[] {
  const halfW = windowWidth / 2 - 30
  return [
    {
      id: 'pillow-1',
      type: 'pillow',
      position: { x: -halfW, y: 0, z: 20 },
      rotation: { x: 0, y: 15, z: -5 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#f5f0e6',
      material: 'cotton'
    },
    {
      id: 'pillow-2',
      type: 'pillow',
      position: { x: halfW * 0.6, y: 0, z: 18 },
      rotation: { x: 0, y: -10, z: 3 },
      scale: { x: 0.9, y: 0.9, z: 0.9 },
      color: '#6b8e9e',
      material: 'linen'
    },
    {
      id: 'table-1',
      type: 'table',
      position: { x: 0, y: 0, z: 30 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#c9a066',
      material: 'wood'
    }
  ]
}

export function getMaterialByColor(color: string, materials: MaterialOption[]): MaterialOption | undefined {
  return materials.find(m => m.color.toLowerCase() === color.toLowerCase())
}

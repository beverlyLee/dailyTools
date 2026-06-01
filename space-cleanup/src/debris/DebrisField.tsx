import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface DebrisData {
  id: number
  angle: number
  radius: number
  speed: number
  inclination: number
  yOffset: number
  rotationSpeed: { x: number; y: number; z: number }
  size: number
  torusParams: { p: number; q: number }
  color: string
  position: THREE.Vector3
}

interface ExplosionData {
  id: number
  position: THREE.Vector3
  createdAt: number
}

interface DebrisFieldProps {
  shipPosition: THREE.Vector3
  onDebrisRemoved: (count: number) => void
  onDebrisAdded: (count: number) => void
}

const generateDebrisColor = () => {
  const hue = 200 + Math.random() * 40
  const saturation = 25 + Math.random() * 15
  const lightness = 35 + Math.random() * 20
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

const createDebris = (id: number): DebrisData => ({
  id,
  angle: Math.random() * Math.PI * 2,
  radius: 3.5 + Math.random() * 4,
  speed: 0.15 + Math.random() * 0.35,
  inclination: (Math.random() - 0.5) * 0.6,
  yOffset: (Math.random() - 0.5) * 1.5,
  rotationSpeed: {
    x: (Math.random() - 0.5) * 2,
    y: (Math.random() - 0.5) * 2,
    z: (Math.random() - 0.5) * 2,
  },
  size: 0.08 + Math.random() * 0.12,
  torusParams: {
    p: Math.floor(Math.random() * 3) + 2,
    q: Math.floor(Math.random() * 3) + 1,
  },
  color: generateDebrisColor(),
  position: new THREE.Vector3(),
})

export default function DebrisField({ shipPosition, onDebrisRemoved, onDebrisAdded }: DebrisFieldProps) {
  const debrisGroupRef = useRef<THREE.Group>(null)
  const [debrisList, setDebrisList] = useState<DebrisData[]>([])
  const [explosions, setExplosions] = useState<ExplosionData[]>([])
  const shipPositionRef = useRef(new THREE.Vector3())
  const debrisPositionsRef = useRef<Map<number, THREE.Vector3>>(new Map())
  const nextIdRef = useRef(100)
  const COLLISION_DISTANCE = 1.5

  useEffect(() => {
    shipPositionRef.current.copy(shipPosition)
  }, [shipPosition])

  const initialDebris = useMemo<DebrisData[]>(() => {
    const debris: DebrisData[] = []
    const debrisCount = 50
    for (let i = 0; i < debrisCount; i++) {
      debris.push(createDebris(i))
    }
    return debris
  }, [])

  useEffect(() => {
    setDebrisList(initialDebris)
  }, [initialDebris])

  const debrisRefs = useRef<Map<number, THREE.Mesh>>(new Map())

  const addExplosion = useCallback((position: THREE.Vector3) => {
    const explosion: ExplosionData = {
      id: Date.now() + Math.random(),
      position: position.clone(),
      createdAt: Date.now(),
    }
    setExplosions((prev) => [...prev, explosion])
    setTimeout(() => {
      setExplosions((prev) => prev.filter((e) => e.id !== explosion.id))
    }, 600)
  }, [])

  const spawnNewDebris = useCallback(() => {
    const newDebris = createDebris(nextIdRef.current++)
    setDebrisList((prev) => [...prev, newDebris])
    onDebrisAdded(1)
  }, [onDebrisAdded])

  useFrame((_, delta) => {
    if (!debrisGroupRef.current) return

    const removedIds: number[] = []
    const explosionPositions: THREE.Vector3[] = []
    const shipPos = shipPositionRef.current

    setDebrisList((prev) => {
      return prev.map((debris) => {
        const newAngle = debris.angle + delta * debris.speed

        const x = Math.cos(newAngle) * debris.radius
        const z = Math.sin(newAngle) * debris.radius
        const y = Math.sin(newAngle * 0.5) * debris.yOffset + debris.inclination * debris.radius * 0.3

        const currentPos = new THREE.Vector3(x, y, z)
        debrisPositionsRef.current.set(debris.id, currentPos)

        const distance = currentPos.distanceTo(shipPos)
        const debrisRadius = debris.size * 1.5
        const shipRadius = 0.8
        const effectiveCollisionDistance = debrisRadius + shipRadius

        if (distance < Math.max(effectiveCollisionDistance, COLLISION_DISTANCE)) {
          removedIds.push(debris.id)
          explosionPositions.push(currentPos.clone())
        }

        const mesh = debrisRefs.current.get(debris.id)
        if (mesh) {
          mesh.position.copy(currentPos)
          mesh.rotation.x += delta * debris.rotationSpeed.x
          mesh.rotation.y += delta * debris.rotationSpeed.y
          mesh.rotation.z += delta * debris.rotationSpeed.z
        }

        return { ...debris, angle: newAngle, position: currentPos }
      })
    })

    if (removedIds.length > 0) {
      explosionPositions.forEach((pos) => addExplosion(pos))
      setDebrisList((prev) => {
        const filtered = prev.filter((d) => !removedIds.includes(d.id))
        onDebrisRemoved(removedIds.length)
        return filtered
      })

      removedIds.forEach(() => {
        setTimeout(() => {
          spawnNewDebris()
        }, 2000 + Math.random() * 3000)
      })
    }
  })

  return (
    <group ref={debrisGroupRef}>
      {debrisList.map((debris) => (
        <mesh
          key={debris.id}
          ref={(el) => {
            if (el) debrisRefs.current.set(debris.id, el)
          }}
          castShadow
        >
          <torusKnotGeometry
            args={[
              debris.size,
              debris.size * 0.3,
              32,
              8,
              debris.torusParams.p,
              debris.torusParams.q,
            ]}
          />
          <meshStandardMaterial
            color={debris.color}
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
      ))}

      {explosions.map((explosion) => (
        <ExplosionParticles key={explosion.id} position={explosion.position} createdAt={explosion.createdAt} />
      ))}
    </group>
  )
}

interface ExplosionParticlesProps {
  position: THREE.Vector3
  createdAt: number
}

function ExplosionParticles({ position, createdAt }: ExplosionParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)
  const particleData = useRef<{ velocities: THREE.Vector3[] }>({ velocities: [] })

  useEffect(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(50 * 3)
    const velocities: THREE.Vector3[] = []

    for (let i = 0; i < 50; i++) {
      const i3 = i * 3
      positions[i3] = position.x
      positions[i3 + 1] = position.y
      positions[i3 + 2] = position.z

      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 0.5 + Math.random() * 1.5
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ))
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometryRef.current = geometry
    particleData.current.velocities = velocities
  }, [position])

  useFrame((_, delta) => {
    if (!particlesRef.current || !geometryRef.current) return

    const elapsed = (Date.now() - createdAt) / 1000
    const positions = geometryRef.current.attributes.position.array as Float32Array

    for (let i = 0; i < 50; i++) {
      const i3 = i * 3
      particleData.current.velocities[i].multiplyScalar(0.96)
      positions[i3] += particleData.current.velocities[i].x * delta
      positions[i3 + 1] += particleData.current.velocities[i].y * delta
      positions[i3 + 2] += particleData.current.velocities[i].z * delta
    }

    geometryRef.current.attributes.position.needsUpdate = true

    const material = particlesRef.current.material as THREE.PointsMaterial
    material.opacity = Math.max(0, 1 - elapsed * 2)
    material.size = Math.max(0.02, 0.15 - elapsed * 0.2)
  })

  if (!geometryRef.current) return null

  return (
    <points ref={particlesRef} geometry={geometryRef.current}>
      <pointsMaterial
        color="#ff6b35"
        size={0.15}
        transparent
        opacity={1}
        sizeAttenuation
      />
    </points>
  )
}

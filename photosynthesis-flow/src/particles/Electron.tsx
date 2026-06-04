import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ElectronProps {
  position: THREE.Vector3 | [number, number, number]
  intensity?: number
}

export default function Electron({ position, intensity = 1 }: ElectronProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 10) * 0.1
      meshRef.current.scale.setScalar(scale)
    }
    if (glowRef.current) {
      const glowScale = 1.5 + Math.sin(clock.elapsedTime * 8) * 0.2
      glowRef.current.scale.setScalar(glowScale)
    }
  })

  const posArray = Array.isArray(position) 
    ? position 
    : [position.x, position.y, position.z]

  return (
    <group position={posArray as [number, number, number]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color="#60a5fa"
          emissive="#3b82f6"
          emissiveIntensity={intensity * 4}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial 
          color="#93c5fd"
          transparent
          opacity={0.5 * intensity}
        />
      </mesh>
    </group>
  )
}

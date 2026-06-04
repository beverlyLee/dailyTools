import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

interface ATPProps {
  position: [number, number, number]
  opacity?: number
}

export default function ATP({ position, opacity = 1 }: ATPProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 2
      groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 1.5) * 0.2
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial 
          color="#f472b6"
          emissive="#ec4899"
          emissiveIntensity={1.5}
          transparent
          opacity={opacity}
        />
      </mesh>
      
      <mesh position={[0.3, 0, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color="#f9a8d4"
          emissive="#f472b6"
          emissiveIntensity={1}
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>
      
      <mesh position={[0.55, 0, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color="#f9a8d4"
          emissive="#f472b6"
          emissiveIntensity={1}
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>

      <mesh position={[0.75, 0, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color="#f9a8d4"
          emissive="#f472b6"
          emissiveIntensity={1}
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>

      <mesh position={[-0.25, 0, 0]}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial 
          color="#a78bfa"
          emissive="#8b5cf6"
          emissiveIntensity={0.8}
          transparent
          opacity={opacity * 0.9}
        />
      </mesh>

      <pointLight 
        color="#f472b6" 
        intensity={opacity * 0.6} 
        distance={2}
        decay={2}
      />
    </group>
  )
}

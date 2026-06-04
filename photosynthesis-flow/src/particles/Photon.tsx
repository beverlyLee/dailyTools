import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PhotonProps {
  targetPosition: THREE.Vector3
  complexId: number
  onHit: (complexId: number) => void
}

export default function Photon({ targetPosition, complexId, onHit }: PhotonProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isActive, setIsActive] = useState(true)

  const offsetTarget = useMemo(() => new THREE.Vector3(
    targetPosition.x + (Math.random() - 0.5) * 0.6,
    targetPosition.y,
    targetPosition.z + (Math.random() - 0.5) * 0.6
  ), [targetPosition, targetPosition.x, targetPosition.y, targetPosition.z])

  const [currentPos, setCurrentPos] = useState(new THREE.Vector3(
    offsetTarget.x + (Math.random() - 0.5) * 2,
    8,
    offsetTarget.z + (Math.random() - 0.5) * 2
  ))
  const velocityRef = useRef(new THREE.Vector3(
    (offsetTarget.x - currentPos.x) * 0.02,
    -0.15,
    (offsetTarget.z - currentPos.z) * 0.02
  ))

  useFrame((_, delta) => {
    if (!isActive || !meshRef.current) return

    const newPos = currentPos.clone()
    newPos.add(velocityRef.current.clone().multiplyScalar(delta * 60))
    
    setCurrentPos(newPos)
    meshRef.current.position.copy(newPos)

    const distance = newPos.distanceTo(offsetTarget)
    if (distance < 0.5) {
      setIsActive(false)
      onHit(complexId)
    }
  })

  useEffect(() => {
    if (!isActive) {
      const timer = setTimeout(() => {
        const newRandomPos = new THREE.Vector3(
          offsetTarget.x + (Math.random() - 0.5) * 2,
          8,
          offsetTarget.z + (Math.random() - 0.5) * 2
        )
        
        const newVelocity = new THREE.Vector3(
          (offsetTarget.x - newRandomPos.x) * 0.02,
          -0.15,
          (offsetTarget.z - newRandomPos.z) * 0.02
        )
        
        velocityRef.current = newVelocity
        setCurrentPos(newRandomPos)
        setIsActive(true)
      }, 1500 + Math.random() * 1000)

      return () => clearTimeout(timer)
    }
  }, [isActive, offsetTarget, offsetTarget.x, offsetTarget.z])

  if (!isActive) return null

  return (
    <group position={currentPos.toArray()}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={4}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial 
          color="#fef3c7"
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  )
}

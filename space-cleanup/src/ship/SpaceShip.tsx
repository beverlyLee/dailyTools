import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SpaceShipProps {
  onPositionUpdate: (position: THREE.Vector3) => void
}

export default function SpaceShip({ onPositionUpdate }: SpaceShipProps) {
  const shipRef = useRef<THREE.Group>(null)
  const velocityRef = useRef(new THREE.Vector3())
  const [keys, setKeys] = useState({
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
        setKeys((prev) => ({ ...prev, [key]: true }))
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
        setKeys((prev) => ({ ...prev, [key]: false }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    if (!shipRef.current) return

    const ship = shipRef.current
    const acceleration = 8
    const maxSpeed = 12
    const friction = 0.98
    const rotationSpeed = 2

    const forward = new THREE.Vector3()
    ship.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    if (keys.w) {
      velocityRef.current.addScaledVector(forward, acceleration * delta)
    }
    if (keys.s) {
      velocityRef.current.addScaledVector(forward, -acceleration * delta * 0.5)
    }
    if (keys.a) {
      velocityRef.current.addScaledVector(right, -acceleration * delta * 0.5)
    }
    if (keys.d) {
      velocityRef.current.addScaledVector(right, acceleration * delta * 0.5)
    }
    if (keys.q) {
      ship.rotation.z += rotationSpeed * delta
    }
    if (keys.e) {
      ship.rotation.z -= rotationSpeed * delta
    }

    if (keys.a && !keys.d) {
      ship.rotation.y += rotationSpeed * delta
    }
    if (keys.d && !keys.a) {
      ship.rotation.y -= rotationSpeed * delta
    }

    velocityRef.current.y *= 0.9

    const planeReturnForce = -ship.position.y * 2
    velocityRef.current.y += planeReturnForce * delta

    velocityRef.current.multiplyScalar(friction)

    if (velocityRef.current.length() > maxSpeed) {
      velocityRef.current.normalize().multiplyScalar(maxSpeed)
    }

    ship.position.addScaledVector(velocityRef.current, delta)

    ship.position.y = Math.max(-2, Math.min(2, ship.position.y))

    const distanceFromCenter = Math.sqrt(ship.position.x ** 2 + ship.position.z ** 2)
    const maxDistance = 15
    if (distanceFromCenter > maxDistance) {
      const scale = maxDistance / distanceFromCenter
      ship.position.x *= scale
      ship.position.z *= scale
      velocityRef.current.x *= -0.3
      velocityRef.current.z *= -0.3
    }

    const minDistance = 2.5
    if (distanceFromCenter < minDistance) {
      const scale = minDistance / distanceFromCenter
      ship.position.x *= scale
      ship.position.z *= scale
      velocityRef.current.x *= -0.5
      velocityRef.current.z *= -0.5
    }

    ship.rotation.x = 0

    onPositionUpdate(ship.position.clone())
  })

  return (
    <group ref={shipRef} position={[0, 0, 6]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.3, 0.8, 6]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.25, 0.4, 6]} />
        <meshStandardMaterial color="#607d8b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.25, 0, -0.1]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.4, 0.05, 0.2]} />
        <meshStandardMaterial color="#78909c" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.25, 0, -0.1]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.4, 0.05, 0.2]} />
        <meshStandardMaterial color="#78909c" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#4fc3f7" transparent opacity={0.8} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, -0.45]}>
        <cylinderGeometry args={[0.08, 0.12, 0.15, 8]} />
        <meshBasicMaterial color="#ff6b35" />
      </mesh>
      <pointLight position={[0, 0, -0.5]} color="#ff6b35" intensity={2} distance={3} />
    </group>
  )
}

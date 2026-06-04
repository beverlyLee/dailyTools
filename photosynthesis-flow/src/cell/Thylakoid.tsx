import { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Photon from '../particles/Photon'
import Electron from '../particles/Electron'
import ATP from '../particles/ATP'

interface Complex {
  id: number
  position: THREE.Vector3
  name: string
  color: string
}

interface ElectronState {
  id: number
  currentComplex: number
  targetComplex: number
  progress: number
  isMoving: boolean
}

interface ComplexActivation {
  [complexId: number]: number
}

const PHOTON_COUNT = 4

export default function Thylakoid() {
  const groupRef = useRef<THREE.Group>(null)
  const [electrons, setElectrons] = useState<ElectronState[]>([])
  const [atpMolecules, setAtpMolecules] = useState<Array<{
    id: number
    position: THREE.Vector3
    age: number
  }>>([])
  const [complexActivations, setComplexActivations] = useState<ComplexActivation>({})
  const electronIdRef = useRef(0)
  const atpIdRef = useRef(0)

  const proteinComplexes: Complex[] = useMemo(() => [
    { id: 0, position: new THREE.Vector3(-4, 0.3, 0), name: 'PSII', color: '#22c55e' },
    { id: 1, position: new THREE.Vector3(-1.5, 0.3, 0), name: 'Cytb6f', color: '#10b981' },
    { id: 2, position: new THREE.Vector3(1.5, 0.3, 0), name: 'PSI', color: '#14b8a6' },
    { id: 3, position: new THREE.Vector3(4, 0.3, 0), name: 'ATP Synthase', color: '#06b6d4' },
  ], [])

  const calculateArcPosition = useCallback((
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    progress: number,
    arcHeight: number = 1.2
  ): THREE.Vector3 => {
    const result = startPos.clone().lerp(endPos, progress)
    const arcOffset = Math.sin(progress * Math.PI) * arcHeight
    result.y += 0.5 + arcOffset
    return result
  }, [])

  const timeRef = useRef(0)

  const getComplexEmissiveIntensity = useCallback((complexId: number): number => {
    const lastActivation = complexActivations[complexId] || 0
    const timeSinceActivation = timeRef.current - lastActivation
    const activationDuration = 0.5
    
    if (timeSinceActivation < activationDuration) {
      const fadeFactor = 1 - (timeSinceActivation / activationDuration)
      return 0.3 + fadeFactor * 1.5
    }
    return 0.3
  }, [complexActivations])

  const activateComplex = useCallback((complexId: number, time: number) => {
    setComplexActivations(prev => ({
      ...prev,
      [complexId]: time
    }))
  }, [])

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime
    timeRef.current = time

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05
    }

    setElectrons(prev => {
      let newElectrons = [...prev]
      const electronsToRemove: number[] = []
      const electronsToAdd: ElectronState[] = []
      const complexesToActivate: number[] = []

      newElectrons = newElectrons.map(e => {
        if (!e.isMoving) return e

        const newProgress = e.progress + delta * 0.6

        if (newProgress >= 1) {
          complexesToActivate.push(e.targetComplex)
          
          const nextComplex = e.targetComplex + 1

          if (nextComplex >= proteinComplexes.length) {
            const atpPos = proteinComplexes[3].position.clone()
            atpPos.y += 0.5
            setAtpMolecules(prevAtp => [...prevAtp, {
              id: atpIdRef.current++,
              position: atpPos,
              age: 0
            }])
            electronsToRemove.push(e.id)
            return e
          }

          electronsToAdd.push({
            id: electronIdRef.current++,
            currentComplex: e.targetComplex,
            targetComplex: nextComplex,
            progress: 0,
            isMoving: true
          })
          electronsToRemove.push(e.id)
          return e
        }

        return { ...e, progress: newProgress }
      })

      if (complexesToActivate.length > 0) {
        complexesToActivate.forEach(id => {
          activateComplex(id, time)
        })
      }

      newElectrons = newElectrons.filter(e => !electronsToRemove.includes(e.id))
      newElectrons = [...newElectrons, ...electronsToAdd]

      return newElectrons
    })

    setAtpMolecules(prev => 
      prev.map(atp => ({ ...atp, age: atp.age + delta }))
        .filter(atp => atp.age < 3)
    )
  })

  const handlePhotonHit = useCallback((complexId: number) => {
    if (complexId !== 0) return

    activateComplex(0, timeRef.current)

    const nextComplex = complexId + 1
    if (nextComplex >= proteinComplexes.length) return

    setElectrons(prev => [...prev, {
      id: electronIdRef.current++,
      currentComplex: complexId,
      targetComplex: nextComplex,
      progress: 0,
      isMoving: true
    }])
  }, [proteinComplexes.length, activateComplex])

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[6, 6, 0.2, 64, 1, true]} />
        <meshStandardMaterial 
          color="#166534" 
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
          emissive="#15803d"
          emissiveIntensity={0.2}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <ringGeometry args={[5.8, 6.2, 64]} />
        <meshStandardMaterial 
          color="#22c55e" 
          side={THREE.DoubleSide}
          emissive="#4ade80"
          emissiveIntensity={0.5}
        />
      </mesh>

      {proteinComplexes.map((complex) => (
        <group key={complex.id} position={complex.position.toArray()}>
          <mesh>
            <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
            <meshStandardMaterial 
              color={complex.color}
              emissive={complex.color}
              emissiveIntensity={getComplexEmissiveIntensity(complex.id)}
            />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial 
              color="#fbbf24"
              emissive="#fbbf24"
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      ))}

      {Array.from({ length: PHOTON_COUNT }, (_, i) => (
        <Photon 
          key={`photon-${i}`}
          targetPosition={proteinComplexes[0].position}
          complexId={0}
          onHit={handlePhotonHit}
        />
      ))}

      {electrons.map(electron => {
        const startPos = proteinComplexes[electron.currentComplex].position
        const endPos = proteinComplexes[electron.targetComplex].position
        const currentPos = calculateArcPosition(startPos, endPos, electron.progress)
        
        return (
          <Electron 
            key={electron.id} 
            position={currentPos}
            intensity={0.5 + Math.sin(electron.progress * Math.PI) * 1.0}
          />
        )
      })}

      {atpMolecules.map(atp => (
        <ATP 
          key={atp.id} 
          position={[
            atp.position.x + Math.sin(atp.age * 2) * 0.3,
            atp.position.y + atp.age * 0.5,
            atp.position.z + Math.cos(atp.age * 2) * 0.3
          ]}
          opacity={1 - atp.age / 3}
        />
      ))}
    </group>
  )
}

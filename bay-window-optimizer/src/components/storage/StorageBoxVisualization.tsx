import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BayWindowConfig, StorageConfig, StorageDrawer, StorageAnalysis as StorageAnalysisType } from '../../types'
import { toMeters } from '../../utils/calculations'

interface StorageBoxVisualizationProps {
  bayConfig: BayWindowConfig
  storageConfig: StorageConfig
  storageAnalysis: StorageAnalysisType
  animateDrawers: boolean
  drawerMaterial: string
}

export function StorageBoxVisualization({
  bayConfig,
  storageConfig,
  storageAnalysis,
  animateDrawers,
  drawerMaterial
}: StorageBoxVisualizationProps) {
  const SH = toMeters(bayConfig.sillHeight)
  const SD = toMeters(bayConfig.sillDepth)
  const WW = toMeters(bayConfig.windowWidth)
  const drawerCount = storageConfig.drawers.length

  const conflictedDrawerIds = new Set<string>()
  storageAnalysis.conflicts.forEach(c => conflictedDrawerIds.add(c.drawerId))

  if (!storageConfig.enabled || drawerCount === 0) {
    return null
  }

  const hasAnyConflict = storageAnalysis.hasConflicts
  const drawerH = toMeters(storageConfig.drawerHeight)
  const totalDrawersHeight = drawerH * drawerCount
  const cabinetHeight = totalDrawersHeight + 0.04
  const cabinetWidth = WW - 0.06
  const cabinetDepth = toMeters(storageConfig.drawerDepth) + 0.03
  const cabinetY = SH - cabinetHeight / 2 - 0.01

  const drawerRefs = useRef<Map<string, THREE.Group>>(new Map())

  useFrame(() => {
    drawerRefs.current.forEach((group, drawerId) => {
      const isConflicted = conflictedDrawerIds.has(drawerId)
      const targetZ = animateDrawers && !isConflicted
        ? toMeters(storageConfig.drawerDepth) * 0.55
        : 0
      if (group) {
        const current = group.position.z
        group.position.z = current + (targetZ - current) * 0.08
      }
    })
  })

  return (
    <group position={[0, 0, -SD / 2]}>
      <mesh position={[0, cabinetY, cabinetDepth / 2]} receiveShadow>
        <boxGeometry args={[cabinetWidth, cabinetHeight, cabinetDepth]} />
        <meshStandardMaterial
          color={hasAnyConflict ? '#fde2e2' : '#e8dcc8'}
          roughness={0.85}
        />
      </mesh>

      <mesh position={[0, cabinetY + cabinetHeight / 2 + 0.005, cabinetDepth / 2]}>
        <boxGeometry args={[cabinetWidth + 0.02, 0.01, cabinetDepth + 0.02]} />
        <meshStandardMaterial
          color={hasAnyConflict ? '#f8c2c2' : '#d4c4a8'}
          roughness={0.75}
        />
      </mesh>

      <mesh position={[-cabinetWidth / 2 - 0.005, cabinetY, cabinetDepth / 2]}>
        <boxGeometry args={[0.01, cabinetHeight, cabinetDepth + 0.02]} />
        <meshStandardMaterial color="#c8b898" roughness={0.8} />
      </mesh>
      <mesh position={[cabinetWidth / 2 + 0.005, cabinetY, cabinetDepth / 2]}>
        <boxGeometry args={[0.01, cabinetHeight, cabinetDepth + 0.02]} />
        <meshStandardMaterial color="#c8b898" roughness={0.8} />
      </mesh>

      {storageConfig.drawers.map((drawer, idx) => {
        const isConflicted = conflictedDrawerIds.has(drawer.id)
        const yOffset = -totalDrawersHeight / 2 + drawerH / 2 + idx * drawerH

        return (
          <DrawerUnit
            key={drawer.id}
            drawer={drawer}
            index={idx}
            totalCount={drawerCount}
            cabinetY={cabinetY}
            drawerH={drawerH}
            totalDrawersHeight={totalDrawersHeight}
            yOffset={yOffset}
            isConflicted={isConflicted}
            materialColor={drawerMaterial}
            setRef={(g) => {
              if (g) drawerRefs.current.set(drawer.id, g)
              else drawerRefs.current.delete(drawer.id)
            }}
          />
        )
      })}

      {animateDrawers && hasAnyConflict && (
        <mesh position={[0, SH / 2, SD / 2 + 0.1]}>
          <boxGeometry args={[WW, SH, 0.01]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  )
}

interface DrawerUnitProps {
  drawer: StorageDrawer
  index: number
  totalCount: number
  cabinetY: number
  drawerH: number
  totalDrawersHeight: number
  yOffset: number
  isConflicted: boolean
  materialColor: string
  setRef: (g: THREE.Group | null) => void
}

function DrawerUnit({
  drawer,
  drawerH,
  isConflicted,
  materialColor,
  setRef,
  cabinetY,
  yOffset
}: DrawerUnitProps) {
  const drawerX = toMeters(drawer.x)
  const drawerW = toMeters(drawer.width)
  const drawerD = toMeters(drawer.depth)

  return (
    <group
      ref={setRef}
      position={[drawerX, cabinetY + yOffset, 0]}
    >
      <mesh position={[0, 0, drawerD / 2]} castShadow>
        <boxGeometry args={[
          drawerW - 0.015,
          drawerH - 0.015,
          drawerD - 0.015
        ]} />
        <meshStandardMaterial
          color={isConflicted ? '#fca5a5' : materialColor}
          roughness={0.75}
          metalness={0.05}
        />
      </mesh>

      <mesh position={[0, 0, drawerD + 0.002]} castShadow>
        <boxGeometry args={[
          drawerW + 0.005,
          drawerH + 0.005,
          0.018
        ]} />
        <meshStandardMaterial
          color={isConflicted ? '#ef4444' : materialColor}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[
        0,
        0,
        drawerD + 0.035
      ]} castShadow>
        <boxGeometry args={[drawerW * 0.3, 0.025, 0.02]} />
        <meshStandardMaterial
          color={isConflicted ? '#b91c1c' : '#5a5a5a'}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {isConflicted && (
        <mesh position={[0, 0, drawerD * 0.9]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}

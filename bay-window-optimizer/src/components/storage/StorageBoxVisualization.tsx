import { useMemo } from 'react'
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

  const conflictedDrawerIds = useMemo(() => {
    const ids = new Set<string>()
    storageAnalysis.conflicts.forEach(c => {
      ids.add(c.drawerId)
    })
    return ids
  }, [storageAnalysis.conflicts])

  if (!storageConfig.enabled || storageConfig.drawers.length === 0) {
    return null
  }

  const hasAnyConflict = storageAnalysis.hasConflicts

  return (
    <group position={[0, 0, -SD / 2]}>
      <mesh position={[0, SH / 2 - toMeters(storageConfig.drawerHeight * storageConfig.drawers.length) / 2, 0.01]}>
        <boxGeometry args={[
          toMeters(bayConfig.windowWidth) - 0.06,
          toMeters(storageConfig.drawerHeight * storageConfig.drawers.length) + 0.02,
          toMeters(storageConfig.drawerDepth) + 0.02
        ]} />
        <meshStandardMaterial color={hasAnyConflict ? '#fde2e2' : '#e8dcc8'} roughness={0.8} />
      </mesh>

      {storageConfig.drawers.map((drawer, idx) => {
        const isConflicted = conflictedDrawerIds.has(drawer.id)
        const openOffset = animateDrawers
          ? (isConflicted ? 0.02 : toMeters(drawer.depth) * 0.6)
          : 0

        return (
          <DrawerUnit
            key={drawer.id}
            drawer={drawer}
            index={idx}
            totalCount={storageConfig.drawers.length}
            openOffset={openOffset}
            isConflicted={isConflicted}
            materialColor={drawerMaterial}
          />
        )
      })}

      {animateDrawers && hasAnyConflict && (
        <mesh position={[0, SH / 2, toMeters(bayConfig.sillDepth) / 2 + 0.1]}>
          <boxGeometry args={[toMeters(bayConfig.windowWidth), SH, 0.01]} />
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
  openOffset: number
  isConflicted: boolean
  materialColor: string
}

function DrawerUnit({ drawer, index, totalCount, openOffset, isConflicted, materialColor }: DrawerUnitProps) {
  const drawerH = toMeters(drawer.height)
  const totalDrawersHeight = drawerH * totalCount
  const yOffset = -totalDrawersHeight / 2 + drawerH / 2 + index * drawerH

  return (
    <group position={[toMeters(drawer.x), yOffset, 0]}>
      <mesh position={[0, 0, toMeters(drawer.depth) / 2 + openOffset]} castShadow>
        <boxGeometry args={[
          toMeters(drawer.width) - 0.02,
          drawerH - 0.015,
          toMeters(drawer.depth) - 0.02
        ]} />
        <meshStandardMaterial
          color={isConflicted ? '#fca5a5' : materialColor}
          roughness={0.75}
          metalness={0.05}
        />
      </mesh>

      <mesh position={[0, 0, toMeters(drawer.depth) + openOffset - 0.005]} castShadow>
        <boxGeometry args={[
          toMeters(drawer.width) - 0.01,
          drawerH - 0.005,
          0.015
        ]} />
        <meshStandardMaterial
          color={isConflicted ? '#ef4444' : materialColor}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[
        toMeters(drawer.width) / 2 - toMeters(drawer.width) * 0.15,
        0,
        toMeters(drawer.depth) + openOffset + 0.015
      ]} castShadow>
        <boxGeometry args={[toMeters(drawer.width) * 0.25, 0.025, 0.02]} />
        <meshStandardMaterial color={isConflicted ? '#b91c1c' : '#6b7280'} metalness={0.7} roughness={0.3} />
      </mesh>

      {isConflicted && openOffset > 0.01 && (
        <mesh position={[0, 0, toMeters(drawer.depth) * 0.9 + openOffset]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}

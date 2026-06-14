import { useMemo } from 'react'
import type { BayWindowConfig, StorageConfig, StorageDrawer } from '../../types'
import { toMeters } from '../../utils/calculations'

interface StorageBoxVisualizationProps {
  bayConfig: BayWindowConfig
  storageConfig: StorageConfig
  animateDrawers: boolean
  drawerMaterial: string
}

export function StorageBoxVisualization({
  bayConfig,
  storageConfig,
  animateDrawers,
  drawerMaterial
}: StorageBoxVisualizationProps) {
  const SH = toMeters(bayConfig.sillHeight)
  const SD = toMeters(bayConfig.sillDepth)

  const conflictedDrawers = useMemo(() => {
    const ids = new Set<string>()
    if (bayConfig.hasCurtainBox && storageConfig.enabled) {
      storageConfig.drawers.forEach(d => {
        const openDepth = d.depth * 0.8
        if (openDepth > bayConfig.curtainBoxDepth - 2) {
          ids.add(d.id)
        }
      })
    }
    if (bayConfig.hasRadiator && storageConfig.enabled) {
      const radStartX = bayConfig.radiatorOffsetX - bayConfig.radiatorWidth / 2
      const radEndX = bayConfig.radiatorOffsetX + bayConfig.radiatorWidth / 2
      storageConfig.drawers.forEach(d => {
        const dStartX = d.x - d.width / 2
        const dEndX = d.x + d.width / 2
        const xOverlap = Math.max(0, Math.min(dEndX, radEndX) - Math.max(dStartX, radStartX))
        if (xOverlap > 0 && d.depth > bayConfig.radiatorDepth + 2) {
          ids.add(d.id)
        }
      })
    }
    return ids
  }, [bayConfig, storageConfig])

  if (!storageConfig.enabled || storageConfig.drawers.length === 0) {
    return null
  }

  return (
    <group position={[0, 0, -SD / 2]}>
      <mesh position={[0, SH / 2 - toMeters(storageConfig.drawerHeight * storageConfig.drawers.length) / 2, 0.01]}>
        <boxGeometry args={[
          toMeters(bayConfig.windowWidth) - 0.06,
          toMeters(storageConfig.drawerHeight * storageConfig.drawers.length) + 0.02,
          toMeters(storageConfig.drawerDepth) + 0.02
        ]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.8} />
      </mesh>

      {storageConfig.drawers.map((drawer, idx) => {
        const openOffset = animateDrawers
          ? (conflictedDrawers.has(drawer.id) ? 0.02 : toMeters(drawer.depth) * 0.6)
          : 0

        const isConflicted = conflictedDrawers.has(drawer.id)

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

      {animateDrawers && Array.from(conflictedDrawers).length > 0 && (
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

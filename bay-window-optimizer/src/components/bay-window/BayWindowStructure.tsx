import { useMemo } from 'react'
import type { BayWindowConfig } from '../../types'
import { toMeters } from '../../utils/calculations'

interface BayWindowStructureProps {
  config: BayWindowConfig
  frameColor: string
}

export function BayWindowStructure({ config, frameColor }: BayWindowStructureProps) {
  const {
    windowWidth,
    windowHeight,
    windowDepth,
    sillHeight,
    sillDepth,
    wallThickness,
    paneCount,
    hasCurtainBox,
    curtainBoxDepth,
    curtainBoxHeight,
    hasRadiator,
    radiatorWidth,
    radiatorHeight,
    radiatorDepth,
    radiatorOffsetX
  } = config

  const W = toMeters(windowWidth)
  const WH = toMeters(windowHeight)
  void windowDepth
  const SH = toMeters(sillHeight)
  const SD = toMeters(sillDepth)
  const WT = toMeters(wallThickness)

  const frameThickness = 0.04
  const glassThickness = 0.012

  const panes = useMemo(() => {
    const result: { x: number; width: number; isSide: boolean; angle: number }[] = []
    const paneGap = 0.02
    const totalFrameWidth = frameThickness * 2 + paneGap * (paneCount - 1)

    if (paneCount === 1) {
      result.push({ x: 0, width: W - totalFrameWidth, isSide: false, angle: 0 })
    } else if (paneCount === 2) {
      const centerPaneWidth = (W - totalFrameWidth) * 0.7
      const sidePaneWidth = (W - totalFrameWidth) * 0.3
      result.push({ x: -W / 2 + frameThickness + sidePaneWidth / 2, width: sidePaneWidth, isSide: true, angle: 25 })
      result.push({ x: W / 2 - frameThickness - centerPaneWidth / 2, width: centerPaneWidth, isSide: false, angle: 0 })
    } else {
      const sidePaneWidth = (W - totalFrameWidth) * 0.2
      const centerPaneWidth = (W - totalFrameWidth - sidePaneWidth * 2) / (paneCount - 2)
      for (let i = 0; i < paneCount; i++) {
        if (i === 0) {
          result.push({
            x: -W / 2 + frameThickness + sidePaneWidth / 2,
            width: sidePaneWidth,
            isSide: true,
            angle: 30
          })
        } else if (i === paneCount - 1) {
          result.push({
            x: W / 2 - frameThickness - sidePaneWidth / 2,
            width: sidePaneWidth,
            isSide: true,
            angle: -30
          })
        } else {
          const idx = i - 1
          result.push({
            x: -W / 2 + frameThickness + sidePaneWidth + paneGap + idx * (centerPaneWidth + paneGap) + centerPaneWidth / 2,
            width: centerPaneWidth,
            isSide: false,
            angle: 0
          })
        }
      }
    }
    return result
  }, [W, paneCount, frameThickness])

  return (
    <group>
      <mesh position={[0, SH / 2, -SD / 2]} receiveShadow>
        <boxGeometry args={[W, SH, SD]} />
        <meshStandardMaterial color="#f5f0e6" roughness={0.9} />
      </mesh>

      <mesh position={[0, SH + 0.02, -SD / 2 + 0.02]} receiveShadow castShadow>
        <boxGeometry args={[W + 0.04, 0.04, SD + 0.04]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.7} />
      </mesh>

      <mesh position={[-W / 2 - WT / 2, SH + WH / 2, -SD / 2]} castShadow>
        <boxGeometry args={[WT, WH, SD + WT]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.95} />
      </mesh>
      <mesh position={[W / 2 + WT / 2, SH + WH / 2, -SD / 2]} castShadow>
        <boxGeometry args={[WT, WH, SD + WT]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.95} />
      </mesh>
      <mesh position={[0, SH + WH + WT / 2, -SD / 2]} castShadow>
        <boxGeometry args={[W + WT * 2, WT, SD + WT]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.95} />
      </mesh>

      <group position={[0, SH + WH / 2, -SD + glassThickness / 2]}>
        <mesh position={[0, WH / 2 + frameThickness / 2, 0]} castShadow>
          <boxGeometry args={[W + frameThickness * 2, frameThickness, frameThickness]} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, -WH / 2 - frameThickness / 2, 0]} castShadow>
          <boxGeometry args={[W + frameThickness * 2, frameThickness, frameThickness]} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[-W / 2 - frameThickness / 2, 0, 0]} castShadow>
          <boxGeometry args={[frameThickness, WH + frameThickness * 2, frameThickness]} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[W / 2 + frameThickness / 2, 0, 0]} castShadow>
          <boxGeometry args={[frameThickness, WH + frameThickness * 2, frameThickness]} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.3} />
        </mesh>

        {panes.map((pane, idx) => {
          const radAngle = (pane.angle * Math.PI) / 180
          const offsetZ = pane.isSide ? Math.sin(radAngle) * pane.width / 4 : 0
          const offsetX = pane.isSide ? (1 - Math.cos(radAngle)) * pane.width / 4 * (idx === 0 ? -1 : 1) : 0

          return (
            <group key={idx} position={[pane.x + offsetX, 0, offsetZ]} rotation={[0, radAngle, 0]}>
              <mesh castShadow>
                <boxGeometry args={[pane.width + frameThickness, WH, frameThickness]} />
                <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh>
                <boxGeometry args={[pane.width, WH - frameThickness, glassThickness]} />
                <meshPhysicalMaterial
                  color="#e8f4fc"
                  transparent
                  opacity={0.25}
                  roughness={0.05}
                  metalness={0}
                  transmission={0.9}
                  thickness={0.02}
                  ior={1.5}
                />
              </mesh>
            </group>
          )
        })}
      </group>

      {hasCurtainBox && (
        <group position={[0, SH + WH - toMeters(curtainBoxHeight) / 2, -SD / 2 + toMeters(curtainBoxDepth) / 2 + 0.02]}>
          <mesh castShadow>
            <boxGeometry args={[W + 0.15, toMeters(curtainBoxHeight), toMeters(curtainBoxDepth)]} />
            <meshStandardMaterial color="#ffffff" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0, toMeters(curtainBoxDepth) / 2 + 0.005]}>
            <boxGeometry args={[W + 0.12, toMeters(curtainBoxHeight) - 0.02, 0.01]} />
            <meshStandardMaterial color="#d4cfc4" roughness={0.8} />
          </mesh>
        </group>
      )}

      {hasRadiator && (
        <group position={[
          toMeters(radiatorOffsetX),
          toMeters(radiatorHeight) / 2 + 0.05,
          -SD / 2 + 0.04
        ]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[toMeters(radiatorWidth), toMeters(radiatorHeight), toMeters(radiatorDepth)]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} metalness={0.3} />
          </mesh>
          {Array.from({ length: Math.floor(radiatorWidth / 10) }).map((_, i) => (
            <mesh
              key={i}
              position={[
                -toMeters(radiatorWidth) / 2 + 0.05 + i * 0.1,
                0,
                toMeters(radiatorDepth) / 2 + 0.005
              ]}
            >
              <boxGeometry args={[0.05, toMeters(radiatorHeight) - 0.04, 0.015]} />
              <meshStandardMaterial color="#d0d0d0" roughness={0.4} metalness={0.5} />
            </mesh>
          ))}
          <mesh position={[0, toMeters(radiatorHeight) / 2 - 0.02, 0]}>
            <cylinderGeometry args={[0.015, 0.015, toMeters(radiatorWidth) - 0.05, 12]} />
            <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.6} />
          </mesh>
        </group>
      )}

      <mesh position={[0, -0.05, 1.5]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#f0ebe3" roughness={0.9} />
      </mesh>

      <mesh position={[0, 1.5, -3]} receiveShadow>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.95} />
      </mesh>
    </group>
  )
}

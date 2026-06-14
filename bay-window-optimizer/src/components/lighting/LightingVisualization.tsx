import { useMemo } from 'react'
import * as THREE from 'three'
import type { BayWindowConfig, LightingAnalysis as LightingAnalysisType } from '../../types'
import { toMeters } from '../../utils/calculations'
import { SeededRandom } from '../../utils/seededRandom'

interface LightingVisualizationProps {
  bayConfig: BayWindowConfig
  lightingAnalysis: LightingAnalysisType
  showLightRays: boolean
  showCoverageMap: boolean
}

export function LightingVisualization({
  bayConfig,
  lightingAnalysis,
  showLightRays,
  showCoverageMap
}: LightingVisualizationProps) {
  const W = toMeters(bayConfig.windowWidth)
  const WH = toMeters(bayConfig.windowHeight)
  const SH = toMeters(bayConfig.sillHeight)
  const SD = toMeters(bayConfig.sillDepth)

  const illuminationColor = useMemo(() => {
    switch (lightingAnalysis.illuminationLevel) {
      case 'excellent': return '#fef3c7'
      case 'good': return '#fde68a'
      case 'fair': return '#fcd34d'
      case 'poor': return '#f59e0b'
    }
  }, [lightingAnalysis.illuminationLevel])

  const lightRays = useMemo(() => {
    const rays: { start: [number, number, number]; end: [number, number, number]; intensity: number }[] = []
    const rayCount = 12
    const sunHeight = 8
    const sunDistance = 6
    const rayRng = new SeededRandom(`rays-${bayConfig.windowWidth}-${bayConfig.windowHeight}-${lightingAnalysis.lightBlockagePercentage}`)

    for (let i = 0; i < rayCount; i++) {
      for (let j = 0; j < 6; j++) {
        const seedKey1 = (i * 6 + j) * 3
        const seedKey2 = (i * 6 + j) * 3 + 1
        const seedKey3 = (i * 6 + j) * 3 + 2
        rayRng.reset(seedKey1)
        const startX = -W / 2 + (i / (rayCount - 1)) * W + (rayRng.next() - 0.5) * 0.05
        rayRng.reset(seedKey2)
        const startY = SH + WH - (j / 5) * WH * 0.8 + (rayRng.next() - 0.5) * 0.05
        const startZ = -SD + 0.1

        rayRng.reset(seedKey3)
        const dirX = (rayRng.next() - 0.5) * 0.3
        const dirY = -sunHeight
        const dirZ = sunDistance

        const endX = startX + dirX * 0.8
        const endY = Math.max(0.02, startY + dirY * 0.5)
        const endZ = startZ + dirZ * 0.8

        let intensity = 1
        const normalizedY = (startY - SH) / WH
        if (lightingAnalysis.lightBlockagePercentage > 0 && normalizedY < lightingAnalysis.lightBlockagePercentage / 100) {
          intensity = 0.4 + (normalizedY / (lightingAnalysis.lightBlockagePercentage / 100)) * 0.6
        }

        rays.push({
          start: [startX, startY, startZ],
          end: [endX, endY, endZ],
          intensity
        })
      }
    }
    return rays
  }, [W, WH, SH, SD, bayConfig.windowWidth, bayConfig.windowHeight, lightingAnalysis.lightBlockagePercentage])

  return (
    <group>
      {showLightRays && lightRays.map((ray, idx) => {
        const points = [
          new THREE.Vector3(...ray.start),
          new THREE.Vector3(...ray.end)
        ]
        const geometry = new THREE.BufferGeometry().setFromPoints(points)

        return (
          <line key={idx}>
            <primitive object={geometry} attach="geometry" />
            <lineBasicMaterial
              color={illuminationColor}
              transparent
              opacity={ray.intensity * 0.35}
            />
          </line>
        )
      })}

      {showCoverageMap && (
        <group position={[0, SH + WH / 2, -SD + 0.001]}>
          {lightingAnalysis.windowCoverageMap.map((row, rowIdx) =>
            row.map((coverage, colIdx) => {
              const cellW = W / row.length
              const cellH = WH / row.length
              const x = -W / 2 + cellW / 2 + colIdx * cellW
              const y = -WH / 2 + cellH / 2 + (row.length - 1 - rowIdx) * cellH

              const baseColor = new THREE.Color(illuminationColor)
              const shadowColor = new THREE.Color('#52525b')
              const finalColor = baseColor.clone().lerp(shadowColor, coverage * 0.8)

              return (
                <mesh key={`${rowIdx}-${colIdx}`} position={[x, y, 0]}>
                  <planeGeometry args={[cellW * 0.98, cellH * 0.98]} />
                  <meshBasicMaterial
                    color={finalColor}
                    transparent
                    opacity={0.5}
                  />
                </mesh>
              )
            })
          )}
        </group>
      )}

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 0.95, SD * 1.5]} />
        <meshBasicMaterial
          color={illuminationColor}
          transparent
          opacity={0.15 * (1 - lightingAnalysis.lightBlockagePercentage / 100) + 0.05}
        />
      </mesh>

      {lightingAnalysis.sillShadowDepth > 0.05 && (
        <mesh
          position={[
            0,
            0.03,
            -SD / 2 + toMeters(lightingAnalysis.sillShadowDepth) / 2
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[W * 0.9, toMeters(lightingAnalysis.sillShadowDepth)]} />
          <meshBasicMaterial color="#374151" transparent opacity={0.2} />
        </mesh>
      )}
    </group>
  )
}

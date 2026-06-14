import { useMemo } from 'react'
import type { ComfortAnalysis as ComfortAnalysisType, BayWindowConfig } from '../../types'
import { toMeters } from '../../utils/calculations'

interface ComfortVisualizationProps {
  bayConfig: BayWindowConfig
  comfortAnalysis: ComfortAnalysisType
  cushionColor: string
  showPerson: boolean
}

export function ComfortVisualization({
  bayConfig,
  comfortAnalysis,
  cushionColor,
  showPerson
}: ComfortVisualizationProps) {
  const SH = toMeters(bayConfig.sillHeight)
  const SD = toMeters(bayConfig.sillDepth)
  const W = toMeters(bayConfig.windowWidth)

  const cushionThickness = 0.08
  const seatY = SH + cushionThickness / 2

  const legAngles = useMemo(() => {
    const { thighAngle, shinAngle } = comfortAnalysis
    return {
      thigh: (thighAngle * Math.PI) / 180,
      shin: (shinAngle * Math.PI) / 180
    }
  }, [comfortAnalysis])

  const bodyParts = useMemo(() => {
    const hipHeight = seatY + cushionThickness / 2 + 0.08
    const upperLegLength = 0.5
    const lowerLegLength = 0.48

    const thighEndX = Math.cos(-legAngles.thigh) * upperLegLength
    const thighEndY = hipHeight - 0.04 + Math.sin(-legAngles.thigh) * upperLegLength

    const shinAngleRad = -legAngles.thigh - Math.PI / 2 + (legAngles.shin * Math.PI) / 180
    const shinEndX = thighEndX + Math.cos(shinAngleRad) * lowerLegLength
    const shinEndY = thighEndY + Math.sin(shinAngleRad) * lowerLegLength

    return {
      torso: { height: 0.6, y: hipHeight + 0.3 },
      hip: { y: hipHeight },
      thigh: {
        length: upperLegLength,
        startX: 0,
        startY: hipHeight - 0.04,
        endX: thighEndX,
        endY: thighEndY,
        angle: -legAngles.thigh
      },
      shin: {
        length: lowerLegLength,
        startX: thighEndX,
        startY: thighEndY,
        endX: shinEndX,
        endY: shinEndY,
        angle: shinAngleRad
      }
    }
  }, [seatY, cushionThickness, legAngles])

  const comfortColor = useMemo(() => {
    switch (comfortAnalysis.comfortLevel) {
      case 'excellent': return '#22c55e'
      case 'good': return '#84cc16'
      case 'fair': return '#eab308'
      case 'poor': return '#ef4444'
    }
  }, [comfortAnalysis.comfortLevel])

  return (
    <group>
      <mesh position={[0, seatY, -SD / 2 + cushionThickness / 2 + 0.02]} receiveShadow castShadow>
        <boxGeometry args={[W - 0.1, cushionThickness, SD - 0.08]} />
        <meshStandardMaterial color={cushionColor} roughness={0.85} />
      </mesh>

      <mesh position={[0, seatY + cushionThickness / 2 + 0.03, -SD / 2 + SD * 0.3]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.35]} />
        <meshStandardMaterial color={cushionColor} roughness={0.8} />
      </mesh>

      {showPerson && (
        <group position={[-0.3, 0, -SD / 2 + SD * 0.35]}>
          <mesh position={[0, bodyParts.torso.y, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.16, bodyParts.torso.height, 16]} />
            <meshStandardMaterial color="#6366f1" roughness={0.7} />
          </mesh>

          <mesh position={[0, bodyParts.torso.y + bodyParts.torso.height / 2 + 0.1, 0]} castShadow>
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial color="#f4c9a0" roughness={0.6} />
          </mesh>

          <group position={[bodyParts.thigh.startX, bodyParts.thigh.startY, 0]} rotation={[0, 0, bodyParts.thigh.angle]}>
            <mesh position={[bodyParts.thigh.length / 2, 0, 0]} castShadow>
              <boxGeometry args={[bodyParts.thigh.length, 0.08, 0.1]} />
              <meshStandardMaterial color="#4338ca" roughness={0.7} />
            </mesh>
          </group>

          <group position={[bodyParts.shin.startX, bodyParts.shin.startY, 0]} rotation={[0, 0, bodyParts.shin.angle + Math.PI / 2]}>
            <mesh position={[bodyParts.shin.length / 2, 0, 0]} castShadow>
              <boxGeometry args={[bodyParts.shin.length, 0.07, 0.09]} />
              <meshStandardMaterial color="#3730a3" roughness={0.7} />
            </mesh>
          </group>

          <mesh position={[bodyParts.shin.endX, bodyParts.shin.endY - 0.02, 0]} castShadow>
            <boxGeometry args={[0.15, 0.04, 0.08]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>

          <group position={[-0.18, bodyParts.hip.y - 0.18, 0]} rotation={[0, 0, -0.3]}>
            <mesh position={[0, 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.04, 0.5, 12]} />
              <meshStandardMaterial color="#6366f1" roughness={0.7} />
            </mesh>
          </group>
          <group position={[0.18, bodyParts.hip.y - 0.18, 0]} rotation={[0, 0, 0.2]}>
            <mesh position={[0, 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.04, 0.5, 12]} />
              <meshStandardMaterial color="#6366f1" roughness={0.7} />
            </mesh>
          </group>
        </group>
      )}

      <mesh position={[0, 0.01, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.2, 64]} />
        <meshBasicMaterial color={comfortColor} transparent opacity={0.7} side={2} />
      </mesh>
    </group>
  )
}

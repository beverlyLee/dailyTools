import type { KeystoneParams, KeystoneResult, ProjectionResult, Projector } from '../types'
import { calculateProjection } from './optics'

export function analyzeKeystone(
  params: KeystoneParams,
  projector: Projector,
  distance: number
): KeystoneResult {
  const maxShift = projector.maxKeystoneAngle
  
  const horizontalShiftRad = Math.atan2(params.horizontalShift, distance)
  const verticalShiftRad = Math.atan2(params.verticalShift, distance)
  const horizontalShiftDeg = horizontalShiftRad * (180 / Math.PI)
  const verticalShiftDeg = verticalShiftRad * (180 / Math.PI)
  
  const totalAngleRad = Math.sqrt(horizontalShiftRad ** 2 + verticalShiftRad ** 2)
  const totalAngle = totalAngleRad * (180 / Math.PI)
  
  const withinRange = totalAngle <= maxShift
  
  const corrected = withinRange && totalAngle > 0
  
  const distortionPercentage = Math.min(100, (totalAngle / maxShift) * 100)
  
  const keystoneNeeded = totalAngle
  
  const brightnessLoss = Math.min(40, (totalAngle / maxShift) * 40)
  
  const resolutionLoss = Math.min(30, (totalAngle / maxShift) * 30)
  
  return {
    corrected,
    distortionPercentage,
    keystoneNeeded,
    withinRange,
    brightnessLoss,
    resolutionLoss
  }
}

export function calculateSideProjectionImage(
  projector: Projector,
  distance: number,
  horizontalShift: number,
  zoomPosition: number = 0
): {
  width: number
  height: number
  leftEdge: number
  rightEdge: number
  topEdge: number
  bottomEdge: number
  trapezoidRatio: number
} {
  const projection = calculateProjection(projector, distance, zoomPosition)
  const halfWidth = projection.imageWidth / 2
  const halfHeight = projection.imageHeight / 2
  
  const leftDistance = Math.sqrt((distance) ** 2 + (horizontalShift - halfWidth) ** 2)
  const rightDistance = Math.sqrt((distance) ** 2 + (horizontalShift + halfWidth) ** 2)
  
  const leftWidthScale = leftDistance / distance
  const rightWidthScale = rightDistance / distance
  
  const leftHeight = projection.imageHeight * leftWidthScale
  const rightHeight = projection.imageHeight * rightWidthScale
  
  const trapezoidRatio = Math.min(leftHeight, rightHeight) / Math.max(leftHeight, rightHeight)
  
  const avgWidth = (leftWidthScale + rightWidthScale) / 2 * projection.imageWidth
  const avgHeight = (leftHeight + rightHeight) / 2
  
  return {
    width: avgWidth,
    height: avgHeight,
    leftEdge: horizontalShift - avgWidth / 2,
    rightEdge: horizontalShift + avgWidth / 2,
    topEdge: projection.offsetHeight,
    bottomEdge: projection.offsetHeight - avgHeight,
    trapezoidRatio
  }
}

export function getKeystoneSeverity(distortionPercentage: number): {
  level: 'none' | 'mild' | 'moderate' | 'severe'
  label: string
  color: string
} {
  if (distortionPercentage < 5) {
    return { level: 'none', label: '无畸变', color: '#4caf50' }
  } else if (distortionPercentage < 25) {
    return { level: 'mild', label: '轻微畸变', color: '#8bc34a' }
  } else if (distortionPercentage < 50) {
    return { level: 'moderate', label: '中等畸变', color: '#ff9800' }
  } else {
    return { level: 'severe', label: '严重畸变', color: '#f44336' }
  }
}

export function generateKeystoneCorners(
  distance: number,
  lensHeight: number,
  horizontalShift: number,
  verticalShift: number,
  imageWidth: number,
  imageHeight: number
): Array<{ x: number; y: number; z: number }> {
  const halfW = imageWidth / 2
  const halfH = imageHeight / 2
  
  const lensX = horizontalShift
  const lensY = lensHeight
  const lensZ = 0
  
  const wallZ = distance
  
  const dx = -lensX
  const dy = verticalShift
  const dz = wallZ - lensZ
  
  const scale = dz / dz
  
  const centerX = lensX + dx * scale
  const centerY = lensY + dy * scale
  
  const leftDist = Math.sqrt(dz ** 2 + (centerX - halfW - lensX) ** 2)
  const rightDist = Math.sqrt(dz ** 2 + (centerX + halfW - lensX) ** 2)
  const topDist = Math.sqrt(dz ** 2 + (centerY + halfH - lensY) ** 2)
  const bottomDist = Math.sqrt(dz ** 2 + (centerY - halfH - lensY) ** 2)
  
  return [
    { x: centerX - halfW, y: centerY + halfH, z: wallZ },
    { x: centerX + halfW, y: centerY + halfH, z: wallZ },
    { x: centerX + halfW, y: centerY - halfH, z: wallZ },
    { x: centerX - halfW, y: centerY - halfH, z: wallZ }
  ]
}

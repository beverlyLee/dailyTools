import type { Projector, ProjectionResult, LightCone } from '../types'

const ASPECT_RATIO_W = 16
const ASPECT_RATIO_H = 9
const INCH_TO_METER = 0.0254
const METER_TO_INCH = 1 / INCH_TO_METER

export const ASPECT_RATIO = ASPECT_RATIO_W / ASPECT_RATIO_H

export function diagonalToWidth(diagonal: number): number {
  return diagonal / Math.sqrt(1 + (ASPECT_RATIO_H / ASPECT_RATIO_W) ** 2)
}

export function diagonalToHeight(diagonal: number): number {
  return diagonal / Math.sqrt(1 + (ASPECT_RATIO_W / ASPECT_RATIO_H) ** 2)
}

export function widthToDiagonal(width: number): number {
  return width * Math.sqrt(1 + (ASPECT_RATIO_H / ASPECT_RATIO_W) ** 2)
}

export function heightToDiagonal(height: number): number {
  return height * Math.sqrt(1 + (ASPECT_RATIO_W / ASPECT_RATIO_H) ** 2)
}

export function metersToInches(meters: number): number {
  return meters * METER_TO_INCH
}

export function inchesToMeters(inches: number): number {
  return inches * INCH_TO_METER
}

export function calculateProjection(
  projector: Projector,
  distance: number,
  zoomPosition: number = 0
): ProjectionResult {
  let throwRatio: number
  
  if (projector.zoomType === 'optical' && projector.throwRatioMin && projector.throwRatioMax) {
    throwRatio = projector.throwRatioMin + 
      (projector.throwRatioMax - projector.throwRatioMin) * Math.max(0, Math.min(1, zoomPosition))
  } else {
    throwRatio = projector.throwRatio
  }
  
  const imageWidth = distance / throwRatio
  const imageHeight = imageWidth / ASPECT_RATIO
  const imageDiagonal = widthToDiagonal(imageWidth)
  const imageDiagonalInches = metersToInches(imageDiagonal)
  
  const offsetHeight = imageHeight * projector.offset
  
  return {
    distance,
    imageWidth,
    imageHeight,
    imageDiagonal,
    imageDiagonalInches,
    offsetHeight
  }
}

export function calculateDistanceForScreen(
  projector: Projector,
  screenDiagonal: number,
  zoomPosition: number = 0
): number {
  let throwRatio: number
  
  if (projector.zoomType === 'optical' && projector.throwRatioMin && projector.throwRatioMax) {
    throwRatio = projector.throwRatioMin + 
      (projector.throwRatioMax - projector.throwRatioMin) * Math.max(0, Math.min(1, zoomPosition))
  } else {
    throwRatio = projector.throwRatio
  }
  
  const screenWidth = diagonalToWidth(screenDiagonal)
  return screenWidth * throwRatio
}

export function calculateLightCone(
  projector: Projector,
  distance: number,
  lensPosition: { x: number; y: number; z: number },
  zoomPosition: number = 0
): LightCone {
  const projection = calculateProjection(projector, distance, zoomPosition)
  
  const halfWidth = projection.imageWidth / 2
  const halfHeight = projection.imageHeight / 2
  
  return {
    lensCenter: { ...lensPosition },
    topLeft: {
      x: lensPosition.x - halfWidth,
      y: lensPosition.y + projection.offsetHeight,
      z: lensPosition.z + distance
    },
    topRight: {
      x: lensPosition.x + halfWidth,
      y: lensPosition.y + projection.offsetHeight,
      z: lensPosition.z + distance
    },
    bottomLeft: {
      x: lensPosition.x - halfWidth,
      y: lensPosition.y + projection.offsetHeight - projection.imageHeight,
      z: lensPosition.z + distance
    },
    bottomRight: {
      x: lensPosition.x + halfWidth,
      y: lensPosition.y + projection.offsetHeight - projection.imageHeight,
      z: lensPosition.z + distance
    }
  }
}

export function calculateImageOnWall(
  projector: Projector,
  distance: number,
  lensHeight: number,
  zoomPosition: number = 0
): { top: number; bottom: number; left: number; right: number; centerX: number } {
  const projection = calculateProjection(projector, distance, zoomPosition)
  const halfWidth = projection.imageWidth / 2
  
  const top = lensHeight + projection.offsetHeight
  const bottom = top - projection.imageHeight
  
  return {
    top,
    bottom,
    left: -halfWidth,
    right: halfWidth,
    centerX: 0
  }
}

export function calculateThrowAngle(projector: Projector): { horizontal: number; vertical: number } {
  const halfHorizontalFov = Math.atan(0.5 / projector.throwRatio)
  const halfVerticalFov = Math.atan(0.5 / (projector.throwRatio * ASPECT_RATIO))
  
  return {
    horizontal: halfHorizontalFov * 2,
    vertical: halfVerticalFov * 2
  }
}

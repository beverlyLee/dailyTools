import type { InstallationParams, InstallationResult, ScreenSize, Projector } from '../types'
import { calculateProjection } from './optics'

const DEFAULT_VIEWER_EYE_HEIGHT = 1.2
const DEFAULT_CEILING_HEIGHT = 2.8
const DEFAULT_SCREEN_BOTTOM_HEIGHT = 0.6
const PROJECTOR_BODY_HEIGHT = 0.12
const SHELF_MIN_HEIGHT = 0.3
const SHELF_MAX_HEIGHT = 1.2
const MIN_CEILING_CLEARANCE = 0.2

export function verifyInstallation(
  params: Partial<InstallationParams>,
  projector: Projector,
  screen: ScreenSize,
  distance: number
): InstallationResult {
  const RECOMMENDED_VIEWING_DISTANCE_TIMES_WIDTH = 1.2
  const defaultViewerDistance = screen.width * RECOMMENDED_VIEWING_DISTANCE_TIMES_WIDTH
  
  const fullParams: InstallationParams = {
    projectorHeight: params.projectorHeight ?? 0.45,
    screenHeight: screen.height,
    screenBottomHeight: params.screenBottomHeight ?? DEFAULT_SCREEN_BOTTOM_HEIGHT,
    ceilingHeight: params.ceilingHeight ?? DEFAULT_CEILING_HEIGHT,
    viewerDistance: params.viewerDistance ?? defaultViewerDistance,
    viewerEyeHeight: params.viewerEyeHeight ?? DEFAULT_VIEWER_EYE_HEIGHT,
    isCeilingMount: params.isCeilingMount ?? false
  }
  
  const projection = calculateProjection(projector, distance)
  const screenTopHeight = fullParams.screenBottomHeight + fullParams.screenHeight
  const screenCenterY = fullParams.screenBottomHeight + fullParams.screenHeight / 2
  
  const imageCenterOffset = projection.offsetHeight - projection.imageHeight / 2
  
  const idealLensHeightForShelf = screenCenterY - imageCenterOffset
  const idealShelfHeight = idealLensHeightForShelf - PROJECTOR_BODY_HEIGHT / 2
  
  const canShelfMount = idealShelfHeight >= SHELF_MIN_HEIGHT && 
                        idealShelfHeight <= SHELF_MAX_HEIGHT &&
                        idealLensHeightForShelf + projection.imageHeight / 2 < fullParams.ceilingHeight - MIN_CEILING_CLEARANCE
  
  const idealLensHeightForCeiling = screenCenterY + imageCenterOffset
  const ceilingMountProjectorTop = idealLensHeightForCeiling + PROJECTOR_BODY_HEIGHT / 2
  const ceilingProjectorBottom = idealLensHeightForCeiling - PROJECTOR_BODY_HEIGHT / 2
  
  const canCeilingMount = ceilingMountProjectorTop <= fullParams.ceilingHeight - MIN_CEILING_CLEARANCE &&
                          ceilingProjectorBottom - projection.imageHeight / 2 + projection.offsetHeight > 0.1
  
  const currentImageBottom = fullParams.projectorHeight + projection.offsetHeight - projection.imageHeight
  const currentImageTop = fullParams.projectorHeight + projection.offsetHeight
  
  const imageCoversScreenAtCurrent = currentImageBottom <= fullParams.screenBottomHeight + 0.05 &&
                                     currentImageTop >= screenTopHeight - 0.05
  
  const sizeMatchRatio = projection.imageDiagonalInches / screen.diagonalInches
  const imageFillsScreen = sizeMatchRatio >= 0.95 && sizeMatchRatio <= 1.1
  
  const viewerDistanceFromScreen = fullParams.viewerDistance
  const projDistanceFromScreen = distance
  
  const viewerIsInFrontOfProjector = viewerDistanceFromScreen > projDistanceFromScreen
  
  let blocksView = false
  
  if (viewerIsInFrontOfProjector) {
    const eyeY = fullParams.viewerEyeHeight
    const projBottomY = fullParams.projectorHeight - PROJECTOR_BODY_HEIGHT / 2
    const projTopY = fullParams.projectorHeight + PROJECTOR_BODY_HEIGHT / 2
    
    const viewerToScreenDist = viewerDistanceFromScreen
    const viewerToProjDist = viewerDistanceFromScreen - projDistanceFromScreen
    
    const viewLineSlope = (screenCenterY - eyeY) / viewerToScreenDist
    const viewYAtProj = eyeY + viewLineSlope * viewerToProjDist
    
    blocksView = viewYAtProj >= projBottomY - 0.02 && viewYAtProj <= projTopY + 0.02
  }
  
  const shelfBlocksView = canShelfMount && blocksView
  
  const ceilingDistanceFromTop = fullParams.ceilingHeight - ceilingMountProjectorTop

  const shelfHeight = Math.max(SHELF_MIN_HEIGHT, Math.min(SHELF_MAX_HEIGHT, idealShelfHeight))
  const ceilingClearanceCm = (ceilingDistanceFromTop * 100).toFixed(0)
  const screenDiagStr = screen.diagonalInches.toFixed(0)
  const projDiagStr = projection.imageDiagonalInches.toFixed(0)
  const shelfCm = (shelfHeight * 100).toFixed(0)
  const idealCm = (idealShelfHeight * 100).toFixed(0)

  let recommendation = ''

  if (canShelfMount && !shelfBlocksView && imageFillsScreen) {
    recommendation = `无需吊顶，放在柜子上即可。建议放置高度约 ${shelfCm} cm，画面可完整覆盖 ${screenDiagStr} 寸幕布。`
  } else if (canShelfMount && shelfBlocksView && imageFillsScreen) {
    recommendation = `可放置在电视柜上（建议高度 ${shelfCm} cm），但可能遮挡观众视线。建议将投影仪侧移或抬高观看位置。`
  } else if (canShelfMount && !imageFillsScreen) {
    if (sizeMatchRatio < 0.95) {
      recommendation = `可放置在柜子上（建议高度 ${shelfCm} cm），但当前距离下画面偏小（${projDiagStr} 寸），无法投满 ${screenDiagStr} 寸幕布。建议增大投射距离或选择更小尺寸的幕布。`
    } else {
      recommendation = `可放置在柜子上（建议高度 ${shelfCm} cm），当前距离下画面大于幕布（${projDiagStr} 寸）。可减小距离或使用更大尺寸的幕布。`
    }
  } else if (canCeilingMount) {
    recommendation = `建议吊顶安装，投影仪距天花板约 ${ceilingClearanceCm} cm，可完整覆盖幕布。`
  } else if (!canShelfMount && idealShelfHeight < SHELF_MIN_HEIGHT) {
    recommendation = `投影仪需要放置在较低位置（约 ${idealCm} cm），低于常规电视柜高度。建议使用矮柜或地面放置，或考虑吊顶安装。`
  } else if (!canShelfMount && idealShelfHeight > SHELF_MAX_HEIGHT) {
    recommendation = `投影仪需要放置在较高位置（约 ${idealCm} cm），高于常规电视柜。建议吊顶安装或使用高架。`
  } else {
    recommendation = '当前配置下安装较为困难，建议调整投射距离、幕布尺寸或安装方式。'
  }
  
  const clearance = fullParams.ceilingHeight - (fullParams.projectorHeight + PROJECTOR_BODY_HEIGHT / 2)
  
  const SHELF_CAUTION_MARGIN = 0.1
  const SHELF_DANGER_MARGIN = 0.05
  const CEILING_CAUTION_MARGIN = 0.1
  const CEILING_DANGER_MARGIN = 0.05
  
  let shelfRiskLevel: 'safe' | 'caution' | 'danger' = 'safe'
  let shelfRiskMessage = ''
  
  if (canShelfMount) {
    const distToMin = shelfHeight - SHELF_MIN_HEIGHT
    const distToMax = SHELF_MAX_HEIGHT - shelfHeight
    const minDist = Math.min(distToMin, distToMax)
    
    if (minDist < SHELF_DANGER_MARGIN) {
      shelfRiskLevel = 'danger'
      shelfRiskMessage = `⚠️ 接近${distToMin < distToMax ? '下限' : '上限'}，建议预留 ≥ 5cm 余量`
    } else if (minDist < SHELF_CAUTION_MARGIN) {
      shelfRiskLevel = 'caution'
      shelfRiskMessage = `💡 接近${distToMin < distToMax ? '下限' : '上限'}，建议适当调整安装高度`
    }
  }
  
  let ceilingRiskLevel: 'safe' | 'caution' | 'danger' = 'safe'
  let ceilingRiskMessage = ''
  
  if (canCeilingMount) {
    if (ceilingDistanceFromTop < CEILING_DANGER_MARGIN) {
      ceilingRiskLevel = 'danger'
      ceilingRiskMessage = '⚠️ 距顶余量不足，考虑换用更薄吊架'
    } else if (ceilingDistanceFromTop < CEILING_CAUTION_MARGIN) {
      ceilingRiskLevel = 'caution'
      ceilingRiskMessage = '💡 距顶余量较小，安装时注意预留散热空间'
    }
  }
  
  return {
    canShelfMount,
    canCeilingMount,
    shelfHeight,
    idealShelfHeight,
    ceilingMountHeight: ceilingProjectorBottom,
    ceilingDistanceFromTop,
    blocksView,
    clearance,
    recommendation,
    viewerDistance: fullParams.viewerDistance,
    shelfRiskLevel,
    ceilingRiskLevel,
    shelfRiskMessage,
    ceilingRiskMessage
  }
}

export function getIdealViewerDistance(screen: ScreenSize): number {
  const recommendedDistanceTimesWidth = 1.2
  return screen.width * recommendedDistanceTimesWidth
}

export function getViewerEyeHeight(seated: boolean = true): number {
  return seated ? DEFAULT_VIEWER_EYE_HEIGHT : 1.6
}

export function calculateShelfHeightForScreen(
  projector: Projector,
  screen: ScreenSize,
  screenBottomHeight: number,
  distance: number
): number {
  const projection = calculateProjection(projector, distance)
  const screenCenterY = screenBottomHeight + screen.height / 2
  const imageCenterOffset = projection.offsetHeight - projection.imageHeight / 2
  const idealLensHeight = screenCenterY - imageCenterOffset
  return idealLensHeight - PROJECTOR_BODY_HEIGHT / 2
}

export { 
  DEFAULT_VIEWER_EYE_HEIGHT, 
  DEFAULT_CEILING_HEIGHT, 
  DEFAULT_SCREEN_BOTTOM_HEIGHT,
  PROJECTOR_BODY_HEIGHT
}

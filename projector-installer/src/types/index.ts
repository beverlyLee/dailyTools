export interface Projector {
  id: string
  name: string
  brand: string
  throwRatio: number
  throwRatioMin?: number
  throwRatioMax?: number
  zoomType: 'fixed' | 'optical'
  offset: number
  maxKeystoneAngle: number
  nativeResolution: { width: number; height: number }
  brightness: number
  category: 'standard' | 'shortThrow' | 'ultraShortThrow'
}

export interface ProjectionResult {
  distance: number
  imageWidth: number
  imageHeight: number
  imageDiagonal: number
  imageDiagonalInches: number
  offsetHeight: number
}

export interface ScreenSize {
  name: string
  diagonalInches: number
  width: number
  height: number
}

export interface ScreenMatchResult {
  recommendedScreen: ScreenSize | null
  canFill: boolean
  fillPercentage: number
  availableScreens: ScreenSize[]
  closestLarger: ScreenSize | null
  closestSmaller: ScreenSize | null
}

export interface InstallationParams {
  projectorHeight: number
  screenHeight: number
  screenBottomHeight: number
  ceilingHeight: number
  viewerDistance: number
  viewerEyeHeight: number
  isCeilingMount: boolean
}

export interface InstallationResult {
  canShelfMount: boolean
  canCeilingMount: boolean
  shelfHeight: number
  ceilingMountHeight: number
  blocksView: boolean
  clearance: number
  recommendation: string
}

export interface KeystoneParams {
  horizontalShift: number
  verticalShift: number
  angle: number
  maxKeystone: number
}

export interface KeystoneResult {
  corrected: boolean
  distortionPercentage: number
  keystoneNeeded: number
  withinRange: boolean
  brightnessLoss: number
  resolutionLoss: number
}

export interface LightPathPoint {
  x: number
  y: number
  z: number
}

export interface LightCone {
  topLeft: LightPathPoint
  topRight: LightPathPoint
  bottomLeft: LightPathPoint
  bottomRight: LightPathPoint
  lensCenter: LightPathPoint
}

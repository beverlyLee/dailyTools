import type { ScreenSize, ScreenMatchResult, ProjectionResult } from '../types'
import { inchesToMeters, diagonalToWidth, diagonalToHeight } from './optics'

export const standardScreens: ScreenSize[] = [
  { name: '84 寸', diagonalInches: 84, width: 0, height: 0 },
  { name: '92 寸', diagonalInches: 92, width: 0, height: 0 },
  { name: '100 寸', diagonalInches: 100, width: 0, height: 0 },
  { name: '110 寸', diagonalInches: 110, width: 0, height: 0 },
  { name: '120 寸', diagonalInches: 120, width: 0, height: 0 },
  { name: '133 寸', diagonalInches: 133, width: 0, height: 0 },
  { name: '150 寸', diagonalInches: 150, width: 0, height: 0 },
  { name: '180 寸', diagonalInches: 180, width: 0, height: 0 },
  { name: '200 寸', diagonalInches: 200, width: 0, height: 0 }
].map(s => ({
  ...s,
  width: diagonalToWidth(inchesToMeters(s.diagonalInches)),
  height: diagonalToHeight(inchesToMeters(s.diagonalInches))
}))

export function matchScreen(projection: ProjectionResult): ScreenMatchResult {
  const imageDiagonal = projection.imageDiagonalInches
  
  let recommendedScreen: ScreenSize | null = null
  let closestLarger: ScreenSize | null = null
  let closestSmaller: ScreenSize | null = null
  
  for (let i = 0; i < standardScreens.length; i++) {
    const screen = standardScreens[i]
    if (screen.diagonalInches <= imageDiagonal) {
      closestSmaller = screen
    }
    if (screen.diagonalInches > imageDiagonal && closestLarger === null) {
      closestLarger = screen
    }
  }
  
  if (closestSmaller) {
    const fillRatio = imageDiagonal / closestSmaller.diagonalInches
    if (fillRatio >= 0.95) {
      recommendedScreen = closestSmaller
    }
  }
  
  const canFill = recommendedScreen !== null
  
  let fillPercentage = 0
  if (closestSmaller) {
    fillPercentage = Math.min(100, (imageDiagonal / closestSmaller.diagonalInches) * 100)
  }
  
  return {
    recommendedScreen,
    canFill,
    fillPercentage,
    availableScreens: standardScreens,
    closestLarger,
    closestSmaller
  }
}

export function getScreenByName(name: string): ScreenSize | undefined {
  return standardScreens.find(s => s.name === name)
}

export function formatScreenInfo(screen: ScreenSize): string {
  return `${screen.name} (${(screen.width * 100).toFixed(0)} × ${(screen.height * 100).toFixed(0)} cm)`
}

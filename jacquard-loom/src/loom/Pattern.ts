import type { PatternData } from '../types'

function createLetterJ(size: number = 32): boolean[][] {
  const data: boolean[][] = []
  const center = size / 2
  const thickness = Math.max(4, Math.floor(size / 6))
  const topBarHeight = Math.floor(size / 5)
  const tailWidth = Math.floor(size / 3)

  for (let y = 0; y < size; y++) {
    const row: boolean[] = []
    for (let x = 0; x < size; x++) {
      let pixel = false
      const distFromCenter = Math.abs(x - center)

      if (y < topBarHeight) {
        pixel = distFromCenter < tailWidth
      }
      else if (y < size - topBarHeight) {
        pixel = x > center - thickness / 2 && x < center + thickness / 2
      }
      else {
        pixel = x > center - tailWidth && x < center + thickness / 2
      }

      row.push(pixel)
    }
    data.push(row)
  }

  return data
}

function createBorder(size: number = 32, padding: number = 2): boolean[][] {
  const data: boolean[][] = []
  for (let y = 0; y < size; y++) {
    const row: boolean[] = []
    for (let x = 0; x < size; x++) {
      const isBorder =
        x < padding ||
        x >= size - padding ||
        y < padding ||
        y >= size - padding
      row.push(isBorder)
    }
    data.push(row)
  }
  return data
}

function combinePatterns(a: boolean[][], b: boolean[][]): boolean[][] {
  const height = a.length
  const width = a[0].length
  const result: boolean[][] = []
  for (let y = 0; y < height; y++) {
    const row: boolean[] = []
    for (let x = 0; x < width; x++) {
      row.push(a[y][x] || b[y][x])
    }
    result.push(row)
  }
  return result
}

const letterJ = createLetterJ(32)
const border = createBorder(32, 1)

export const PATTERN_DATA: PatternData = {
  name: 'Letter J with Border',
  width: 32,
  height: 32,
  data: combinePatterns(letterJ, border),
}

export function getRowPattern(rowIndex: number, warpCount: number): boolean[] {
  if (rowIndex < 0 || rowIndex >= PATTERN_DATA.height) {
    return new Array(warpCount).fill(false)
  }

  const patternRow = PATTERN_DATA.data[rowIndex]
  const result: boolean[] = new Array(warpCount).fill(false)

  const patternWidth = PATTERN_DATA.width
  const scaleX = warpCount / patternWidth

  for (let w = 0; w < warpCount; w++) {
    const patternX = Math.min(
      Math.floor(w / scaleX),
      patternWidth - 1
    )
    result[w] = !patternRow[patternX]
  }

  return result
}

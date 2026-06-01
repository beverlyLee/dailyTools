export interface Cell {
  moisture: number
  moss: number
  spore: boolean
  height: number
}

export class GrowthSystem {
  width: number
  height: number
  grid: Cell[][]
  nextGrid: Cell[][]

  moistureDiffusionRate: number = 0.25
  gravityFlowRate: number = 0.4
  mossGrowthRate: number = 0.04
  mossSpreadChance: number = 0.8
  moistureEvaporation: number = 0.001
  mossSpreadThreshold: number = 0.05

  private heightMap: number[][]

  constructor(width: number, height: number, heightMap: number[][]) {
    this.width = width
    this.height = height
    this.heightMap = heightMap
    this.grid = []
    this.nextGrid = []

    this.initGrid()
    this.initMoisture()
  }

  initGrid() {
    this.grid = []
    this.nextGrid = []
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = []
      this.nextGrid[y] = []
      for (let x = 0; x < this.width; x++) {
        const h = this.heightMap[y][x]
        this.grid[y][x] = {
          moisture: 0,
          moss: 0,
          spore: Math.random() < 0.08,
          height: h
        }
        this.nextGrid[y][x] = { ...this.grid[y][x] }
      }
    }
  }

  initMoisture() {
    const w = this.width
    const h = this.height
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = this.grid[y][x]
        if (cell.height < 0.4) {
          cell.moisture = 0.6 + (0.4 - cell.height) * 0.8
        }
      }
    }
    for (let dy = 0; dy < h; dy++) {
      for (let dx of [0, w - 1]) {
        this.grid[dy][dx].moisture = Math.max(this.grid[dy][dx].moisture, 0.5)
      }
    }
    for (let dx = 0; dx < w; dx++) {
      for (let dy of [0, h - 1]) {
        this.grid[dy][dx].moisture = Math.max(this.grid[dy][dx].moisture, 0.5)
      }
    }
  }

  getNeighbors(x: number, y: number): { x: number; y: number }[] {
    const neighbors: { x: number; y: number }[] = []
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          neighbors.push({ x: nx, y: ny })
        }
      }
    }
    return neighbors
  }

  diffuseMoisture() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x]
        const neighbors = this.getNeighbors(x, y)

        let flowIn = 0
        let flowOut = 0

        for (const n of neighbors) {
          const neighbor = this.grid[n.y][n.x]
          const heightDiff = cell.height - neighbor.height

          if (heightDiff > 0) {
            flowOut += cell.moisture * this.gravityFlowRate * heightDiff * 0.5
          } else {
            flowIn += neighbor.moisture * this.gravityFlowRate * Math.abs(heightDiff) * 0.5
          }
        }

        let diffusionDelta = 0
        for (const n of neighbors) {
          const neighbor = this.grid[n.y][n.x]
          diffusionDelta += (neighbor.moisture - cell.moisture) * this.moistureDiffusionRate / neighbors.length
        }

        let newMoisture = cell.moisture + diffusionDelta - flowOut + flowIn
        newMoisture = Math.max(0, newMoisture - this.moistureEvaporation)
        newMoisture = Math.min(1, newMoisture)
        this.nextGrid[y][x].moisture = newMoisture
      }
    }
  }

  growMoss() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.nextGrid[y][x]

        const darkness = 1.0 - cell.height * 0.7
        const growthCondition = cell.moisture * darkness

        if (cell.spore && cell.moss === 0) {
          if (growthCondition > 0.05 || cell.moisture > 0.1) {
            cell.moss = this.mossGrowthRate * 2
            cell.spore = false
          }
        }

        if (cell.moss > 0 && cell.moss < 1) {
          cell.moss = Math.min(1, cell.moss + this.mossGrowthRate * (0.5 + growthCondition))
        }

        if (cell.moss > this.mossSpreadThreshold) {
          const neighbors = this.getNeighbors(x, y)
          for (const n of neighbors) {
            const neighbor = this.nextGrid[n.y][n.x]
            if (neighbor.moss === 0 && !neighbor.spore) {
              const moistureFactor = Math.max(neighbor.moisture, 0.15)
              const spreadProbability = this.mossSpreadChance * cell.moss * moistureFactor * 0.4
              if (Math.random() < spreadProbability) {
                neighbor.spore = true
              }
            }
          }
        }
      }
    }
  }

  update() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.nextGrid[y][x] = {
          moisture: this.grid[y][x].moisture,
          moss: this.grid[y][x].moss,
          spore: this.grid[y][x].spore,
          height: this.grid[y][x].height
        }
      }
    }

    this.diffuseMoisture()
    this.growMoss()

    const temp = this.grid
    this.grid = this.nextGrid
    this.nextGrid = temp
  }

  getMossColor(x: number, y: number): { r: number; g: number; b: number } {
    const cell = this.grid[y][x]
    const darkness = 1.0 - cell.height * 0.5
    const baseGray = (80 + cell.height * 60) * darkness

    if (cell.moss > 0) {
      const m = Math.min(cell.moss, 1)
      const targetR = 25
      const targetG = 195
      const targetB = 45

      const r = baseGray * (1 - m) + targetR * m
      const g = baseGray * (1 - m) + targetG * m
      const b = baseGray * (1 - m) + targetB * m
      return { r, g, b }
    }

    return { r: baseGray, g: baseGray, b: baseGray }
  }

  getMossCoverage(): number {
    let total = 0
    let mossy = 0
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        total++
        if (this.grid[y][x].moss > 0.1) {
          mossy++
        }
      }
    }
    return mossy / total
  }

  reset() {
    this.initGrid()
    this.initMoisture()
  }
}

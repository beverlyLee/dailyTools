export class SeededRandom {
  private seed: number

  constructor(seed: number | string = 42) {
    if (typeof seed === 'string') {
      this.seed = this.hashString(seed)
    } else {
      this.seed = seed >>> 0
    }
  }

  private hashString(str: string): number {
    let hash = 2166136261
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i)
      hash = (hash * 16777619) >>> 0
    }
    return hash >>> 0
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0
    return this.seed / 0xffffffff
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  reset(seed: number | string = 42): void {
    if (typeof seed === 'string') {
      this.seed = this.hashString(seed)
    } else {
      this.seed = seed >>> 0
    }
  }
}

export function createSeededRandom(seed: number | string): () => number {
  const rng = new SeededRandom(seed)
  return () => rng.next()
}

export interface WallPoint {
  id: string
  x: number
  z: number
}

export interface Wall {
  id: string
  from: WallPoint
  to: WallPoint
  height: number
  thickness: number
}

export type FurnitureType = 'sofa' | 'bed' | 'table' | 'chair'

export interface FurnitureItem {
  id: string
  type: FurnitureType
  position: [number, number, number]
  rotationY: number
}

export const WALL_HEIGHT = 2.4
export const WALL_THICKNESS = 0.15

export const FURNITURE_CATALOG: Record<
  FurnitureType,
  {
    label: string
    color: string
    size: [number, number, number]
    modelPath: string
  }
> = {
  sofa: { label: '沙发', color: '#8B5E3C', size: [1.8, 0.8, 0.9], modelPath: '/models/sofa.glb' },
  bed: { label: '床', color: '#C4A77D', size: [2.0, 0.5, 1.5], modelPath: '/models/bed.glb' },
  table: { label: '桌子', color: '#5C4033', size: [1.2, 0.75, 1.2], modelPath: '/models/table.glb' },
  chair: { label: '椅子', color: '#6B8E23', size: [0.5, 0.9, 0.5], modelPath: '/models/chair.glb' },
}

export function computeAABB(item: FurnitureItem): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const cat = FURNITURE_CATALOG[item.type]
  const [w, , d] = cat.size
  const maxDim = Math.max(w, d)
  const half = maxDim / 2
  return {
    minX: item.position[0] - half,
    maxX: item.position[0] + half,
    minZ: item.position[2] - half,
    maxZ: item.position[2] + half,
  }
}

export function checkOverlap(a: FurnitureItem, b: FurnitureItem): boolean {
  const aa = computeAABB(a)
  const bb = computeAABB(b)
  return !(
    aa.maxX < bb.minX ||
    aa.minX > bb.maxX ||
    aa.maxZ < bb.minZ ||
    aa.minZ > bb.maxZ
  )
}

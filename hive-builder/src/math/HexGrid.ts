import { scaleLinear } from 'd3-scale';

export interface CubeCoord {
  q: number;
  r: number;
  s: number;
}

export interface HexCellData {
  coord: CubeCoord;
  position: { x: number; y: number };
  layer: number;
}

const HEX_DIRECTIONS: CubeCoord[] = [
  { q: 1, r: 0, s: -1 },
  { q: 1, r: -1, s: 0 },
  { q: 0, r: -1, s: 1 },
  { q: -1, r: 0, s: 1 },
  { q: -1, r: 1, s: 0 },
  { q: 0, r: 1, s: -1 },
];

export const HEX_SIZE = 1;

function cubeToPixel(coord: CubeCoord, size: number = HEX_SIZE): { x: number; y: number } {
  const x = size * (3 / 2 * coord.q);
  const y = size * (Math.sqrt(3) / 2 * coord.q + Math.sqrt(3) * coord.r);
  return { x, y };
}

function cubeNeighbor(coord: CubeCoord, direction: number): CubeCoord {
  return { q: coord.q + HEX_DIRECTIONS[direction].q, r: coord.r + HEX_DIRECTIONS[direction].r, s: coord.s + HEX_DIRECTIONS[direction].s };
}

function coordKey(coord: CubeCoord): string {
  return `${coord.q},${coord.r},${coord.s}`;
}

export function generateHexGridBFS(maxRadius: number): HexCellData[] {
  const cells: HexCellData[] = [];
  const visited = new Set<string>();
  const queue: { coord: CubeCoord; layer: number }[] = [];

  const center: CubeCoord = { q: 0, r: 0, s: 0 };
  queue.push({ coord: center, layer: 0 });
  visited.add(coordKey(center));

  while (queue.length > 0) {
    const { coord, layer } = queue.shift()!;
    
    if (layer > maxRadius) continue;

    const position = cubeToPixel(coord);
    cells.push({ coord, position, layer });

    if (layer < maxRadius) {
      for (let i = 0; i < 6; i++) {
        const neighbor = cubeNeighbor(coord, i);
        const key = coordKey(neighbor);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ coord: neighbor, layer: layer + 1 });
        }
      }
    }
  }

  cells.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer;
    if (a.coord.q !== b.coord.q) return a.coord.q - b.coord.q;
    if (a.coord.r !== b.coord.r) return a.coord.r - b.coord.r;
    return a.coord.s - b.coord.s;
  });

  return cells;
}

export function createScale(domain: [number, number], range: [number, number]) {
  return scaleLinear().domain(domain).range(range);
}

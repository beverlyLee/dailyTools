export interface StarData {
  id: string;
  name: string;
  ra: number;
  dec: number;
  mag: number;
}

export interface ConstellationData {
  name: string;
  chineseName: string;
  color: string;
  stars: StarData[];
  lines: string[][];
}

export interface StarsDatabase {
  version: string;
  description: string;
  threshold: number;
  constellations: Record<string, ConstellationData>;
}

export interface Star3D {
  id: string;
  name: string;
  position: [number, number, number];
  ra: number;
  dec: number;
  mag: number;
  color: string;
  constellation: string;
}

export interface LineSegment3D {
  a: Star3D;
  b: Star3D;
  color: string;
  isDynamic: boolean;
}

const DEG_TO_RAD = Math.PI / 180;
const HOURS_TO_RAD = (Math.PI * 2) / 24;

export function computeLST(date: Date, longitudeDeg: number): number {
  const jd = date.getTime() / 86400000.0 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  gmst = ((gmst % 360) + 360) % 360;
  let lst = gmst + longitudeDeg;
  lst = ((lst % 360) + 360) % 360;
  return lst / 15.0;
}

export function raDecToCartesian(
  ra: number,
  dec: number,
  radius: number = 10,
  lstHours: number = 0
): [number, number, number] {
  const haRad = (ra - lstHours) * HOURS_TO_RAD;
  const decRad = dec * DEG_TO_RAD;
  const x = radius * Math.cos(decRad) * Math.sin(haRad);
  const y = radius * Math.sin(decRad);
  const z = -radius * Math.cos(decRad) * Math.cos(haRad);
  return [x, y, z];
}

export function angularDistance(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number
): number {
  const dra = (ra2 - ra1) * HOURS_TO_RAD;
  const d1 = dec1 * DEG_TO_RAD;
  const d2 = dec2 * DEG_TO_RAD;
  const cosAngle =
    Math.sin(d1) * Math.sin(d2) +
    Math.cos(d1) * Math.cos(d2) * Math.cos(dra);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

export function cartesianAngularDistance(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const magA = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  const magB = Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2]);
  return Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB)))) * (180 / Math.PI);
}

export function magToSize(mag: number): number {
  const normalized = Math.max(0, (6 - mag) / 6);
  return 0.05 + normalized * 0.12;
}

export function magToOpacity(mag: number): number {
  const normalized = Math.max(0, (6 - mag) / 6);
  return 0.4 + normalized * 0.6;
}

export function getStarColor(constellationColor: string, mag: number): string {
  return constellationColor;
}

export function extractAllStars(
  db: StarsDatabase,
  lstHours: number = 0
): Star3D[] {
  const stars: Star3D[] = [];
  for (const [key, constellation] of Object.entries(db.constellations)) {
    for (const star of constellation.stars) {
      const pos = raDecToCartesian(star.ra, star.dec, 10, lstHours);
      stars.push({
        id: star.id,
        name: star.name,
        position: pos,
        ra: star.ra,
        dec: star.dec,
        mag: star.mag,
        color: constellation.color,
        constellation: key,
      });
    }
  }
  return stars;
}

export function getConstellationLines(
  db: StarsDatabase,
  lstHours: number = 0
): LineSegment3D[] {
  const starMap = new Map<string, Star3D>();
  const allStars = extractAllStars(db, lstHours);
  for (const star of allStars) {
    starMap.set(star.id, star);
  }

  const lines: LineSegment3D[] = [];
  for (const constellation of Object.values(db.constellations)) {
    for (const line of constellation.lines) {
      if (line.length >= 2) {
        const [idA, idB] = line;
        const a = starMap.get(idA);
        const b = starMap.get(idB);
        if (a && b) {
          lines.push({ a, b, color: constellation.color, isDynamic: false });
        }
      }
    }
  }
  return lines;
}

export function getDynamicLines(
  db: StarsDatabase,
  thresholdDeg: number = 35,
  lstHours: number = 0
): LineSegment3D[] {
  const allStars = extractAllStars(db, lstHours);
  const starMap = new Map<string, Star3D>();
  for (const star of allStars) {
    starMap.set(star.id, star);
  }

  const preDefined = getConstellationLines(db, lstHours);
  const seenPairs = new Set<string>();
  for (const line of preDefined) {
    const key = [line.a.id, line.b.id].sort().join('-');
    seenPairs.add(key);
  }

  const dynamicLines: LineSegment3D[] = [...preDefined];

  for (let i = 0; i < allStars.length; i++) {
    for (let j = i + 1; j < allStars.length; j++) {
      const a = allStars[i];
      const b = allStars[j];
      const key = [a.id, b.id].sort().join('-');
      if (seenPairs.has(key)) continue;

      const angDist = angularDistance(a.ra, a.dec, b.ra, b.dec);
      if (angDist < thresholdDeg) {
        const mixColor = interpolateColor(a.color, b.color, 0.5);
        dynamicLines.push({ a, b, color: mixColor, isDynamic: true });
        seenPairs.add(key);
      }
    }
  }

  return dynamicLines;
}

export function euclideanDistance3D(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function filterStarsByMagnitude(
  stars: Star3D[],
  maxMag: number = 5
): Star3D[] {
  return stars.filter((s) => s.mag <= maxMag);
}

export function interpolateColor(
  color1: string,
  color2: string,
  t: number
): string {
  const hex = (c: string) => parseInt(c.slice(1), 16);
  const r1 = (hex(color1) >> 16) & 0xff;
  const g1 = (hex(color1) >> 8) & 0xff;
  const b1 = hex(color1) & 0xff;
  const r2 = (hex(color2) >> 16) & 0xff;
  const g2 = (hex(color2) >> 8) & 0xff;
  const b2 = hex(color2) & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

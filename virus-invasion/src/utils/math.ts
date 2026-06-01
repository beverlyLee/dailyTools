import * as THREE from 'three';

export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export const easeInCubic = (t: number): number => {
  return t * t * t;
};

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const randomPointOnSphere = (radius: number): THREE.Vector3 => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
};

export const simplexNoise3D = (x: number, y: number, z: number, scale: number = 1): number => {
  const X = Math.floor(x * scale) & 255;
  const Y = Math.floor(y * scale) & 255;
  const Z = Math.floor(z * scale) & 255;
  x -= Math.floor(x * scale);
  y -= Math.floor(y * scale);
  z -= Math.floor(z * scale);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = p[X] + Y;
  const AA = p[A] + Z;
  const AB = p[A + 1] + Z;
  const B = p[X + 1] + Y;
  const BA = p[B] + Z;
  const BB = p[B + 1] + Z;
  return lerp(
    w,
    lerp(
      v,
      lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
      lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
    ),
    lerp(
      v,
      lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
      lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))
    )
  );
};

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (t: number, a: number, b: number): number => a + t * (b - a);
const grad = (hash: number, x: number, y: number, z: number): number => {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
};

const p = new Array(512);
for (let i = 0; i < 256; i++) {
  p[256 + i] = p[i] = Math.floor(Math.random() * 256);
}

export interface DeformationPoint {
  position: THREE.Vector3;
  radius: number;
  depth: number;
  strength: number;
}

interface DeformationContribution {
  displacement: number;
  weight: number;
  point: DeformationPoint;
}

export const calculateVertexDisplacement = (
  vertex: THREE.Vector3,
  originalVertex: THREE.Vector3,
  deformationPoints: DeformationPoint[],
  cellRadius: number
): THREE.Vector3 => {
  const normal = originalVertex.clone().normalize();
  
  if (deformationPoints.length === 0) {
    return originalVertex.clone();
  }

  const contributions: DeformationContribution[] = [];
  let maxDisplacement = 0;

  for (const point of deformationPoints) {
    const dist = vertex.distanceTo(point.position);
    if (dist < point.radius && point.strength > 0.001) {
      const factor = 1 - dist / point.radius;
      const smoothFactor = easeOutCubic(factor);
      const displacement = smoothFactor * point.depth * point.strength;
      const weight = smoothFactor * point.strength;
      
      contributions.push({ displacement, weight, point });
      
      if (displacement > maxDisplacement) {
        maxDisplacement = displacement;
      }
    }
  }

  if (contributions.length === 0) {
    return originalVertex.clone();
  }

  let totalDisplacement: number;
  
  if (contributions.length === 1) {
    totalDisplacement = contributions[0].displacement;
  } else {
    const totalWeight = contributions.reduce((sum, c) => sum + c.weight, 0);
    const weightedAverage = contributions.reduce((sum, c) => sum + c.displacement * c.weight, 0) / totalWeight;
    
    const maxContribution = contributions.reduce((max, c) => 
      c.displacement > max.displacement ? c : max, contributions[0]);
    
    const blendFactor = clamp(maxContribution.weight / totalWeight, 0.3, 0.7);
    totalDisplacement = maxDisplacement * blendFactor + weightedAverage * (1 - blendFactor);
    
    const overlapReduction = 1 - Math.pow(1 - 1 / contributions.length, 2);
    totalDisplacement *= (1 - overlapReduction * 0.25);
  }

  const maxAllowedDisplacement = cellRadius * 0.6;
  totalDisplacement = clamp(totalDisplacement, 0, maxAllowedDisplacement);

  return originalVertex.clone().sub(normal.multiplyScalar(totalDisplacement));
};

export const mergeDeformationPoints = (
  points: DeformationPoint[],
  mergeThreshold: number = 0.8
): DeformationPoint[] => {
  if (points.length <= 1) return points;

  const merged: DeformationPoint[] = [];
  const used = new Set<number>();

  for (let i = 0; i < points.length; i++) {
    if (used.has(i)) continue;
    
    const p1 = points[i];
    const cluster: DeformationPoint[] = [p1];
    used.add(i);

    for (let j = i + 1; j < points.length; j++) {
      if (used.has(j)) continue;
      
      const p2 = points[j];
      const dist = p1.position.distanceTo(p2.position);
      const overlapRadius = Math.min(p1.radius, p2.radius) * mergeThreshold;
      
      if (dist < overlapRadius) {
        cluster.push(p2);
        used.add(j);
      }
    }

    if (cluster.length === 1) {
      merged.push(p1);
    } else {
      let totalStrength = 0;
      let weightedPos = new THREE.Vector3(0, 0, 0);
      let maxDepth = 0;
      let maxRadius = 0;

      for (const p of cluster) {
        totalStrength += p.strength;
        weightedPos.add(p.position.clone().multiplyScalar(p.strength));
        maxDepth = Math.max(maxDepth, p.depth);
        maxRadius = Math.max(maxRadius, p.radius);
      }

      weightedPos.divideScalar(totalStrength);
      
      const combinedStrength = Math.min(totalStrength, 1.5);
      const combinedDepth = maxDepth * (1 + (cluster.length - 1) * 0.15);
      const combinedRadius = maxRadius * (1 + (cluster.length - 1) * 0.1);

      merged.push({
        position: weightedPos,
        radius: combinedRadius,
        depth: combinedDepth,
        strength: combinedStrength,
      });
    }
  }

  return merged;
};

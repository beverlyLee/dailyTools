const materialTypeMap: Record<string, number> = {
  wood: 0,
  stone: 1,
  fabric: 2,
  metal: 3,
  concrete: 4,
  custom: 5
};

function hash(p: [number, number]): number {
  return Math.abs(Math.sin(p[0] * 127.1 + p[1] * 311.7) * 43758.5453) % 1;
}

function noise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash([ix, iy]);
  const b = hash([ix + 1, iy]);
  const c = hash([ix, iy + 1]);
  const d = hash([ix + 1, iy + 1]);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function fbm(x: number, y: number, octaves: number = 6): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ] : [0.5, 0.5, 0.5];
}

function woodGrain(u: number, v: number): number {
  const baseWarp = fbm(u * 2, v * 2, 4) * 0.3;
  const y = v * 12 + baseWarp * 3;
  const primaryGrain = Math.pow(Math.sin(y * 1.5 + fbm(u * 2.5, v * 2.5, 4) * 2) * 0.5 + 0.5, 1.5);
  const secondaryGrain = Math.pow(Math.sin(y * 4 + fbm(u * 6, v * 6, 4) * 1.5) * 0.5 + 0.5, 2) * 0.4;
  let grain = primaryGrain * 0.7 + secondaryGrain * 0.3;
  grain += fbm(u * 40, v * 0.5, 4) * 0.15;
  grain += fbm(u * 80, v * 80, 4) * 0.1;
  return Math.max(0, Math.min(1, grain));
}

function woodKnots(u: number, v: number): { knots: number; mask: number } {
  const warpX = fbm(u * 1.5, v * 1.5 + 5, 4) * 0.2;
  const warpY = fbm(u * 1.5 + 5, v * 1.5, 4) * 0.2;
  const du = u + warpX;
  const dv = v + warpY;
  
  const scale = 3;
  const iu = Math.floor(du * scale);
  const iv = Math.floor(dv * scale);
  const fu = du * scale - iu;
  const fv = dv * scale - iv;
  
  let minDist = 1;
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      const px = hash([iu + x, iv + y]);
      const py = hash([iu + x + 100, iv + y + 100]);
      const dx = x + px - fu;
      const dy = y + py - fv;
      const dist = Math.sqrt(dx * dx + dy * dy);
      minDist = Math.min(minDist, dist);
    }
  }
  
  const knotCenters = minDist < 0.15 ? 1 : 0;
  const knotRings = (Math.sin(minDist * 30) * 0.5 + 0.5) * knotCenters;
  const darkKnots = (minDist < 0.2 ? 1 - minDist / 0.2 : 0) * 0.6;
  
  return {
    knots: knotRings * 0.4 + darkKnots,
    mask: knotCenters
  };
}

function marbleVeins(u: number, v: number): number {
  const warp1 = fbm(u * 1.5 * 2.5, v * 1.5 * 2.5, 5) * 0.8;
  const warp2 = fbm((u + 0.5) * 3 * 2.5, (v + 0.5) * 3 * 2.5, 5) * 0.4;
  const wu = u * 2.5 + warp1;
  const wv = v * 2.5 + warp2 * 0.5;
  
  const mainVein = Math.pow(Math.sin(wu * 2.5 + wv * 0.5) * 0.5 + 0.5, 4);
  const secVein1 = Math.pow(Math.sin(wu * 6 + wv * 1.5 + fbm(u * 4 * 2.5, v * 4 * 2.5, 4) * 2) * 0.5 + 0.5, 6) * 0.6;
  const secVein2 = Math.pow(Math.sin(wu * 12 + wv * 3 + fbm(u * 8 * 2.5, v * 8 * 2.5, 4) * 3) * 0.5 + 0.5, 8) * 0.3;
  
  const crackNoise = fbm(u * 20 * 2.5, v * 20 * 2.5, 4);
  const cracks = crackNoise > 0.55 && crackNoise < 0.65 ? (crackNoise - 0.55) / 0.1 * 0.2 : 0;
  
  return Math.max(0, Math.min(1, mainVein + secVein1 + secVein2 + cracks));
}

function carpetFiber(u: number, v: number): number {
  const dirNoise = fbm(u * 3, v * 3, 4) * Math.PI;
  const cosDir = Math.cos(dirNoise);
  const sinDir = Math.sin(dirNoise);
  
  const su = (u * cosDir - v * sinDir) * 80;
  const sv = (u * sinDir + v * cosDir) * 80;
  
  const fiberLines = Math.pow(Math.sin(su + fbm(u * 20, v * 20, 4) * 5) * 0.5 + 0.5, 2);
  
  let fiber = fiberLines * 0.4;
  fiber += fbm(u * 60, v * 60, 4) * 0.3;
  fiber += fbm(u * 120, v * 120, 4) * 0.2;
  fiber += fbm(u * 250, v * 250, 3) * 0.1;
  
  const clumps = Math.pow(fbm(u * 10, v * 10, 4), 2);
  fiber += clumps * 0.15;
  
  const tuft = Math.pow(Math.sin(u * 30) * Math.sin(v * 30) * 0.5 + 0.5, 4);
  fiber += tuft * 0.1;
  
  return Math.max(0, Math.min(1, fiber));
}

function brushedMetal(u: number, v: number): number {
  let brush = Math.pow(fbm(u * 30, v * 0.3, 5), 1.5) * 0.6;
  brush += fbm(u * 100, v * 1, 4) * 0.25;
  brush += fbm(u * 300, v * 2, 3) * 0.15;
  
  const scratches = Math.pow(fbm(u * 500, v * 10, 3), 4) * 0.1;
  brush += scratches;
  
  brush += fbm(u * 20, v * 20, 4) * 0.1;
  
  return Math.max(0, Math.min(1, brush));
}

function concreteTexture(u: number, v: number): number {
  let concrete = 0;
  concrete += fbm(u * 3, v * 3, 5) * 0.35;
  concrete += fbm(u * 8, v * 8, 5) * 0.25;
  concrete += fbm(u * 20, v * 20, 5) * 0.2;
  concrete += fbm(u * 50, v * 50, 4) * 0.15;
  concrete += fbm(u * 120, v * 120, 4) * 0.1;
  concrete += fbm(u * 300, v * 300, 3) * 0.05;
  return Math.max(0, Math.min(1, concrete));
}

export function generateMaterialThumbnail(
  category: string,
  color: string,
  width: number = 128,
  height: number = 128
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const baseColor = hexToRgb(color);
  const type = materialTypeMap[category] ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width * 4;
      const v = y / height * 4;
      let r = baseColor[0];
      let g = baseColor[1];
      let b = baseColor[2];

      if (type === 0) {
        const grain = woodGrain(u, v);
        const { knots, mask } = woodKnots(u, v);
        
        const lightWood = [baseColor[0] * 1.25, baseColor[1] * 1.25, baseColor[2] * 1.25];
        const darkWood = [baseColor[0] * 0.65, baseColor[1] * 0.65, baseColor[2] * 0.65];
        const veryDark = [baseColor[0] * 0.4, baseColor[1] * 0.4, baseColor[2] * 0.4];
        
        r = darkWood[0] + (baseColor[0] - darkWood[0]) * grain * 0.7;
        g = darkWood[1] + (baseColor[1] - darkWood[1]) * grain * 0.7;
        b = darkWood[2] + (baseColor[2] - darkWood[2]) * grain * 0.7;
        
        if (grain > 0.4) {
          const t = (grain - 0.4) / 0.5;
          r += (lightWood[0] - r) * t * 0.6;
          g += (lightWood[1] - g) * t * 0.6;
          b += (lightWood[2] - b) * t * 0.6;
        }
        
        const knotColor = [veryDark[0] + (darkWood[0] - veryDark[0]) * knots,
                          veryDark[1] + (darkWood[1] - veryDark[1]) * knots,
                          veryDark[2] + (darkWood[2] - veryDark[2]) * knots];
        r = r + (knotColor[0] - r) * mask * 0.8;
        g = g + (knotColor[1] - g) * mask * 0.8;
        b = b + (knotColor[2] - b) * mask * 0.8;
      }
      else if (type === 1) {
        const veins = marbleVeins(u, v);
        const darkVein = [baseColor[0] * 0.4, baseColor[1] * 0.4, baseColor[2] * 0.4];
        const midVein = [baseColor[0] * 0.65, baseColor[1] * 0.65, baseColor[2] * 0.65];
        
        if (veins > 0.1 && veins < 0.4) {
          const t = (veins - 0.1) / 0.3;
          r = baseColor[0] + (midVein[0] - baseColor[0]) * t * 0.5;
          g = baseColor[1] + (midVein[1] - baseColor[1]) * t * 0.5;
          b = baseColor[2] + (midVein[2] - baseColor[2]) * t * 0.5;
        } else if (veins >= 0.5) {
          const t = Math.min(1, (veins - 0.5) / 0.4);
          r = baseColor[0] + (darkVein[0] - baseColor[0]) * t * 0.8;
          g = baseColor[1] + (darkVein[1] - baseColor[1]) * t * 0.8;
          b = baseColor[2] + (darkVein[2] - baseColor[2]) * t * 0.8;
        }
        
        const sparkle = Math.pow(fbm(u * 60, v * 60, 3), 3) * 0.15;
        r += sparkle;
        g += sparkle;
        b += sparkle;
      }
      else if (type === 2) {
        const fiber = carpetFiber(u, v);
        const darkRoot = [baseColor[0] * 0.7, baseColor[1] * 0.7, baseColor[2] * 0.7];
        const lightTip = [baseColor[0] * 1.2, baseColor[1] * 1.2, baseColor[2] * 1.2];
        
        if (fiber < 0.2) {
          const t = fiber / 0.2;
          r = darkRoot[0] + (baseColor[0] * 0.9 - darkRoot[0]) * t;
          g = darkRoot[1] + (baseColor[1] * 0.9 - darkRoot[1]) * t;
          b = darkRoot[2] + (baseColor[2] * 0.9 - darkRoot[2]) * t;
        } else if (fiber < 0.6) {
          const t = (fiber - 0.2) / 0.4;
          r = baseColor[0] * 0.9 + (baseColor[0] - baseColor[0] * 0.9) * t;
          g = baseColor[1] * 0.9 + (baseColor[1] - baseColor[1] * 0.9) * t;
          b = baseColor[2] * 0.9 + (baseColor[2] - baseColor[2] * 0.9) * t;
        } else {
          const t = Math.min(1, (fiber - 0.6) / 0.35);
          r = baseColor[0] + (lightTip[0] - baseColor[0]) * t * 0.6;
          g = baseColor[1] + (lightTip[1] - baseColor[1]) * t * 0.6;
          b = baseColor[2] + (lightTip[2] - baseColor[2]) * t * 0.6;
        }
        
        const shadowNoise = fbm(u * 15, v * 15, 3);
        const shadowFactor = 0.85 + shadowNoise * 0.3;
        r *= shadowFactor;
        g *= shadowFactor;
        b *= shadowFactor;
      }
      else if (type === 3) {
        const brush = brushedMetal(u, v);
        const darkMetal = [baseColor[0] * 0.75, baseColor[1] * 0.75, baseColor[2] * 0.75];
        const brightMetal = [baseColor[0] * 1.3, baseColor[1] * 1.3, baseColor[2] * 1.3];
        
        r = darkMetal[0] + (baseColor[0] - darkMetal[0]) * brush * 0.6;
        g = darkMetal[1] + (baseColor[1] - darkMetal[1]) * brush * 0.6;
        b = darkMetal[2] + (baseColor[2] - darkMetal[2]) * brush * 0.6;
        
        if (brush > 0.6) {
          const t = (brush - 0.6) / 0.35;
          r += (brightMetal[0] - r) * t * 0.5;
          g += (brightMetal[1] - g) * t * 0.5;
          b += (brightMetal[2] - b) * t * 0.5;
        }
      }
      else if (type === 4) {
        const tex = concreteTexture(u, v);
        const lightConc = [baseColor[0] * 1.15, baseColor[1] * 1.15, baseColor[2] * 1.15];
        const darkConc = [baseColor[0] * 0.8, baseColor[1] * 0.8, baseColor[2] * 0.8];
        
        r = darkConc[0] + (baseColor[0] - darkConc[0]) * tex * 0.5;
        g = darkConc[1] + (baseColor[1] - darkConc[1]) * tex * 0.5;
        b = darkConc[2] + (baseColor[2] - darkConc[2]) * tex * 0.5;
        
        if (tex > 0.5) {
          const t = (tex - 0.5) / 0.4;
          r += (lightConc[0] - r) * t * 0.4;
          g += (lightConc[1] - g) * t * 0.4;
          b += (lightConc[2] - b) * t * 0.4;
        }
        
        const aggregate = Math.pow(fbm(u * 40, v * 40, 3), 3) * 0.1;
        r += aggregate;
        g += aggregate;
        b += aggregate;
      }

      const idx = (y * width + x) * 4;
      data[idx] = Math.max(0, Math.min(255, r * 255));
      data[idx + 1] = Math.max(0, Math.min(255, g * 255));
      data[idx + 2] = Math.max(0, Math.min(255, b * 255));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

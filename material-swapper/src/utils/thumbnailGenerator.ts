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

function fbm2(x: number, y: number, octaves: number = 6): [number, number] {
  return [fbm(x, y, octaves), fbm(x + 5.2, y + 1.3, octaves)];
}

function voronoi(x: number, y: number, scale: number): number {
  const px = x * scale;
  const py = y * scale;
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const fx = px - ix;
  const fy = py - iy;
  let minDist = 1;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = hash([ix + dx, iy + dy]);
      const ny = hash([ix + dx + 100, iy + dy + 100]);
      const ddx = dx + nx - fx;
      const ddy = dy + ny - fy;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      minDist = Math.min(minDist, dist);
    }
  }
  return minDist;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
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
  const baseWarp = fbm(u * 1.5, v * 1.5, 5) * 0.4;
  const fineWarp = fbm(u * 6, v * 6, 5) * 0.15;
  const y = v * 10 + baseWarp * 4;
  const primaryGrain = Math.pow(Math.sin(y * 1.2 + fbm(u * 2, v * 2, 5) * 2.5) * 0.5 + 0.5, 1.2);
  const secondaryGrain = Math.pow(Math.sin(y * 3.5 + fineWarp * 6 + fbm(u * 5, v * 5, 5) * 2) * 0.5 + 0.5, 2.5) * 0.5;
  let grain = primaryGrain * 0.6 + secondaryGrain * 0.4;
  grain += fbm(u * 50, v * 0.3, 5) * 0.12;
  grain += fbm(u * 100, v * 100, 5) * 0.08;
  return Math.max(0, Math.min(1, grain));
}

function woodKnots(u: number, v: number): { knots: number; mask: number } {
  const [wx, wy] = fbm2(u * 1.2, v * 1.2, 5);
  const du = u + wx * 0.3;
  const dv = v + wy * 0.3;
  
  const vor = voronoi(du, dv, 2.5);
  let knotCenters = smoothstep(0, 0.2, vor);
  knotCenters = 1 - knotCenters;
  knotCenters = Math.pow(knotCenters, 1.5);
  
  let knotRings = Math.sin(vor * 25) * 0.5 + 0.5;
  knotRings *= knotCenters;
  knotRings = Math.pow(knotRings, 1.3);
  
  const darkKnots = smoothstep(0.25, 0, vor) * 0.8;
  
  return {
    knots: knotRings * 0.5 + darkKnots,
    mask: knotCenters
  };
}

function marbleVeins(u: number, v: number): number {
  const p = [u * 1.5, v * 1.5];
  
  const largeWarp = fbm(p[0] * 0.8, p[1] * 0.8, 5) * 2.0;
  const medWarp = fbm(p[0] * 2.0 + 3, p[1] * 2.0 + 3, 5) * 1.0;
  const smallWarp = fbm(p[0] * 4.0 + 7, p[1] * 4.0 + 7, 5) * 0.4;
  
  const flowDir = [1.0, 0.3];
  const warpedU = p[0] + flowDir[0] * largeWarp + medWarp;
  const warpedV = p[1] + flowDir[1] * largeWarp + smallWarp;
  
  const mainVein = Math.sin(warpedU * 1.2 + warpedV * 0.4 + fbm(p[0] * 0.6, p[1] * 0.6, 5) * 3.0) * 0.5 + 0.5;
  const mainVeinPow = smoothstep(0.3, 0.8, Math.pow(mainVein, 2.2));
  
  const secVein = Math.sin(warpedU * 3.5 + warpedV * 1.2 + fbm(p[0] * 1.5, p[1] * 1.5, 5) * 2.5 + 1.0) * 0.5 + 0.5;
  const secVeinPow = smoothstep(0.2, 0.9, Math.pow(secVein, 4.0) * 0.8) * 0.7;
  
  const fineVein = Math.sin(warpedU * 8.0 + warpedV * 3.0 + fbm(p[0] * 3.0, p[1] * 3.0, 5) * 2.0 + 2.5) * 0.5 + 0.5;
  const fineVeinPow = Math.pow(fineVein, 6.0) * 0.5;
  
  return Math.max(0, Math.min(1, mainVeinPow + secVeinPow + fineVeinPow));
}

function carpetFiber(u: number, v: number, plush: number = 0.5): number {
  const dirNoise = fbm(u * 1.5, v * 1.5, 5) * Math.PI * 2.0;
  const cosDir = Math.cos(dirNoise);
  const sinDir = Math.sin(dirNoise);
  
  const fiberScale = 80 - (plush * 30);
  
  const su = (u * cosDir - v * sinDir) * fiberScale;
  
  const fiberLines = Math.pow(
    Math.sin(su + fbm(u * 12, v * 12, 5) * 8.0) * 0.5 + 0.5,
    2.0 - plush * 0.5
  );
  
  let fiber = fiberLines * (0.3 + plush * 0.15);
  
  const n1 = 50 - plush * 15;
  const n2 = 100 - plush * 30;
  const n3 = 200 - plush * 60;
  const n4 = 400 - plush * 120;
  
  fiber += fbm(u * n1, v * n1, 5) * 0.25;
  fiber += fbm(u * n2, v * n2, 5) * 0.2;
  fiber += fbm(u * n3, v * n3, 4) * 0.15;
  fiber += fbm(u * n4, v * n4, 3) * 0.1;
  
  const clumpScale = 10 - plush * 3;
  const clumps = Math.pow(fbm(u * clumpScale, v * clumpScale, 5), 2);
  fiber += clumps * (0.15 + plush * 0.1);
  
  const tuftScale = 25 - plush * 7;
  const tuft = Math.pow(
    Math.sin(u * tuftScale + fbm(u * 4, v * 4, 5) * 4.0) * 
    Math.sin(v * tuftScale + fbm(u * 4 + 1, v * 4 + 1, 5) * 4.0) * 0.5 + 0.5, 
    3.0 - plush
  );
  fiber += tuft * (0.1 + plush * 0.1);
  
  return Math.max(0, Math.min(1, fiber));
}

function brushedMetal(u: number, v: number): number {
  const coarseBrush = Math.pow(fbm(u * 15, v * 0.15, 5), 1.1) * 0.5;
  const mainBrush = Math.pow(fbm(u * 40, v * 0.3, 6), 1.4) * 0.35;
  const fineBrush = Math.pow(fbm(u * 120, v * 0.8, 5), 1.8) * 0.2;
  const microBrush = Math.pow(fbm(u * 300, v * 2.0, 4), 2.5) * 0.12;
  
  let brush = coarseBrush + mainBrush + fineBrush + microBrush;
  
  const scratches = Math.pow(fbm(u * 500, v * 8, 3), 4.0) * 0.15;
  brush += scratches;
  
  brush += fbm(u * 15, v * 15, 4) * 0.06;
  
  return Math.max(0, Math.min(1, brush));
}

function concreteTexture(u: number, v: number): number {
  let concrete = 0;
  concrete += fbm(u * 2, v * 2, 6) * 0.4;
  concrete += fbm(u * 6, v * 6, 5) * 0.25;
  concrete += fbm(u * 15, v * 15, 5) * 0.2;
  concrete += fbm(u * 40, v * 40, 4) * 0.15;
  concrete += fbm(u * 100, v * 100, 4) * 0.1;
  concrete += fbm(u * 250, v * 250, 3) * 0.06;
  return Math.max(0, Math.min(1, concrete));
}

function concreteSpots(u: number, v: number): number {
  const vor = voronoi(u, v, 6);
  let spots = smoothstep(0, 0.35, 1 - vor);
  spots *= 0.35;
  
  const poreNoise = fbm(u * 80, v * 80, 4);
  const pores = smoothstep(0.55, 0.9, poreNoise);
  spots -= pores * 0.18;
  
  return spots;
}

function mixColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

function scaleColor(c: [number, number, number], s: number): [number, number, number] {
  return [c[0] * s, c[1] * s, c[2] * s];
}

function addColor(c: [number, number, number], v: number): [number, number, number] {
  return [Math.max(0, Math.min(1, c[0] + v)), 
          Math.max(0, Math.min(1, c[1] + v)), 
          Math.max(0, Math.min(1, c[2] + v))];
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

  const uvScale = 3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = (x / width) * uvScale;
      const v = (y / height) * uvScale;
      let r = baseColor[0];
      let g = baseColor[1];
      let b = baseColor[2];

      if (type === 0) {
        const grain = woodGrain(u, v);
        const { knots, mask } = woodKnots(u, v);
        
        const lightWood = scaleColor(baseColor, 1.35);
        const darkWood = scaleColor(baseColor, 0.55);
        const veryDark = scaleColor(baseColor, 0.3);
        
        let col = mixColor(darkWood, baseColor, grain * 0.6);
        const lightT = smoothstep(0.3, 0.95, grain) * 0.7;
        col = mixColor(col, lightWood, lightT);
        
        const ringVar = Math.sin(v * 15 + fbm(u * 4, v * 4, 5) * 4) * 0.5 + 0.5;
        const ringFactor = 0.85 + ringVar * 0.3;
        col = scaleColor(col, ringFactor);
        
        const knotColor = mixColor(veryDark, darkWood, knots);
        col = mixColor(col, knotColor, mask * 0.9);
        
        const poreNoise = fbm(u * 200, v * 200, 4);
        col = scaleColor(col, 0.92 + poreNoise * 0.16);
        
        r = col[0];
        g = col[1];
        b = col[2];
      }
      else if (type === 1) {
        const veins = marbleVeins(u, v);
        const lightVein = scaleColor(baseColor, 1.25);
        const mediumVein = scaleColor(baseColor, 0.7);
        const darkVein = scaleColor(baseColor, 0.35);
        
        let col = [...baseColor] as [number, number, number];
        
        const lightT = smoothstep(0.0, 0.15, veins) * 0.3;
        col = mixColor(col, lightVein, lightT);
        
        const midT = smoothstep(0.15, 0.45, veins) * 0.7;
        col = mixColor(col, mediumVein, midT);
        
        const darkT = smoothstep(0.5, 0.9, veins) * 0.95;
        col = mixColor(col, darkVein, darkT);
        
        const sparkle = Math.pow(fbm(u * 50, v * 50, 4), 3) * 0.15;
        col = addColor(col, sparkle);
        
        const surfVar = fbm(u * 6, v * 6, 5) * 0.04;
        col = addColor(col, surfVar);
        
        const micro = fbm(u * 100, v * 100, 4) * 0.06;
        col = scaleColor(col, 0.96 + micro);
        
        r = col[0];
        g = col[1];
        b = col[2];
      }
      else if (type === 2) {
        const plush = 0.5;
        const fiber = carpetFiber(u, v, plush);
        const darkRoot = scaleColor(baseColor, 0.7 - plush * 0.2);
        const baseFiber = scaleColor(baseColor, 0.9 - plush * 0.1);
        const lightTip = scaleColor(baseColor, 1.2 + plush * 0.15);
        
        let col = mixColor(darkRoot, baseFiber, smoothstep(0.1, 0.5, fiber));
        col = mixColor(col, lightTip, smoothstep(0.5, 0.95, fiber) * (0.5 + plush * 0.3));
        
        const colorVar = fbm(u * 3.5, v * 3.5, 5);
        const varColor = scaleColor(baseColor, (0.9 - plush * 0.1) + colorVar * (0.2 + plush * 0.2));
        col = mixColor(col, varColor, 0.3 + plush * 0.15);
        
        const shadowNoise = fbm(u * 10, v * 10, 5);
        col = scaleColor(col, (0.85 - plush * 0.1) + shadowNoise * (0.3 + plush * 0.2));
        
        const microShadows = fbm(u * (60 - plush * 15), v * (60 - plush * 15), 4) * (0.1 + plush * 0.05);
        col = addColor(col, -microShadows);
        
        const sheen = Math.pow(fiber, 3 + plush * 2) * (0.1 + plush * 0.1);
        col = addColor(col, sheen);
        
        r = col[0];
        g = col[1];
        b = col[2];
      }
      else if (type === 3) {
        const brush = brushedMetal(u, v);
        const darkMetal = scaleColor(baseColor, 0.6);
        const brightMetal = scaleColor(baseColor, 1.5);
        const highlightMetal = scaleColor(baseColor, 1.8);
        
        let col = mixColor(darkMetal, baseColor, brush * 0.5);
        col = mixColor(col, brightMetal, smoothstep(0.5, 0.85, brush) * 0.7);
        col = mixColor(col, highlightMetal, smoothstep(0.85, 1.0, brush) * 0.5);
        
        const grainDetail = fbm(u * 50, v * 50, 4) * 0.1;
        col = addColor(col, grainDetail);
        
        const microScratch = Math.pow(fbm(u * 400, v * 400, 3), 5) * 0.2;
        col = addColor(col, microScratch);
        
        const tarnish = fbm(u * 4, v * 4, 5) * 0.08;
        col = scaleColor(col, 0.92 + tarnish);
        
        r = col[0];
        g = col[1];
        b = col[2];
      }
      else if (type === 4) {
        const tex = concreteTexture(u, v);
        const spots = concreteSpots(u, v);
        const lightConc = scaleColor(baseColor, 1.2);
        const darkConc = scaleColor(baseColor, 0.75);
        const spotColor = scaleColor(baseColor, 0.6);
        
        let col = mixColor(darkConc, baseColor, tex * 0.45);
        col = mixColor(col, lightConc, smoothstep(0.45, 0.9, tex) * 0.5);
        
        col = mixColor(col, spotColor, Math.abs(spots) * 1.2);
        
        const aggregate = Math.pow(fbm(u * 35, v * 35, 4), 3) * 0.12;
        col = addColor(col, aggregate);
        
        const fineGrain = fbm(u * 180, v * 180, 3) * 0.06;
        col = addColor(col, fineGrain);
        
        const wearPattern = fbm(u * 1.5, v * 1.5, 5) * 0.06;
        col = addColor(col, wearPattern);
        
        r = col[0];
        g = col[1];
        b = col[2];
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

import { getPolygonBounds, getPolygonArea, createRectanglePolygon, sutherlandHodgman, pointInPolygon, getPolygonCentroid } from './polygonClipping.js';

const STANDARD_SIZES = [
  { name: '小方毯', width: 1.2, height: 1.2, shape: 'square' },
  { name: '中方毯', width: 1.6, height: 1.6, shape: 'square' },
  { name: '大方毯', width: 2.0, height: 2.0, shape: 'square' },
  { name: '超大方毯', width: 2.4, height: 2.4, shape: 'square' },
  { name: '小长毯', width: 1.2, height: 1.8, shape: 'rectangle' },
  { name: '中长毯', width: 1.6, height: 2.3, shape: 'rectangle' },
  { name: '大长毯', width: 2.0, height: 2.9, shape: 'rectangle' },
  { name: '超大长毯', width: 2.4, height: 3.4, shape: 'rectangle' },
  { name: '小圆毯', diameter: 1.2, shape: 'circle' },
  { name: '中圆毯', diameter: 1.6, shape: 'circle' },
  { name: '大圆毯', diameter: 2.0, shape: 'circle' },
  { name: '超大圆毯', diameter: 2.4, shape: 'circle' }
];

function createCarpetPolygon(size, centerX, centerY, rotation = 0) {
  if (size.shape === 'circle') {
    const radius = size.diameter / 2;
    const segments = 32;
    const polygon = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2 + rotation;
      polygon.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      });
    }
    return polygon;
  } else {
    return createRectanglePolygon(centerX, centerY, size.width, size.height, rotation);
  }
}

function findBestPosition(contourPolygon, size) {
  const bounds = getPolygonBounds(contourPolygon);
  const centroid = getPolygonCentroid(contourPolygon);
  
  let carpetWidth, carpetHeight;
  if (size.shape === 'circle') {
    carpetWidth = size.diameter;
    carpetHeight = size.diameter;
  } else {
    carpetWidth = size.width;
    carpetHeight = size.height;
  }
  
  const testPositions = [
    { x: centroid.x, y: centroid.y, rot: 0 }
  ];
  
  if (size.shape === 'rectangle' && size.width !== size.height) {
    testPositions.push({ x: centroid.x, y: centroid.y, rot: Math.PI / 2 });
  }
  
  if (carpetWidth < bounds.width) {
    testPositions.push({ x: bounds.minX + carpetWidth / 2, y: centroid.y, rot: 0 });
    testPositions.push({ x: bounds.maxX - carpetWidth / 2, y: centroid.y, rot: 0 });
  }
  if (carpetHeight < bounds.height) {
    testPositions.push({ x: centroid.x, y: bounds.minY + carpetHeight / 2, rot: 0 });
    testPositions.push({ x: centroid.x, y: bounds.maxY - carpetHeight / 2, rot: 0 });
  }
  
  let bestResult = null;
  let bestScore = -1;
  
  for (const pos of testPositions) {
    const carpetPoly = createCarpetPolygon(size, pos.x, pos.y, pos.rot);
    const clipped = sutherlandHodgman(carpetPoly, contourPolygon);
    
    if (clipped.length >= 3) {
      const clippedArea = getPolygonArea(clipped);
      const fullArea = getPolygonArea(carpetPoly);
      const coverageRatio = fullArea > 0 ? clippedArea / fullArea : 0;
      
      const score = coverageRatio;
      
      if (score > bestScore) {
        bestScore = score;
        bestResult = {
          carpetPolygon: carpetPoly,
          clippedPolygon: clipped,
          clippedArea,
          fullArea,
          coverageRatio,
          position: { x: pos.x, y: pos.y, rotation: pos.rot }
        };
      }
    }
  }
  
  return bestResult;
}

export function recommendCarpetSize(contourPolygon, carpetType = 'rectangle') {
  const contourArea = getPolygonArea(contourPolygon);
  const bounds = getPolygonBounds(contourPolygon);
  const centroid = getPolygonCentroid(contourPolygon);
  
  let candidates;
  if (carpetType === 'circle') {
    candidates = STANDARD_SIZES.filter(s => s.shape === 'circle');
  } else if (carpetType === 'square') {
    candidates = STANDARD_SIZES.filter(s => s.shape === 'square');
  } else {
    candidates = STANDARD_SIZES.filter(s => s.shape === 'rectangle' || s.shape === 'square');
  }
  
  const scored = [];
  
  for (const size of candidates) {
    const bestFit = findBestPosition(contourPolygon, size);
    
    if (!bestFit) continue;
    
    const areaUtilization = contourArea > 0 ? bestFit.clippedArea / contourArea : 0;
    const coverageRatio = bestFit.coverageRatio;
    
    const score = coverageRatio * 0.5 + areaUtilization * 0.5;
    
    scored.push({
      ...size,
      score,
      clippedArea: bestFit.clippedArea,
      fullArea: bestFit.fullArea,
      coverageRatio,
      areaUtilization,
      scaledWidth: size.shape === 'circle' ? size.diameter : size.width,
      scaledHeight: size.shape === 'circle' ? size.diameter : size.height,
      carpetPolygon: bestFit.carpetPolygon,
      clippedPolygon: bestFit.clippedPolygon,
      position: bestFit.position
    });
  }
  
  scored.sort((a, b) => b.score - a.score);
  
  return {
    recommended: scored[0] || null,
    allSizes: scored,
    bounds,
    centroid,
    contourArea
  };
}

export function adjustCarpetPosition(contourPolygon, carpetSize, centerX, centerY, rotation = 0) {
  const carpetPolygon = createCarpetPolygon(carpetSize, centerX, centerY, rotation);
  const clipped = sutherlandHodgman(carpetPolygon, contourPolygon);
  
  const clippedArea = clipped.length >= 3 ? getPolygonArea(clipped) : 0;
  const fullArea = getPolygonArea(carpetPolygon);
  
  return {
    carpetPolygon,
    clippedPolygon: clipped,
    clippedArea,
    fullArea,
    coverageRatio: fullArea > 0 ? clippedArea / fullArea : 0,
    isFullyInside: clipped.length === carpetPolygon.length && 
                    getPolygonArea(clipped) / getPolygonArea(carpetPolygon) > 0.99
  };
}

export function findBestFitPosition(contourPolygon, carpetSize) {
  return findBestPosition(contourPolygon, carpetSize);
}

export function getStandardSizes() {
  return [...STANDARD_SIZES];
}

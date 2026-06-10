import { pointInPolygon, sutherlandHodgman, getPolygonArea, getPolygonBounds, createRectanglePolygon } from './polygonClipping.js';

export function createObstacle(type, position, size, rotation = 0) {
  return {
    type,
    position,
    size,
    rotation,
    id: `obstacle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

export function createDoorSwingObstacle(hingeX, hingeY, doorWidth, swingAngle = Math.PI / 2, isLeftSwing = true) {
  const segments = 16;
  const polygon = [];
  
  polygon.push({ x: hingeX, y: hingeY });
  
  const startAngle = isLeftSwing ? Math.PI : 0;
  const endAngle = isLeftSwing ? Math.PI + swingAngle : swingAngle;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + (endAngle - startAngle) * t;
    polygon.push({
      x: hingeX + Math.cos(angle) * doorWidth,
      y: hingeY + Math.sin(angle) * doorWidth
    });
  }
  
  return {
    type: 'door',
    position: { x: hingeX, y: hingeY },
    size: { width: doorWidth, height: doorWidth },
    rotation: 0,
    polygon,
    swingAngle,
    isLeftSwing,
    id: `door_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

export function createFurnitureLegObstacle(x, y, radius = 0.05) {
  const segments = 12;
  const polygon = [];
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    polygon.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius
    });
  }
  
  return {
    type: 'furniture_leg',
    position: { x, y },
    size: { radius },
    rotation: 0,
    polygon,
    radius,
    id: `leg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

export function getObstaclePolygon(obstacle) {
  if (obstacle.polygon) {
    return obstacle.polygon;
  }
  
  if (obstacle.type === 'furniture_leg') {
    return obstacle.polygon || createFurnitureLegObstacle(
      obstacle.position.x, obstacle.position.y, obstacle.size?.radius || 0.05
    ).polygon;
  }
  
  return createRectanglePolygon(
    obstacle.position.x,
    obstacle.position.y,
    obstacle.size.width,
    obstacle.size.height,
    obstacle.rotation || 0
  );
}

export function checkCollision(carpetPolygon, obstacles) {
  const collisions = [];
  let totalCollidingArea = 0;
  
  for (const obstacle of obstacles) {
    const obstaclePoly = getObstaclePolygon(obstacle);
    
    const intersection = sutherlandHodgman(carpetPolygon, obstaclePoly);
    
    if (intersection.length >= 3) {
      const area = getPolygonArea(intersection);
      
      if (area > 0.0001) {
        collisions.push({
          obstacle,
          intersectionPolygon: intersection,
          area
        });
        totalCollidingArea += area;
      }
    }
  }
  
  const carpetArea = getPolygonArea(carpetPolygon);
  const collisionRatio = carpetArea > 0 ? totalCollidingArea / carpetArea : 0;
  
  return {
    hasCollision: collisions.length > 0,
    collisions,
    totalCollidingArea,
    collisionRatio
  };
}

function createCarpetPolygon(centerX, centerY, width, height, isCircle) {
  if (isCircle) {
    const radius = width / 2;
    const segments = 32;
    const poly = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      poly.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      });
    }
    return poly;
  } else {
    return createRectanglePolygon(centerX, centerY, width, height);
  }
}

function isCircular(polygon) {
  if (polygon.length < 8) return false;
  
  const centroid = getPolygonCentroid(polygon);
  let maxDist = 0, minDist = Infinity;
  
  for (const p of polygon) {
    const dist = Math.sqrt(Math.pow(p.x - centroid.x, 2) + Math.pow(p.y - centroid.y, 2));
    maxDist = Math.max(maxDist, dist);
    minDist = Math.min(minDist, dist);
  }
  
  return (maxDist - minDist) / maxDist < 0.15;
}

function getPolygonCentroid(polygon) {
  let cx = 0, cy = 0;
  let area = 0;
  const n = polygon.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
    cx += (polygon[i].x + polygon[j].x) * cross;
    cy += (polygon[i].y + polygon[j].y) * cross;
    area += cross;
  }
  
  area *= 0.5;
  const factor = 1 / (6 * area);
  
  return { x: cx * factor, y: cy * factor };
}

function evaluatePosition(centerX, centerY, width, height, isCircle, contourPolygon, obstacles) {
  const carpetPoly = createCarpetPolygon(centerX, centerY, width, height, isCircle);
  
  const clipped = sutherlandHodgman(carpetPoly, contourPolygon);
  if (clipped.length < 3) {
    return { score: -Infinity, clippedArea: 0, collisionArea: Infinity, clippedPolygon: [] };
  }
  
  const clippedArea = getPolygonArea(clipped);
  const originalArea = isCircle 
    ? Math.PI * Math.pow(width / 2, 2) 
    : width * height;
  
  const coverageRatio = clippedArea / originalArea;
  
  if (coverageRatio < 0.6) {
    return { score: -Infinity, clippedArea, collisionArea: Infinity, clippedPolygon: clipped, coverageRatio };
  }
  
  const collisionResult = checkCollision(clipped, obstacles);
  
  const collisionPenalty = collisionResult.totalCollidingArea * 10;
  
  const score = coverageRatio * 100 - collisionPenalty * 50;
  
  return {
    score,
    clippedArea,
    collisionArea: collisionResult.totalCollidingArea,
    collisionRatio: collisionResult.collisionRatio,
    clippedPolygon: clipped,
    coverageRatio,
    hasCollision: collisionResult.hasCollision,
    collisions: collisionResult.collisions
  };
}

export function adjustCarpetToAvoidCollisions(carpetPolygon, obstacles, contourPolygon, maxAttempts = 100) {
  const bounds = getPolygonBounds(carpetPolygon);
  const carpetWidth = bounds.width;
  const carpetHeight = bounds.height;
  const isCircle = isCircular(carpetPolygon);
  
  const initCenter = getPolygonCentroid(carpetPolygon);
  
  const result = adjustPositionForObstacles(
    initCenter.x, initCenter.y,
    carpetWidth, carpetHeight, isCircle,
    contourPolygon, obstacles
  );
  
  const finalCollisionResult = checkCollision(result.polygon, obstacles);
  
  return {
    polygon: result.polygon,
    center: { x: result.x, y: result.y },
    adjusted: result.adjusted,
    result: finalCollisionResult,
    coverageRatio: result.coverageRatio
  };
}

export function clipCarpetAroundObstacles(carpetPolygon, obstacles) {
  let resultPolygon = [...carpetPolygon];
  
  for (const obstacle of obstacles) {
    const obstaclePoly = getObstaclePolygon(obstacle);
    
    const hole = sutherlandHodgman(resultPolygon, obstaclePoly);
    
    if (hole.length >= 3) {
      resultPolygon = subtractPolygon(resultPolygon, obstaclePoly);
    }
  }
  
  return resultPolygon;
}

function subtractPolygon(mainPoly, holePoly) {
  let minDist = Infinity;
  let mainIdx = 0;
  let holeIdx = 0;
  
  for (let i = 0; i < mainPoly.length; i++) {
    for (let j = 0; j < holePoly.length; j++) {
      const dist = Math.sqrt(
        Math.pow(mainPoly[i].x - holePoly[j].x, 2) +
        Math.pow(mainPoly[i].y - holePoly[j].y, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        mainIdx = i;
        holeIdx = j;
      }
    }
  }
  
  const result = [];
  
  for (let i = 0; i <= mainIdx; i++) {
    result.push({ ...mainPoly[i] });
  }
  
  const holeReversed = [];
  for (let i = holePoly.length - 1; i >= 0; i--) {
    const idx = (holeIdx + i) % holePoly.length;
    holeReversed.push({ ...holePoly[idx] });
  }
  result.push(...holeReversed);
  result.push({ ...holePoly[holeIdx] });
  
  for (let i = mainIdx; i < mainPoly.length; i++) {
    result.push({ ...mainPoly[i] });
  }
  
  return result;
}

export function adjustPositionForObstacles(
  centerX, centerY,
  width, height, isCircle,
  contourPolygon, obstacles
) {
  const initEval = evaluatePosition(
    centerX, centerY,
    width, height, isCircle,
    contourPolygon, obstacles
  );
  
  if (!initEval.hasCollision) {
    return { x: centerX, y: centerY, polygon: initEval.clippedPolygon, adjusted: false,
             collisionArea: 0, coverageRatio: initEval.coverageRatio, hasCollision: false };
  }
  
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
    { dx: 0.707, dy: 0.707 },
    { dx: -0.707, dy: 0.707 },
    { dx: 0.707, dy: -0.707 },
    { dx: -0.707, dy: -0.707 }
  ];
  
  let bestX = centerX;
  let bestY = centerY;
  let bestEval = initEval;
  
  const maxDim = Math.max(width, height);
  
  const searchSteps = [
    maxDim * 0.5,
    maxDim * 0.25,
    maxDim * 0.12,
    maxDim * 0.06,
    maxDim * 0.03,
    maxDim * 0.01
  ];
  
  for (const step of searchSteps) {
    let improved = true;
    let iterations = 0;
    const maxIterations = 20;
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      let bestDirX = 0;
      let bestDirY = 0;
      let bestDirEval = bestEval;
      
      for (const dir of directions) {
        const testX = bestX + dir.dx * step;
        const testY = bestY + dir.dy * step;
        
        const evalResult = evaluatePosition(
          testX, testY,
          width, height, isCircle,
          contourPolygon, obstacles
        );
        
        if (evalResult.score > bestDirEval.score) {
          bestDirEval = evalResult;
          bestDirX = dir.dx;
          bestDirY = dir.dy;
        }
      }
      
      if (bestDirEval.score > bestEval.score + 0.001) {
        bestX = bestX + bestDirX * step;
        bestY = bestY + bestDirY * step;
        bestEval = bestDirEval;
        improved = true;
      }
    }
  }
  
  return {
    x: bestX,
    y: bestY,
    polygon: bestEval.clippedPolygon,
    adjusted: Math.abs(bestX - centerX) > 0.005 || Math.abs(bestY - centerY) > 0.005,
    collisionArea: bestEval.collisionArea || 0,
    coverageRatio: bestEval.coverageRatio,
    hasCollision: bestEval.hasCollision || false
  };
}

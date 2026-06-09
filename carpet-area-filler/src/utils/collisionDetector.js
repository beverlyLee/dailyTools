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

export function adjustCarpetToAvoidCollisions(carpetPolygon, obstacles, contourPolygon, maxAttempts = 100) {
  const result = checkCollision(carpetPolygon, obstacles);
  
  if (!result.hasCollision) {
    return { polygon: carpetPolygon, adjusted: false, result };
  }
  
  const bounds = getPolygonBounds(carpetPolygon);
  const carpetWidth = bounds.width;
  const carpetHeight = bounds.height;
  const isCircle = isCircular(carpetPolygon);
  
  let bestCenter = getPolygonCentroid(carpetPolygon);
  let bestCollisionArea = result.totalCollidingArea;
  let bestPolygon = [...carpetPolygon];
  
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
  
  let step = Math.max(carpetWidth, carpetHeight) * 0.1;
  const minStep = 0.01;
  
  let currentCenter = { ...bestCenter };
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let improved = false;
    
    for (const dir of directions) {
      const testCenter = {
        x: currentCenter.x + dir.dx * step,
        y: currentCenter.y + dir.dy * step
      };
      
      let testPolygon;
      if (isCircle) {
        const radius = carpetWidth / 2;
        const segments = 24;
        testPolygon = [];
        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          testPolygon.push({
            x: testCenter.x + Math.cos(angle) * radius,
            y: testCenter.y + Math.sin(angle) * radius
          });
        }
      } else {
        testPolygon = createRectanglePolygon(
          testCenter.x, testCenter.y,
          carpetWidth, carpetHeight
        );
      }
      
      const clipped = sutherlandHodgman(testPolygon, contourPolygon);
      if (clipped.length < 3) continue;
      
      const clippedArea = getPolygonArea(clipped);
      const originalArea = isCircle 
        ? Math.PI * Math.pow(carpetWidth / 2, 2)
        : carpetWidth * carpetHeight;
      
      if (clippedArea < originalArea * 0.5) continue;
      
      const collisionResult = checkCollision(clipped, obstacles);
      
      if (collisionResult.totalCollidingArea < bestCollisionArea * 0.995) {
        bestCollisionArea = collisionResult.totalCollidingArea;
        bestPolygon = clipped;
        bestCenter = { ...testCenter };
        improved = true;
      }
    }
    
    if (improved) {
      currentCenter = { ...bestCenter };
    } else {
      step *= 0.5;
      if (step < minStep) break;
    }
  }
  
  return {
    polygon: bestPolygon,
    adjusted: bestCollisionArea < result.totalCollidingArea * 0.99,
    result: checkCollision(bestPolygon, obstacles)
  };
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
  
  for (let i = 0; i <= holePoly.length; i++) {
    const idx = (holeIdx + i) % holePoly.length;
    result.push({ ...holePoly[idx] });
  }
  
  result.push({ ...holePoly[holeIdx] });
  
  for (let i = mainIdx; i < mainPoly.length; i++) {
    result.push({ ...mainPoly[i] });
  }
  
  return result;
}

export function sutherlandHodgman(subjectPolygon, clipPolygon) {
  let outputList = [...subjectPolygon];
  
  if (outputList.length < 3) return [];
  
  const clipLength = clipPolygon.length;
  
  for (let i = 0; i < clipLength; i++) {
    if (outputList.length < 3) break;
    
    const clipEdgeStart = clipPolygon[i];
    const clipEdgeEnd = clipPolygon[(i + 1) % clipLength];
    
    const inputList = [...outputList];
    outputList = [];
    
    const inputLength = inputList.length;
    
    for (let j = 0; j < inputLength; j++) {
      const currentPoint = inputList[j];
      const prevPoint = inputList[(j - 1 + inputLength) % inputLength];
      
      const currentInside = isInside(currentPoint, clipEdgeStart, clipEdgeEnd);
      const prevInside = isInside(prevPoint, clipEdgeStart, clipEdgeEnd);
      
      if (currentInside) {
        if (!prevInside) {
          const intersection = computeIntersection(prevPoint, currentPoint, clipEdgeStart, clipEdgeEnd);
          outputList.push(intersection);
        }
        outputList.push(currentPoint);
      } else if (prevInside) {
        const intersection = computeIntersection(prevPoint, currentPoint, clipEdgeStart, clipEdgeEnd);
        outputList.push(intersection);
      }
    }
  }
  
  return outputList;
}

function isInside(point, edgeStart, edgeEnd) {
  const cross = (edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) - 
                (edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x);
  return cross >= 0;
}

function computeIntersection(point1, point2, edgeStart, edgeEnd) {
  const x1 = point1.x, y1 = point1.y;
  const x2 = point2.x, y2 = point2.y;
  const x3 = edgeStart.x, y3 = edgeStart.y;
  const x4 = edgeEnd.x, y4 = edgeEnd.y;
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
  if (Math.abs(denom) < 0.0001) {
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  }
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  
  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1)
  };
}

export function getPolygonBounds(polygon) {
  if (polygon.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const p of polygon) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  
  return {
    minX, maxX, minY, maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

export function getPolygonArea(polygon) {
  let area = 0;
  const n = polygon.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  
  return Math.abs(area / 2);
}

export function getPolygonCentroid(polygon) {
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
  
  return {
    x: cx * factor,
    y: cy * factor
  };
}

export function createRectanglePolygon(centerX, centerY, width, height, rotation = 0) {
  const hw = width / 2;
  const hh = height / 2;
  
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh }
  ];
  
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  
  return corners.map(p => ({
    x: centerX + p.x * cos - p.y * sin,
    y: centerY + p.x * sin + p.y * cos
  }));
}

export function pointInPolygon(point, polygon) {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

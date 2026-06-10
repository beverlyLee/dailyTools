import * as THREE from 'three';
import { getPolygonBounds } from './polygonClipping.js';

export function polygonToShape(polygon) {
  const shape = new THREE.Shape();
  
  if (polygon.length === 0) return shape;
  
  shape.moveTo(polygon[0].x, polygon[0].y);
  
  for (let i = 1; i < polygon.length; i++) {
    shape.lineTo(polygon[i].x, polygon[i].y);
  }
  
  shape.closePath();
  
  return shape;
}

export function polygonToGeometry(polygon, height = 0.01, bevelEnabled = false) {
  const shape = polygonToShape(polygon);
  
  const bounds = getPolygonBounds(polygon);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  
  const extrudeSettings = {
    depth: height,
    bevelEnabled: bevelEnabled,
    bevelThickness: height * 0.2,
    bevelSize: height * 0.2,
    bevelSegments: 2
  };
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
  geometry.translate(-centerX, -centerY, 0);
  
  geometry.rotateX(Math.PI / 2);
  
  geometry.computeVertexNormals();
  
  return geometry;
}

export function polygonToFlatGeometry(polygon) {
  const shape = polygonToShape(polygon);
  
  const geometry = new THREE.ShapeGeometry(shape);
  
  const bounds = getPolygonBounds(polygon);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  
  geometry.translate(-centerX, -centerY, 0);
  
  geometry.rotateX(Math.PI / 2);
  
  geometry.computeVertexNormals();
  
  return geometry;
}

export function createCarpetMesh(polygon, material, pileHeight = 0.01) {
  const group = new THREE.Group();
  
  const baseGeometry = polygonToFlatGeometry(polygon);
  const baseMaterial = material.clone();
  baseMaterial.bumpScale = 0;
  const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
  baseMesh.position.y = 0.001;
  baseMesh.receiveShadow = true;
  baseMesh.castShadow = false;
  group.add(baseMesh);
  
  const pileGeometry = polygonToGeometry(polygon, pileHeight, false);
  const pileMaterial = material.clone();
  pileMaterial.bumpScale = pileHeight * 0.3;
  const pileMesh = new THREE.Mesh(pileGeometry, pileMaterial);
  pileMesh.position.y = 0.001;
  pileMesh.receiveShadow = true;
  pileMesh.castShadow = true;
  group.add(pileMesh);
  
  const bounds = getPolygonBounds(polygon);
  group.userData = {
    polygon: [...polygon],
    bounds,
    center: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2
    },
    pileHeight
  };
  
  return group;
}

export function createRoomFloor(width, depth, material = null) {
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.1
    });
  }
  
  const geometry = new THREE.PlaneGeometry(width, depth);
  geometry.rotateX(Math.PI / 2);
  geometry.scale(1, -1, 1);
  
  const floor = new THREE.Mesh(geometry, material);
  floor.receiveShadow = true;
  floor.position.y = 0;
  
  return floor;
}

export function createWallLine(points, height = 2.8, color = 0xcccccc) {
  if (points.length < 2) return new THREE.Group();
  
  const group = new THREE.Group();
  
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    const dx = p2.x - p1.x;
    const dz = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    
    const wallGeometry = new THREE.BoxGeometry(length, height, 0.1);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.9,
      side: THREE.DoubleSide
    });
    
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(
      (p1.x + p2.x) / 2,
      height / 2,
      (p1.y + p2.y) / 2
    );
    wall.rotation.y = -angle;
    wall.castShadow = true;
    wall.receiveShadow = true;
    
    group.add(wall);
  }
  
  return group;
}

export function createObstacleMesh(obstacle, color = 0xff6b6b) {
  const group = new THREE.Group();
  
  if (obstacle.type === 'furniture_leg') {
    const radius = obstacle.size?.radius || 0.05;
    const height = 0.15;
    
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(obstacle.position.x, height / 2 + 0.05, obstacle.position.y);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    group.add(mesh);
  } else if (obstacle.type === 'door') {
    const poly = obstacle.polygon;
    
    if (!poly || poly.length < 3) return group;
    
    const shape = new THREE.Shape();
    shape.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      shape.lineTo(poly[i].x, poly[i].y);
    }
    shape.closePath();
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.02,
      bevelEnabled: false
    });
    
    geometry.rotateX(Math.PI / 2);
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.01;
    
    group.add(mesh);
  }
  
  group.userData = { obstacle };
  
  return group;
}

export function createPolygonOutlineMesh(polygon, color = 0x00ff88, height = 0.02) {
  const group = new THREE.Group();
  
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    
    const dx = p2.x - p1.x;
    const dz = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    
    const lineGeometry = new THREE.BoxGeometry(length, height, 0.01);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: color });
    
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(
      (p1.x + p2.x) / 2,
      height / 2 + 0.005,
      (p1.y + p2.y) / 2
    );
    line.rotation.y = -angle;
    
    group.add(line);
  }
  
  return group;
}

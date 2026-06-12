import * as THREE from 'three';

export interface MeshFace {
  a: number;
  b: number;
  c: number;
}

export interface DetectedCorner {
  position: THREE.Vector3;
  angle: number;
  height: number;
  riskLevel: 'high' | 'medium' | 'low';
  objectName: string;
  edgeVectors: { v1: THREE.Vector3; v2: THREE.Vector3 };
  faces: MeshFace[];
  mesh: THREE.Object3D;
}

export interface SharpCornerResult {
  corners: DetectedCorner[];
  highRiskCount: number;
  mediumRiskCount: number;
  totalArea: number;
}

export class SharpCornerDetector {
  public group: THREE.Group;
  private cornerMarkers: THREE.Mesh[] = [];
  private cornerLabels: THREE.Sprite[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'SharpCornerDetector';
  }

  public detect(
    sceneObjects: THREE.Object3D[],
    childHeightRange: { min: number; max: number },
    childPosition: THREE.Vector3
  ): SharpCornerResult {
    this.clearMarkers();

    const allCorners: DetectedCorner[] = [];
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let totalArea = 0;

    for (const obj of sceneObjects) {
      if (!obj.userData.isFurniture) continue;

      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const detected = this.analyzeMeshCorners(
            child,
            childHeightRange,
            childPosition
          );
          allCorners.push(...detected);
        }
      });
    }

    for (const corner of allCorners) {
      this.createCornerMarker(corner);

      if (corner.riskLevel === 'high') {
        highRiskCount++;
        totalArea += this.estimateCornerImpactArea(corner);
      } else if (corner.riskLevel === 'medium') {
        mediumRiskCount++;
      }
    }

    return {
      corners: allCorners.filter((c) => c.riskLevel !== 'low'),
      highRiskCount,
      mediumRiskCount,
      totalArea,
    };
  }

  private analyzeMeshCorners(
    mesh: THREE.Mesh,
    childHeightRange: { min: number; max: number },
    childPosition: THREE.Vector3
  ): DetectedCorner[] {
    const geometry = mesh.geometry;
    const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
    const indexAttr = geometry.index as THREE.BufferAttribute;

    if (!positionAttr || !indexAttr) return [];

    const worldMatrix = mesh.matrixWorld;
    const detectedCorners: DetectedCorner[] = [];
    const processedCorners = new Set<string>();

    const vertexToFaces = this.buildVertexToFaceMap(indexAttr);

    for (let vertexIdx = 0; vertexIdx < positionAttr.count; vertexIdx++) {
      const key = `${mesh.uuid}-${vertexIdx}`;
      if (processedCorners.has(key)) continue;

      const worldPos = this.getVertexWorldPos(vertexIdx, positionAttr, worldMatrix);

      if (worldPos.y < childHeightRange.min || worldPos.y > childHeightRange.max) {
        continue;
      }

      const faceIndices = vertexToFaces.get(vertexIdx);
      if (!faceIndices || faceIndices.length < 2) continue;

      const adjacentFaces = this.getAdjacentFaces(faceIndices, indexAttr, vertexIdx);
      const angleInfo = this.calculateCornerAngle(adjacentFaces, vertexIdx, positionAttr, worldMatrix);

      if (angleInfo === null) continue;

      const { angle, v1, v2, faces } = angleInfo;

      if (angle >= Math.PI * 0.98) continue;

      const riskLevel = this.classifyRisk(
        angle,
        worldPos,
        childPosition,
        childHeightRange
      );

      if (riskLevel === 'low') {
        processedCorners.add(key);
        continue;
      }

      const cornerKey = this.generateCornerKey(worldPos);
      if (processedCorners.has(cornerKey)) {
        processedCorners.add(key);
        continue;
      }

      processedCorners.add(key);
      processedCorners.add(cornerKey);

      detectedCorners.push({
        position: worldPos,
        angle,
        height: worldPos.y,
        riskLevel,
        objectName: mesh.name || mesh.parent?.name || 'Unknown',
        edgeVectors: { v1, v2 },
        faces,
        mesh,
      });
    }

    return detectedCorners;
  }

  private buildVertexToFaceMap(index: THREE.BufferAttribute): Map<number, number[]> {
    const map = new Map<number, number[]>();
    for (let i = 0; i < index.count; i += 3) {
      const faceIdx = i / 3;
      for (let j = 0; j < 3; j++) {
        const vertIdx = index.getX(i + j);
        if (!map.has(vertIdx)) {
          map.set(vertIdx, []);
        }
        map.get(vertIdx)!.push(faceIdx);
      }
    }
    return map;
  }

  private getAdjacentFaces(
    faceIndices: number[],
    index: THREE.BufferAttribute,
    vertexIdx: number
  ): Array<{ a: number; b: number; c: number }> {
    const result: Array<{ a: number; b: number; c: number }> = [];
    for (const faceIdx of faceIndices) {
      const i = faceIdx * 3;
      result.push({
        a: index.getX(i),
        b: index.getX(i + 1),
        c: index.getX(i + 2),
      });
    }
    return result;
  }

  private getVertexWorldPos(
    idx: number,
    positionAttr: THREE.BufferAttribute,
    matrix: THREE.Matrix4
  ): THREE.Vector3 {
    const pos = new THREE.Vector3(
      positionAttr.getX(idx),
      positionAttr.getY(idx),
      positionAttr.getZ(idx)
    );
    return pos.applyMatrix4(matrix);
  }

  private calculateCornerAngle(
    faces: Array<{ a: number; b: number; c: number }>,
    vertexIdx: number,
    positionAttr: THREE.BufferAttribute,
    matrix: THREE.Matrix4
  ): { angle: number; v1: THREE.Vector3; v2: THREE.Vector3; faces: MeshFace[] } | null {
    const edgeVectors: THREE.Vector3[] = [];

    const localPos = new THREE.Vector3(
      positionAttr.getX(vertexIdx),
      positionAttr.getY(vertexIdx),
      positionAttr.getZ(vertexIdx)
    );

    for (const face of faces) {
      const otherIndices = [face.a, face.b, face.c].filter((i) => i !== vertexIdx);
      if (otherIndices.length !== 2) continue;

      for (const otherIdx of otherIndices) {
        const otherPos = new THREE.Vector3(
          positionAttr.getX(otherIdx),
          positionAttr.getY(otherIdx),
          positionAttr.getZ(otherIdx)
        );
        const edge = new THREE.Vector3().subVectors(otherPos, localPos);
        if (edge.length() > 0.001) {
          edge.normalize();
          edgeVectors.push(edge);
        }
      }
    }

    if (edgeVectors.length < 2) return null;

    let minAngle = Infinity;
    let bestPair: [THREE.Vector3, THREE.Vector3] | null = null;

    for (let i = 0; i < edgeVectors.length; i++) {
      for (let j = i + 1; j < edgeVectors.length; j++) {
        const angle = edgeVectors[i].angleTo(edgeVectors[j]);
        if (angle > 0.1 && angle < minAngle) {
          minAngle = angle;
          bestPair = [edgeVectors[i], edgeVectors[j]];
        }
      }
    }

    if (!bestPair || minAngle === Infinity) return null;

    return {
      angle: minAngle,
      v1: bestPair[0].clone().applyMatrix4(new THREE.Matrix4().extractRotation(matrix)),
      v2: bestPair[1].clone().applyMatrix4(new THREE.Matrix4().extractRotation(matrix)),
      faces: [],
    };
  }

  private generateCornerKey(pos: THREE.Vector3): string {
    const precision = 2;
    return `${pos.x.toFixed(precision)}-${pos.y.toFixed(precision)}-${pos.z.toFixed(precision)}`;
  }

  private classifyRisk(
    angle: number,
    worldPos: THREE.Vector3,
    childPos: THREE.Vector3,
    childHeightRange: { min: number; max: number }
  ): 'high' | 'medium' | 'low' {
    const angleDeg = (angle * 180) / Math.PI;

    const headZoneMin = 0.7;
    const headZoneMax = childHeightRange.max;
    const inHeadZone = worldPos.y >= headZoneMin && worldPos.y <= headZoneMax;

    if (angleDeg < 90) {
      if (inHeadZone) return 'high';
      return 'high';
    }

    if (angleDeg < 100) {
      if (inHeadZone) return 'medium';
      return 'medium';
    }

    return 'low';
  }

  private estimateCornerImpactArea(corner: DetectedCorner): number {
    const radius = 0.05;
    return Math.PI * radius * radius;
  }

  private createCornerMarker(corner: DetectedCorner): void {
    const color =
      corner.riskLevel === 'high' ? 0xef4444 : corner.riskLevel === 'medium' ? 0xf59e0b : 0x22c55e;

    const geometry = new THREE.SphereGeometry(0.03, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(corner.position);
    marker.userData = { isCornerMarker: true, cornerData: corner };
    this.cornerMarkers.push(marker);
    this.group.add(marker);

    const pulseGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
    });
    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    pulse.position.copy(corner.position);
    pulse.userData = { isPulseMarker: true, baseScale: 1, pulse: 0 };
    this.cornerMarkers.push(pulse);
    this.group.add(pulse);
  }

  private clearMarkers(): void {
    for (const marker of this.cornerMarkers) {
      this.group.remove(marker);
      if (marker.geometry) marker.geometry.dispose();
      if (marker.material instanceof THREE.Material) marker.material.dispose();
    }
    this.cornerMarkers = [];

    for (const label of this.cornerLabels) {
      this.group.remove(label);
    }
    this.cornerLabels = [];
  }

  public animatePulse(time: number): void {
    for (const marker of this.cornerMarkers) {
      if (marker.userData.isPulseMarker) {
        const pulse = (Math.sin(time * 3) + 1) / 2;
        const scale = 1 + pulse * 0.8;
        marker.scale.setScalar(scale);
        (marker.material as THREE.MeshBasicMaterial).opacity = 0.5 - pulse * 0.35;
      }
    }
  }

  public getHighRiskCorners(): DetectedCorner[] {
    const result: DetectedCorner[] = [];
    for (const marker of this.cornerMarkers) {
      if (marker.userData.isCornerMarker && marker.userData.cornerData) {
        if (marker.userData.cornerData.riskLevel === 'high') {
          result.push(marker.userData.cornerData);
        }
      }
    }
    return result;
  }
}

import * as THREE from 'three';
import { DetectedCorner } from './SharpCornerDetector';

export interface PaddingSuggestion {
  objectName: string;
  cornerPosition: THREE.Vector3;
  paddingMesh: THREE.Mesh;
  paddingType: 'corner_guard' | 'edge_trim' | 'full_wrap';
  area: number;
  thickness: number;
  materialCost: number;
  installationAdvice: string;
}

export interface PaddingResult {
  suggestions: PaddingSuggestion[];
  totalArea: number;
  estimatedCost: number;
  highRiskCount: number;
}

export class SoftPaddingSystem {
  public group: THREE.Group;
  private paddingMeshes: THREE.Mesh[] = [];
  private suggestions: PaddingSuggestion[] = [];

  private static readonly MATERIAL_COST_PER_SQ_M = 120;
  private static readonly CORNER_GUARD_PRICE = 15;
  private static readonly EDGE_TRIM_PER_M = 25;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'SoftPaddingSystem';
  }

  public analyzeAndApply(
    detectedCorners: DetectedCorner[]
  ): PaddingResult {
    this.clearAll();
    this.suggestions = [];
    let totalArea = 0;
    let totalCost = 0;
    let highRiskCount = 0;

    const processedMeshes = new Map<string, DetectedCorner[]>();

    for (const corner of detectedCorners) {
      if (corner.riskLevel === 'low') continue;
      if (corner.riskLevel === 'high') highRiskCount++;

      const meshKey = corner.mesh.uuid;
      if (!processedMeshes.has(meshKey)) {
        processedMeshes.set(meshKey, []);
      }
      processedMeshes.get(meshKey)!.push(corner);
    }

    for (const [meshId, corners] of processedMeshes.entries()) {
      const corner = corners[0];
      const mesh = corner.mesh;

      if (corners.length >= 3) {
        const result = this.applyFullWrap(mesh, corners);
        if (result) {
          this.suggestions.push(...result.suggestions);
          totalArea += result.area;
          totalCost += result.cost;
        }
      } else {
        for (const c of corners) {
          const result = this.applyCornerGuard(c);
          if (result) {
            this.suggestions.push(result);
            totalArea += result.area;
            totalCost += this.calculateSuggestionCost(result);
          }
        }
      }

      const edges = this.detectDangerousEdges(mesh, corners);
      for (const edge of edges) {
        const result = this.applyEdgeTrim(edge.start, edge.end, mesh);
        if (result) {
          this.suggestions.push(result);
          totalArea += result.area;
          totalCost += this.calculateSuggestionCost(result);
        }
      }
    }

    return {
      suggestions: this.suggestions,
      totalArea,
      estimatedCost: totalCost,
      highRiskCount,
    };
  }

  private applyCornerGuard(corner: DetectedCorner): PaddingSuggestion | null {
    const thickness = 0.02;
    const size = 0.08;

    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.5,
      roughness: 0.9,
      emissive: 0x4ade80,
      emissiveIntensity: 0.1,
    });

    const padding = new THREE.Mesh(geometry, material);
    padding.position.copy(corner.position);
    padding.userData = { isPadding: true, paddingType: 'corner_guard' };
    this.paddingMeshes.push(padding);
    this.group.add(padding);

    const area = 4 * Math.PI * size * size;

    return {
      objectName: corner.objectName,
      cornerPosition: corner.position.clone(),
      paddingMesh: padding,
      paddingType: 'corner_guard',
      area,
      thickness,
      materialCost: SoftPaddingSystem.CORNER_GUARD_PRICE,
      installationAdvice: '建议安装L型硅胶防撞角，用3M双面胶固定',
    };
  }

  private applyEdgeTrim(
    start: THREE.Vector3,
    end: THREE.Vector3,
    mesh: THREE.Object3D
  ): PaddingSuggestion | null {
    const thickness = 0.02;
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const length = start.distanceTo(end);
    const direction = end.clone().sub(start).normalize();

    const geometry = new THREE.CylinderGeometry(thickness, thickness, length, 12);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, 0, 0);

    const material = new THREE.MeshStandardMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.5,
      roughness: 0.9,
    });

    const padding = new THREE.Mesh(geometry, material);
    padding.position.copy(mid);
    padding.lookAt(end);
    padding.rotateY(Math.PI / 2);
    padding.userData = { isPadding: true, paddingType: 'edge_trim' };
    this.paddingMeshes.push(padding);
    this.group.add(padding);

    const area = 2 * Math.PI * thickness * length;

    return {
      objectName: mesh.name || '家具',
      cornerPosition: mid.clone(),
      paddingMesh: padding,
      paddingType: 'edge_trim',
      area,
      thickness,
      materialCost: length * SoftPaddingSystem.EDGE_TRIM_PER_M,
      installationAdvice: '建议使用U型橡胶防撞条，覆盖整个边缘',
    };
  }

  private applyFullWrap(
    mesh: THREE.Object3D,
    corners: DetectedCorner[]
  ): { suggestions: PaddingSuggestion[]; area: number; cost: number } | null {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const thickness = 0.02;
    const geometry = new THREE.BoxGeometry(
      size.x + thickness * 2,
      size.y + thickness * 2,
      size.z + thickness * 2
    );
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.25,
      roughness: 0.95,
      wireframe: false,
    });

    const padding = new THREE.Mesh(geometry, material);
    padding.position.copy(center);
    padding.userData = { isPadding: true, paddingType: 'full_wrap' };
    this.paddingMeshes.push(padding);
    this.group.add(padding);

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x22c55e,
      linewidth: 2,
      transparent: true,
      opacity: 0.7,
    });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    edgeLines.position.copy(center);
    this.group.add(edgeLines);

    const area = 2 * (size.x * size.y + size.y * size.z + size.x * size.z);
    const cost = area * SoftPaddingSystem.MATERIAL_COST_PER_SQ_M;

    const suggestions: PaddingSuggestion[] = corners.map((c) => ({
      objectName: c.objectName,
      cornerPosition: c.position.clone(),
      paddingMesh: padding,
      paddingType: 'full_wrap',
      area: area / corners.length,
      thickness,
      materialCost: cost / corners.length,
      installationAdvice: '建议整体包裹软包海绵（厚度≥2cm），外包皮革或布艺',
    }));

    return { suggestions, area, cost };
  }

  private detectDangerousEdges(
    mesh: THREE.Object3D,
    corners: DetectedCorner[]
  ): Array<{ start: THREE.Vector3; end: THREE.Vector3 }> {
    const box = new THREE.Box3().setFromObject(mesh);
    const edges: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    const headRange = { min: 0.7, max: 0.9 };
    const cornerPositions = corners.map((c) => c.position);

    const allEdges = [
      { start: new THREE.Vector3(box.min.x, box.min.y, box.min.z), end: new THREE.Vector3(box.max.x, box.min.y, box.min.z) },
      { start: new THREE.Vector3(box.max.x, box.min.y, box.min.z), end: new THREE.Vector3(box.max.x, box.max.y, box.min.z) },
      { start: new THREE.Vector3(box.max.x, box.max.y, box.min.z), end: new THREE.Vector3(box.min.x, box.max.y, box.min.z) },
      { start: new THREE.Vector3(box.min.x, box.max.y, box.min.z), end: new THREE.Vector3(box.min.x, box.min.y, box.min.z) },
      { start: new THREE.Vector3(box.min.x, box.min.y, box.max.z), end: new THREE.Vector3(box.max.x, box.min.y, box.max.z) },
      { start: new THREE.Vector3(box.max.x, box.min.y, box.max.z), end: new THREE.Vector3(box.max.x, box.max.y, box.max.z) },
      { start: new THREE.Vector3(box.max.x, box.max.y, box.max.z), end: new THREE.Vector3(box.min.x, box.max.y, box.max.z) },
      { start: new THREE.Vector3(box.min.x, box.max.y, box.max.z), end: new THREE.Vector3(box.min.x, box.min.y, box.max.z) },
      { start: new THREE.Vector3(box.min.x, box.max.y, box.min.z), end: new THREE.Vector3(box.min.x, box.max.y, box.max.z) },
      { start: new THREE.Vector3(box.max.x, box.max.y, box.min.z), end: new THREE.Vector3(box.max.x, box.max.y, box.max.z) },
      { start: new THREE.Vector3(box.min.x, box.min.y, box.min.z), end: new THREE.Vector3(box.min.x, box.min.y, box.max.z) },
      { start: new THREE.Vector3(box.max.x, box.min.y, box.min.z), end: new THREE.Vector3(box.max.x, box.min.y, box.max.z) },
    ];

    for (const edge of allEdges) {
      const midY = (edge.start.y + edge.end.y) / 2;
      if (midY >= headRange.min && midY <= headRange.max) {
        const mid = edge.start.clone().add(edge.end).multiplyScalar(0.5);
        const hasNearbyCorner = cornerPositions.some(
          (cp) => cp.distanceTo(mid) < 0.15
        );
        if (hasNearbyCorner) {
          edges.push(edge);
        }
      }
    }

    return edges;
  }

  private calculateSuggestionCost(suggestion: PaddingSuggestion): number {
    return suggestion.materialCost;
  }

  public clearAll(): void {
    for (const mesh of this.paddingMeshes) {
      this.group.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) mesh.material.dispose();
    }
    this.paddingMeshes = [];
    this.suggestions = [];

    const toRemove: THREE.Object3D[] = [];
    this.group.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        toRemove.push(child);
      }
    });
    for (const obj of toRemove) {
      this.group.remove(obj);
      if (obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
    }
  }

  public setPaddingVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public animate(time: number): void {
    for (const mesh of this.paddingMeshes) {
      const pulse = (Math.sin(time * 2 + mesh.position.x * 5) + 1) / 2;
      const scale = 1 + pulse * 0.03;
      mesh.scale.setScalar(scale);
    }
  }
}

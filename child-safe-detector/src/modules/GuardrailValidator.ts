import * as THREE from 'three';

export interface HighRiskZone {
  type: 'window' | 'balcony' | 'bay_window' | 'stairs';
  position: THREE.Vector3;
  size: THREE.Vector3;
  hasGuardrail: boolean;
  guardrailInstallSpace: boolean;
  fallHeight: number;
  riskLevel: 'critical' | 'high' | 'medium';
  requiredGuardrailHeight: number;
  gapSize: number;
  recommendation: string;
}

export interface GuardrailCheckResult {
  zones: HighRiskZone[];
  totalZones: number;
  protectedZones: number;
  unprotectedZones: number;
  installSpaceAvailable: number;
  warnings: string[];
}

export class GuardrailValidator {
  public group: THREE.Group;
  private zoneMarkers: THREE.Mesh[] = [];
  private guardrailPreview: THREE.Mesh[] = [];

  private static readonly REQUIRED_GUARDRAIL_HEIGHT = 1.1;
  private static readonly MAX_ALLOWED_GAP = 0.11;
  private static readonly GUARDRAIL_THICKNESS = 0.06;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'GuardrailValidator';
  }

  public validate(sceneObjects: THREE.Object3D[]): GuardrailCheckResult {
    this.clearAll();

    const zones: HighRiskZone[] = [];
    const warnings: string[] = [];
    let protectedZones = 0;
    let unprotectedZones = 0;
    let installSpaceAvailable = 0;

    const potentialZones = this.scanForHighRiskZones(sceneObjects);

    for (const zone of potentialZones) {
      const validatedZone = this.analyzeZone(zone, sceneObjects);

      if (validatedZone.hasGuardrail) {
        protectedZones++;
        this.createSafeMarker(validatedZone);
      } else {
        unprotectedZones++;
        this.createWarningMarker(validatedZone);

        if (validatedZone.guardrailInstallSpace) {
          installSpaceAvailable++;
          this.createGuardrailPreview(validatedZone);
        }
      }

      if (validatedZone.riskLevel === 'critical') {
        warnings.push(
          `⚠️ 严重风险：${this.getZoneTypeName(validatedZone.type)}区域缺少防护栏，高度${(validatedZone.fallHeight * 100).toFixed(0)}cm，存在坠落危险`
        );
      } else if (validatedZone.riskLevel === 'high' && !validatedZone.hasGuardrail) {
        warnings.push(
          `🔴 高风险：${this.getZoneTypeName(validatedZone.type)}建议安装防护栏，推荐高度${(validatedZone.requiredGuardrailHeight * 100).toFixed(0)}cm`
        );
      }

      zones.push(validatedZone);
    }

    if (zones.length === 0) {
      warnings.push('✅ 未检测到窗户、阳台等高危区域，请确认是否完整建模');
    }

    return {
      zones,
      totalZones: zones.length,
      protectedZones,
      unprotectedZones,
      installSpaceAvailable,
      warnings,
    };
  }

  private scanForHighRiskZones(sceneObjects: THREE.Object3D[]): HighRiskZone[] {
    const zones: HighRiskZone[] = [];

    for (const obj of sceneObjects) {
      if (obj.userData.isWindow) {
        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        const pos = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(pos);

        zones.push({
          type: obj.userData.isBayWindow ? 'bay_window' : 'window',
          position: pos,
          size,
          hasGuardrail: false,
          guardrailInstallSpace: false,
          fallHeight: 1.5,
          riskLevel: 'high',
          requiredGuardrailHeight: GuardrailValidator.REQUIRED_GUARDRAIL_HEIGHT,
          gapSize: 0,
          recommendation: '',
        });
      }

      if (obj.userData.isBalcony) {
        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        const pos = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(pos);

        zones.push({
          type: 'balcony',
          position: pos,
          size,
          hasGuardrail: false,
          guardrailInstallSpace: false,
          fallHeight: 3,
          riskLevel: 'critical',
          requiredGuardrailHeight: 1.2,
          gapSize: 0,
          recommendation: '',
        });
      }
    }

    return zones;
  }

  private analyzeZone(zone: HighRiskZone, sceneObjects: THREE.Object3D[]): HighRiskZone {
    let hasGuardrail = false;
    let installSpace = true;
    let existingGuardrailHeight = 0;
    let minGap = Infinity;

    const zoneBox = new THREE.Box3(
      new THREE.Vector3(
        zone.position.x - zone.size.x / 2 - 0.1,
        zone.position.y - zone.size.y / 2,
        zone.position.z - zone.size.z / 2 - 0.1
      ),
      new THREE.Vector3(
        zone.position.x + zone.size.x / 2 + 0.1,
        zone.position.y + zone.size.y / 2 + 0.1,
        zone.position.z + zone.size.z / 2 + 0.1
      )
    );

    for (const obj of sceneObjects) {
      if (!obj.userData.isFurniture && !obj.userData.isGuardrail) continue;

      const objBox = new THREE.Box3().setFromObject(obj);

      if (!zoneBox.intersectsBox(objBox)) continue;

      if (obj.userData.isGuardrail) {
        hasGuardrail = true;
        const objSize = new THREE.Vector3();
        objBox.getSize(objSize);
        existingGuardrailHeight = Math.max(existingGuardrailHeight, objSize.y);

        if (obj.userData.railGap !== undefined) {
          minGap = Math.min(minGap, obj.userData.railGap);
        }
      } else {
        const objCenter = new THREE.Vector3();
        objBox.getCenter(objCenter);
        const zoneCenter = new THREE.Vector3();
        zoneBox.getCenter(zoneCenter);

        const horizDist = Math.sqrt(
          Math.pow(objCenter.x - zoneCenter.x, 2) +
            Math.pow(objCenter.z - zoneCenter.z, 2)
        );

        if (horizDist < 0.15 && objBox.max.y > 0.3) {
          installSpace = false;
        }
      }
    }

    let riskLevel = zone.riskLevel;
    let recommendation = '';

    if (hasGuardrail) {
      if (existingGuardrailHeight < zone.requiredGuardrailHeight) {
        riskLevel = 'high';
        recommendation = `现有防护栏高度${(existingGuardrailHeight * 100).toFixed(0)}cm，低于标准要求的${(zone.requiredGuardrailHeight * 100).toFixed(0)}cm，建议加高`;
      } else if (minGap < Infinity && minGap > GuardrailValidator.MAX_ALLOWED_GAP) {
        riskLevel = 'medium';
        recommendation = `防护栏间距${(minGap * 100).toFixed(0)}cm，超过安全标准的11cm，儿童头部可能被卡住`;
      } else {
        riskLevel = 'medium';
        recommendation = '防护栏符合安全标准，建议定期检查稳固性';
      }
    } else {
      if (installSpace) {
        recommendation = `建议安装防护栏（高度≥${(zone.requiredGuardrailHeight * 100).toFixed(0)}cm，栏杆间距≤11cm），已检测到安装空间`;
      } else {
        riskLevel = 'critical';
        recommendation = '缺少防护栏且安装空间被家具阻挡，建议移除障碍物后安装防护栏';
      }
    }

    return {
      ...zone,
      hasGuardrail,
      guardrailInstallSpace: installSpace,
      riskLevel,
      gapSize: minGap === Infinity ? 0 : minGap,
      recommendation,
    };
  }

  private createWarningMarker(zone: HighRiskZone): void {
    const color = zone.riskLevel === 'critical' ? 0xdc2626 : zone.riskLevel === 'high' ? 0xef4444 : 0xf59e0b;

    const boxGeometry = new THREE.BoxGeometry(
      zone.size.x + 0.1,
      zone.size.y + 0.05,
      zone.size.z + 0.1
    );
    const edges = new THREE.EdgesGeometry(boxGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color,
      linewidth: 3,
      transparent: true,
      opacity: 0.9,
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.position.copy(zone.position);
    wireframe.userData = { isZoneMarker: true, pulse: 0 };
    this.zoneMarkers.push(wireframe as unknown as THREE.Mesh);
    this.group.add(wireframe);

    const planeGeometry = new THREE.BoxGeometry(
      zone.size.x + 0.08,
      zone.size.y + 0.03,
      zone.size.z + 0.08
    );
    const planeMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
    });
    const highlight = new THREE.Mesh(planeGeometry, planeMaterial);
    highlight.position.copy(zone.position);
    this.zoneMarkers.push(highlight);
    this.group.add(highlight);
  }

  private createSafeMarker(zone: HighRiskZone): void {
    const boxGeometry = new THREE.BoxGeometry(
      zone.size.x + 0.1,
      zone.size.y + 0.05,
      zone.size.z + 0.1
    );
    const edges = new THREE.EdgesGeometry(boxGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x22c55e,
      linewidth: 2,
      transparent: true,
      opacity: 0.6,
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.position.copy(zone.position);
    this.zoneMarkers.push(wireframe as unknown as THREE.Mesh);
    this.group.add(wireframe);
  }

  private createGuardrailPreview(zone: HighRiskZone): void {
    const railHeight = zone.requiredGuardrailHeight;
    const thickness = GuardrailValidator.GUARDRAIL_THICKNESS;

    const width = Math.max(zone.size.x, 0.6);
    const postCount = Math.max(3, Math.ceil(width / 0.2) + 1);

    for (let i = 0; i < postCount; i++) {
      const x = zone.position.x - width / 2 + (width / (postCount - 1)) * i;

      const postGeometry = new THREE.BoxGeometry(thickness, railHeight, thickness);
      const postMaterial = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.5,
        roughness: 0.7,
      });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(x, railHeight / 2, zone.position.z - zone.size.z / 2 - 0.05);
      this.guardrailPreview.push(post);
      this.group.add(post);
    }

    const railPositions = [
      { y: railHeight - thickness / 2, label: 'top' },
      { y: railHeight * 0.66, label: 'mid2' },
      { y: railHeight * 0.33, label: 'mid1' },
    ];

    for (const rail of railPositions) {
      const railGeometry = new THREE.BoxGeometry(width + thickness, thickness, thickness);
      const railMaterial = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.55,
        roughness: 0.7,
      });
      const railMesh = new THREE.Mesh(railGeometry, railMaterial);
      railMesh.position.set(
        zone.position.x,
        rail.y,
        zone.position.z - zone.size.z / 2 - 0.05
      );
      this.guardrailPreview.push(railMesh);
      this.group.add(railMesh);
    }
  }

  private getZoneTypeName(type: HighRiskZone['type']): string {
    const names: Record<HighRiskZone['type'], string> = {
      window: '窗户',
      bay_window: '飘窗',
      balcony: '阳台',
      stairs: '楼梯',
    };
    return names[type];
  }

  private clearAll(): void {
    for (const marker of this.zoneMarkers) {
      this.group.remove(marker);
      if (marker.geometry) marker.geometry.dispose();
      if (marker.material instanceof THREE.Material) marker.material.dispose();
    }
    this.zoneMarkers = [];

    for (const preview of this.guardrailPreview) {
      this.group.remove(preview);
      if (preview.geometry) preview.geometry.dispose();
      if (preview.material instanceof THREE.Material) preview.material.dispose();
    }
    this.guardrailPreview = [];
  }

  public animate(time: number): void {
    for (const marker of this.zoneMarkers) {
      if (marker.userData.isZoneMarker) {
        const pulse = (Math.sin(time * 4) + 1) / 2;
        const scale = 1 + pulse * 0.04;
        marker.scale.setScalar(scale);
      }
    }
    for (const preview of this.guardrailPreview) {
      const pulse = (Math.sin(time * 2 + preview.position.y * 3) + 1) / 2;
      if (preview.material instanceof THREE.MeshStandardMaterial) {
        preview.material.opacity = 0.4 + pulse * 0.3;
      }
    }
  }
}

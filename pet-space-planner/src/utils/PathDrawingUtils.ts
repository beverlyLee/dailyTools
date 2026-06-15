import * as THREE from 'three';

export const PATH_COLORS = {
  CAT_PATH: 0xe91e63,
  WALKWAY: 0xff9800,
  CLEANING: 0x2196f3,
  DOG_PATH: 0x4caf50,
};

export const PATH_STYLES = {
  CAT_PATH: {
    tubeRadius: 0.04,
    dashSize: 0.3,
    gapSize: 0.15,
    arrowSpacing: 1.2,
    arrowSize: 0.09,
    labelColor: 0xe91e63,
    lineType: 'dashed-dotted',
  },
  WALKWAY: {
    tubeRadius: 0.06,
    dashSize: 0,
    gapSize: 0,
    arrowSpacing: 2.0,
    arrowSize: 0.12,
    labelColor: 0xff9800,
    lineType: 'solid',
  },
  CLEANING: {
    tubeRadius: 0.05,
    dashSize: 0.25,
    gapSize: 0.25,
    arrowSpacing: 1.5,
    arrowSize: 0.1,
    labelColor: 0x2196f3,
    lineType: 'dashed',
  },
  DOG_PATH: {
    tubeRadius: 0.045,
    dashSize: 0.35,
    gapSize: 0.18,
    arrowSpacing: 1.8,
    arrowSize: 0.095,
    labelColor: 0x4caf50,
    lineType: 'dashed-dotted',
  },
};

export class PathDrawingUtils {
  static createArrow(
    from: THREE.Vector3,
    to: THREE.Vector3,
    color: number,
    headSize = 0.15
  ): THREE.Group {
    const group = new THREE.Group();
    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    if (length < 0.01) return group;

    dir.normalize();
    const arrow = new THREE.ArrowHelper(dir, from, length, color, headSize, headSize * 0.6);
    group.add(arrow);

    return group;
  }

  static createTubePath(
    points: THREE.Vector3[],
    color: number,
    radius = 0.04,
    dashed = false
  ): THREE.Object3D {
    if (points.length < 2) return new THREE.Object3D();

    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);

    if (dashed) {
      const tubeGeo = new THREE.TubeGeometry(curve, points.length * 12, radius, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(tubeGeo, tubeMat);
      mesh.renderOrder = 50;
      return mesh;
    }

    const tubeGeo = new THREE.TubeGeometry(curve, points.length * 12, radius, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(tubeGeo, tubeMat);
    mesh.renderOrder = 40;
    return mesh;
  }

  static createDashedLine(
    points: THREE.Vector3[],
    color: number,
    dashSize = 0.2,
    gapSize = 0.12,
    opacity = 0.85
  ): THREE.Line {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color,
      dashSize,
      gapSize,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    line.renderOrder = 60;
    return line;
  }

  static createPathLabel(
    position: THREE.Vector3,
    text: string,
    color: number,
    bgColor?: number
  ): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    if (bgColor !== undefined) {
      const br = ((bgColor >> 16) & 0xff);
      const bg2 = ((bgColor >> 8) & 0xff);
      const bb = (bgColor & 0xff);
      ctx.fillStyle = `rgba(${br}, ${bg2}, ${bb}, 0.92)`;
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    }
    ctx.beginPath();
    ctx.roundRect(12, 12, 360, 104, 16);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    const r = ((color >> 16) & 0xff);
    const g = ((color >> 8) & 0xff);
    const b = (color & 0xff);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(12, 12, 360, 104, 16);
    ctx.stroke();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.font = 'bold 46px "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(3.2, 1.1, 1);
    sprite.renderOrder = 998;
    return sprite;
  }

  static createPathArrows(
    points: THREE.Vector3[],
    color: number,
    spacing = 1.5,
    arrowSize = 0.08
  ): THREE.Group {
    const group = new THREE.Group();
    if (points.length < 2) return group;

    let accumulated = 0;
    for (let i = 1; i < points.length; i++) {
      const seg = new THREE.Vector3().subVectors(points[i], points[i - 1]);
      const segLen = seg.length();

      let offset = accumulated === 0 ? spacing * 0.5 : 0;
      while (offset < segLen) {
        const t = offset / segLen;
        const pos = new THREE.Vector3().lerpVectors(points[i - 1], points[i], t);
        const dir = seg.clone().normalize();

        const arrowGeo = new THREE.ConeGeometry(arrowSize, arrowSize * 2.2, 6);
        const arrowMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.copy(pos);
        arrow.position.y += 0.15;
        arrow.renderOrder = 70;

        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        arrow.quaternion.copy(quat);

        group.add(arrow);
        offset += spacing;
      }
      accumulated += segLen;
    }

    return group;
  }

  static createNodeMarker(
    position: THREE.Vector3,
    color: number,
    size = 0.1
  ): THREE.Group {
    const group = new THREE.Group();

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(size, 16, 16),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      })
    );
    sphere.position.copy(position);
    sphere.renderOrder = 80;
    group.add(sphere);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(size * 1.3, size * 1.8, 32),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.position.y += 0.01;
    ring.renderOrder = 75;
    group.add(ring);

    return group;
  }
}

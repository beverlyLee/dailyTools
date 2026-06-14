import * as THREE from 'three';

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
        opacity: 0.8,
      });
      return new THREE.Mesh(tubeGeo, tubeMat);
    }

    const tubeGeo = new THREE.TubeGeometry(curve, points.length * 12, radius, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
    });
    return new THREE.Mesh(tubeGeo, tubeMat);
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
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }

  static createPathLabel(
    position: THREE.Vector3,
    text: string,
    color: number,
    bgColor?: number
  ): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;

    if (bgColor !== undefined) {
      const br = ((bgColor >> 16) & 0xff);
      const bg2 = ((bgColor >> 8) & 0xff);
      const bb = (bgColor & 0xff);
      ctx.fillStyle = `rgba(${br}, ${bg2}, ${bb}, 0.85)`;
    } else {
      ctx.fillStyle = 'rgba(30, 30, 50, 0.85)';
    }
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 80, 12);
    ctx.fill();

    const r = ((color >> 16) & 0xff);
    const g = ((color >> 8) & 0xff);
    const b = (color & 0xff);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 80, 12);
    ctx.stroke();

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.font = 'bold 32px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(2, 0.75, 1);
    sprite.renderOrder = 10;
    return sprite;
  }

  static createPathArrows(
    points: THREE.Vector3[],
    color: number,
    spacing = 1.5
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

        const arrowGeo = new THREE.ConeGeometry(0.08, 0.2, 6);
        const arrowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.copy(pos);
        arrow.position.y += 0.12;

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
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    sphere.position.copy(position);
    group.add(sphere);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(size * 1.3, size * 1.7, 24),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.position.y += 0.005;
    group.add(ring);

    return group;
  }
}

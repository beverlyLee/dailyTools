<script>
  import * as THREE from 'three';
  import { createNoise3D } from 'simplex-noise';

  export let scene;
  export let sliceY = 0;

  let initialized = false;
  let foodGroup = new THREE.Group();
  let slicePlane;
  let solidMaterial;
  let innerMaterial;
  let sideInnerMaterial;
  let noise3D;
  let wireframeMesh;
  let topCapMesh;
  let innerCylinderMesh;
  let outerCylinderMesh;

  const RADIUS = 1.2;
  const HEIGHT = 2.5;
  const SEGMENTS = 96;
  const RADIAL_RINGS = 18;
  const TEXTURE_SIZE = 512;

  const COLOR_SCHEME = {
    fiberHigh:  [205, 75, 50],
    fiberMid:   [145, 55, 40],
    muscleLow:  [95, 32, 24],
    void:       [45, 14, 10],
    coreDarken: 0.3,
  };

  let textureDirty = true;
  let rebuildScheduled = false;
  let lastSliceKey = -1;
  const SLICE_STEP = 0.01;

  function scheduleTextureRebuild() {
    if (rebuildScheduled) return;
    rebuildScheduled = true;
    requestAnimationFrame(() => {
      rebuildScheduled = false;
      if (!textureDirty) return;
      textureDirty = false;
      rebuildTextures();
    });
  }

  function fbm3D(x, y, z, octaves = 6) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value / maxValue;
  }

  function fbmDirectional(x, y, z, octaves, dirX, dirY, dirZ) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      const sx = x * frequency * dirX;
      const sy = y * frequency * dirY;
      const sz = z * frequency * dirZ;
      value += amplitude * noise3D(sx, sy, sz);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value / maxValue;
  }

  function colorFromNoise(combined) {
    const c = COLOR_SCHEME;
    if (combined > 0.2) {
      const fi = (combined - 0.2) / 0.8;
      return [
        Math.floor(c.fiberHigh[0] - fi * (c.fiberHigh[0] - c.fiberMid[0])),
        Math.floor(c.fiberHigh[1] - fi * (c.fiberHigh[1] - c.fiberMid[1])),
        Math.floor(c.fiberHigh[2] - fi * (c.fiberHigh[2] - c.fiberMid[2])),
      ];
    } else if (combined > 0.0) {
      const intensity = (combined + 0.2) / 0.4;
      return [
        Math.floor(c.fiberMid[0] - intensity * (c.fiberMid[0] - c.muscleLow[0])),
        Math.floor(c.fiberMid[1] - intensity * (c.fiberMid[1] - c.muscleLow[1])),
        Math.floor(c.fiberMid[2] - intensity * (c.fiberMid[2] - c.muscleLow[2])),
      ];
    } else if (combined > -0.2) {
      const intensity = (combined + 0.2) / 0.2;
      return [
        Math.floor(c.muscleLow[0] - intensity * (c.muscleLow[0] - c.void[0])),
        Math.floor(c.muscleLow[1] - intensity * (c.muscleLow[1] - c.void[1])),
        Math.floor(c.muscleLow[2] - intensity * (c.muscleLow[2] - c.void[2])),
      ];
    } else {
      const vi = Math.min(1, (-combined - 0.2) / 0.3);
      return [
        Math.floor(c.void[0] - vi * 15),
        Math.floor(c.void[1] - vi * 6),
        Math.floor(c.void[2] - vi * 5),
      ];
    }
  }

  function buildFoodTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#8B4513');
    gradient.addColorStop(0.3, '#A0522D');
    gradient.addColorStop(0.6, '#CD853F');
    gradient.addColorStop(1, '#8B4513');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.4 + 0.1;
      const hue = 20 + Math.random() * 30;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 60%, ${20 + Math.random() * 20}%, ${alpha})`;
      ctx.fill();
    }

    for (let i = 0; i < 300; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = Math.random() * 30 + 10;
      const angle = Math.random() * Math.PI * 2;
      ctx.strokeStyle = `rgba(60, 20, 10, ${Math.random() * 0.3 + 0.1})`;
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 2);
    texture.anisotropy = 8;
    return texture;
  }

  function buildPolarInnerTexture(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const lastCol = new Uint8ClampedArray(size * 4);

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const idx = (py * size + px) * 4;

        const u = px / size;
        const v = py / size;

        if (u > 1.0) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
          continue;
        }

        const dist = u;
        const angle = v * Math.PI * 2;

        const r = dist * 3;
        const ns = sliceY * 4;

        const radialNoise = fbmDirectional(
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          ns,
          6,
          1.0, 1.0, 1.0
        );

        const ringNoise = fbm3D(angle * 4, r * 0.6, ns * 0.7, 4);

        const radialBias = dist;
        const combined = radialNoise * (0.55 + radialBias * 0.45) + ringNoise * (0.45 - radialBias * 0.25);

        const [cr, cg, cb] = colorFromNoise(combined);

        let fr = cr, fg = cg, fb = cb;
        if (dist < 0.15) {
          const cf = 1.0 - (dist / 0.15) * COLOR_SCHEME.coreDarken;
          fr = Math.floor(cr * cf);
          fg = Math.floor(cg * cf);
          fb = Math.floor(cb * cf);
        }

        data[idx] = fr;
        data[idx + 1] = fg;
        data[idx + 2] = fb;
        data[idx + 3] = 255;

        if (px === 0) {
          const lidx = py * 4;
          lastCol[lidx] = fr;
          lastCol[lidx + 1] = fg;
          lastCol[lidx + 2] = fb;
          lastCol[lidx + 3] = 255;
        }
      }
    }

    for (let py = 0; py < size; py++) {
      const px = size - 1;
      const idx = (py * size + px) * 4;
      const lidx = py * 4;
      data[idx] = lastCol[lidx];
      data[idx + 1] = lastCol[lidx + 1];
      data[idx + 2] = lastCol[lidx + 2];
      data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 16;
    texture.needsUpdate = true;
    return texture;
  }

  function buildSideInnerTexture(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = `rgb(${COLOR_SCHEME.muscleLow[0]}, ${COLOR_SCHEME.muscleLow[1]}, ${COLOR_SCHEME.muscleLow[2]})`;
    ctx.fillRect(0, 0, width, height);

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      const vNorm = y / height;
      const brightStrip = Math.pow(Math.max(0, Math.sin(vNorm * Math.PI * 11) * 0.5 + 0.5), 1.6);
      const darkStrip  = Math.pow(Math.max(0, Math.sin(vNorm * Math.PI * 11 + 1.7) * 0.5 + 0.5), 1.6);
      const yMod = (brightStrip - darkStrip) * 0.45;

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * Math.PI * 2 * 3;
        const cylY = (y / height) * 5;
        const ns = sliceY * 4;

        const fiberNoise = fbmDirectional(theta * 0.35, cylY * 2.0, ns, 6, 0.4, 2.2, 0.6);
        const layerNoise = fbm3D(theta * 0.25, cylY * 2.2, ns * 0.5, 4);

        const bandPhase = (y / height) * 22 + Math.sin(theta * 0.5) * 0.7;
        const band = Math.sin(bandPhase) * 0.3;

        const stripeY = (y / height) * 16;
        const stripeCore = Math.sin(stripeY) * 0.5;
        const stripeMod = Math.sin(stripeY * 0.57 + 1.3) * 0.22;
        const stripe = Math.max(0, stripeCore + stripeMod - 0.05);

        const combined = fiberNoise * 0.45 + layerNoise * 0.15 + band * 0.12 + stripe * 0.18 + yMod * 0.15;

        const idx = (y * width + x) * 4;
        const [cr, cg, cb] = colorFromNoise(combined);

        const bandBright = Math.max(0, band) * 35;
        const stripeBright = stripe * 60;
        const yModBright = Math.max(0, yMod) * 70;

        data[idx] = Math.min(255, cr + bandBright + stripeBright + yModBright);
        data[idx + 1] = Math.min(255, cg + bandBright * 0.5 + stripeBright * 0.4 + yModBright * 0.5);
        data[idx + 2] = Math.min(255, cb + bandBright * 0.3 + stripeBright * 0.25 + yModBright * 0.35);

        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 16;
    texture.needsUpdate = true;
    return texture;
  }

  function rebuildTextures() {
    if (!topCapMesh || !innerCylinderMesh) return;
    const newPolarTexture = buildPolarInnerTexture(TEXTURE_SIZE);
    if (topCapMesh.material.map) topCapMesh.material.map.dispose();
    topCapMesh.material.map = newPolarTexture;
    topCapMesh.material.needsUpdate = true;

    const newSideTexture = buildSideInnerTexture(TEXTURE_SIZE, TEXTURE_SIZE / 2);
    if (innerCylinderMesh.material.map) innerCylinderMesh.material.map.dispose();
    innerCylinderMesh.material.map = newSideTexture;
    innerCylinderMesh.material.needsUpdate = true;
  }

  function buildPolarTopCapGeometry(radius, segments, rings) {
    const positions = [];
    const uvs = [];
    const normals = [];
    const indices = [];

    for (let ring = 0; ring <= rings; ring++) {
      const r = (ring / rings) * radius;
      const u = ring / rings;
      for (let seg = 0; seg < segments; seg++) {
        const angle = (seg / segments) * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const v = seg / segments;
        positions.push(x, 0, z);
        uvs.push(u, v);
        normals.push(0, 1, 0);
      }
    }

    for (let ring = 0; ring < rings; ring++) {
      for (let seg = 0; seg < segments; seg++) {
        const a = ring * segments + seg;
        const b = ring * segments + ((seg + 1) % segments);
        const c = (ring + 1) * segments + seg;
        const d = (ring + 1) * segments + ((seg + 1) % segments);
        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setIndex(indices);
    return geom;
  }

  function buildFoodModel() {
    noise3D = createNoise3D();

    const foodTexture = buildFoodTexture();

    solidMaterial = new THREE.MeshStandardMaterial({
      map: foodTexture,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.FrontSide
    });

    const polarInnerTexture = buildPolarInnerTexture(TEXTURE_SIZE);
    innerMaterial = new THREE.MeshStandardMaterial({
      map: polarInnerTexture,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const sideInnerTexture = buildSideInnerTexture(TEXTURE_SIZE, TEXTURE_SIZE / 2);
    sideInnerMaterial = new THREE.MeshStandardMaterial({
      map: sideInnerTexture,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.BackSide
    });

    const cylinderGeom = new THREE.CylinderGeometry(RADIUS, RADIUS, HEIGHT, SEGMENTS, 1, false);
    outerCylinderMesh = new THREE.Mesh(cylinderGeom, solidMaterial);
    outerCylinderMesh.name = 'cylinder';

    const innerCylinderGeom = new THREE.CylinderGeometry(RADIUS * 0.999, RADIUS * 0.999, HEIGHT, SEGMENTS, 1, true);
    innerCylinderMesh = new THREE.Mesh(innerCylinderGeom, sideInnerMaterial);
    innerCylinderMesh.name = 'innerCylinder';

    slicePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const topCapGeom = buildPolarTopCapGeometry(RADIUS, SEGMENTS, RADIAL_RINGS);
    topCapMesh = new THREE.Mesh(topCapGeom, innerMaterial);
    topCapMesh.name = 'topCap';

    foodGroup.add(outerCylinderMesh);
    foodGroup.add(innerCylinderMesh);
    foodGroup.add(topCapMesh);

    outerCylinderMesh.material.clippingPlanes = [slicePlane];
    outerCylinderMesh.material.clipShadows = true;
    innerCylinderMesh.material.clippingPlanes = [slicePlane];
    innerCylinderMesh.material.clipShadows = true;

    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      clippingPlanes: [slicePlane],
      side: THREE.FrontSide
    });
    wireframeMesh = new THREE.Mesh(new THREE.BufferGeometry(), wireframeMat);
    wireframeMesh.name = 'wireframe';
    foodGroup.add(wireframeMesh);

    scene.add(foodGroup);
  }

  function updateSlice() {
    if (!slicePlane) return;

    const minY = -HEIGHT / 2;
    const maxY = HEIGHT / 2;
    const newY = minY + sliceY * (maxY - minY);
    slicePlane.constant = -newY;

    if (topCapMesh) {
      topCapMesh.position.y = newY;
      topCapMesh.rotation.x = -Math.PI / 2;
    }

    if (wireframeMesh) {
      wireframeMesh.geometry.dispose();

      const visibleHeight = Math.max(0.01, newY - minY);
      const centerY = (minY + newY) / 2;

      const newWireframeGeom = new THREE.CylinderGeometry(
        RADIUS * 1.002, RADIUS * 1.002,
        visibleHeight * 1.002,
        SEGMENTS, 1, true
      );
      newWireframeGeom.translate(0, centerY, 0);
      wireframeMesh.geometry = newWireframeGeom;
    }

    const sliceKey = Math.floor(sliceY / SLICE_STEP);
    if (sliceKey !== lastSliceKey) {
      lastSliceKey = sliceKey;
      textureDirty = true;
      scheduleTextureRebuild();
    }
  }

  $: {
    if (scene && !initialized) {
      initialized = true;
      buildFoodModel();
      updateSlice();
    }
    if (slicePlane) updateSlice();
  }
</script>

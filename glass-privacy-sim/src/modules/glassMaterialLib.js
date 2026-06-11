import * as THREE from 'three';

const GLASS_TYPES = {
  clear: {
    name: '普通透明玻璃',
    ior: 1.52,
    roughness: 0.0,
    transmission: 0.96,
    thickness: 0.004,
    normalStrength: 0.0,
    blurRadius: 0.0,
    lightTransmittance: 0.92,
    privacyLevel: 0.0,
    silhouetteVisibility: 1.0,
    penetrationProb: 0.98,
    description: '标准透明浮法玻璃，无任何隐私保护'
  },
  ribbed: {
    name: '长虹玻璃',
    ior: 1.52,
    roughness: 0.15,
    transmission: 0.82,
    thickness: 0.006,
    normalStrength: 0.55,
    blurRadius: 4.0,
    lightTransmittance: 0.72,
    privacyLevel: 0.7,
    silhouetteVisibility: 0.25,
    penetrationProb: 0.12,
    normalPattern: 'ribbed',
    description: '竖条纹压花，透光不透影，卫生间首选'
  },
  frosted: {
    name: '磨砂玻璃',
    ior: 1.52,
    roughness: 0.75,
    transmission: 0.68,
    thickness: 0.005,
    normalStrength: 0.85,
    blurRadius: 8.0,
    lightTransmittance: 0.58,
    privacyLevel: 0.88,
    silhouetteVisibility: 0.1,
    penetrationProb: 0.03,
    normalPattern: 'frosted',
    description: '均匀磨砂，高隐私但采光损失较大'
  },
  embossed: {
    name: '压花玻璃',
    ior: 1.52,
    roughness: 0.35,
    transmission: 0.78,
    thickness: 0.006,
    normalStrength: 0.65,
    blurRadius: 5.5,
    lightTransmittance: 0.68,
    privacyLevel: 0.75,
    silhouetteVisibility: 0.18,
    penetrationProb: 0.08,
    normalPattern: 'embossed',
    description: '花纹压花，兼顾隐私与采光'
  },
  wired: {
    name: '夹丝玻璃',
    ior: 1.52,
    roughness: 0.2,
    transmission: 0.80,
    thickness: 0.008,
    normalStrength: 0.35,
    blurRadius: 3.0,
    lightTransmittance: 0.74,
    privacyLevel: 0.5,
    silhouetteVisibility: 0.4,
    penetrationProb: 0.25,
    normalPattern: 'wired',
    description: '内置金属丝网，安全性与适度隐私'
  }
};

function generateNormalMap(pattern, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let nx = 0.5, ny = 0.5, nz = 1.0;

      if (pattern === 'ribbed') {
        const stripe = Math.sin(x * 0.15) * 0.5 + 0.5;
        const edge = Math.pow(stripe, 3.0);
        nx = 0.5 + (edge - 0.5) * 0.8;
        ny = 0.5;
        nz = 1.0;
      } else if (pattern === 'frosted') {
        nx = 0.5 + (Math.random() - 0.5) * 0.7;
        ny = 0.5 + (Math.random() - 0.5) * 0.7;
        nz = 0.6 + Math.random() * 0.3;
      } else if (pattern === 'embossed') {
        const fx = Math.sin(x * 0.08) * Math.cos(y * 0.06);
        const fy = Math.cos(x * 0.06) * Math.sin(y * 0.08);
        const f = fx * fy;
        nx = 0.5 + f * 0.6;
        ny = 0.5 + (fx - fy) * 0.4;
        nz = 1.0 - Math.abs(f) * 0.3;
      } else if (pattern === 'wired') {
        const gridX = (x % 40 < 2) || (x % 40 > 38) ? 1 : 0;
        const gridY = (y % 40 < 2) || (y % 40 > 38) ? 1 : 0;
        const isWire = gridX || gridY;
        if (isWire) {
          nx = 0.3 + Math.random() * 0.1;
          ny = 0.3 + Math.random() * 0.1;
          nz = 0.3;
        } else {
          nx = 0.5 + (Math.random() - 0.5) * 0.08;
          ny = 0.5 + (Math.random() - 0.5) * 0.08;
          nz = 0.95;
        }
      }

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      imgData.data[idx]     = ((nx / len) * 0.5 + 0.5) * 255;
      imgData.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      imgData.data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      imgData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function generateAlphaMap(pattern, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (pattern === 'ribbed') {
    for (let x = 0; x < size; x++) {
      const v = Math.sin(x * 0.15) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255,255,255,${v})`;
      ctx.fillRect(x, 0, 1, size);
    }
  } else if (pattern === 'frosted') {
    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = 160 + Math.random() * 60;
      imgData.data[i * 4] = v;
      imgData.data[i * 4 + 1] = v;
      imgData.data[i * 4 + 2] = v;
      imgData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (pattern === 'embossed') {
    const imgData = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const f = Math.sin(x * 0.08) * Math.cos(y * 0.06) * 0.3 + 0.7;
        const v = f * 255;
        imgData.data[(y * size + x) * 4] = v;
        imgData.data[(y * size + x) * 4 + 1] = v;
        imgData.data[(y * size + x) * 4 + 2] = v;
        imgData.data[(y * size + x) * 4 + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (pattern === 'wired') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    for (let x = 0; x < size; x += 40) {
      ctx.fillRect(x, 0, 2, size);
    }
    for (let y = 0; y < size; y += 40) {
      ctx.fillRect(0, y, size, 2);
    }
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

const normalMapCache = {};
const alphaMapCache = {};

function getNormalMap(type) {
  const glassType = GLASS_TYPES[type];
  if (!glassType.normalPattern) return null;
  if (!normalMapCache[type]) {
    normalMapCache[type] = generateNormalMap(glassType.normalPattern);
  }
  return normalMapCache[type];
}

function getAlphaMap(type) {
  const glassType = GLASS_TYPES[type];
  if (!glassType.normalPattern) return null;
  if (!alphaMapCache[type]) {
    alphaMapCache[type] = generateAlphaMap(glassType.normalPattern);
  }
  return alphaMapCache[type];
}

function createGlassMaterial(type) {
  const glass = GLASS_TYPES[type];
  const normalMap = getNormalMap(type);

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xffffff),
    metalness: 0.0,
    roughness: glass.roughness,
    transmission: glass.transmission,
    thickness: glass.thickness,
    ior: glass.ior,
    transparent: true,
    opacity: type === 'clear' ? 0.15 : 0.4,
    side: THREE.DoubleSide,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(glass.normalStrength, glass.normalStrength),
    envMapIntensity: 0.3,
    clearcoat: 0.1,
    clearcoatRoughness: glass.roughness * 0.5,
  });

  material.userData = { glassType: type, ...glass };
  return material;
}

export { GLASS_TYPES, createGlassMaterial, getNormalMap, getAlphaMap };

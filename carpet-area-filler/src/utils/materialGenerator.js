import * as THREE from 'three';

const CARPET_TYPES = {
  wool: {
    name: '羊毛',
    pileHeight: 0.015,
    color: '#d4a574',
    roughness: 0.9,
    sheen: 0.1,
    patternScale: 80,
    description: '柔软舒适，天然光泽'
  },
  nylon: {
    name: '尼龙',
    pileHeight: 0.008,
    color: '#4a90d9',
    roughness: 0.6,
    sheen: 0.4,
    patternScale: 120,
    description: '耐磨耐用，易于清洁'
  },
  sisal: {
    name: '剑麻',
    pileHeight: 0.005,
    color: '#c4a882',
    roughness: 1.0,
    sheen: 0.0,
    patternScale: 60,
    description: '天然材质，粗犷质感'
  }
};

export function getCarpetTypes() {
  return Object.entries(CARPET_TYPES).map(([key, value]) => ({
    id: key,
    ...value
  }));
}

export function createCarpetMaterial(type = 'wool', color = null) {
  const config = CARPET_TYPES[type] || CARPET_TYPES.wool;
  const baseColor = color || config.color;
  
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  const baseColorObj = new THREE.Color(baseColor);
  const r = Math.floor(baseColorObj.r * 255);
  const g = Math.floor(baseColorObj.g * 255);
  const b = Math.floor(baseColorObj.b * 255);
  
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, 512, 512);
  
  const scale = config.patternScale;
  
  if (type === 'wool') {
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 2 + 1;
      const shade = Math.random() * 40 - 20;
      
      ctx.fillStyle = `rgba(${Math.min(255, Math.max(0, r + shade))}, ${Math.min(255, Math.max(0, g + shade))}, ${Math.min(255, Math.max(0, b + shade))}, 0.3)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    for (let i = 0; i < 20; i++) {
      const startX = Math.random() * 512;
      const startY = Math.random() * 512;
      ctx.strokeStyle = `rgba(${r + 30}, ${g + 20}, ${b + 10}, 0.1)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(
        startX + Math.random() * 100 - 50, startY + Math.random() * 100,
        startX + Math.random() * 200 - 100, startY + Math.random() * 200,
        startX + Math.random() * 300 - 150, startY + Math.random() * 300
      );
      ctx.stroke();
    }
  } else if (type === 'nylon') {
    for (let y = 0; y < 512; y += 4) {
      for (let x = 0; x < 512; x += 4) {
        const shade = (Math.sin(x * 0.1) * Math.cos(y * 0.1) * 20);
        ctx.fillStyle = `rgba(${Math.min(255, Math.max(0, r + shade))}, ${Math.min(255, Math.max(0, g + shade))}, ${Math.min(255, Math.max(0, b + shade))}, 0.8)`;
        ctx.fillRect(x, y, 3, 3);
      }
    }
  } else if (type === 'sisal') {
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const length = Math.random() * 20 + 5;
      const angle = Math.random() * Math.PI;
      const shade = Math.random() * 60 - 30;
      
      ctx.strokeStyle = `rgba(${Math.min(255, Math.max(0, r + shade))}, ${Math.min(255, Math.max(0, g + shade))}, ${Math.min(255, Math.max(0, b + shade))}, 0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
    
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = `rgba(${r - 40}, ${g - 30}, ${b - 20}, 0.3)`;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: baseColor,
    roughness: config.roughness,
    metalness: 0.0,
    bumpMap: texture,
    bumpScale: config.pileHeight * 0.5,
    side: THREE.DoubleSide
  });
  
  return {
    material,
    texture,
    pileHeight: config.pileHeight,
    config: { ...config, color: baseColor }
  };
}

export function createBumpMap(type = 'wool') {
  const config = CARPET_TYPES[type] || CARPET_TYPES.wool;
  
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  
  if (type === 'wool') {
    for (let i = 0; i < 10000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 2 + 0.5;
      const shade = Math.floor(Math.random() * 60 + 100);
      
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'nylon') {
    for (let y = 0; y < 256; y += 2) {
      for (let x = 0; x < 256; x += 2) {
        const shade = 128 + Math.floor(Math.sin(x * 0.2) * Math.cos(y * 0.2) * 30);
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'sisal') {
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const length = Math.random() * 15 + 3;
      const angle = Math.random() * Math.PI;
      const shade = Math.floor(Math.random() * 80 + 90);
      
      ctx.strokeStyle = `rgb(${shade}, ${shade}, ${shade})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  
  return texture;
}

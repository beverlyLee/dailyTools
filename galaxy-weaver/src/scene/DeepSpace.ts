import * as THREE from 'three';

export class DeepSpace {
  private texture: THREE.DataTexture;
  private width: number;
  private height: number;
  private sourcePosition: THREE.Vector2;

  constructor(width: number = 4096, height: number = 4096) {
    this.width = width;
    this.height = height;
    this.sourcePosition = new THREE.Vector2(0.56, 0.5);
    this.texture = this.generateNebulaField();
  }

  private noise2D(x: number, y: number, seed: number = 0): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  private smoothNoise(x: number, y: number, seed: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    
    const n00 = this.noise2D(x0, y0, seed);
    const n10 = this.noise2D(x0 + 1, y0, seed);
    const n01 = this.noise2D(x0, y0 + 1, seed);
    const n11 = this.noise2D(x0 + 1, y0 + 1, seed);
    
    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;
    
    return nx0 * (1 - sy) + nx1 * sy;
  }

  private fbm(x: number, y: number, seed: number, octaves: number = 6): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.smoothNoise(x * frequency, y * frequency, seed + i * 100);
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value;
  }

  private generateNebulaField(): THREE.DataTexture {
    const size = this.width * this.height;
    const data = new Uint8Array(size * 4);

    for (let i = 0; i < size; i++) {
      const i4 = i * 4;
      data[i4] = 1;
      data[i4 + 1] = 2;
      data[i4 + 2] = 6;
      data[i4 + 3] = 255;
    }

    const nebulaCount = 12;
    for (let n = 0; n < nebulaCount; n++) {
      const cx = Math.random();
      const cy = Math.random();
      const nebulaRadius = 0.06 + Math.random() * 0.12;
      
      const colorType = Math.floor(Math.random() * 3);
      let baseR: number, baseG: number, baseB: number;
      if (colorType === 0) {
        baseR = 180; baseG = 130; baseB = 80;
      } else if (colorType === 1) {
        baseR = 80; baseG = 130; baseB = 190;
      } else {
        baseR = 130; baseG = 80; baseB = 170;
      }
      
      const seed = n * 1000;
      
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const ux = x / this.width;
          const uy = y / this.height;
          
          const dx = ux - cx;
          const dy = uy - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < nebulaRadius * 2) {
            const noiseVal = this.fbm(ux * 10, uy * 10, seed, 5);
            const filamentNoise = this.fbm(ux * 25 + n * 5, uy * 25 + n * 3, seed + 500, 4);
            
            const shape = Math.pow(Math.max(0, 1 - dist / (nebulaRadius * 1.5)), 1.3);
            
            const filament = Math.max(0, filamentNoise - 0.35) * 2.2;
            const intensity = shape * (0.25 + 0.75 * noiseVal) * (0.4 + 0.6 * filament);
            
            if (intensity > 0.008) {
              const idx = (y * this.width + x) * 4;
              const colorVar = noiseVal;
              
              data[idx] = Math.min(255, data[idx] + Math.floor(baseR * intensity * colorVar));
              data[idx + 1] = Math.min(255, data[idx + 1] + Math.floor(baseG * intensity * (0.75 + 0.25 * colorVar)));
              data[idx + 2] = Math.min(255, data[idx + 2] + Math.floor(baseB * intensity * (0.55 + 0.45 * colorVar)));
            }
          }
          
          if (dist < nebulaRadius * 1.2) {
            const starNoise = this.noise2D(x * 0.08 + n * 10, y * 0.08 + n * 15, seed + 200);
            if (starNoise > 0.992) {
              const idx = (y * this.width + x) * 4;
              const brightness = (starNoise - 0.992) * 125;
              data[idx] = Math.min(255, data[idx] + Math.floor(180 * brightness));
              data[idx + 1] = Math.min(255, data[idx + 1] + Math.floor(200 * brightness));
              data[idx + 2] = Math.min(255, data[idx + 2] + Math.floor(240 * brightness));
            }
          }
        }
      }
    }

    const sourceX = Math.floor(this.sourcePosition.x * this.width);
    const sourceY = Math.floor(this.sourcePosition.y * this.height);
    const sourceRadius = Math.floor(0.015 * Math.min(this.width, this.height));
    const sourceSeed = 12345;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dx = x - sourceX;
        const dy = y - sourceY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < sourceRadius * 6) {
          const ux = x / this.width;
          const uy = y / this.height;
          
          const spiralAngle = Math.atan2(dy, dx);
          const spiralNoise = this.fbm(
            ux * 30 + Math.cos(spiralAngle * 2) * 0.4,
            uy * 30 + Math.sin(spiralAngle * 2) * 0.4,
            sourceSeed,
            5
          );
          
          const armNoise = Math.sin(spiralAngle * 4 + dist * 0.03) * 0.5 + 0.5;
          
          let radialFalloff = Math.max(0, 1 - dist / (sourceRadius * 4.5));
          radialFalloff = Math.pow(radialFalloff, 1.8);
          
          let coreIntensity = Math.max(0, 1 - dist / (sourceRadius * 0.8));
          coreIntensity = Math.pow(coreIntensity, 2.0) * 3.5;
          
          const armIntensity = radialFalloff * (0.5 + 0.5 * armNoise) * spiralNoise * 1.2;
          const totalIntensity = Math.max(coreIntensity, armIntensity);
          
          if (totalIntensity > 0.003) {
            const idx = (y * this.width + x) * 4;
            
            const colorMix = Math.min(1, dist / (sourceRadius * 2.5));
            const r = Math.floor(255 * (0.95 + 0.05 * colorMix));
            const g = Math.floor(250 * (0.88 + 0.12 * colorMix));
            const b = Math.floor(220 * (0.75 + 0.25 * colorMix));
            
            data[idx] = Math.min(255, data[idx] + Math.floor(r * totalIntensity));
            data[idx + 1] = Math.min(255, data[idx + 1] + Math.floor(g * totalIntensity));
            data[idx + 2] = Math.min(255, data[idx + 2] + Math.floor(b * totalIntensity));
          }
        }
      }
    }

    const foregroundStars = 8000;
    for (let i = 0; i < foregroundStars; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      const idx = (y * this.width + x) * 4;
      
      const brightness = Math.random();
      
      let r: number, g: number, b: number;
      const colorRoll = Math.random();
      if (colorRoll < 0.55) {
        r = 255; g = 255; b = 255;
      } else if (colorRoll < 0.82) {
        r = 210; g = 235; b = 255;
      } else {
        r = 255; g = 240; b = 220;
      }
      
      const intensity = Math.floor(50 + brightness * 205);
      data[idx] = Math.min(255, data[idx] + Math.floor(r * intensity / 255));
      data[idx + 1] = Math.min(255, data[idx + 1] + Math.floor(g * intensity / 255));
      data[idx + 2] = Math.min(255, data[idx + 2] + Math.floor(b * intensity / 255));
      data[idx + 3] = 255;
    }

    const texture = new THREE.DataTexture(
      data,
      this.width,
      this.height,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return texture;
  }

  getTexture(): THREE.Texture {
    return this.texture;
  }

  getSourcePosition(): THREE.Vector2 {
    return this.sourcePosition.clone();
  }

  update(_time: number): void {
  }

  resize(_width: number, _height: number): void {
  }
}

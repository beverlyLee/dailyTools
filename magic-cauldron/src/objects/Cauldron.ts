import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

const vertexShader = `
  uniform float uTime;
  uniform float uNoiseScale;
  uniform float uWaveSpeed;
  uniform float uWaveHeight;
  uniform float uBoilIntensity;
  uniform float uLiquidRadius;
  
  varying vec2 vUv;
  varying float vNoise;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDistFromCenter;
  
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    vUv = uv;
    vNormal = normal;
    vPosition = position;
    
    vDistFromCenter = length(position.xy);
    
    float radialMask = 1.0 - smoothstep(uLiquidRadius * 0.7, uLiquidRadius * 0.95, vDistFromCenter);
    
    float noise1 = snoise(vec3(position.x * uNoiseScale, position.y * uNoiseScale, uTime * uWaveSpeed));
    float noise2 = snoise(vec3(position.x * uNoiseScale * 2.0, position.y * uNoiseScale * 2.0, uTime * uWaveSpeed * 1.5 + 100.0));
    float noise3 = snoise(vec3(position.x * uNoiseScale * 4.0, position.y * uNoiseScale * 4.0, uTime * uWaveSpeed * 2.0 + 200.0));
    
    float boilNoise = snoise(vec3(position.x * 8.0, position.y * 8.0, uTime * 4.0));
    boilNoise = max(boilNoise, 0.0) * uBoilIntensity * radialMask;
    
    float combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    vNoise = combinedNoise + boilNoise;
    
    vec3 newPosition = position;
    newPosition.z += combinedNoise * uWaveHeight * radialMask;
    newPosition.z += boilNoise * uWaveHeight * 1.5;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uTime;
  uniform float uGlowIntensity;
  uniform float uBoilIntensity;
  uniform float uLiquidRadius;
  
  varying vec2 vUv;
  varying float vNoise;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDistFromCenter;
  
  void main() {
    float edgeAlpha = 1.0 - smoothstep(uLiquidRadius * 0.92, uLiquidRadius * 0.98, vDistFromCenter);
    
    if (edgeAlpha < 0.01) discard;
    
    float depthFactor = smoothstep(-1.0, 0.5, vPosition.z + vNoise * 0.5);
    
    vec3 color1 = uColor;
    vec3 color2 = uColor2;
    
    float noiseFactor = (vNoise + 1.0) * 0.5;
    vec3 finalColor = mix(color1, color2, depthFactor * 0.6 + noiseFactor * 0.4);
    
    float boilGlow = max(vNoise * uBoilIntensity, 0.0);
    finalColor += color2 * boilGlow * 0.3;
    
    float edge = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
    finalColor += uColor * edge * uGlowIntensity;
    
    float centerGlow = 1.0 - length(vUv - 0.5) * 1.5;
    centerGlow = max(centerGlow, 0.0);
    finalColor += uColor2 * centerGlow * uGlowIntensity * 0.5;
    
    float sparkle = sin(vUv.x * 100.0 + uTime * 3.0) * sin(vUv.y * 100.0 + uTime * 2.5);
    sparkle = smoothstep(0.95, 1.0, sparkle);
    finalColor += vec3(1.0) * sparkle * 0.3 * uBoilIntensity;
    
    float finalAlpha = 0.92 * edgeAlpha;
    
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

export class Cauldron {
  group: THREE.Group;
  liquidMaterial: THREE.ShaderMaterial;
  private cauldronGroup: THREE.Group;
  private liquidMesh: THREE.Mesh;
  private innerGlow: THREE.Mesh;
  private cauldronRadius: number = 2;
  private liquidRadius: number;
  private noise3D = createNoise3D();
  private targetColor: THREE.Color;
  private targetColor2: THREE.Color;
  private currentColor: THREE.Color;
  private currentColor2: THREE.Color;
  private targetBoilIntensity: number = 0;
  private currentBoilIntensity: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.liquidRadius = this.cauldronRadius * 0.92;
    
    this.targetColor = new THREE.Color(0x8b0000);
    this.targetColor2 = new THREE.Color(0xff4444);
    this.currentColor = this.targetColor.clone();
    this.currentColor2 = this.targetColor2.clone();
    
    this.liquidMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: this.currentColor },
        uColor2: { value: this.currentColor2 },
        uNoiseScale: { value: 2.5 },
        uWaveSpeed: { value: 0.8 },
        uWaveHeight: { value: 0.15 },
        uGlowIntensity: { value: 0.8 },
        uBoilIntensity: { value: 0 },
        uLiquidRadius: { value: this.liquidRadius }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    this.cauldronGroup = this.createCauldron();
    this.liquidMesh = this.createLiquid();
    this.innerGlow = this.createInnerGlow();
    
    this.group.add(this.cauldronGroup);
    this.group.add(this.liquidMesh);
    this.group.add(this.innerGlow);
  }

  private createCauldron(): THREE.Group {
    const cauldronGroup = new THREE.Group();
    
    const bowlGeometry = new THREE.SphereGeometry(this.cauldronRadius, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const bowlMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      metalness: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    const bowl = new THREE.Mesh(bowlGeometry, bowlMaterial);
    bowl.rotation.x = Math.PI;
    bowl.userData.isCauldronPart = true;
    cauldronGroup.add(bowl);
    
    const rimGeometry = new THREE.TorusGeometry(this.cauldronRadius + 0.1, 0.15, 16, 64);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      metalness: 0.9,
      roughness: 0.2
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.05;
    rim.userData.isCauldronPart = true;
    cauldronGroup.add(rim);
    
    const legGeometry = new THREE.CylinderGeometry(0.15, 0.25, 1.2, 16);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x252535,
      metalness: 0.7,
      roughness: 0.4
    });
    
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      const angle = (i / 3) * Math.PI * 2;
      leg.position.x = Math.cos(angle) * 1.3;
      leg.position.z = Math.sin(angle) * 1.3;
      leg.position.y = -1.6;
      leg.userData.isCauldronPart = true;
      cauldronGroup.add(leg);
    }
    
    return cauldronGroup;
  }

  private createLiquid(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(this.liquidRadius, 128);
    
    const positions = geometry.attributes.position.array as Float32Array;
    const uvs = geometry.attributes.uv.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = 0;
      
      uvs[(i / 3) * 2] = (x / this.liquidRadius + 1) / 2;
      uvs[(i / 3) * 2 + 1] = (y / this.liquidRadius + 1) / 2;
    }
    
    geometry.computeVertexNormals();
    
    const mesh = new THREE.Mesh(geometry, this.liquidMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.2;
    
    return mesh;
  }

  private createInnerGlow(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.liquidRadius * 0.95, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: this.currentColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI;
    mesh.position.y = -0.3;
    return mesh;
  }

  setLiquidColor(color: THREE.Color, color2?: THREE.Color): void {
    this.targetColor.copy(color);
    if (color2) {
      this.targetColor2.copy(color2);
    } else {
      this.targetColor2.copy(color).offsetHSL(0.1, 0.2, 0.2);
    }
  }

  setBoilIntensity(intensity: number): void {
    this.targetBoilIntensity = Math.max(0, Math.min(1, intensity));
  }

  getLiquidRadius(): number {
    return this.liquidRadius;
  }

  update(time: number, delta: number): void {
    this.currentColor.lerp(this.targetColor, delta * 2);
    this.currentColor2.lerp(this.targetColor2, delta * 2);
    this.currentBoilIntensity += (this.targetBoilIntensity - this.currentBoilIntensity) * delta * 3;
    
    this.liquidMaterial.uniforms.uTime.value = time;
    this.liquidMaterial.uniforms.uColor.value.copy(this.currentColor);
    this.liquidMaterial.uniforms.uColor2.value.copy(this.currentColor2);
    this.liquidMaterial.uniforms.uBoilIntensity.value = this.currentBoilIntensity;
    
    (this.innerGlow.material as THREE.MeshBasicMaterial).color.copy(this.currentColor);
    (this.innerGlow.material as THREE.MeshBasicMaterial).opacity = 0.15 + this.currentBoilIntensity * 0.2;
    
    const glowScale = 1 + this.currentBoilIntensity * 0.1;
    this.innerGlow.scale.setScalar(glowScale);
  }

  getLiquidColor(): THREE.Color {
    return this.currentColor.clone();
  }

  getLiquidSurfaceY(): number {
    return this.liquidMesh.position.y;
  }

  dispose(): void {
    this.liquidMaterial.dispose();
    
    this.cauldronGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    
    this.liquidMesh.geometry.dispose();
    this.innerGlow.geometry.dispose();
    (this.innerGlow.material as THREE.Material).dispose();
  }
}

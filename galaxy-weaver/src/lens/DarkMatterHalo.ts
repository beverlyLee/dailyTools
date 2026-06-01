import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform vec2 uLensCenter;
  uniform float uEinsteinRadius;
  uniform float uLensStrength;
  uniform float uEllipticity;
  uniform float uShear;
  uniform float uTime;
  uniform vec2 uResolution;
  
  varying vec2 vUv;
  
  vec2 lensEquation(vec2 xi, vec2 center) {
    vec2 relPos = xi - center;
    float r = length(relPos);
    
    if (r < 0.00001) {
      return center;
    }
    
    vec2 xi_norm = relPos / r;
    
    float theta_E = uEinsteinRadius;
    
    float alpha_mono = theta_E * theta_E / r * uLensStrength;
    
    float phi = atan(relPos.y, relPos.x);
    float cos2phi = cos(2.0 * phi);
    float sin2phi = sin(2.0 * phi);
    
    float e = uEllipticity;
    float gamma = uShear;
    
    float alpha_t = -e * theta_E * cos2phi;
    float alpha_r =  e * theta_E * sin2phi;
    
    vec2 alpha_quad;
    alpha_quad.x = alpha_t * xi_norm.x - alpha_r * xi_norm.y;
    alpha_quad.y = alpha_r * xi_norm.x + alpha_t * xi_norm.y;
    
    vec2 alpha_shear;
    alpha_shear.x = -gamma * theta_E * cos2phi * xi_norm.x + gamma * theta_E * sin2phi * xi_norm.y;
    alpha_shear.y = -gamma * theta_E * sin2phi * xi_norm.x - gamma * theta_E * cos2phi * xi_norm.y;
    
    vec2 alpha_total = xi_norm * alpha_mono + alpha_quad + alpha_shear;
    
    vec2 source_pos = xi - alpha_total;
    
    return source_pos;
  }
  
  float magnification(vec2 xi, vec2 center) {
    vec2 relPos = xi - center;
    float r = length(relPos);
    
    if (r < 0.0001) return 1.0;
    
    float theta_E = uEinsteinRadius;
    
    float kappa = 0.5 * theta_E / r * uLensStrength;
    
    float phi = atan(relPos.y, relPos.x);
    float cos2phi = cos(2.0 * phi);
    float sin2phi = sin(2.0 * phi);
    
    float gamma_mono = 0.5 * theta_E / r * uLensStrength;
    
    float gamma_quad_cos = -uEllipticity * theta_E / r * cos2phi;
    float gamma_quad_sin =  uEllipticity * theta_E / r * sin2phi;
    
    float gamma_shear_cos = -uShear * theta_E / r * cos2phi;
    float gamma_shear_sin =  uShear * theta_E / r * sin2phi;
    
    float gamma1 = gamma_quad_cos + gamma_shear_cos;
    float gamma2 = gamma_quad_sin + gamma_shear_sin;
    
    float A = 1.0 - kappa - gamma1;
    float B = -gamma2;
    float C = -gamma2;
    float D = 1.0 - kappa + gamma1;
    
    float det = A * D - B * C;
    float mu = 1.0 / abs(det + 0.00001);
    
    return min(mu, 8.0);
  }
  
  float tangentialStretch(vec2 xi, vec2 center) {
    vec2 relPos = xi - center;
    float r = length(relPos);
    
    if (r < 0.0001) return 1.0;
    
    float theta_E = uEinsteinRadius;
    
    float kappa = 0.5 * theta_E / r * uLensStrength;
    float gamma = 0.5 * theta_E / r * uLensStrength + uShear * theta_E / r;
    
    float mu_t = 1.0 / (1.0 - kappa - gamma + 0.0001);
    
    return clamp(mu_t, 1.0, 5.0);
  }
  
  vec4 anisotropicSample(vec2 uv, vec2 center) {
    vec2 sourceUv = lensEquation(uv, center);
    sourceUv = clamp(sourceUv, 0.001, 0.999);
    
    vec2 relPos = uv - center;
    float r = length(relPos);
    
    float stretch = tangentialStretch(uv, center);
    
    float theta_E = uEinsteinRadius;
    float nearRing = exp(-pow((r - theta_E) / (theta_E * 0.25), 2.0));
    
    int numSamples = int(mix(3.0, 12.0, nearRing + (stretch - 1.0) * 0.3));
    numSamples = clamp(numSamples, 1, 12);
    
    vec2 tangent;
    if (r > 0.0001) {
      tangent = vec2(-relPos.y, relPos.x) / r;
    } else {
      tangent = vec2(1.0, 0.0);
    }
    
    float halfWidth = 0.0015 * stretch * (1.0 + nearRing * 1.5);
    
    vec4 totalColor = vec4(0.0);
    float totalWeight = 0.0;
    
    for (int i = 0; i < 12; i++) {
      if (i >= numSamples) break;
      
      float t = 0.0;
      if (numSamples > 1) {
        t = (float(i) / float(numSamples - 1) - 0.5) * 2.0;
      }
      
      float weight = 1.0 - abs(t) * 0.4;
      
      vec2 sampleOffset = tangent * t * halfWidth;
      vec2 sampleImageUv = uv + sampleOffset;
      vec2 sampleSourceUv = lensEquation(sampleImageUv, center);
      
      sampleSourceUv = clamp(sampleSourceUv, 0.001, 0.999);
      
      vec4 sampleColor = texture2D(uTexture, sampleSourceUv);
      
      totalColor += sampleColor * weight;
      totalWeight += weight;
    }
    
    if (totalWeight > 0.0) {
      totalColor /= totalWeight;
    }
    
    float mu = magnification(uv, center);
    totalColor.rgb *= mu;
    
    return totalColor;
  }
  
  void main() {
    vec2 lensCenter = uLensCenter;
    
    vec4 color = anisotropicSample(vUv, lensCenter);
    
    float r = length(vUv - lensCenter);
    float coreMask = smoothstep(0.0, uEinsteinRadius * 0.06, r);
    color.rgb *= mix(0.02, 1.0, coreMask);
    
    float totalDist = length(vUv - 0.5);
    float vignette = 1.0 - smoothstep(0.6, 1.25, totalDist);
    color.rgb *= vignette * 0.4 + 0.6;
    
    gl_FragColor = color;
  }
`;

export class DarkMatterHalo {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: null as THREE.Texture | null },
        uLensCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uEinsteinRadius: { value: 0.14 },
        uLensStrength: { value: 1.0 },
        uEllipticity: { value: 0.18 },
        uShear: { value: 0.07 },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1920, 1080) },
      },
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  setSourceTexture(texture: THREE.Texture): void {
    this.material.uniforms.uTexture.value = texture;
  }

  update(time: number, mouseX: number, mouseY: number): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uLensCenter.value.set(mouseX, 1 - mouseY);
  }

  setEinsteinRadius(radius: number): void {
    this.material.uniforms.uEinsteinRadius.value = radius;
  }

  setStrength(strength: number): void {
    this.material.uniforms.uLensStrength.value = strength;
  }

  setEllipticity(e: number): void {
    this.material.uniforms.uEllipticity.value = e;
  }

  setShear(s: number): void {
    this.material.uniforms.uShear.value = s;
  }

  setResolution(width: number, height: number): void {
    this.material.uniforms.uResolution.value.set(width, height);
  }
}

import * as THREE from 'three'

const glowVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec3 vColor;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = - (viewMatrix * worldPos).xyz;
    vColor = color;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const glowFragmentShader = `
  uniform float glowPower;
  uniform float glowIntensity;
  uniform vec3  uCameraPos;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec3 vColor;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    float fresnel = 1.0 - abs(dot(viewDir, normal));
    fresnel = pow(fresnel, glowPower);
    
    float camDist = length(uCameraPos - vWorldPosition);
    float distFade = 1.0 / (1.0 + camDist * 0.06);
    float distanceBoost = 1.0 + distFade * 1.5;
    
    vec3 tinted = mix(vColor, vec3(1.0), 0.35);
    vec3 glowColor = tinted * glowIntensity * fresnel * distanceBoost;
    float alpha = fresnel * 0.9 * distFade;
    
    gl_FragColor = vec4(glowColor, alpha);
  }
`

const outerGlowFragmentShader = `
  uniform float glowPower;
  uniform float glowIntensity;
  uniform vec3  uCameraPos;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec3 vColor;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    float fresnel = 1.0 - abs(dot(viewDir, normal));
    fresnel = smoothstep(0.05, 0.9, fresnel);
    fresnel = pow(fresnel, glowPower);
    
    float camDist = length(uCameraPos - vWorldPosition);
    float distFade = 1.0 / (1.0 + camDist * 0.05);
    float distanceBoost = 1.0 + distFade * 1.8;
    
    vec3 whitened = mix(vColor, vec3(1.0), 0.6);
    vec3 glowColor = whitened * glowIntensity * fresnel * distanceBoost;
    float alpha = fresnel * 0.5 * distFade;
    
    gl_FragColor = vec4(glowColor, alpha);
  }
`

export class GlowShaderMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: {
        glowPower: { value: 1.4 },
        glowIntensity: { value: 3.0 },
        uCameraPos: { value: new THREE.Vector3(0, 0, 12) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      vertexColors: true,
    })
  }
}

export class OuterGlowMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader: glowVertexShader,
      fragmentShader: outerGlowFragmentShader,
      uniforms: {
        glowPower: { value: 0.8 },
        glowIntensity: { value: 2.8 },
        uCameraPos: { value: new THREE.Vector3(0, 0, 12) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      vertexColors: true,
    })
  }
}

export class EdgeGlowMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vColor;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vViewPosition = - (modelViewMatrix * vec4(position, 1.0)).xyz;
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float edgePower;
        uniform float edgeIntensity;
        
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vColor;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          
          float edge = 1.0 - abs(dot(viewDir, normal));
          edge = smoothstep(0.4, 0.9, edge);
          edge = pow(edge, edgePower);
          
          vec3 edgeColor = mix(vColor, vec3(1.0), 0.3) * edgeIntensity;
          float alpha = edge * 0.8;
          
          gl_FragColor = vec4(edgeColor, alpha);
        }
      `,
      uniforms: {
        edgePower: { value: 3.0 },
        edgeIntensity: { value: 2.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
      vertexColors: true,
    })
  }
}

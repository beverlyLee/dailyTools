import * as THREE from 'three';

const gaussianBlurVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const gaussianBlurFragmentShader = `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform sampler2D tGlassMask;
uniform vec2 uResolution;
uniform float uBlurRadius;
uniform float uFocusDistance;
uniform float uFocusRange;
uniform int uPass;
varying vec2 vUv;

float gaussian(float x, float sigma) {
  return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
}

float getDepth(vec2 uv) {
  return texture2D(tDepth, uv).r;
}

bool isBehindGlass(vec2 uv) {
  return texture2D(tGlassMask, uv).r > 0.5;
}

void main() {
  if (uBlurRadius < 0.5) {
    gl_FragColor = texture2D(tDiffuse, vUv);
    return;
  }

  if (!isBehindGlass(vUv)) {
    gl_FragColor = texture2D(tDiffuse, vUv);
    return;
  }

  vec2 texelSize = 1.0 / uResolution;
  vec4 color = vec4(0.0);
  float totalWeight = 0.0;

  float sigma = uBlurRadius * 0.5;
  int kernelSize = int(ceil(uBlurRadius * 2.0));
  kernelSize = min(kernelSize, 24);

  if (uPass == 0) {
    for (int i = -24; i <= 24; i++) {
      if (abs(float(i)) > float(kernelSize)) continue;
      float weight = gaussian(float(i), sigma);
      vec2 offset = vec2(float(i) * texelSize.x, 0.0);
      vec2 sampleUv = vUv + offset;
      if (sampleUv.x < 0.0 || sampleUv.x > 1.0) continue;
      color += texture2D(tDiffuse, sampleUv) * weight;
      totalWeight += weight;
    }
  } else {
    for (int i = -24; i <= 24; i++) {
      if (abs(float(i)) > float(kernelSize)) continue;
      float weight = gaussian(float(i), sigma);
      vec2 offset = vec2(0.0, float(i) * texelSize.y);
      vec2 sampleUv = vUv + offset;
      if (sampleUv.y < 0.0 || sampleUv.y > 1.0) continue;
      color += texture2D(tDiffuse, sampleUv) * weight;
      totalWeight += weight;
    }
  }

  gl_FragColor = color / totalWeight;
}
`;

const compositeVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const compositeFragmentShader = `
uniform sampler2D tOriginal;
uniform sampler2D tBlurred;
uniform sampler2D tGlassMask;
uniform float uPrivacyLevel;
uniform vec3 uGlassTint;
varying vec2 vUv;

void main() {
  vec4 original = texture2D(tOriginal, vUv);
  vec4 blurred = texture2D(tBlurred, vUv);
  float mask = texture2D(tGlassMask, vUv).r;

  vec4 behindGlass = mix(original, blurred, mask * uPrivacyLevel);
  behindGlass.rgb = mix(behindGlass.rgb, behindGlass.rgb * uGlassTint, mask * 0.15);

  float glassShine = mask * 0.06;
  behindGlass.rgb += vec3(glassShine);

  gl_FragColor = behindGlass;
}
`;

class BlurProcessor {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType
      }
    );

    this.blurTargetH = new THREE.WebGLRenderTarget(
      window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType
      }
    );

    this.blurTargetV = new THREE.WebGLRenderTarget(
      window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType
      }
    );

    this.glassMaskTarget = new THREE.WebGLRenderTarget(
      window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter
      }
    );

    this.depthTarget = new THREE.WebGLRenderTarget(
      window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType
      }
    );

    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        tGlassMask: { value: null },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uBlurRadius: { value: 0.0 },
        uFocusDistance: { value: 5.0 },
        uFocusRange: { value: 2.0 },
        uPass: { value: 0 }
      },
      vertexShader: gaussianBlurVertexShader,
      fragmentShader: gaussianBlurFragmentShader,
      depthWrite: false,
      depthTest: false
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tOriginal: { value: null },
        tBlurred: { value: null },
        tGlassMask: { value: null },
        uPrivacyLevel: { value: 0.0 },
        uGlassTint: { value: new THREE.Color(0.9, 0.95, 1.0) }
      },
      vertexShader: compositeVertexShader,
      fragmentShader: compositeFragmentShader,
      depthWrite: false,
      depthTest: false
    });

    this.fullscreenQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.blurMaterial
    );
    this.fullscreenScene = new THREE.Scene();
    this.fullscreenScene.add(this.fullscreenQuad);
    this.fullscreenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  resize(width, height) {
    this.renderTarget.setSize(width, height);
    this.blurTargetH.setSize(width, height);
    this.blurTargetV.setSize(width, height);
    this.glassMaskTarget.setSize(width, height);
    this.depthTarget.setSize(width, height);
    this.blurMaterial.uniforms.uResolution.value.set(width, height);
  }

  renderGlassMask(glassMeshes) {
    const originalMaterials = [];
    const maskMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });

    this.scene.traverse((child) => {
      if (child.isMesh) {
        originalMaterials.push({ mesh: child, material: child.material });
        if (glassMeshes.includes(child)) {
          child.material = maskMaterial;
        } else {
          child.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        }
      }
    });

    this.renderer.setRenderTarget(this.glassMaskTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    originalMaterials.forEach(({ mesh, material }) => {
      mesh.material = material;
    });
  }

  process(glassMeshes, blurRadius, privacyLevel, glassTint) {
    this.renderGlassMask(glassMeshes);

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);

    this.blurMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
    this.blurMaterial.uniforms.tGlassMask.value = this.glassMaskTarget.texture;
    this.blurMaterial.uniforms.uBlurRadius.value = blurRadius;
    this.blurMaterial.uniforms.uPass.value = 0;

    this.fullscreenQuad.material = this.blurMaterial;
    this.renderer.setRenderTarget(this.blurTargetH);
    this.renderer.render(this.fullscreenScene, this.fullscreenCamera);

    this.blurMaterial.uniforms.tDiffuse.value = this.blurTargetH.texture;
    this.blurMaterial.uniforms.uPass.value = 1;
    this.renderer.setRenderTarget(this.blurTargetV);
    this.renderer.render(this.fullscreenScene, this.fullscreenCamera);

    this.compositeMaterial.uniforms.tOriginal.value = this.renderTarget.texture;
    this.compositeMaterial.uniforms.tBlurred.value = this.blurTargetV.texture;
    this.compositeMaterial.uniforms.tGlassMask.value = this.glassMaskTarget.texture;
    this.compositeMaterial.uniforms.uPrivacyLevel.value = privacyLevel;
    this.compositeMaterial.uniforms.uGlassTint.value = glassTint || new THREE.Color(0.9, 0.95, 1.0);

    this.fullscreenQuad.material = this.compositeMaterial;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.fullscreenScene, this.fullscreenCamera);
  }

  quantifyPrivacyLevel(blurRadius) {
    if (blurRadius <= 0.5) return { level: 0.0, grade: 'F', description: '无隐私保护' };
    if (blurRadius <= 2.0) return { level: 0.25, grade: 'D', description: '隐私不足，轮廓可见' };
    if (blurRadius <= 4.0) return { level: 0.5, grade: 'C', description: '部分隐私，色块可辨' };
    if (blurRadius <= 6.0) return { level: 0.7, grade: 'B', description: '较好隐私，仅见模糊色块' };
    if (blurRadius <= 8.0) return { level: 0.85, grade: 'A', description: '高隐私，无法辨认形态' };
    return { level: 0.95, grade: 'A+', description: '极强隐私，完全不可辨识' };
  }

  dispose() {
    this.renderTarget.dispose();
    this.blurTargetH.dispose();
    this.blurTargetV.dispose();
    this.glassMaskTarget.dispose();
    this.depthTarget.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
  }
}

export { BlurProcessor };

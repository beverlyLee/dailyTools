import * as THREE from 'three';
import { MetaballSystem } from './MetaballSystem';

export class FluidScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private system: MetaballSystem;
  private mesh: THREE.Mesh | null = null;
  private clock: THREE.Clock;
  private waterMaterial: THREE.ShaderMaterial;
  private panel: HTMLElement;
  private fpsValue: HTMLElement;
  private ballsValue: HTMLElement;
  private mainBallsValue: HTMLElement;
  private splashBallsValue: HTMLElement;
  private collisionValue: HTMLElement;
  private statusValue: HTMLElement;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;
  private resetButton: HTMLButtonElement;
  private boundOnResize: () => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private speedSlider: HTMLInputElement;
  private splashSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private splashValue: HTMLElement;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.03);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 3, 12);
    this.camera.lookAt(0, 0.5, 0);

    this.clock = new THREE.Clock();

    this.waterMaterial = this.createWaterMaterial();

    this.system = new MetaballSystem(28);

    this.setupLights();
    this.setupEnvironment();

    const panelElements = this.createDebugPanel();
    this.panel = panelElements.panel;
    this.fpsValue = panelElements.fpsValue;
    this.ballsValue = panelElements.ballsValue;
    this.mainBallsValue = panelElements.mainBallsValue;
    this.splashBallsValue = panelElements.splashBallsValue;
    this.collisionValue = panelElements.collisionValue;
    this.statusValue = panelElements.statusValue;
    this.resetButton = panelElements.resetButton;
    this.speedSlider = panelElements.speedSlider;
    this.splashSlider = panelElements.splashSlider;
    this.speedValue = panelElements.speedValue;
    this.splashValue = panelElements.splashValue;

    this.resetButton.addEventListener('click', () => this.reset());
    this.speedSlider.addEventListener('input', () => {
      this.system.params.flowSpeed = parseFloat(this.speedSlider.value);
      this.system.reset();
      this.speedValue.textContent = this.speedSlider.value;
    });
    this.splashSlider.addEventListener('input', () => {
      this.system.params.splashCount = parseInt(this.splashSlider.value);
      this.splashValue.textContent = this.splashSlider.value;
    });

    this.boundOnResize = this.onResize.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('resize', this.boundOnResize);
    window.addEventListener('keydown', this.boundOnKeyDown);
  }

  private createWaterMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCameraPos: { value: new THREE.Vector3() },
        uLightDir: { value: new THREE.Vector3(0.5, 1.0, 0.3).normalize() },
        uLightColor: { value: new THREE.Color(1.0, 0.95, 0.9) },
        uAmbientColor: { value: new THREE.Color(0.15, 0.2, 0.35) },
        uWaterColor: { value: new THREE.Color(0.05, 0.3, 0.6) },
        uWaterDeep: { value: new THREE.Color(0.02, 0.08, 0.2) },
        uFresnelPower: { value: 3.0 },
        uSpecPower: { value: 64.0 },
        uCollisionFlash: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uCameraPos;
        uniform vec3 uLightDir;
        uniform vec3 uLightColor;
        uniform vec3 uAmbientColor;
        uniform vec3 uWaterColor;
        uniform vec3 uWaterDeep;
        uniform float uFresnelPower;
        uniform float uSpecPower;
        uniform float uCollisionFlash;

        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;

        void main() {
          vec3 N = normalize(vWorldNormal);
          vec3 V = normalize(vViewDir);
          vec3 L = normalize(uLightDir);
          vec3 H = normalize(L + V);

          float NdV = max(dot(N, V), 0.0);
          float fresnel = pow(1.0 - NdV, uFresnelPower);
          fresnel = mix(0.15, 1.0, fresnel);

          float NdL = max(dot(N, L), 0.0);
          vec3 diffuse = uWaterColor * NdL * uLightColor;

          float spec = pow(max(dot(N, H), 0.0), uSpecPower);
          vec3 specular = uLightColor * spec * 0.8;

          vec3 reflectDir = reflect(-V, N);
          float envMix = fresnel;
          vec3 envColor = mix(uWaterDeep, vec3(0.3, 0.5, 0.8), pow(max(dot(reflectDir, vec3(0.0, 1.0, 0.0)), 0.0), 2.0));

          vec3 waterShade = mix(diffuse, envColor, envMix);
          waterShade += specular * fresnel;
          waterShade += uAmbientColor * uWaterColor * 0.3;

          vec3 rimColor = vec3(0.4, 0.7, 1.0) * pow(1.0 - NdV, 4.0) * 0.4;
          waterShade += rimColor;

          vec3 flashColor = vec3(0.6, 0.9, 1.0);
          float wave = sin(vWorldPos.x * 8.0 + uTime * 6.0) * sin(vWorldPos.z * 8.0 + uTime * 4.0);
          float flashEffect = uCollisionFlash * (0.6 + 0.4 * wave);
          waterShade = mix(waterShade, flashColor, flashEffect * 0.7);

          if (uCollisionFlash > 0.0) {
            float flashSpec = pow(max(dot(N, H), 0.0), 24.0);
            waterShade += uCollisionFlash * flashSpec * vec3(0.5, 0.8, 1.0) * 1.5;
          }

          gl_FragColor = vec4(waterShade, 0.92);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  private setupLights(): void {
    const dirLight = new THREE.DirectionalLight(0xfff0dd, 2.0);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x4488cc, 0.5);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const ambient = new THREE.AmbientLight(0x1a2a4a, 0.6);
    this.scene.add(ambient);

    const pointLight = new THREE.PointLight(0x4488ff, 1.5, 20);
    pointLight.position.set(0, 4, 3);
    this.scene.add(pointLight);
  }

  private setupEnvironment(): void {
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3;
    this.scene.add(floor);

    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 20;
      particlePos[i * 3 + 1] = Math.random() * 10;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x4488ff,
      size: 0.03,
      transparent: true,
      opacity: 0.4,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(particles);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'r' || e.key === 'R') {
      this.reset();
    }
  }

  private createSliderRow(panel: HTMLElement, label: string, min: number, max: number, value: number, step: number): {
    slider: HTMLInputElement;
    valueEl: HTMLElement;
  } {
    const row = document.createElement('div');
    row.style.marginTop = '6px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '3px';

    const labelEl = document.createElement('span');
    labelEl.style.color = '#8898b8';
    labelEl.style.fontSize = '12px';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.style.color = '#fff';
    valueEl.style.fontWeight = '600';
    valueEl.style.fontFamily = 'monospace';
    valueEl.style.fontSize = '12px';
    valueEl.textContent = value.toString();

    header.appendChild(labelEl);
    header.appendChild(valueEl);
    row.appendChild(header);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.value = value.toString();
    slider.step = step.toString();
    slider.style.width = '100%';
    slider.style.height = '4px';
    slider.style.appearance = 'none';
    slider.style.background = 'rgba(68, 136, 255, 0.25)';
    slider.style.borderRadius = '2px';
    slider.style.outline = 'none';
    slider.style.cursor = 'pointer';

    row.appendChild(slider);
    panel.appendChild(row);

    return { slider, valueEl };
  }

  private createDebugPanel(): {
    panel: HTMLElement;
    fpsValue: HTMLElement;
    ballsValue: HTMLElement;
    mainBallsValue: HTMLElement;
    splashBallsValue: HTMLElement;
    collisionValue: HTMLElement;
    statusValue: HTMLElement;
    resetButton: HTMLButtonElement;
    speedSlider: HTMLInputElement;
    splashSlider: HTMLInputElement;
    speedValue: HTMLElement;
    splashValue: HTMLElement;
  } {
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.top = '16px';
    panel.style.left = '16px';
    panel.style.padding = '16px 20px';
    panel.style.background = 'rgba(10, 14, 30, 0.85)';
    panel.style.border = '1px solid rgba(68, 136, 255, 0.3)';
    panel.style.borderRadius = '10px';
    panel.style.color = '#e0e8ff';
    panel.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    panel.style.fontSize = '13px';
    panel.style.lineHeight = '1.8';
    panel.style.minWidth = '220px';
    panel.style.backdropFilter = 'blur(8px)';
    panel.style.zIndex = '1000';
    panel.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
    panel.style.maxHeight = '90vh';
    panel.style.overflowY = 'auto';

    const title = document.createElement('div');
    title.style.fontWeight = '700';
    title.style.fontSize = '14px';
    title.style.marginBottom = '10px';
    title.style.color = '#4488ff';
    title.style.letterSpacing = '0.5px';
    title.textContent = 'Fluid Topology Debug';

    const createRow = (label: string): HTMLElement => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.gap = '20px';

      const labelEl = document.createElement('span');
      labelEl.style.color = '#8898b8';
      labelEl.textContent = label;

      const valueEl = document.createElement('span');
      valueEl.style.color = '#fff';
      valueEl.style.fontWeight = '600';
      valueEl.style.fontFamily = 'monospace';

      row.appendChild(labelEl);
      row.appendChild(valueEl);
      panel.appendChild(row);

      return valueEl;
    };

    panel.appendChild(title);

    const fpsValue = createRow('FPS:');
    const ballsValue = createRow('总球体:');
    const mainBallsValue = createRow('主流体:');
    const splashBallsValue = createRow('飞溅:');
    const collisionValue = createRow('碰撞次数:');
    const statusValue = createRow('状态:');

    const separator = document.createElement('div');
    separator.style.marginTop = '12px';
    separator.style.paddingTop = '10px';
    separator.style.borderTop = '1px solid rgba(68, 136, 255, 0.2)';
    separator.style.color = '#4488ff';
    separator.style.fontSize = '12px';
    separator.style.fontWeight = '600';
    separator.textContent = '参数控制';
    panel.appendChild(separator);

    const speedControl = this.createSliderRow(panel, '水流速度', 1.0, 8.0, 3.5, 0.5);
    const splashControl = this.createSliderRow(panel, '飞溅粒子数', 10, 80, 40, 5);

    const hint = document.createElement('div');
    hint.style.marginTop = '10px';
    hint.style.paddingTop = '10px';
    hint.style.borderTop = '1px solid rgba(68, 136, 255, 0.2)';
    hint.style.color = '#7788aa';
    hint.style.fontSize = '11px';
    hint.innerHTML = '<b>R</b> 键 / 点击按钮重置';
    panel.appendChild(hint);

    const resetButton = document.createElement('button');
    resetButton.textContent = '重置模拟';
    resetButton.style.marginTop = '10px';
    resetButton.style.width = '100%';
    resetButton.style.padding = '8px 12px';
    resetButton.style.background = 'linear-gradient(180deg, #4488ff 0%, #3366dd 100%)';
    resetButton.style.color = '#fff';
    resetButton.style.border = 'none';
    resetButton.style.borderRadius = '6px';
    resetButton.style.fontWeight = '600';
    resetButton.style.fontSize = '12px';
    resetButton.style.cursor = 'pointer';
    resetButton.style.transition = 'transform 0.1s, box-shadow 0.1s';
    resetButton.style.boxShadow = '0 2px 8px rgba(68, 136, 255, 0.3)';
    resetButton.addEventListener('mouseenter', () => {
      resetButton.style.transform = 'translateY(-1px)';
      resetButton.style.boxShadow = '0 3px 12px rgba(68, 136, 255, 0.45)';
    });
    resetButton.addEventListener('mouseleave', () => {
      resetButton.style.transform = 'translateY(0)';
      resetButton.style.boxShadow = '0 2px 8px rgba(68, 136, 255, 0.3)';
    });
    resetButton.addEventListener('mousedown', () => {
      resetButton.style.transform = 'translateY(0)';
    });
    panel.appendChild(resetButton);

    document.body.appendChild(panel);

    return {
      panel, fpsValue, ballsValue, mainBallsValue, splashBallsValue,
      collisionValue, statusValue, resetButton,
      speedSlider: speedControl.slider,
      splashSlider: splashControl.slider,
      speedValue: speedControl.valueEl,
      splashValue: splashControl.valueEl,
    };
  }

  update(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.25) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    this.system.update(dt);

    const stats = this.system.getStats();
    const collision = this.system.getCollisionState();

    this.fpsValue.textContent = this.currentFps.toString();
    this.ballsValue.textContent = stats.totalBalls.toString();
    this.mainBallsValue.textContent = stats.mainBalls.toString();
    this.splashBallsValue.textContent = stats.splashBalls.toString();
    this.collisionValue.textContent = collision.collisionCount.toString();

    if (collision.hasCollided) {
      const timeStr = collision.timeSinceCollision.toFixed(1);
      this.statusValue.textContent = `碰撞 ✓ (${timeStr}s前)`;
      this.statusValue.style.color = '#66ff99';
    } else {
      this.statusValue.textContent = '等待碰撞...';
      this.statusValue.style.color = '#ffaa44';
    }

    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }

    const geometry = this.system.generateMesh();

    if (geometry.getAttribute('position').count > 0) {
      this.mesh = new THREE.Mesh(geometry, this.waterMaterial);
      this.scene.add(this.mesh);
    }

    this.waterMaterial.uniforms.uTime.value = elapsed;
    this.waterMaterial.uniforms.uCameraPos.value.copy(this.camera.position);
    this.waterMaterial.uniforms.uCollisionFlash.value = this.system.collisionFlash;

    const angle = elapsed * 0.15;
    this.camera.position.x = 12 * Math.sin(angle);
    this.camera.position.z = 12 * Math.cos(angle);
    this.camera.position.y = 3 + Math.sin(elapsed * 0.1) * 0.5;
    this.camera.lookAt(0, 0.5, 0);

    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    const loop = () => {
      requestAnimationFrame(loop);
      this.update();
    };
    loop();
  }

  reset(): void {
    this.system.reset();
    this.frameCount = 0;
    this.fpsTime = 0;
    this.currentFps = 0;

    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }

    this.statusValue.textContent = '已重置 ✓';
    this.statusValue.style.color = '#ffdd66';
    this.collisionValue.textContent = '0';
    this.ballsValue.textContent = '0';
    this.splashBallsValue.textContent = '0';
    this.mainBallsValue.textContent = '0';

    const originalBg = this.panel.style.borderColor;
    this.panel.style.borderColor = '#ffdd66';
    setTimeout(() => {
      this.panel.style.borderColor = originalBg;
      this.statusValue.textContent = '等待碰撞...';
      this.statusValue.style.color = '#ffaa44';
    }, 600);
  }

  dispose(): void {
    this.renderer.dispose();
    if (this.mesh) {
      this.mesh.geometry.dispose();
    }
    this.waterMaterial.dispose();
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
    window.removeEventListener('resize', this.boundOnResize);
    window.removeEventListener('keydown', this.boundOnKeyDown);
  }
}

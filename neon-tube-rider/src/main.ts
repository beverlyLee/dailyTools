import * as THREE from 'three';
import { TubeTrack } from './track/TubeTrack';
import { RenderVerifier, VerificationResult } from './verify/RenderVerifier';

const FADE_START_DELAY = 3000;
const FADE_DURATION = 2000;
const HIDE_DELAY = 5000;

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private tubeTrack: TubeTrack;
  private clock: THREE.Clock;
  private progress: number;
  private speed: number;
  private speedElement: HTMLElement | null;
  private titleElement: HTMLElement | null;
  private verifier: RenderVerifier;
  private verifyElement: HTMLElement | null;
  private titleVerifyLog: string[];
  private frenetDotHistory: number[];
  private static readonly FRENET_DOT_WINDOW = 100;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      85,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000);
    document.body.appendChild(this.renderer.domElement);

    this.tubeTrack = new TubeTrack();
    this.scene.add(this.tubeTrack.mesh);

    this.clock = new THREE.Clock();
    this.progress = 0;
    this.speed = 0.0003;

    this.speedElement = document.getElementById('speed');
    this.titleElement = document.getElementById('title');

    this.verifier = new RenderVerifier(this.renderer, 3000);
    this.verifyElement = document.getElementById('verify');

    this.titleVerifyLog = [];
    this.frenetDotHistory = [];

    this.verifier.onResult((result: VerificationResult) => {
      this.displayVerifyResult(result);
    });

    this.addStars();
    this.setupTitleFade();
    this.setupTitleVerification();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private setupTitleFade(): void {
    if (!this.titleElement) return;

    setTimeout(() => {
      if (!this.titleElement) return;
      this.titleElement.style.animationPlayState = 'paused';
      this.titleElement.style.animationName = 'none';
      this.titleElement.style.transition = `opacity ${FADE_DURATION}ms ease-out`;
      this.titleElement.style.opacity = '0';
    }, FADE_START_DELAY);

    setTimeout(() => {
      if (!this.titleElement) return;
      this.titleElement.style.display = 'none';
    }, HIDE_DELAY);
  }

  private setupTitleVerification(): void {
    const checkpoints = [
      { time: 1000, label: '1s', expectVisible: true, expectOpacity: 1.0 },
      { time: 2000, label: '2s', expectVisible: true, expectOpacity: 1.0 },
      { time: 3500, label: '3.5s', expectVisible: true, expectOpacity: 0.25 },
      { time: 4500, label: '4.5s', expectVisible: true, expectOpacity: 0.0 },
      { time: 6000, label: '6s', expectVisible: false, expectOpacity: 0.0 },
    ];

    for (const cp of checkpoints) {
      setTimeout(() => {
        const el = this.titleElement;
        if (!el) return;
        const isVisible = el.style.display !== 'none';
        const rawOpacity = el.style.opacity;
        const opacity = rawOpacity === '' ? 1.0 : parseFloat(rawOpacity);
        const visibleOk = isVisible === cp.expectVisible;
        const opacityTolerance = 0.15;
        const opacityOk = Math.abs(opacity - cp.expectOpacity) < opacityTolerance;
        const status = (visibleOk && opacityOk) ? '✅' : '❌';
        const line = `${status} ${cp.label}: visible=${isVisible}(expect ${cp.expectVisible}) opacity=${opacity.toFixed(2)}(expect ~${cp.expectOpacity.toFixed(2)})`;
        this.titleVerifyLog.push(line);
        this.updateTitleVerifyDisplay();
      }, cp.time);
    }
  }

  private updateTitleVerifyDisplay(): void {
    const el = document.getElementById('title-verify');
    if (el) {
      el.textContent = this.titleVerifyLog.join('\n');
    }
  }

  private addStars(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 2000;
      positions[i + 1] = Math.random() * 3000;
      positions[i + 2] = (Math.random() - 0.5) * 2000;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateCamera(time: number): { tangentDot: number } {
    const point = this.tubeTrack.getPointAt(this.progress);
    const frame = this.tubeTrack.getFrenetFrame(this.progress);

    this.camera.position.copy(point);

    const rollAngle = Math.sin(time * 0.5) * 0.3;

    const rotatedNormal = frame.normal.clone().applyAxisAngle(frame.tangent, rollAngle);
    const rotatedBinormal = frame.binormal.clone().applyAxisAngle(frame.tangent, rollAngle);

    const negTangent = frame.tangent.clone().negate();
    const cameraMatrix = new THREE.Matrix4();
    cameraMatrix.makeBasis(
      rotatedBinormal.negate(),
      rotatedNormal,
      negTangent
    );
    this.camera.setRotationFromMatrix(cameraMatrix);
    this.camera.position.copy(point);

    const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const tangentDot = cameraForward.dot(frame.tangent);

    return { tangentDot };
  }

  private displayVerifyResult(result: VerificationResult): void {
    if (!this.verifyElement) return;

    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const lines = [
      `[Frame #${result.frameCount}] ${status}`,
      `Brightness: avg=${result.avgBrightness.toFixed(4)} max=${result.maxBrightness.toFixed(4)}`,
      `Non-black: ${(result.nonBlackPixelRatio * 100).toFixed(1)}%`,
      `Dominant: ${result.dominantChannel.toUpperCase()}`,
      `Variance: ${result.colorVariance.toFixed(4)}`,
      `Center: R=${result.centerSample.r} G=${result.centerSample.g} B=${result.centerSample.b}`,
      `Frenet dot: ${result.frenetDot.toFixed(4)} | Avg(${Game.FRENET_DOT_WINDOW}): ${result.avgFrenetDot.toFixed(4)}`,
      result.doubleBufferStable ? 'Double-buffer: ✅ stable' : 'Double-buffer: ⚠️ retry',
    ];

    this.verifyElement.textContent = lines.join('\n');
    this.verifyElement.style.color = result.passed ? '#0f0' : '#f00';
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const time = this.clock.getElapsedTime();

    this.speed += 0.000001;
    this.speed = Math.min(this.speed, 0.002);

    this.progress += this.speed;
    if (this.progress >= 1) {
      this.progress = 0;
    }

    const { tangentDot } = this.updateCamera(time);

    this.frenetDotHistory.push(tangentDot);
    if (this.frenetDotHistory.length > Game.FRENET_DOT_WINDOW) {
      this.frenetDotHistory.shift();
    }
    const avgFrenetDot = this.frenetDotHistory.reduce((a, b) => a + b, 0) / this.frenetDotHistory.length;

    this.tubeTrack.update(time, this.speed * 10000);

    this.renderer.render(this.scene, this.camera);

    this.verifier.verify(this.renderer, time, tangentDot, avgFrenetDot);

    if (this.speedElement) {
      const displaySpeed = Math.floor(this.speed * 100000);
      this.speedElement.textContent = `SPEED: ${displaySpeed} | Frenet Avg: ${avgFrenetDot.toFixed(4)}`;
    }
  }
}

new Game();

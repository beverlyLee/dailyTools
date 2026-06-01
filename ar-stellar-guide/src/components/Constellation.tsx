import React, { useEffect, useRef, useCallback } from 'react';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { ExpoWebGLRenderingContext } from 'expo-gl';
import {
  StarsDatabase,
  extractAllStars,
  getDynamicLines,
  magToSize,
  computeLST,
  LineSegment3D,
  Star3D,
} from '../utils/StarMath';

interface ConstellationProps {
  starsDatabase: StarsDatabase;
  rotation: { x: number; y: number; z: number };
  threshold?: number;
  showLabels?: boolean;
  longitudeDeg?: number;
  backgroundImageUri?: string | null;
  onLayout?: (width: number, height: number) => void;
}

function buildDashedLineBuffers(
  lines: LineSegment3D[],
  segmentLength: number = 0.35,
  gapLength: number = 0.25
): { positions: Float32Array; colors: Float32Array } {
  const segs: number[] = [];
  const cols: number[] = [];

  for (const line of lines) {
    const ax = line.a.position[0];
    const ay = line.a.position[1];
    const az = line.a.position[2];
    const bx = line.b.position[0];
    const by = line.b.position[1];
    const bz = line.b.position[2];

    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const totalLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (totalLen < 0.0001) continue;

    const ux = dx / totalLen;
    const uy = dy / totalLen;
    const uz = dz / totalLen;

    const hexColor = new THREE.Color(line.color);
    const r = hexColor.r;
    const g = hexColor.g;
    const bl = hexColor.b;

    let t = 0;
    const step = segmentLength + gapLength;
    while (t < totalLen) {
      const segStart = t;
      const segEnd = Math.min(t + segmentLength, totalLen);
      const actualSegLen = segEnd - segStart;

      if (actualSegLen > 0.01) {
        const sx = ax + ux * segStart;
        const sy = ay + uy * segStart;
        const sz = az + uz * segStart;
        const ex = ax + ux * segEnd;
        const ey = ay + uy * segEnd;
        const ez = az + uz * segEnd;

        segs.push(sx, sy, sz, ex, ey, ez);
        cols.push(
          r, g, bl, 0.45,
          r, g, bl, 0.45
        );
      }

      t += step;
    }
  }

  return {
    positions: new Float32Array(segs),
    colors: new Float32Array(cols),
  };
}

function createStarGlowTexture(color: string, size: number = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.3, color + 'AA');
  gradient.addColorStop(0.7, color + '22');
  gradient.addColorStop(1, color + '00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const Constellation: React.FC<ConstellationProps> = ({
  starsDatabase,
  rotation,
  threshold = 35,
  showLabels = false,
  longitudeDeg = 0,
  backgroundImageUri = null,
}) => {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const skyDomeRef = useRef<THREE.Group | null>(null);
  const rafRef = useRef<number>(0);
  const rotationRef = useRef(rotation);
  const isReadyRef = useRef(false);
  const thresholdRef = useRef(threshold);
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const bgTextureRef = useRef<THREE.Texture | null>(null);
  const bgMeshRef = useRef<THREE.Mesh | null>(null);
  const lastSizeRef = useRef({ w: 0, h: 0 });

  rotationRef.current = rotation;
  thresholdRef.current = threshold;

  const loadBackgroundImage = useCallback(
    (uri: string) => {
      if (!sceneRef.current) return;
      if (bgTextureRef.current) {
        bgTextureRef.current.dispose();
        bgTextureRef.current = null;
      }

      const loader = new THREE.TextureLoader();
      loader.load(
        uri,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;
          if (!bgMeshRef.current || !sceneRef.current) return;
          const mat = bgMeshRef.current.material as THREE.MeshBasicMaterial;
          mat.map = texture;
          mat.color.setHex(0xffffff);
          mat.needsUpdate = true;
        },
        undefined,
        (err) => {
          console.warn('Failed to load background texture:', err);
        }
      );
    },
    []
  );

  useEffect(() => {
    if (backgroundImageUri && isReadyRef.current) {
      loadBackgroundImage(backgroundImageUri);
    } else if (!backgroundImageUri && bgMeshRef.current) {
      const mat = bgMeshRef.current.material as THREE.MeshBasicMaterial;
      if (mat.map) {
        mat.map.dispose();
        mat.map = null;
        mat.color.setHex(0x000510);
        mat.needsUpdate = true;
      }
    }
  }, [backgroundImageUri, loadBackgroundImage]);

  const resize = useCallback(() => {
    if (!rendererRef.current || !cameraRef.current || !glRef.current) return;
    const gl = glRef.current;
    let w = gl.drawingBufferWidth;
    let h = gl.drawingBufferHeight;
    if (w <= 0 || h <= 0) {
      const c = (gl as any).canvas;
      if (c && c.clientWidth && c.clientHeight) {
        w = c.clientWidth;
        h = c.clientHeight;
      } else if (typeof window !== 'undefined' && window.innerWidth && window.innerHeight) {
        w = window.innerWidth;
        h = window.innerHeight;
      } else {
        w = 750;
        h = 1334;
      }
    }
    if (w === lastSizeRef.current.w && h === lastSizeRef.current.h && w > 0 && h > 0) return;
    lastSizeRef.current = { w, h };

    rendererRef.current.setSize(w, h, false);
    cameraRef.current.aspect = w / h;
    cameraRef.current.updateProjectionMatrix();
  }, []);

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      try {
        glRef.current = gl;

        let width = gl.drawingBufferWidth;
        let height = gl.drawingBufferHeight;
        if (width <= 0 || height <= 0) {
          const canvas = (gl as any).canvas;
          if (canvas && canvas.clientWidth && canvas.clientHeight) {
            width = canvas.clientWidth;
            height = canvas.clientHeight;
          } else if (typeof window !== 'undefined' && window.innerWidth && window.innerHeight) {
            width = window.innerWidth;
            height = window.innerHeight;
          } else {
            width = 750;
            height = 1334;
          }
        }
        lastSizeRef.current = { w: width, h: height };
        const aspectRatio = width / height;

        const renderer = new THREE.WebGLRenderer({
          context: gl as unknown as WebGLRenderingContext,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        renderer.setClearColor(0x000510, 0);
        renderer.autoClear = false;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        rendererRef.current = renderer;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 100);
        camera.position.set(0, 0, 0.01);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        const skyDome = new THREE.Group();
        skyDomeRef.current = skyDome;
        scene.add(skyDome);

        const bgGeometry = new THREE.PlaneGeometry(200, 200);
        const bgMaterial = new THREE.MeshBasicMaterial({
          color: 0x000510,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: false,
        });
        const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        bgMesh.position.set(0, 0, -9.9);
        bgMesh.renderOrder = -10;
        skyDome.add(bgMesh);
        bgMeshRef.current = bgMesh;

        const lst = computeLST(new Date(), longitudeDeg);
        const allStars = extractAllStars(starsDatabase, lst);

        const textureCache = new Map<string, THREE.CanvasTexture>();

        const starGroup = new THREE.Group();
        starGroup.renderOrder = 5;

        for (const star of allStars) {
          const baseSize = magToSize(star.mag) * 2.5;

          let texture = textureCache.get(star.color);
          if (!texture) {
            texture = createStarGlowTexture(star.color, 128);
            textureCache.set(star.color, texture);
          }

          const material = new THREE.SpriteMaterial({
            map: texture,
            color: 0xffffff,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            opacity: 0.95,
          });

          const sprite = new THREE.Sprite(material);
          sprite.position.set(star.position[0], star.position[1], star.position[2]);
          sprite.scale.set(baseSize, baseSize, 1);
          starGroup.add(sprite);
        }

        skyDome.add(starGroup);

        const allLines = getDynamicLines(starsDatabase, thresholdRef.current, lst);
        const predefinedLines = allLines.filter((l) => !l.isDynamic);
        const dynamicLines = allLines.filter((l) => l.isDynamic);

        const predefPositions: number[] = [];
        const predefColors: number[] = [];
        for (const line of predefinedLines) {
          predefPositions.push(
            line.a.position[0], line.a.position[1], line.a.position[2],
            line.b.position[0], line.b.position[1], line.b.position[2]
          );
          const hexColor = new THREE.Color(line.color);
          predefColors.push(
            hexColor.r, hexColor.g, hexColor.b, 0.95,
            hexColor.r, hexColor.g, hexColor.b, 0.95
          );
        }

        if (predefPositions.length > 0) {
          const predefLineGeometry = new THREE.BufferGeometry();
          predefLineGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(predefPositions, 3)
          );
          predefLineGeometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(predefColors, 4)
          );

          const predefLineMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            linewidth: 2,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
          });

          const predefLineSegments = new THREE.LineSegments(predefLineGeometry, predefLineMaterial);
          predefLineSegments.renderOrder = 3;
          skyDome.add(predefLineSegments);
        }

        if (dynamicLines.length > 0) {
          const dashed = buildDashedLineBuffers(dynamicLines, 0.4, 0.3);
          if (dashed.positions.length > 0) {
            const dynLineGeometry = new THREE.BufferGeometry();
            dynLineGeometry.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(dashed.positions, 3)
            );
            dynLineGeometry.setAttribute(
              'color',
              new THREE.Float32BufferAttribute(dashed.colors, 4)
            );

            const dynLineMaterial = new THREE.LineBasicMaterial({
              vertexColors: true,
              transparent: true,
              opacity: 1.0,
              linewidth: 1,
              depthWrite: false,
              depthTest: false,
              blending: THREE.AdditiveBlending,
            });

            const dynLineSegments = new THREE.LineSegments(dynLineGeometry, dynLineMaterial);
            dynLineSegments.renderOrder = 2;
            skyDome.add(dynLineSegments);
          }
        }

        const glowGeometry = new THREE.SphereGeometry(9.98, 48, 48);
        const glowMaterial = new THREE.ShaderMaterial({
          uniforms: {},
          vertexShader: `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            void main() {
              float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
              gl_FragColor = vec4(0.02, 0.05, 0.12, intensity * 0.35);
            }
          `,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false,
          depthTest: false,
        });
        const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        glowSphere.renderOrder = 1;
        skyDome.add(glowSphere);

        if (backgroundImageUri) {
          loadBackgroundImage(backgroundImageUri);
        }

        isReadyRef.current = true;

        let resizeTick = 0;
        const animate = () => {
          if (!isReadyRef.current) return;
          if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

          resizeTick++;
          if (resizeTick % 30 === 0) {
            resize();
          }

          const rot = rotationRef.current;
          if (skyDomeRef.current) {
            skyDomeRef.current.rotation.set(rot.x, rot.y, rot.z);
          }

          rendererRef.current.clear();
          rendererRef.current.render(sceneRef.current, cameraRef.current);
          gl.flush();
          if (typeof (gl as any).endFrameEXP === 'function') {
            (gl as any).endFrameEXP();
          }
          rafRef.current = requestAnimationFrame(animate);
        };

        animate();
      } catch (err) {
        console.error('Constellation GL init error:', err);
      }
    },
    [starsDatabase, threshold, longitudeDeg, loadBackgroundImage, backgroundImageUri, resize]
  );

  useEffect(() => {
    return () => {
      isReadyRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (bgTextureRef.current) {
        bgTextureRef.current.dispose();
        bgTextureRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  return (
    <GLView
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
      }}
      onContextCreate={onContextCreate}
    />
  );
};

export default Constellation;

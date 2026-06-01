import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useEmotion, EmotionType, getAnimationParams } from '@/contexts/EmotionContext';

const EMOTION_COLORS: Record<EmotionType, { primary: THREE.Color; secondary: THREE.Color }> = {
  sad: {
    primary: new THREE.Color(0x4ade80),
    secondary: new THREE.Color(0x22d3ee),
  },
  happy: {
    primary: new THREE.Color(0xfbbf24),
    secondary: new THREE.Color(0xf59e0b),
  },
  angry: {
    primary: new THREE.Color(0xef4444),
    secondary: new THREE.Color(0xdc2626),
  },
  calm: {
    primary: new THREE.Color(0x06b6d4),
    secondary: new THREE.Color(0x0891b2),
  },
  neutral: {
    primary: new THREE.Color(0x667eea),
    secondary: new THREE.Color(0x764ba2),
  },
  surprised: {
    primary: new THREE.Color(0x8b5cf6),
    secondary: new THREE.Color(0x7c3aed),
  },
  fearful: {
    primary: new THREE.Color(0x14b8a6),
    secondary: new THREE.Color(0x0d9488),
  },
  love: {
    primary: new THREE.Color(0xec4899),
    secondary: new THREE.Color(0xdb2777),
  },
};

export const Visualizer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const waveRef = useRef<THREE.Mesh | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const targetColorsRef = useRef<{ primary: THREE.Color; secondary: THREE.Color }>(EMOTION_COLORS.neutral);
  const currentColorsRef = useRef<{ primary: THREE.Color; secondary: THREE.Color }>({
    primary: EMOTION_COLORS.neutral.primary.clone(),
    secondary: EMOTION_COLORS.neutral.secondary.clone(),
  });

  const { currentEmotion } = useEmotion();
  const animationParams = useMemo(() => getAnimationParams(currentEmotion.emotion), [currentEmotion.emotion]);

  useEffect(() => {
    targetColorsRef.current = EMOTION_COLORS[currentEmotion.emotion] || EMOTION_COLORS.neutral;
  }, [currentEmotion.emotion]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 30;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10;

      const color = i % 2 === 0 ? currentColorsRef.current.primary : currentColorsRef.current.secondary;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 2 + 0.5;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    const waveGeometry = new THREE.PlaneGeometry(80, 30, 128, 64);
    const waveMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      wireframe: false,
    });

    const wavePositions = waveGeometry.attributes.position;
    const waveColors = new Float32Array(wavePositions.count * 3);

    for (let i = 0; i < wavePositions.count; i++) {
      const x = wavePositions.getX(i);
      const y = wavePositions.getY(i);
      const colorRatio = (x + 40) / 80;
      
      const color = new THREE.Color().lerpColors(
        currentColorsRef.current.primary,
        currentColorsRef.current.secondary,
        colorRatio
      );
      
      waveColors[i * 3] = color.r;
      waveColors[i * 3 + 1] = color.g;
      waveColors[i * 3 + 2] = color.b;
    }

    waveGeometry.setAttribute('color', new THREE.BufferAttribute(waveColors, 3));

    const wave = new THREE.Mesh(waveGeometry, waveMaterial);
    wave.position.z = -20;
    wave.position.y = -5;
    scene.add(wave);
    waveRef.current = wave;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const time = { t: 0 };

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      time.t += 0.016 * animationParams.particleSpeed;

      currentColorsRef.current.primary.lerp(targetColorsRef.current.primary, 0.02);
      currentColorsRef.current.secondary.lerp(targetColorsRef.current.secondary, 0.02);

      if (particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const colors = particlesRef.current.geometry.attributes.color.array as Float32Array;
        
        for (let i = 0; i < particleCount; i++) {
          const x = positions[i * 3];
          const y = positions[i * 3 + 1];
          const z = positions[i * 3 + 2];

          positions[i * 3 + 1] = y + Math.sin(time.t * 2 + x * 0.1) * 0.02 * animationParams.waveAmplitude;
          positions[i * 3 + 2] = z + Math.cos(time.t * 1.5 + y * 0.1) * 0.015 * animationParams.waveAmplitude;

          const distanceFromCenter = Math.sqrt(x * x + y * y);
          const colorRatio = (distanceFromCenter + 30) / 60;
          
          const particleColor = new THREE.Color().lerpColors(
            currentColorsRef.current.primary,
            currentColorsRef.current.secondary,
            colorRatio
          );
          
          colors[i * 3] = particleColor.r * animationParams.colorIntensity;
          colors[i * 3 + 1] = particleColor.g * animationParams.colorIntensity;
          colors[i * 3 + 2] = particleColor.b * animationParams.colorIntensity;
        }

        particlesRef.current.geometry.attributes.position.needsUpdate = true;
        particlesRef.current.geometry.attributes.color.needsUpdate = true;
        particlesRef.current.rotation.y += 0.0005 * animationParams.particleSpeed;
      }

      if (waveRef.current) {
        const wavePositions = waveRef.current.geometry.attributes.position.array as Float32Array;
        const waveColors = waveRef.current.geometry.attributes.color.array as Float32Array;
        
        for (let i = 0; i < wavePositions.length / 3; i++) {
          const x = wavePositions[i * 3];
          const y = wavePositions[i * 3 + 1];
          
          wavePositions[i * 3 + 2] = Math.sin(time.t * 3 + x * 0.2) * Math.cos(time.t * 2 + y * 0.15) * 2 * animationParams.waveAmplitude;

          const colorRatio = (x + 40) / 80 + 0.5 * Math.sin(time.t + y * 0.1);
          const clampedRatio = Math.max(0, Math.min(1, colorRatio));
          
          const waveColor = new THREE.Color().lerpColors(
            currentColorsRef.current.primary,
            currentColorsRef.current.secondary,
            clampedRatio
          );
          
          waveColors[i * 3] = waveColor.r * animationParams.colorIntensity;
          waveColors[i * 3 + 1] = waveColor.g * animationParams.colorIntensity;
          waveColors[i * 3 + 2] = waveColor.b * animationParams.colorIntensity;
        }

        waveRef.current.geometry.attributes.position.needsUpdate = true;
        waveRef.current.geometry.attributes.color.needsUpdate = true;
      }

      const bgColor = new THREE.Color(0x0f172a);
      const emotionBgTint = currentColorsRef.current.primary.clone().multiplyScalar(0.1);
      scene.background = bgColor.add(emotionBgTint);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      rendererRef.current?.dispose();
      particlesRef.current?.geometry.dispose();
      (particlesRef.current?.material as THREE.Material)?.dispose();
      waveRef.current?.geometry.dispose();
      (waveRef.current?.material as THREE.Material)?.dispose();
    };
  }, [animationParams]);

  return (
    <div 
      ref={containerRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default Visualizer;

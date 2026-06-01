import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lightFragUniforms, lightFragLogic } from '../effects/LightCone';

const vertexShader = /* glsl */ `
  uniform float uPointSize;
  uniform float uTime;
  attribute vec3 aRandomOffset;
  attribute float aPhase;
  varying vec3 vWorldPosition;
  varying float vPhase;

  void main() {
    vec3 pos = position;

    float t = uTime + aPhase * 6.28318;
    pos.x += sin(t * 0.4 + aRandomOffset.x * 10.0) * (0.2 + aRandomOffset.y * 0.3);
    pos.y += cos(t * 0.3 + aRandomOffset.z * 10.0) * (0.25 + aRandomOffset.x * 0.25);
    pos.z += sin(t * 0.35 + aRandomOffset.y * 10.0) * (0.15 + aRandomOffset.z * 0.2);

    pos.y += sin(uTime * 0.15 + position.x * 0.08 + position.z * 0.06) * 0.2;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    vPhase = aPhase;

    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uPointSize * (280.0 / -mvPosition.z);
  }
`;

const fragmentShader = /* glsl */ `
  ${lightFragUniforms}
  uniform vec3 uGlowColor;
  uniform float uTime;
  varying vec3 vWorldPosition;
  varying float vPhase;

  ${lightFragLogic}

  void main() {
    float alpha = calculateLightVisibility(vWorldPosition);

    float twinkle = 0.7 + 0.3 * sin(uTime * 2.0 + vPhase * 12.0);
    alpha *= twinkle;

    vec2 uv = gl_PointCoord - vec2(0.5);
    float circle = 1.0 - smoothstep(0.0, 0.5, length(uv));
    float glow = pow(circle, 1.3);

    gl_FragColor = vec4(uGlowColor * (0.5 + glow * 0.5), alpha * glow);
  }
`;

interface PlanktonProps {
  lightUniformsRef: React.MutableRefObject<{
    uLightPos: { value: THREE.Vector3 };
    uLightRadius: { value: number };
    uLightIntensity: { value: number };
    uMouseMoved: { value: number };
  }>;
  count?: number;
}

export default function Plankton({ lightUniformsRef, count = 8000 }: PlanktonProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, randomOffsets, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 140;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 140;
      rand[i * 3] = Math.random();
      rand[i * 3 + 1] = Math.random();
      rand[i * 3 + 2] = Math.random();
      phase[i] = Math.random();
    }
    return { positions: pos, randomOffsets: rand, phases: phase };
  }, [count]);

  const uniforms = useMemo(() => ({
    uLightPos: { value: new THREE.Vector3(0, 0, 0) },
    uLightRadius: { value: 20.0 },
    uLightIntensity: { value: 1.0 },
    uMouseMoved: { value: 0 },
    uPointSize: { value: 2.5 },
    uTime: { value: 0 },
    uGlowColor: { value: new THREE.Color(0x5ec8ff) },
  }), []);

  useFrame((_, delta) => {
    if (materialRef.current && lightUniformsRef.current) {
      uniforms.uTime.value += delta;
      uniforms.uLightPos.value.copy(lightUniformsRef.current.uLightPos.value);
      uniforms.uMouseMoved.value = lightUniformsRef.current.uMouseMoved.value;
      uniforms.uLightRadius.value = lightUniformsRef.current.uLightRadius.value;
      uniforms.uLightIntensity.value = lightUniformsRef.current.uLightIntensity.value;
    }
  });

  return (
    <points renderOrder={50}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandomOffset"
          count={count}
          array={randomOffsets}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          count={count}
          array={phases}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

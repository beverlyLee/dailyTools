import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lightFragUniforms, lightFragLogic } from '../effects/LightCone';

interface BackgroundDebrisProps {
  lightUniformsRef: React.MutableRefObject<{
    uLightPos: { value: THREE.Vector3 };
    uLightRadius: { value: number };
    uMouseMoved: { value: number };
  }>;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  varying vec3 vWorldPosition;
  varying float vFogFactor;

  void main() {
    vec3 pos = position;
    float t = uTime * 0.08 + uPhase * 6.28318;
    pos.x += sin(t * 0.7 + pos.y * 0.02) * 0.8;
    pos.y += cos(t * 0.5 + pos.x * 0.02) * 0.6;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;

    vec4 mvPosition = viewMatrix * worldPosition;
    vFogFactor = clamp(-mvPosition.z / 90.0, 0.0, 1.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  ${lightFragUniforms}
  uniform vec3 uColor;
  varying vec3 vWorldPosition;
  varying float vFogFactor;

  ${lightFragLogic}

  void main() {
    float visibility = calculateLightVisibility(vWorldPosition) * 0.7;
    float fogAlpha = 1.0 - vFogFactor * 0.85;
    float alpha = visibility * 0.2 * fogAlpha;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export default function BackgroundDebris({ lightUniformsRef }: BackgroundDebrisProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const debrisData = useMemo(() => {
    const debris: { pos: number[]; scale: number; rot: number[]; phase: number }[] = [];
    for (let i = 0; i < 18; i++) {
      debris.push({
        pos: [
          (Math.random() - 0.5) * 130,
          (Math.random() - 0.5) * 75,
          (Math.random() - 0.5) * 130,
        ],
        scale: 2 + Math.random() * 6,
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        phase: Math.random(),
      });
    }
    return debris;
  }, []);

  const sharedUniforms = useMemo(() => ({
    uLightPos: { value: new THREE.Vector3(0, 0, 0) },
    uLightRadius: { value: 22.0 },
    uLightIntensity: { value: 1.0 },
    uMouseMoved: { value: 0 },
    uTime: { value: 0 },
  }), []);

  useFrame((_, delta) => {
    if (materialRef.current && lightUniformsRef.current) {
      sharedUniforms.uTime.value += delta;
      sharedUniforms.uLightPos.value.copy(lightUniformsRef.current.uLightPos.value);
      sharedUniforms.uMouseMoved.value = lightUniformsRef.current.uMouseMoved.value;
      sharedUniforms.uLightRadius.value = lightUniformsRef.current.uLightRadius.value;
    }
  });

  return (
    <group renderOrder={10}>
      {debrisData.map((d, i) => (
        <mesh
          key={i}
          position={d.pos as [number, number, number]}
          rotation={d.rot as [number, number, number]}
          scale={[d.scale, d.scale * 0.6, d.scale]}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <shaderMaterial
            ref={i === 0 ? materialRef : undefined}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={{
              uLightPos: sharedUniforms.uLightPos,
              uLightRadius: sharedUniforms.uLightRadius,
              uLightIntensity: sharedUniforms.uLightIntensity,
              uMouseMoved: sharedUniforms.uMouseMoved,
              uTime: sharedUniforms.uTime,
              uPhase: { value: d.phase },
              uColor: { value: new THREE.Color(i % 2 === 0 ? 0x2a4a6a : 0x1a3a5a) },
            }}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

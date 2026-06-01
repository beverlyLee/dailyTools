import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lightFragUniforms, lightFragLogic } from '../effects/LightCone';

interface DeepSeaCreaturesProps {
  lightUniformsRef: React.MutableRefObject<{
    uLightPos: { value: THREE.Vector3 };
    uLightRadius: { value: number };
    uMouseMoved: { value: number };
  }>;
}

const reefVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uSpeed;
  varying vec3 vWorldPosition;
  varying float vFogFactor;

  void main() {
    vec3 pos = position;
    float t = uTime * uSpeed + uPhase * 6.28318;
    pos.x += sin(t * 0.7 + pos.y * 0.01) * 0.6;
    pos.y += cos(t * 0.5 + pos.x * 0.01) * 0.4;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;

    vec4 mvPosition = viewMatrix * worldPosition;
    vFogFactor = clamp(-mvPosition.z / 100.0, 0.0, 1.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fishVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uSpeed;
  varying vec3 vWorldPosition;
  varying float vFogFactor;

  void main() {
    vec3 pos = position;
    float t = uTime * uSpeed + uPhase * 6.28318;

    float wag = sin(t * 5.0) * 0.2;
    if (pos.x < -0.2) {
      pos.z += wag * abs(pos.x + 0.2) * 3.0;
    }

    pos.x += sin(t * 0.6) * 1.2;
    pos.y += cos(t * 0.4) * 0.6;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;

    vec4 mvPosition = viewMatrix * worldPosition;
    vFogFactor = clamp(-mvPosition.z / 100.0, 0.0, 1.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const shellVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uSpeed;
  varying vec3 vWorldPosition;
  varying float vFogFactor;

  void main() {
    vec3 pos = position;
    float t = uTime * uSpeed + uPhase * 6.28318;
    pos.x += sin(t * 0.4) * 0.15;
    pos.y += cos(t * 0.3) * 0.1;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;

    vec4 mvPosition = viewMatrix * worldPosition;
    vFogFactor = clamp(-mvPosition.z / 100.0, 0.0, 1.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const creatureFragmentShader = /* glsl */ `
  ${lightFragUniforms}
  uniform vec3 uColor;
  varying vec3 vWorldPosition;
  varying float vFogFactor;

  ${lightFragLogic}

  void main() {
    float visibility = calculateLightVisibility(vWorldPosition);
    float fogAlpha = 1.0 - vFogFactor * 0.7;
    float alpha = visibility * 0.55 * fogAlpha;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const shellFragmentShader = /* glsl */ `
  ${lightFragUniforms}
  uniform vec3 uColor;
  varying vec3 vWorldPosition;
  varying float vFogFactor;

  ${lightFragLogic}

  void main() {
    float visibility = calculateLightVisibility(vWorldPosition);
    float fogAlpha = 1.0 - vFogFactor * 0.65;
    float alpha = visibility * 0.7 * fogAlpha;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export default function DeepSeaCreatures({ lightUniformsRef }: DeepSeaCreaturesProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const fishMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const shellMaterialRef = useRef<THREE.ShaderMaterial>(null);

  const reefData = useMemo(() => {
    const items: { pos: number[]; scale: number; rot: number[]; phase: number; speed: number }[] = [];
    for (let i = 0; i < 12; i++) {
      items.push({
        pos: [
          (Math.random() - 0.5) * 100,
          -18 + Math.random() * 12,
          (Math.random() - 0.5) * 100,
        ],
        scale: 3 + Math.random() * 6,
        rot: [Math.random() * 0.4, Math.random() * Math.PI, 0],
        phase: Math.random(),
        speed: 0.06 + Math.random() * 0.06,
      });
    }
    return items;
  }, []);

  const fishData = useMemo(() => {
    const fish: { pos: number[]; scale: number; rot: number[]; phase: number; speed: number }[] = [];
    for (let i = 0; i < 20; i++) {
      fish.push({
        pos: [
          (Math.random() - 0.5) * 90,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 90,
        ],
        scale: 1.0 + Math.random() * 1.5,
        rot: [0, Math.random() * Math.PI, 0],
        phase: Math.random(),
        speed: 0.4 + Math.random() * 0.5,
      });
    }
    return fish;
  }, []);

  const shellData = useMemo(() => {
    const shells: { pos: number[]; scale: number; rot: number[]; type: number; phase: number }[] = [];
    for (let i = 0; i < 10; i++) {
      shells.push({
        pos: [
          (Math.random() - 0.5) * 80,
          -22 + Math.random() * 8,
          (Math.random() - 0.5) * 80,
        ],
        scale: 2.0 + Math.random() * 2.5,
        rot: [Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.3],
        type: Math.floor(Math.random() * 3),
        phase: Math.random(),
      });
    }
    return shells;
  }, []);

  const sharedUniforms = useMemo(() => ({
    uLightPos: { value: new THREE.Vector3(0, 0, 0) },
    uLightRadius: { value: 22.0 },
    uLightIntensity: { value: 1.0 },
    uMouseMoved: { value: 0 },
    uTime: { value: 0 },
  }), []);

  useFrame((_, delta) => {
    if (lightUniformsRef.current) {
      sharedUniforms.uTime.value += delta;
      sharedUniforms.uLightPos.value.copy(lightUniformsRef.current.uLightPos.value);
      sharedUniforms.uMouseMoved.value = lightUniformsRef.current.uMouseMoved.value;
      sharedUniforms.uLightRadius.value = lightUniformsRef.current.uLightRadius.value;
    }
  });

  const reefColor = new THREE.Color(0x3d5a7a);
  const fishColor = new THREE.Color(0x5a7a9a);
  const shellColor = new THREE.Color(0x6a8aaa);

  return (
    <group renderOrder={5}>
      {reefData.map((d, i) => (
        <mesh
          key={`reef-${i}`}
          position={d.pos as [number, number, number]}
          rotation={d.rot as [number, number, number]}
          scale={[d.scale, d.scale * 0.7, d.scale]}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <shaderMaterial
            ref={i === 0 ? materialRef : undefined}
            vertexShader={reefVertexShader}
            fragmentShader={creatureFragmentShader}
            uniforms={{
              uLightPos: sharedUniforms.uLightPos,
              uLightRadius: sharedUniforms.uLightRadius,
              uLightIntensity: sharedUniforms.uLightIntensity,
              uMouseMoved: sharedUniforms.uMouseMoved,
              uTime: sharedUniforms.uTime,
              uPhase: { value: d.phase },
              uSpeed: { value: d.speed },
              uColor: { value: reefColor },
            }}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}

      {fishData.map((d, i) => (
        <mesh
          key={`fish-${i}`}
          position={d.pos as [number, number, number]}
          rotation={d.rot as [number, number, number]}
          scale={[d.scale, d.scale * 0.6, d.scale]}
        >
          <coneGeometry args={[1, 2.2, 8]} />
          <shaderMaterial
            ref={i === 0 ? fishMaterialRef : undefined}
            vertexShader={fishVertexShader}
            fragmentShader={creatureFragmentShader}
            uniforms={{
              uLightPos: sharedUniforms.uLightPos,
              uLightRadius: sharedUniforms.uLightRadius,
              uLightIntensity: sharedUniforms.uLightIntensity,
              uMouseMoved: sharedUniforms.uMouseMoved,
              uTime: sharedUniforms.uTime,
              uPhase: { value: d.phase },
              uSpeed: { value: d.speed },
              uColor: { value: fishColor },
            }}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}

      {shellData.map((d, i) => (
        <mesh
          key={`shell-${i}`}
          position={d.pos as [number, number, number]}
          rotation={d.rot as [number, number, number]}
          scale={[d.scale, d.scale, d.scale]}
        >
          {d.type === 0 ? (
            <sphereGeometry args={[1, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          ) : d.type === 1 ? (
            <torusGeometry args={[0.7, 0.35, 10, 14]} />
          ) : (
            <coneGeometry args={[0.8, 1.6, 6]} />
          )}
          <shaderMaterial
            ref={i === 0 ? shellMaterialRef : undefined}
            vertexShader={shellVertexShader}
            fragmentShader={shellFragmentShader}
            uniforms={{
              uLightPos: sharedUniforms.uLightPos,
              uLightRadius: sharedUniforms.uLightRadius,
              uLightIntensity: sharedUniforms.uLightIntensity,
              uMouseMoved: sharedUniforms.uMouseMoved,
              uTime: sharedUniforms.uTime,
              uPhase: { value: d.phase },
              uSpeed: { value: 0.04 },
              uColor: { value: shellColor },
            }}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

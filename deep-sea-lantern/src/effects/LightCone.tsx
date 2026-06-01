import { useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const LIGHT_RADIUS = 22.0;
export const LIGHT_INTENSITY = 1.0;

export const lightFragUniforms = `
  uniform vec3 uLightPos;
  uniform float uLightRadius;
  uniform float uLightIntensity;
  uniform float uMouseMoved;
`;

export const lightFragLogic = /* glsl */ `
  float calculateLightVisibility(vec3 worldPos) {
    float dist = distance(worldPos, uLightPos);
    float visibility = 1.0 - smoothstep(0.0, uLightRadius, dist);
    return clamp(visibility, 0.0, 1.0) * uMouseMoved * uLightIntensity;
  }
`;

interface LightConeProps {
  lightPosRef: React.MutableRefObject<THREE.Vector3>;
  lightUniformsRef: React.MutableRefObject<{
    uLightPos: { value: THREE.Vector3 };
    uLightRadius: { value: number };
    uLightIntensity: { value: number };
    uMouseMoved: { value: number };
  }>;
}

export default function LightCone({ lightPosRef, lightUniformsRef }: LightConeProps) {
  const lightRef = useRef<THREE.SpotLight>(null);
  const lightTargetRef = useRef<THREE.Object3D>(null);
  const bulbRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const glowOuterRef = useRef<THREE.Mesh>(null);
  const diverGroupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);

  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(150, 230, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(100, 200, 255, 0.6)');
    gradient.addColorStop(0.5, 'rgba(80, 180, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(50, 150, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      initialized.current = true;
    };
    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, [gl]);

  useFrame(() => {
    if (!initialized.current) {
      if (lightUniformsRef.current) {
        lightUniformsRef.current.uMouseMoved.value = 0;
      }
      return;
    }

    const ndc = new THREE.Vector3(mouse.current.x, mouse.current.y, 0.5);
    ndc.unproject(camera);

    const dir = ndc.sub(camera.position).normalize();
    const distance = 35;
    const point = camera.position.clone().add(dir.multiplyScalar(distance));

    if (lightRef.current) {
      lightRef.current.position.copy(point);
    }

    if (lightTargetRef.current) {
      lightTargetRef.current.position.set(point.x, point.y - 20, point.z - 30);
      lightTargetRef.current.updateMatrixWorld();
    }

    if (bulbRef.current) {
      bulbRef.current.position.copy(point);
    }

    if (glowRef.current) {
      glowRef.current.position.copy(point);
      glowRef.current.lookAt(camera.position);
    }

    if (glowOuterRef.current) {
      glowOuterRef.current.position.copy(point);
      glowOuterRef.current.lookAt(camera.position);
    }

    if (diverGroupRef.current) {
      diverGroupRef.current.position.copy(point);
      diverGroupRef.current.position.y -= 2.2;
      diverGroupRef.current.position.z += 4;
      diverGroupRef.current.lookAt(camera.position);
    }

    lightPosRef.current.copy(point);

    if (lightUniformsRef.current) {
      lightUniformsRef.current.uLightPos.value.copy(point);
      lightUniformsRef.current.uMouseMoved.value = 1;
      lightUniformsRef.current.uLightRadius.value = LIGHT_RADIUS;
      lightUniformsRef.current.uLightIntensity.value = LIGHT_INTENSITY;
    }
  });

  const diverMatProps = {
    depthTest: false,
    depthWrite: false,
    transparent: true,
  };

  return (
    <>
      <spotLight
        ref={lightRef}
        distance={65}
        angle={0.55}
        penumbra={0.5}
        intensity={2.5}
        color={0x77ddff}
        castShadow={false}
      />
      <object3D ref={lightTargetRef} />

      <mesh ref={bulbRef} renderOrder={100}>
        <sphereGeometry args={[0.8, 20, 20]} />
        <meshBasicMaterial
          color={0xaaffff}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={glowRef} renderOrder={99}>
        <planeGeometry args={[12, 12]} />
        <meshBasicMaterial
          map={glowTexture}
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={glowOuterRef} renderOrder={98}>
        <planeGeometry args={[28, 28]} />
        <meshBasicMaterial
          map={glowTexture}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      <group ref={diverGroupRef} renderOrder={102}>
        <mesh position={[0, 2.0, 0]} scale={1.6}>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial color={0x1a2a3a} {...diverMatProps} opacity={0.92} />
        </mesh>
        <mesh position={[0, 2.1, 0.48]} scale={1.6}>
          <sphereGeometry args={[0.32, 12, 12]} />
          <meshBasicMaterial color={0x99ddff} {...diverMatProps} opacity={0.5} />
        </mesh>
        <mesh position={[0, 0.1, 0]} scale={[1.4, 1.8, 1.0]}>
          <capsuleGeometry args={[0.4, 0.8, 4, 8]} />
          <meshBasicMaterial color={0x2a3a4a} {...diverMatProps} opacity={0.95} />
        </mesh>
        <mesh position={[0.6, 0.6, 0]} rotation={[0, 0, -0.5]} scale={1.6}>
          <capsuleGeometry args={[0.12, 0.5, 4, 8]} />
          <meshBasicMaterial color={0x2a3a4a} {...diverMatProps} opacity={0.95} />
        </mesh>
        <mesh position={[1.1, 1.1, -0.15]} rotation={[0.3, 0, -0.8]} scale={1.6}>
          <cylinderGeometry args={[0.06, 0.06, 0.5, 8]} />
          <meshBasicMaterial color={0x5a6a7a} {...diverMatProps} opacity={0.95} />
        </mesh>
        <mesh position={[1.4, 1.5, -0.22]} scale={1.6}>
          <boxGeometry args={[0.28, 0.35, 0.42]} />
          <meshBasicMaterial color={0x6a7a8a} {...diverMatProps} opacity={0.95} />
        </mesh>
        <mesh position={[1.4, 1.15, -0.22]}>
          <boxGeometry args={[0.25, 0.1, 0.35]} />
          <meshBasicMaterial color={0xaaffff} {...diverMatProps} opacity={0.9} />
        </mesh>
      </group>
    </>
  );
}

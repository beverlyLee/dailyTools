import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PetModelProps {
  excitement: number;
  isSleeping: boolean;
  isScared: boolean;
}

export function PetModel({ excitement, isSleeping, isScared }: PetModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const frontLeftLegRef = useRef<THREE.Group>(null);
  const frontRightLegRef = useRef<THREE.Group>(null);
  const backLeftLegRef = useRef<THREE.Group>(null);
  const backRightLegRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftEarRef = useRef<THREE.Mesh>(null);
  const rightEarRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (groupRef.current) {
      const breatheOffset = isSleeping 
        ? Math.sin(time * 2) * 0.05 
        : isScared 
          ? Math.sin(time * 25) * 0.02
          : Math.sin(time * 4) * 0.02;
      
      const standHeight = isScared ? 0.5 : excitement * 0.8;
      groupRef.current.position.y = -0.3 + standHeight + breatheOffset;
      
      const sleepRotation = isSleeping ? Math.sin(time * 0.5) * 0.1 : 0;
      const scaredShake = isScared ? Math.sin(time * 30) * 0.08 : 0;
      groupRef.current.rotation.z = sleepRotation + scaredShake;
      
      const scaredBack = isScared ? -0.3 : 0;
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        scaredBack,
        0.1
      );
      
      const excitedBob = !isScared && excitement > 0.7 
        ? Math.sin(time * 10) * excitement * 0.1 
        : 0;
      groupRef.current.position.y += excitedBob;
    }

    if (bodyRef.current) {
      if (isScared) {
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.2, 0.15);
      } else {
        bodyRef.current.rotation.x = (1 - excitement) * 0.3;
      }
    }

    if (headRef.current) {
      if (isScared) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.3, 0.15);
        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, 0.15);
      } else {
        const headTilt = excitement * 0.2;
        const headBob = Math.sin(time * 3) * excitement * 0.1;
        headRef.current.rotation.x = -0.2 + headTilt + headBob;
        
        const lookAround = isSleeping ? 0 : Math.sin(time * 0.8) * 0.1;
        headRef.current.rotation.y = lookAround;
      }
    }

    const legBendSleep = 0.8;
    const legBendAwake = isScared ? 0.4 : 1 - excitement * 0.5;
    const legBend = isSleeping ? legBendSleep : legBendAwake;
    
    const legSwing = !isScared && excitement > 0.5 
      ? Math.sin(time * 8) * excitement * 0.3 
      : 0;

    if (frontLeftLegRef.current) {
      frontLeftLegRef.current.rotation.x = -legBend + legSwing;
    }
    if (frontRightLegRef.current) {
      frontRightLegRef.current.rotation.x = -legBend - legSwing;
    }
    if (backLeftLegRef.current) {
      backLeftLegRef.current.rotation.x = legBend - legSwing;
    }
    if (backRightLegRef.current) {
      backRightLegRef.current.rotation.x = legBend + legSwing;
    }

    if (tailRef.current) {
      if (isScared) {
        tailRef.current.rotation.y = THREE.MathUtils.lerp(tailRef.current.rotation.y, -0.8, 0.15);
        tailRef.current.rotation.z = THREE.MathUtils.lerp(tailRef.current.rotation.z, -0.3, 0.15);
      } else {
        const tailWag = isSleeping 
          ? Math.sin(time * 1) * 0.1 
          : Math.sin(time * (5 + excitement * 10)) * (0.3 + excitement * 0.5);
        tailRef.current.rotation.y = tailWag;
        tailRef.current.rotation.z = Math.sin(time * 2) * 0.1;
      }
    }

    if (leftEarRef.current && rightEarRef.current) {
      const earAngle = isScared ? Math.PI * 0.4 : Math.PI * 0.1;
      leftEarRef.current.rotation.z = THREE.MathUtils.lerp(leftEarRef.current.rotation.z, earAngle, 0.15);
      rightEarRef.current.rotation.z = THREE.MathUtils.lerp(rightEarRef.current.rotation.z, -earAngle, 0.15);
    }

    if (leftEyeRef.current && rightEyeRef.current) {
      const targetEyeScale = isSleeping ? 0.1 : isScared ? 1.3 : 1;
      leftEyeRef.current.scale.y = THREE.MathUtils.lerp(
        leftEyeRef.current.scale.y,
        targetEyeScale,
        0.15
      );
      rightEyeRef.current.scale.y = THREE.MathUtils.lerp(
        rightEyeRef.current.scale.y,
        targetEyeScale,
        0.15
      );
      leftEyeRef.current.scale.x = THREE.MathUtils.lerp(
        leftEyeRef.current.scale.x,
        targetEyeScale,
        0.15
      );
      rightEyeRef.current.scale.x = THREE.MathUtils.lerp(
        rightEyeRef.current.scale.x,
        targetEyeScale,
        0.15
      );

      const targetGlow = isSleeping ? 0.2 : isScared ? 1.5 : 1;
      (leftEyeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = THREE.MathUtils.lerp(
        (leftEyeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity,
        targetGlow,
        0.15
      );
      (rightEyeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = THREE.MathUtils.lerp(
        (rightEyeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity,
        targetGlow,
        0.15
      );

      const scaredColor = new THREE.Color('#ff4444');
      const normalColor = new THREE.Color('#00ffff');
      const targetColor = isScared ? scaredColor : normalColor;
      (leftEyeRef.current.material as THREE.MeshStandardMaterial).emissive.lerp(targetColor, 0.15);
      (rightEyeRef.current.material as THREE.MeshStandardMaterial).emissive.lerp(targetColor, 0.15);
      (leftEyeRef.current.material as THREE.MeshStandardMaterial).color.lerp(targetColor, 0.15);
      (rightEyeRef.current.material as THREE.MeshStandardMaterial).color.lerp(targetColor, 0.15);
    }
  });

  const metalMaterial = (
    <meshStandardMaterial
      color="#8899aa"
      metalness={0.9}
      roughness={0.2}
    />
  );

  const darkMetalMaterial = (
    <meshStandardMaterial
      color="#445566"
      metalness={0.8}
      roughness={0.3}
    />
  );

  const eyeMaterial = (
    <meshStandardMaterial
      color="#00ffff"
      emissive="#00ffff"
      emissiveIntensity={1}
      metalness={0.5}
      roughness={0.1}
    />
  );

  const accentMaterial = (
    <meshStandardMaterial
      color="#ff00ff"
      emissive="#ff00ff"
      emissiveIntensity={0.5}
      metalness={0.7}
      roughness={0.2}
    />
  );

  return (
    <group ref={groupRef}>
      <mesh ref={bodyRef} position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.2, 0.6, 0.8]} />
        {metalMaterial}
      </mesh>

      <group ref={headRef} position={[0.7, 0.15, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.5, 0.6]} />
          {metalMaterial}
        </mesh>

        <mesh position={[0.2, 0.1, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.15, 8]} />
          {accentMaterial}
        </mesh>

        <mesh ref={leftEyeRef} position={[0.22, 0.1, 0.18]} castShadow>
          <boxGeometry args={[0.05, 0.12, 0.12]} />
          {eyeMaterial}
        </mesh>

        <mesh ref={rightEyeRef} position={[0.22, 0.1, -0.18]} castShadow>
          <boxGeometry args={[0.05, 0.12, 0.12]} />
          {eyeMaterial}
        </mesh>

        <mesh position={[0.3, -0.1, 0]}>
          <boxGeometry args={[0.1, 0.08, 0.3]} />
          {darkMetalMaterial}
        </mesh>

        <mesh ref={leftEarRef} position={[0, 0.35, 0.15]}>
          <cylinderGeometry args={[0.04, 0.04, 0.25, 8]} />
          {darkMetalMaterial}
        </mesh>
        <mesh position={[0, 0.48, 0.15]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          {accentMaterial}
        </mesh>

        <mesh ref={rightEarRef} position={[0, 0.35, -0.15]}>
          <cylinderGeometry args={[0.04, 0.04, 0.25, 8]} />
          {darkMetalMaterial}
        </mesh>
        <mesh position={[0, 0.48, -0.15]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          {accentMaterial}
        </mesh>
      </group>

      <group ref={frontLeftLegRef} position={[0.45, -0.25, 0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
          {darkMetalMaterial}
        </mesh>
        <mesh position={[0, -0.5, 0]} rotation={[0.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.3, 8]} />
          {metalMaterial}
        </mesh>
        <mesh position={[0.05, -0.65, 0.05]}>
          <boxGeometry args={[0.15, 0.05, 0.15]} />
          {darkMetalMaterial}
        </mesh>
      </group>

      <group ref={frontRightLegRef} position={[0.45, -0.25, -0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
          {darkMetalMaterial}
        </mesh>
        <mesh position={[0, -0.5, 0]} rotation={[0.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.3, 8]} />
          {metalMaterial}
        </mesh>
        <mesh position={[0.05, -0.65, -0.05]}>
          <boxGeometry args={[0.15, 0.05, 0.15]} />
          {darkMetalMaterial}
        </mesh>
      </group>

      <group ref={backLeftLegRef} position={[-0.45, -0.25, 0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
          {darkMetalMaterial}
        </mesh>
        <mesh position={[0, -0.5, 0]} rotation={[-0.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.3, 8]} />
          {metalMaterial}
        </mesh>
        <mesh position={[-0.05, -0.65, 0.05]}>
          <boxGeometry args={[0.15, 0.05, 0.15]} />
          {darkMetalMaterial}
        </mesh>
      </group>

      <group ref={backRightLegRef} position={[-0.45, -0.25, -0.35]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
          {darkMetalMaterial}
        </mesh>
        <mesh position={[0, -0.5, 0]} rotation={[-0.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.3, 8]} />
          {metalMaterial}
        </mesh>
        <mesh position={[-0.05, -0.65, -0.05]}>
          <boxGeometry args={[0.15, 0.05, 0.15]} />
          {darkMetalMaterial}
        </mesh>
      </group>

      <group ref={tailRef} position={[-0.6, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.08, 0.6, 8]} />
          {darkMetalMaterial}
        </mesh>
        <mesh position={[-0.55, 0, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          {accentMaterial}
        </mesh>
      </group>

      <mesh position={[0, 0.35, 0]}>
        <torusGeometry args={[0.15, 0.02, 8, 16]} />
        {accentMaterial}
      </mesh>
    </group>
  );
}

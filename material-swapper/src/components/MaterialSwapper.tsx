import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from '../shaders/materialSwapShader';
import { MaterialItem, PBRMaterialTextures } from '../types/material';

interface MaterialSwapperProps {
  material: MaterialItem;
  children: React.ReactNode;
  uvOptions?: {
    repeatX?: number;
    repeatY?: number;
    offsetX?: number;
    offsetY?: number;
    rotation?: number;
  };
  physicsOverrides?: {
    roughness?: number;
    metalness?: number;
    envMapIntensity?: number;
    clearcoat?: number;
    clearcoatRoughness?: number;
    reflectivity?: number;
    normalStrength?: number;
  };
  customTextures?: PBRMaterialTextures;
  geometryType?: 'plane' | 'cylinder' | 'box' | 'custom';
}

const materialTypeMap: Record<string, number> = {
  wood: 0,
  stone: 1,
  fabric: 2,
  metal: 3,
  concrete: 4,
  custom: 5
};

export function MaterialSwapper({ 
  material, 
  children,
  uvOptions = {},
  physicsOverrides = {},
  customTextures = {},
  geometryType = 'plane'
}: MaterialSwapperProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const texturesRef = useRef<Record<string, THREE.Texture | null>>({});

  const type = material.isCustom ? 5 : (materialTypeMap[material.category] ?? 0);
  const hasCustomTextures = type === 5 && Object.keys(customTextures).length > 0;

  const uniforms = useMemo(() => {
    const uv = { ...material.uv, ...uvOptions };
    const physics = { ...material.physics, ...physicsOverrides };

    return {
      materialType: { value: type },
      baseColor: { value: new THREE.Color(material.color) },
      roughness: { value: physics.roughness ?? 0.5 },
      metalness: { value: physics.metalness ?? 0.0 },
      envMapIntensity: { value: physics.envMapIntensity ?? 1.0 },
      clearcoat: { value: physics.clearcoat ?? 0.0 },
      clearcoatRoughness: { value: physics.clearcoatRoughness ?? 0.0 },
      reflectivity: { value: physics.reflectivity ?? 0.5 },
      normalStrength: { value: physics.normalStrength ?? 0.5 },
      fabricPlush: { value: physics.fabricPlush ?? 0.5 },
      uvRepeat: { value: new THREE.Vector2(uv.repeatX ?? 1, uv.repeatY ?? 1) },
      uvOffset: { value: new THREE.Vector2(uv.offsetX ?? 0, uv.offsetY ?? 0) },
      uvRotation: { value: uv.rotation ?? 0 },
      time: { value: 0 },
      lightPosition: { value: new THREE.Vector3(5, 10, 5) },
      lightColor: { value: new THREE.Color(0xffffff) },
      lightIntensity: { value: 1.5 },
      ambientColor: { value: new THREE.Color(0xffffff) },
      ambientIntensity: { value: 0.5 },
      useCustomTextures: { value: hasCustomTextures },
      customMap: { value: null as THREE.Texture | null },
      customNormalMap: { value: null as THREE.Texture | null },
      customRoughnessMap: { value: null as THREE.Texture | null },
      customAOMap: { value: null as THREE.Texture | null }
    };
  }, []);

  useEffect(() => {
    if (!materialRef.current) return;

    const uv = { ...material.uv, ...uvOptions };
    const physics = { ...material.physics, ...physicsOverrides };

    materialRef.current.uniforms.materialType.value = type;
    materialRef.current.uniforms.baseColor.value.set(material.color);
    materialRef.current.uniforms.roughness.value = physics.roughness ?? 0.5;
    materialRef.current.uniforms.metalness.value = physics.metalness ?? 0.0;
    materialRef.current.uniforms.envMapIntensity.value = physics.envMapIntensity ?? 1.0;
    materialRef.current.uniforms.clearcoat.value = physics.clearcoat ?? 0.0;
    materialRef.current.uniforms.clearcoatRoughness.value = physics.clearcoatRoughness ?? 0.0;
    materialRef.current.uniforms.reflectivity.value = physics.reflectivity ?? 0.5;
    materialRef.current.uniforms.normalStrength.value = physics.normalStrength ?? 0.5;
    materialRef.current.uniforms.fabricPlush.value = physics.fabricPlush ?? 0.5;
    materialRef.current.uniforms.uvRepeat.value.set(uv.repeatX ?? 1, uv.repeatY ?? 1);
    materialRef.current.uniforms.uvOffset.value.set(uv.offsetX ?? 0, uv.offsetY ?? 0);
    materialRef.current.uniforms.uvRotation.value = uv.rotation ?? 0;
    materialRef.current.uniforms.useCustomTextures.value = hasCustomTextures;
  }, [material, uvOptions, physicsOverrides, type, hasCustomTextures]);

  useEffect(() => {
    if (!materialRef.current) return;
    
    const loader = new THREE.TextureLoader();
    
    const loadTexture = (url: string | undefined, key: string) => {
      if (!url) {
        if (texturesRef.current[key]) {
          texturesRef.current[key]?.dispose();
          texturesRef.current[key] = null;
        }
        return;
      }
      
      if (texturesRef.current[key]) {
        texturesRef.current[key]?.dispose();
      }
      
      const texture = loader.load(url);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texturesRef.current[key] = texture;
      
      if (materialRef.current) {
        materialRef.current.uniforms[key as keyof typeof materialRef.current.uniforms].value = texture;
      }
    };

    loadTexture(customTextures.map, 'customMap');
    loadTexture(customTextures.normalMap, 'customNormalMap');
    loadTexture(customTextures.roughnessMap, 'customRoughnessMap');
    loadTexture(customTextures.aoMap, 'customAOMap');

    return () => {
      Object.values(texturesRef.current).forEach(tex => tex?.dispose());
      texturesRef.current = {};
    };
  }, [customTextures]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  const shaderMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.DoubleSide
    });
    materialRef.current = mat;
    return mat;
  }, [uniforms]);

  return (
    <mesh ref={meshRef} material={shaderMaterial}>
      {children}
    </mesh>
  );
}

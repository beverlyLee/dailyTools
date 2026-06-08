export interface PBRMaterialTextures {
  map?: string;
  normalMap?: string;
  roughnessMap?: string;
  aoMap?: string;
  metalnessMap?: string;
  displacementMap?: string;
}

export interface MaterialPhysicsProps {
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  reflectivity?: number;
  emissiveIntensity?: number;
}

export interface UVOptions {
  repeatX: number;
  repeatY: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  wrapS: number;
  wrapT: number;
}

export interface MaterialItem {
  id: string;
  name: string;
  category: 'wood' | 'stone' | 'fabric' | 'metal' | 'concrete' | 'custom';
  color: string;
  textures: PBRMaterialTextures;
  textureUrls?: PBRMaterialTextures;
  physics: MaterialPhysicsProps;
  uv: Partial<UVOptions>;
  description?: string;
  isCustom?: boolean;
}

export type SceneObjectType = 'floor' | 'backWall' | 'sideWall' | 'leftPillar' | 'rightPillar';

export type MaterialCategory = MaterialItem['category'];

export interface MaterialLibraryState {
  materials: MaterialItem[];
  activeMaterialId: string | null;
  categories: MaterialCategory[];
}

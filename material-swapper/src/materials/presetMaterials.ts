import { MaterialItem } from '../types/material';

export const presetMaterials: MaterialItem[] = [
  {
    id: 'wood-floor-oak',
    name: '橡木地板',
    category: 'wood',
    color: '#c4a574',
    textures: {},
    physics: {
      roughness: 0.4,
      metalness: 0.0,
      envMapIntensity: 0.8,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      reflectivity: 0.5
    },
    uv: {
      repeatX: 4,
      repeatY: 8
    },
    description: '经典橡木纹理，带有自然木纹和真实反射高光'
  },
  {
    id: 'wood-floor-walnut',
    name: '胡桃木地板',
    category: 'wood',
    color: '#5c4033',
    textures: {},
    physics: {
      roughness: 0.35,
      metalness: 0.0,
      envMapIntensity: 0.9,
      clearcoat: 0.4,
      clearcoatRoughness: 0.15,
      reflectivity: 0.6
    },
    uv: {
      repeatX: 4,
      repeatY: 8
    },
    description: '深色胡桃木，高贵典雅，光泽度高'
  },
  {
    id: 'marble-white',
    name: '白色大理石',
    category: 'stone',
    color: '#f5f5f0',
    textures: {},
    physics: {
      roughness: 0.15,
      metalness: 0.0,
      envMapIntensity: 1.2,
      reflectivity: 0.9
    },
    uv: {
      repeatX: 2,
      repeatY: 2
    },
    description: '卡拉拉白大理石，带有自然灰色纹理'
  },
  {
    id: 'marble-black',
    name: '黑色大理石',
    category: 'stone',
    color: '#2c2c2c',
    textures: {},
    physics: {
      roughness: 0.1,
      metalness: 0.0,
      envMapIntensity: 1.5,
      reflectivity: 0.95
    },
    uv: {
      repeatX: 2,
      repeatY: 2
    },
    description: '黑金大理石，高端奢华，镜面反射'
  },
  {
    id: 'carpet-wool',
    name: '羊毛地毯',
    category: 'fabric',
    color: '#8b7355',
    textures: {},
    physics: {
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.1,
      reflectivity: 0.0
    },
    uv: {
      repeatX: 1,
      repeatY: 1
    },
    description: '柔软羊毛质感，绒面效果，无明显反光'
  },
  {
    id: 'carpet-plush',
    name: '长毛绒地毯',
    category: 'fabric',
    color: '#4a5568',
    textures: {},
    physics: {
      roughness: 0.98,
      metalness: 0.0,
      envMapIntensity: 0.05,
      reflectivity: 0.0
    },
    uv: {
      repeatX: 1,
      repeatY: 1
    },
    description: '深灰色长毛绒，柔软舒适，完全哑光'
  },
  {
    id: 'concrete-polished',
    name: '抛光混凝土',
    category: 'concrete',
    color: '#9e9e9e',
    textures: {},
    physics: {
      roughness: 0.3,
      metalness: 0.0,
      envMapIntensity: 0.7,
      reflectivity: 0.4
    },
    uv: {
      repeatX: 3,
      repeatY: 3
    },
    description: '工业风抛光混凝土地面，带有细腻纹理'
  },
  {
    id: 'metal-brushed-steel',
    name: '拉丝不锈钢',
    category: 'metal',
    color: '#b8b8b8',
    textures: {},
    physics: {
      roughness: 0.25,
      metalness: 1.0,
      envMapIntensity: 1.5,
      reflectivity: 0.9
    },
    uv: {
      repeatX: 4,
      repeatY: 4
    },
    description: '拉丝不锈钢材质，金属质感强烈'
  }
];

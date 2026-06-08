import { useState, useCallback } from 'react';
import { MaterialItem, MaterialCategory } from '../types/material';
import { presetMaterials } from '../materials/presetMaterials';

export function useMaterialLibrary() {
  const [materials, setMaterials] = useState<MaterialItem[]>(presetMaterials);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>('wood-floor-oak');
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'all'>('all');

  const categories: (MaterialCategory | 'all')[] = [
    'all',
    'wood',
    'stone',
    'fabric',
    'metal',
    'concrete',
    'custom'
  ];

  const filteredMaterials = selectedCategory === 'all'
    ? materials
    : materials.filter(m => m.category === selectedCategory);

  const activeMaterial = materials.find(m => m.id === activeMaterialId) || null;

  const selectMaterial = useCallback((id: string) => {
    setActiveMaterialId(id);
  }, []);

  const addCustomMaterial = useCallback((material: Omit<MaterialItem, 'id' | 'isCustom'>) => {
    const newMaterial: MaterialItem = {
      ...material,
      id: `custom-${Date.now()}`,
      isCustom: true
    };
    setMaterials(prev => [...prev, newMaterial]);
    return newMaterial.id;
  }, []);

  const removeCustomMaterial = useCallback((id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
    if (activeMaterialId === id) {
      setActiveMaterialId(materials[0]?.id || null);
    }
  }, [activeMaterialId, materials]);

  const updateMaterialPhysics = useCallback((id: string, physics: Partial<MaterialItem['physics']>) => {
    setMaterials(prev => prev.map(m => 
      m.id === id ? { ...m, physics: { ...m.physics, ...physics } } : m
    ));
  }, []);

  const updateMaterialUV = useCallback((id: string, uv: Partial<MaterialItem['uv']>) => {
    setMaterials(prev => prev.map(m => 
      m.id === id ? { ...m, uv: { ...m.uv, ...uv } } : m
    ));
  }, []);

  return {
    materials: filteredMaterials,
    allMaterials: materials,
    activeMaterial,
    activeMaterialId,
    selectedCategory,
    categories,
    selectMaterial,
    addCustomMaterial,
    removeCustomMaterial,
    updateMaterialPhysics,
    updateMaterialUV,
    setSelectedCategory
  };
}

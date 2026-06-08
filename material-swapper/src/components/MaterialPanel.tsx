import { useState, useEffect, useRef } from 'react';
import { MaterialItem, MaterialCategory } from '../types/material';
import { generateMaterialThumbnail } from '../utils/thumbnailGenerator';

interface MaterialPanelProps {
  materials: MaterialItem[];
  activeMaterialId: string | null;
  selectedCategory: MaterialCategory | 'all';
  categories: (MaterialCategory | 'all')[];
  onSelectMaterial: (id: string) => void;
  onCategoryChange: (category: MaterialCategory | 'all') => void;
  onUploadCustom?: () => void;
}

const categoryNames: Record<string, string> = {
  all: '全部',
  wood: '木材',
  stone: '石材',
  fabric: '织物',
  metal: '金属',
  concrete: '混凝土',
  custom: '自定义'
};

function MaterialThumbnail({ material }: { material: MaterialItem }) {
  const [thumbnail, setThumbnail] = useState<string>('');
  const hasGenerated = useRef(false);

  useEffect(() => {
    if (hasGenerated.current) return;
    hasGenerated.current = true;
    
    const url = generateMaterialThumbnail(
      material.category,
      material.color,
      128,
      128
    );
    setThumbnail(url);
  }, [material]);

  return (
    <div 
      className="material-thumbnail"
      style={{ 
        backgroundColor: material.color,
        backgroundImage: thumbnail ? `url(${thumbnail})` : 'none',
        backgroundSize: 'cover'
      }}
    />
  );
}

export function MaterialPanel({
  materials,
  activeMaterialId,
  selectedCategory,
  categories,
  onSelectMaterial,
  onCategoryChange,
  onUploadCustom
}: MaterialPanelProps) {
  return (
    <div className="material-panel">
      <h3>材质库</h3>
      
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => onCategoryChange(cat)}
          >
            {categoryNames[cat]}
          </button>
        ))}
      </div>

      <div className="material-grid">
        {materials.map(material => (
          <div
            key={material.id}
            className={`material-item ${activeMaterialId === material.id ? 'active' : ''}`}
            onClick={() => onSelectMaterial(material.id)}
            title={material.description}
          >
            <MaterialThumbnail material={material} />
            <div className="material-info">
              <span className="material-name">{material.name}</span>
              <span className="material-category-tag">
                {categoryNames[material.category]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {onUploadCustom && (
        <div className="upload-section">
          <button className="upload-btn" onClick={onUploadCustom}>
            + 上传自定义材质
          </button>
        </div>
      )}
    </div>
  );
}

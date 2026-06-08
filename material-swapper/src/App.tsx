import { useState, useRef, useCallback, useMemo } from 'react';
import { ThreeScene } from './components/ThreeScene';
import { MaterialPanel } from './components/MaterialPanel';
import { UVEditor } from './components/UVEditor';
import { PhysicsPanel } from './components/PhysicsPanel';
import { ObjectSelector } from './components/ObjectSelector';
import { MaterialUploader } from './components/MaterialUploader';
import { useMaterialLibrary } from './hooks/useMaterialLibrary';
import { exportSnapshot } from './utils/snapshot';
import { MaterialPhysicsProps, SceneObjectType, MaterialItem } from './types/material';
import './App.css';

function SnapshotButton({ onExport, isExporting }: { onExport: () => void; isExporting: boolean }) {
  return (
    <button className="snapshot-btn" onClick={onExport} disabled={isExporting}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M8 3v3"></path>
        <path d="M16 3v3"></path>
        <path d="M8 21v-3"></path>
        <path d="M16 21v-3"></path>
        <path d="M3 8h3"></path>
        <path d="M3 16h3"></path>
        <path d="M21 8h-3"></path>
        <path d="M21 16h-3"></path>
      </svg>
      {isExporting ? '导出中...' : '导出快照'}
    </button>
  );
}

function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const {
    materials,
    allMaterials,
    activeMaterial,
    activeMaterialId,
    selectedCategory,
    categories,
    selectMaterial,
    setSelectedCategory,
    addCustomMaterial,
    removeCustomMaterial,
    updateMaterialPhysics,
    updateMaterialUV
  } = useMaterialLibrary();

  const [selectedObject, setSelectedObject] = useState<SceneObjectType>('floor');
  const [activeTab, setActiveTab] = useState<'materials' | 'uv' | 'physics'>('materials');
  const [showUploader, setShowUploader] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [objectMaterials, setObjectMaterials] = useState<Record<SceneObjectType, string>>({
    floor: 'wood-floor-oak',
    backWall: 'concrete-polished',
    sideWall: 'concrete-polished',
    leftPillar: 'marble-white',
    rightPillar: 'marble-white'
  });

  const [uvOverrides, setUvOverrides] = useState<Record<string, Record<string, any>>>({});
  const [physicsOverrides, setPhysicsOverrides] = useState<Record<string, Record<string, any>>>({});

  const currentObjectMaterialId = objectMaterials[selectedObject];
  const currentObjectMaterial = allMaterials.find(m => m.id === currentObjectMaterialId) || allMaterials[0];

  const sceneMaterials = useMemo(() => {
    const result: Record<string, MaterialItem> = {};
    (['floor', 'backWall', 'sideWall', 'leftPillar', 'rightPillar'] as SceneObjectType[]).forEach(obj => {
      const matId = objectMaterials[obj];
      result[obj] = allMaterials.find(m => m.id === matId) || allMaterials[0];
    });
    return result as Record<SceneObjectType, MaterialItem>;
  }, [objectMaterials, allMaterials]);

  const customTextures = useMemo(() => {
    const result: Record<string, any> = {};
    (['floor', 'backWall', 'sideWall', 'leftPillar', 'rightPillar'] as SceneObjectType[]).forEach(obj => {
      const mat = sceneMaterials[obj];
      if (mat?.isCustom && mat.textureUrls) {
        result[obj] = mat.textureUrls;
      }
    });
    return result;
  }, [sceneMaterials]);

  const currentUV = currentObjectMaterial 
    ? { ...currentObjectMaterial.uv, ...uvOverrides[selectedObject] }
    : {};

  const currentPhysics = currentObjectMaterial
    ? { ...currentObjectMaterial.physics, ...physicsOverrides[selectedObject] }
    : {} as MaterialPhysicsProps;

  const handleSelectMaterial = useCallback((materialId: string) => {
    setObjectMaterials(prev => ({
      ...prev,
      [selectedObject]: materialId
    }));
  }, [selectedObject]);

  const handleUVChange = useCallback((uvChanges: any) => {
    setUvOverrides(prev => ({
      ...prev,
      [selectedObject]: { ...prev[selectedObject], ...uvChanges }
    }));
  }, [selectedObject]);

  const handlePhysicsChange = useCallback((physicsChanges: Partial<MaterialPhysicsProps>) => {
    setPhysicsOverrides(prev => ({
      ...prev,
      [selectedObject]: { ...prev[selectedObject], ...physicsChanges }
    }));
  }, [selectedObject]);

  const handleExportSnapshot = useCallback(async () => {
    if (!canvasContainerRef.current) return;
    
    const canvas = canvasContainerRef.current.querySelector('canvas');
    if (!canvas) return;

    setIsExporting(true);
    try {
      await exportSnapshot(canvas, 2560, 1440, `material-${selectedObject}-${Date.now()}.png`);
    } catch (error) {
      console.error('导出快照失败:', error);
      alert('导出快照失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [selectedObject]);

  const handleUploadCustom = useCallback(() => {
    setShowUploader(true);
  }, []);

  const handleUploadComplete = useCallback((data: {
    name: string;
    color: string;
    textures: any;
    textureUrls: any;
  }) => {
    const id = addCustomMaterial({
      name: data.name,
      category: 'custom',
      color: data.color,
      textures: data.textures,
      textureUrls: data.textureUrls,
      physics: {
        roughness: 0.5,
        metalness: 0.0,
        envMapIntensity: 1.0,
        reflectivity: 0.5
      },
      uv: {
        repeatX: 2,
        repeatY: 2
      },
      description: '用户自定义材质'
    });
    
    setObjectMaterials(prev => ({
      ...prev,
      [selectedObject]: id
    }));
    
    setShowUploader(false);
    setSelectedCategory('custom');
  }, [addCustomMaterial, selectedObject, setSelectedCategory]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <div className="logo-text">
            <h1>Material Swapper</h1>
            <span>高性能材质替换工具</span>
          </div>
        </div>
        <SnapshotButton onExport={handleExportSnapshot} isExporting={isExporting} />
      </header>

      <div className="app-main">
        <div className="canvas-container" ref={canvasContainerRef}>
          <ThreeScene
            materials={sceneMaterials}
            uvOverrides={uvOverrides}
            physicsOverrides={physicsOverrides}
            customTextures={customTextures}
          />
          
          <div className="material-info-overlay">
            <span className="current-material-label">当前对象:</span>
            <span className="current-material-name">
              {{
                floor: '地面',
                backWall: '后墙',
                sideWall: '侧墙',
                leftPillar: '左柱',
                rightPillar: '右柱'
              }[selectedObject]}
            </span>
            <span className="material-divider">|</span>
            <span className="current-material-label">材质:</span>
            <span className="current-material-name">{currentObjectMaterial?.name || '-'}</span>
          </div>
        </div>

        <aside className="sidebar">
          <ObjectSelector 
            selectedObject={selectedObject} 
            onChange={setSelectedObject} 
          />

          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
              onClick={() => setActiveTab('materials')}
            >
              材质库
            </button>
            <button
              className={`tab-btn ${activeTab === 'uv' ? 'active' : ''}`}
              onClick={() => setActiveTab('uv')}
            >
              UV 编辑
            </button>
            <button
              className={`tab-btn ${activeTab === 'physics' ? 'active' : ''}`}
              onClick={() => setActiveTab('physics')}
            >
              物理属性
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'materials' && !showUploader && (
              <MaterialPanel
                materials={materials}
                activeMaterialId={currentObjectMaterialId}
                selectedCategory={selectedCategory}
                categories={categories}
                onSelectMaterial={handleSelectMaterial}
                onCategoryChange={setSelectedCategory}
                onUploadCustom={handleUploadCustom}
              />
            )}

            {activeTab === 'materials' && showUploader && (
              <MaterialUploader
                onUpload={handleUploadComplete}
                onCancel={() => setShowUploader(false)}
              />
            )}

            {activeTab === 'uv' && currentObjectMaterial && (
              <UVEditor
                uv={currentUV}
                onChange={handleUVChange}
                disabled={!currentObjectMaterial}
              />
            )}

            {activeTab === 'physics' && currentObjectMaterial && (
              <PhysicsPanel
                physics={currentPhysics}
                onChange={handlePhysicsChange}
                disabled={!currentObjectMaterial}
              />
            )}
          </div>

          <div className="sidebar-footer">
            <div className="stats">
              <div className="stat-item">
                <span className="stat-label">材质总数</span>
                <span className="stat-value">{allMaterials.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">渲染引擎</span>
                <span className="stat-value">Three.js</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;

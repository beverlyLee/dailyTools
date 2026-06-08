import { useState, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { ThreeScene } from './components/ThreeScene';
import { MaterialPanel } from './components/MaterialPanel';
import { UVEditor } from './components/UVEditor';
import { PhysicsPanel } from './components/PhysicsPanel';
import { useMaterialLibrary } from './hooks/useMaterialLibrary';
import { exportSnapshot } from './utils/snapshot';
import { MaterialPhysicsProps } from './types/material';
import './App.css';

function SnapshotButton({ onExport }: { onExport: () => void }) {
  return (
    <button className="snapshot-btn" onClick={onExport}>
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
      导出快照
    </button>
  );
}

function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const {
    materials,
    activeMaterial,
    activeMaterialId,
    selectedCategory,
    categories,
    selectMaterial,
    setSelectedCategory,
    addCustomMaterial,
    updateMaterialPhysics,
    updateMaterialUV
  } = useMaterialLibrary();

  const [activeTab, setActiveTab] = useState<'materials' | 'uv' | 'physics'>('materials');
  const [uvOverrides, setUvOverrides] = useState<Record<string, any>>({});
  const [physicsOverrides, setPhysicsOverrides] = useState<Record<string, Partial<MaterialPhysicsProps>>>({});
  const [isExporting, setIsExporting] = useState(false);

  const currentUV = activeMaterial ? { ...activeMaterial.uv, ...uvOverrides[activeMaterial.id] } : {};
  const currentPhysics = activeMaterial ? { ...activeMaterial.physics, ...physicsOverrides[activeMaterial.id] } : {} as MaterialPhysicsProps;

  const handleUVChange = useCallback((uvChanges: any) => {
    if (!activeMaterial) return;
    setUvOverrides(prev => ({
      ...prev,
      [activeMaterial.id]: { ...prev[activeMaterial.id], ...uvChanges }
    }));
  }, [activeMaterial]);

  const handlePhysicsChange = useCallback((physicsChanges: Partial<MaterialPhysicsProps>) => {
    if (!activeMaterial) return;
    setPhysicsOverrides(prev => ({
      ...prev,
      [activeMaterial.id]: { ...prev[activeMaterial.id], ...physicsChanges }
    }));
  }, [activeMaterial]);

  const handleExportSnapshot = useCallback(async () => {
    if (!canvasContainerRef.current) return;
    
    const canvas = canvasContainerRef.current.querySelector('canvas');
    if (!canvas) return;

    setIsExporting(true);
    try {
      await exportSnapshot(canvas, 1920, 1080, `material-${activeMaterial?.name || 'snapshot'}.png`);
    } catch (error) {
      console.error('导出快照失败:', error);
      alert('导出快照失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [activeMaterial]);

  const handleUploadCustom = useCallback(() => {
    const name = prompt('请输入材质名称:');
    if (!name) return;

    const id = addCustomMaterial({
      name,
      category: 'custom',
      color: '#a0a0a0',
      textures: {},
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
    selectMaterial(id);
  }, [addCustomMaterial, selectMaterial]);

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
        <SnapshotButton onExport={handleExportSnapshot} />
      </header>

      <div className="app-main">
        <div className="canvas-container" ref={canvasContainerRef}>
          {activeMaterial && (
            <ThreeScene
              floorMaterial={activeMaterial}
              uvOptions={uvOverrides[activeMaterial.id]}
              physicsOverrides={physicsOverrides[activeMaterial.id]}
            />
          )}
          
          {activeMaterial && (
            <div className="material-info-overlay">
              <span className="current-material-label">当前材质:</span>
              <span className="current-material-name">{activeMaterial.name}</span>
            </div>
          )}
        </div>

        <aside className="sidebar">
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
            {activeTab === 'materials' && (
              <MaterialPanel
                materials={materials}
                activeMaterialId={activeMaterialId}
                selectedCategory={selectedCategory}
                categories={categories}
                onSelectMaterial={selectMaterial}
                onCategoryChange={setSelectedCategory}
                onUploadCustom={handleUploadCustom}
              />
            )}

            {activeTab === 'uv' && activeMaterial && (
              <UVEditor
                uv={currentUV}
                onChange={handleUVChange}
                disabled={!activeMaterial}
              />
            )}

            {activeTab === 'physics' && activeMaterial && (
              <PhysicsPanel
                physics={currentPhysics}
                onChange={handlePhysicsChange}
                disabled={!activeMaterial}
              />
            )}
          </div>

          <div className="sidebar-footer">
            <div className="stats">
              <div className="stat-item">
                <span className="stat-label">材质数量</span>
                <span className="stat-value">{materials.length}</span>
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

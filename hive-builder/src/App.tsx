import { useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import HexCell from './components/HexCell';
import { generateHexGridBFS, type HexCellData, createScale } from './math/HexGrid';
import './App.css';

const MAX_RADIUS = 5;
const GROWTH_DELAY = 0.15;

function getColorByLayer(layer: number, maxLayer: number): string {
  const hueScale = createScale([0, maxLayer], [45, 30]);
  const saturationScale = createScale([0, maxLayer], [80, 100]);
  const lightnessScale = createScale([0, maxLayer], [65, 55]);
  
  const hue = hueScale(layer);
  const saturation = saturationScale(layer);
  const lightness = lightnessScale(layer);
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function HiveScene({ currentLayer, onLayerComplete }: { 
  currentLayer: number; 
  onLayerComplete: (layer: number) => void;
}) {
  const allCells = useMemo(() => generateHexGridBFS(MAX_RADIUS), []);
  const cellsByLayer = useMemo(() => {
    const map = new Map<number, HexCellData[]>();
    for (let i = 0; i <= MAX_RADIUS; i++) {
      map.set(i, allCells.filter(c => c.layer === i));
    }
    return map;
  }, [allCells]);

  const visibleCells = useMemo(() => {
    const cells: HexCellData[] = [];
    for (let i = 0; i <= currentLayer; i++) {
      const layerCells = cellsByLayer.get(i);
      if (layerCells) {
        cells.push(...layerCells);
      }
    }
    return cells;
  }, [currentLayer, cellsByLayer]);

  useEffect(() => {
    if (currentLayer < MAX_RADIUS) {
      const timer = setTimeout(() => {
        onLayerComplete(currentLayer + 1);
      }, GROWTH_DELAY * 1000);
      return () => clearTimeout(timer);
    }
  }, [currentLayer, onLayerComplete]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#FFE4B5" />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#2D1B0E" />
      </mesh>

      <group>
        {visibleCells.map((cell) => (
          <HexCell
            key={`${cell.coord.q},${cell.coord.r},${cell.coord.s}`}
            position={[cell.position.x, 0, cell.position.y]}
            color={getColorByLayer(cell.layer, MAX_RADIUS)}
            delay={cell.layer * GROWTH_DELAY}
          />
        ))}
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        target={[0, 0, 0]}
      />
    </>
  );
}

function App() {
  const [currentLayer, setCurrentLayer] = useState(0);

  const totalCells = useMemo(() => {
    let count = 0;
    for (let i = 0; i <= currentLayer; i++) {
      count += i === 0 ? 1 : 6 * i;
    }
    return count;
  }, [currentLayer]);

  const handleLayerComplete = useCallback((nextLayer: number) => {
    setCurrentLayer(nextLayer);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🐝 蜂巢构建器</h1>
        <p>从中心向外自动扩展完美的六边形蜂巢结构</p>
      </header>
      
      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, 15, 15], fov: 50 }}
          shadows
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#1a0f08']} />
          <fog attach="fog" args={['#1a0f08', 20, 40]} />
          <HiveScene 
            currentLayer={currentLayer} 
            onLayerComplete={handleLayerComplete}
          />
        </Canvas>
      </div>
      
      <footer className="app-footer">
        <div className="info-panel">
          <div className="info-item">
            <span className="label">当前层数:</span>
            <span className="value">{currentLayer + 1} / {MAX_RADIUS + 1}</span>
          </div>
          <div className="info-item">
            <span className="label">蜂巢总数:</span>
            <span className="value">{totalCells} / {1 + 3 * MAX_RADIUS * (MAX_RADIUS + 1)}</span>
          </div>
          <div className="info-item">
            <span className="label">生长模式:</span>
            <span className="value">广度优先 (BFS)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

import { useState } from 'react';
import CircuitDesigner from './qc-circuit-designer/CircuitDesigner';
import StateVisualizer from './state-vector-visualizer/StateVisualizer';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'designer' | 'visualizer'>('designer');

  return (
    <div className="app">
      <header className="app-header">
        <h1>量子计算模拟实验室</h1>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'designer' ? 'active' : ''}`}
            onClick={() => setActiveTab('designer')}
          >
            量子电路设计器
          </button>
          <button
            className={`nav-tab ${activeTab === 'visualizer' ? 'active' : ''}`}
            onClick={() => setActiveTab('visualizer')}
          >
            状态向量可视化
          </button>
        </nav>
      </header>
      
      <main className="app-main">
        {activeTab === 'designer' ? (
          <CircuitDesigner />
        ) : (
          <StateVisualizer />
        )}
      </main>
    </div>
  );
}

export default App;

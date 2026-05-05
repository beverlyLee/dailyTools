import { Routes, Route, Link, useLocation } from 'react-router-dom';
import MDSimulator from './components/MDSimulator';
import NashSolver from './components/NashSolver';
import './App.css';

function App() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔬 分子动力学与博弈论求解器</h1>
        <nav className="main-nav">
          <Link to="/" className={`nav-link ${isActive('/')}`}>
            ⚛️ 分子动力学模拟器
          </Link>
          <Link to="/nash" className={`nav-link ${isActive('/nash')}`}>
            🎮 纳什均衡求解器
          </Link>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<MDSimulator />} />
          <Route path="/nash" element={<NashSolver />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>分子动力学与博弈论求解器 | 基于 Three.js + React + AG-Grid + Python</p>
      </footer>
    </div>
  );
}

export default App;

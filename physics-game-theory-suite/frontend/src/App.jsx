import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import SimulationPage from './pages/SimulationPage'
import GameSolverPage from './pages/GameSolverPage'
import TrajectoryPage from './pages/TrajectoryPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="simulation" element={<SimulationPage />} />
        <Route path="game-solver" element={<GameSolverPage />} />
        <Route path="trajectory" element={<TrajectoryPage />} />
      </Route>
    </Routes>
  )
}

export default App

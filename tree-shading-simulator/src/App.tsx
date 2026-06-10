import { Scene } from './components/scene/Scene';
import { ControlPanel } from './components/ControlPanel';
import { AssessmentBar } from './components/AssessmentBar';

function App() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-300">
      <Scene />
      <ControlPanel />
      <AssessmentBar />
    </div>
  );
}

export default App;

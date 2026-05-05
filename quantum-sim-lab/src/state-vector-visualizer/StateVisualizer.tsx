import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import BlochSphere from './BlochSphere';
import ProbabilityChart from './ProbabilityChart';
import StateEvolution from './StateEvolution';
import DataExporter from './DataExporter';
import { SimulationResult, CircuitState } from '../types';
import './StateVisualizer.css';

interface StateVisualizerProps {
  initialResult?: SimulationResult;
}

const StateVisualizer: React.FC<StateVisualizerProps> = ({ initialResult }) => {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(
    initialResult || null
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedQubit, setSelectedQubit] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [demoQubits, setDemoQubits] = useState(3);
  const [demoShots, setDemoShots] = useState(1000);

  useEffect(() => {
    if (initialResult) {
      setSimulationResult(initialResult);
      setCurrentStep(0);
    }
  }, [initialResult]);

  const runDemoSimulation = async () => {
    setIsLoading(true);
    try {
      const circuitJson = await invoke<string>('create_circuit', { qubits: demoQubits });
      
      let currentCircuit = circuitJson;
      
      currentCircuit = await invoke<string>('add_gate', {
        circuitJson: currentCircuit,
        gateInfo: {
          gate_type: 'H',
          qubits: [0],
          parameters: [],
        },
      });
      
      currentCircuit = await invoke<string>('add_gate', {
        circuitJson: currentCircuit,
        gateInfo: {
          gate_type: 'CNOT',
          qubits: [0, 1],
          parameters: [],
        },
      });
      
      if (demoQubits >= 3) {
        currentCircuit = await invoke<string>('add_gate', {
          circuitJson: currentCircuit,
          gateInfo: {
            gate_type: 'H',
            qubits: [2],
            parameters: [],
          },
        });
      }

      const result = await invoke<SimulationResult>('run_simulation', {
        circuitJson: currentCircuit,
        shots: demoShots,
      });

      setSimulationResult(result);
      setCurrentStep(0);
    } catch (error) {
      console.error('Demo simulation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAnimation = () => {
    if (isAnimating) {
      setIsAnimating(false);
    } else {
      setIsAnimating(true);
      animateSteps();
    }
  };

  const animateSteps = () => {
    if (!simulationResult) return;

    const steps = simulationResult.step_states.length;
    let current = 0;

    const interval = setInterval(() => {
      if (current >= steps - 1) {
        clearInterval(interval);
        setIsAnimating(false);
        return;
      }
      current++;
      setCurrentStep(current);
    }, 500);

    return () => clearInterval(interval);
  };

  const getCurrentState = (): CircuitState | null => {
    if (!simulationResult) return null;
    if (currentStep < simulationResult.step_states.length) {
      return simulationResult.step_states[currentStep];
    }
    return simulationResult.final_state;
  };

  const currentState = getCurrentState();

  return (
    <div className="state-visualizer">
      <div className="visualizer-toolbar">
        <div className="toolbar-section">
          <label>演示量子比特数:</label>
          <select
            value={demoQubits}
            onChange={(e) => setDemoQubits(Number(e.target.value))}
            className="toolbar-select"
          >
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-section">
          <label>模拟次数:</label>
          <input
            type="number"
            value={demoShots}
            onChange={(e) => setDemoShots(Math.max(1, Number(e.target.value)))}
            min="1"
            max="10000"
            className="toolbar-input"
          />
        </div>

        <button
          onClick={runDemoSimulation}
          disabled={isLoading}
          className="btn btn-primary"
        >
          {isLoading ? '运行中...' : '运行演示模拟'}
        </button>

        {simulationResult && (
          <div className="animation-controls">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="btn btn-small btn-secondary"
            >
              ← 上一步
            </button>
            <button
              onClick={toggleAnimation}
              className="btn btn-small btn-secondary"
            >
              {isAnimating ? '暂停' : '▶ 播放'}
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(simulationResult.step_states.length - 1, currentStep + 1))}
              disabled={currentStep >= simulationResult.step_states.length - 1}
              className="btn btn-small btn-secondary"
            >
              下一步 →
            </button>
            <span className="step-indicator">
              步骤 {currentStep + 1} / {simulationResult.step_states.length}
            </span>
          </div>
        )}
      </div>

      {!simulationResult ? (
        <div className="empty-state-container">
          <div className="empty-visualizer">
            <h3>暂无模拟数据</h3>
            <p>点击"运行演示模拟"按钮查看量子态演化过程</p>
            <p className="hint">或者在"量子电路设计器"中设计电路并运行模拟</p>
          </div>
        </div>
      ) : (
        <div className="visualizer-content">
          <div className="visualizer-grid">
            <div className="bloch-sphere-section">
              <h3>Bloch 球可视化</h3>
              <div className="qubit-selector">
                {Array.from({ length: currentState?.bloch_spheres.length || 0 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedQubit(i)}
                    className={`qubit-btn ${selectedQubit === i ? 'active' : ''}`}
                  >
                    q<sub>{i}</sub>
                  </button>
                ))}
              </div>
              {currentState && (
                <BlochSphere
                  state={currentState.bloch_spheres[selectedQubit]}
                  qubitIndex={selectedQubit}
                />
              )}
            </div>

            <div className="probability-section">
              <h3>测量概率分布</h3>
              {currentState && (
                <ProbabilityChart
                  probabilities={currentState.probabilities}
                  qubitCount={currentState.bloch_spheres.length}
                />
              )}
              {simulationResult.measurement_results.length > 0 && (
                <div className="measurement-stats">
                  <h4>测量统计 ({demoShots} 次)</h4>
                  <ProbabilityChart
                    probabilities={Object.values(simulationResult.probability_distribution)}
                    qubitCount={currentState?.bloch_spheres.length || 0}
                    labels={Object.keys(simulationResult.probability_distribution)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="evolution-section">
            <h3>量子态演化过程</h3>
            <StateEvolution
              stepStates={simulationResult.step_states}
              currentStep={currentStep}
              onStepSelect={setCurrentStep}
            />
          </div>

          <div className="exporter-section">
            <h3>数据导出</h3>
            <DataExporter simulationResult={simulationResult} />
          </div>

          <div className="state-details">
            <h3>状态详情</h3>
            {currentState && (
              <div className="amplitudes-table">
                <table>
                  <thead>
                    <tr>
                      <th>状态</th>
                      <th>振幅 (实部)</th>
                      <th>振幅 (虚部)</th>
                      <th>概率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentState.amplitudes.map((amp, index) => (
                      <tr key={index}>
                        <td className="state-label">
                          |{index.toString(2).padStart(currentState.bloch_spheres.length, '0')}⟩
                        </td>
                        <td className="real-part">{amp.real.toFixed(4)}</td>
                        <td className="imag-part">{amp.imag >= 0 ? '+' : ''}{amp.imag.toFixed(4)}i</td>
                        <td className="probability">
                          {(currentState.probabilities[index] * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StateVisualizer;

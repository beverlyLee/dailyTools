import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';
import GatePanel from './GatePanel';
import CircuitCanvas from './CircuitCanvas';
import SubcircuitManager from './SubcircuitManager';
import { CircuitGate, Subcircuit, SimulationResult, ValidationResult } from '../types';
import './CircuitDesigner.css';

interface CircuitDesignerProps {
  onSimulate?: (result: SimulationResult) => void;
}

const CircuitDesigner: React.FC<CircuitDesignerProps> = ({ onSimulate }) => {
  const [qubitCount, setQubitCount] = useState(3);
  const [gates, setGates] = useState<CircuitGate[]>([]);
  const [circuitJson, setCircuitJson] = useState<string>('');
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [subcircuits, setSubcircuits] = useState<Subcircuit[]>([]);
  const [shots, setShots] = useState(1000);

  useEffect(() => {
    initializeCircuit();
  }, [qubitCount]);

  const initializeCircuit = async () => {
    try {
      const result = await invoke<string>('create_circuit', { qubits: qubitCount });
      setCircuitJson(result);
      setGates([]);
    } catch (error) {
      console.error('Failed to create circuit:', error);
    }
  };

  const handleGateDrop = async (gateType: string, qubits: number[], column: number) => {
    const newGate: CircuitGate = {
      id: uuidv4(),
      type: gateType,
      qubits,
      column,
    };

    const updatedGates = [...gates, newGate];
    setGates(updatedGates);

    try {
      const result = await invoke<string>('add_gate', {
        circuitJson,
        gateInfo: {
          gate_type: gateType,
          qubits,
          parameters: [],
        },
      });
      setCircuitJson(result);
      validateCircuit(result);
    } catch (error) {
      console.error('Failed to add gate:', error);
    }
  };

  const handleRemoveGate = async (gateId: string) => {
    const gateIndex = gates.findIndex((g) => g.id === gateId);
    if (gateIndex === -1) return;

    const updatedGates = gates.filter((g) => g.id !== gateId);
    setGates(updatedGates);

    try {
      const result = await invoke<string>('remove_gate', {
        circuitJson,
        index: gateIndex,
      });
      setCircuitJson(result);
      validateCircuit(result);
    } catch (error) {
      console.error('Failed to remove gate:', error);
    }
  };

  const validateCircuit = async (json: string) => {
    try {
      const result = await invoke<ValidationResult>('validate_circuit', {
        circuitJson: json,
      });
      setValidationResult(result);
    } catch (error) {
      console.error('Failed to validate circuit:', error);
    }
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const result = await invoke<SimulationResult>('run_simulation', {
        circuitJson,
        shots,
      });
      if (onSimulate) {
        onSimulate(result);
      }
      console.log('Simulation result:', result);
    } catch (error) {
      console.error('Failed to run simulation:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClearCircuit = () => {
    initializeCircuit();
    setValidationResult(null);
  };

  const handleSaveSubcircuit = (name: string) => {
    if (gates.length === 0) return;

    const newSubcircuit: Subcircuit = {
      id: uuidv4(),
      name,
      gates: [...gates],
      inputQubits: qubitCount,
      outputQubits: qubitCount,
    };

    setSubcircuits([...subcircuits, newSubcircuit]);
  };

  const handleLoadSubcircuit = (subcircuit: Subcircuit) => {
    if (subcircuit.inputQubits !== qubitCount) {
      setQubitCount(subcircuit.inputQubits);
    }
    setGates([...subcircuit.gates]);
  };

  const handleDeleteSubcircuit = (id: string) => {
    setSubcircuits(subcircuits.filter((s) => s.id !== id));
  };

  return (
    <div className="circuit-designer">
      <div className="designer-toolbar">
        <div className="toolbar-section">
          <label>量子比特数:</label>
          <select
            value={qubitCount}
            onChange={(e) => setQubitCount(Number(e.target.value))}
            className="toolbar-select"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
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
            value={shots}
            onChange={(e) => setShots(Math.max(1, Number(e.target.value)))}
            min="1"
            max="10000"
            className="toolbar-input"
          />
        </div>

        <div className="toolbar-buttons">
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating || gates.length === 0}
            className="btn btn-primary"
          >
            {isSimulating ? '模拟中...' : '运行模拟'}
          </button>
          <button onClick={handleClearCircuit} className="btn btn-secondary">
            清空电路
          </button>
        </div>
      </div>

      {validationResult && !validationResult.valid && (
        <div className="validation-error">
          <h4>电路校验错误:</h4>
          <ul>
            {validationResult.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="designer-content">
        <GatePanel
          onGateSelect={(gateType) => setSelectedGate(gateType)}
          selectedGate={selectedGate}
          subcircuits={subcircuits}
          onSubcircuitSelect={(subcircuit) => {
            handleLoadSubcircuit(subcircuit);
          }}
        />

        <CircuitCanvas
          qubitCount={qubitCount}
          gates={gates}
          selectedGateType={selectedGate}
          onGateDrop={handleGateDrop}
          onGateRemove={handleRemoveGate}
        />

        <SubcircuitManager
          onSave={handleSaveSubcircuit}
          subcircuits={subcircuits}
          onLoad={handleLoadSubcircuit}
          onDelete={handleDeleteSubcircuit}
          hasGates={gates.length > 0}
        />
      </div>
    </div>
  );
};

export default CircuitDesigner;

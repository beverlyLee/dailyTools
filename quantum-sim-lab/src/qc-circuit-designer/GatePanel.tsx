import { useState } from 'react';
import { Subcircuit } from '../types';
import './GatePanel.css';

interface GatePanelProps {
  onGateSelect: (gateType: string) => void;
  selectedGate: string | null;
  subcircuits: Subcircuit[];
  onSubcircuitSelect: (subcircuit: Subcircuit) => void;
}

const singleQubitGates = [
  { type: 'H', name: 'Hadamard', color: '#ff6b6b', description: '创建叠加态' },
  { type: 'X', name: 'Pauli-X', color: '#4ecdc4', description: '量子NOT门' },
  { type: 'Y', name: 'Pauli-Y', color: '#45b7d1', description: 'Y轴旋转' },
  { type: 'Z', name: 'Pauli-Z', color: '#96ceb4', description: 'Z轴旋转' },
  { type: 'S', name: 'Phase', color: '#ffeaa7', description: '相位门' },
  { type: 'T', name: 'T-Gate', color: '#dfe6e9', description: 'π/4相位' },
];

const multiQubitGates = [
  { type: 'CNOT', name: 'CNOT', color: '#fd79a8', description: '控制NOT门' },
  { type: 'Toffoli', name: 'Toffoli', color: '#a29bfe', description: '控制-控制NOT' },
  { type: 'Swap', name: 'Swap', color: '#00b894', description: '交换量子比特' },
];

const measurementGate = {
  type: 'Measurement',
  name: 'Measurement',
  color: '#e17055',
  description: '量子测量',
};

const GatePanel: React.FC<GatePanelProps> = ({
  onGateSelect,
  selectedGate,
  subcircuits,
  onSubcircuitSelect,
}) => {
  const [hoveredGate, setHoveredGate] = useState<string | null>(null);

  const renderGateItem = (gate: { type: string; name: string; color: string; description: string }) => (
    <div
      key={gate.type}
      className={`gate-item ${selectedGate === gate.type ? 'selected' : ''}`}
      onClick={() => onGateSelect(gate.type)}
      onMouseEnter={() => setHoveredGate(gate.type)}
      onMouseLeave={() => setHoveredGate(null)}
      style={{
        borderLeftColor: gate.color,
        backgroundColor: selectedGate === gate.type ? `${gate.color}20` : 'transparent',
      }}
    >
      <div className="gate-icon" style={{ backgroundColor: gate.color }}>
        {gate.type}
      </div>
      <div className="gate-info">
        <div className="gate-name">{gate.name}</div>
        {hoveredGate === gate.type && (
          <div className="gate-description">{gate.description}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="gate-panel">
      <div className="panel-section">
        <h3>单量子比特门</h3>
        <div className="gate-list">
          {singleQubitGates.map(renderGateItem)}
        </div>
      </div>

      <div className="panel-section">
        <h3>多量子比特门</h3>
        <div className="gate-list">
          {multiQubitGates.map(renderGateItem)}
        </div>
      </div>

      <div className="panel-section">
        <h3>测量</h3>
        <div className="gate-list">{renderGateItem(measurementGate)}</div>
      </div>

      {subcircuits.length > 0 && (
        <div className="panel-section">
          <h3>保存的子电路</h3>
          <div className="subcircuit-list">
            {subcircuits.map((subcircuit) => (
              <div
                key={subcircuit.id}
                className="subcircuit-item"
                onClick={() => onSubcircuitSelect(subcircuit)}
              >
                <div className="subcircuit-icon">SC</div>
                <div className="subcircuit-info">
                  <div className="subcircuit-name">{subcircuit.name}</div>
                  <div className="subcircuit-details">
                    {subcircuit.gates.length} 个门, {subcircuit.inputQubits} 量子比特
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel-hint">
        <p>选择一个门，然后点击电路画布上的量子比特线来放置</p>
      </div>
    </div>
  );
};

export default GatePanel;

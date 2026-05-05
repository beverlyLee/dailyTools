import { useState, useMemo } from 'react';
import { CircuitGate } from '../types';
import './CircuitCanvas.css';

interface CircuitCanvasProps {
  qubitCount: number;
  gates: CircuitGate[];
  selectedGateType: string | null;
  onGateDrop: (gateType: string, qubits: number[], column: number) => void;
  onGateRemove: (gateId: string) => void;
}

const gateColors: Record<string, string> = {
  H: '#ff6b6b',
  X: '#4ecdc4',
  Y: '#45b7d1',
  Z: '#96ceb4',
  S: '#ffeaa7',
  T: '#dfe6e9',
  CNOT: '#fd79a8',
  Toffoli: '#a29bfe',
  Swap: '#00b894',
  Measurement: '#e17055',
};

const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  qubitCount,
  gates,
  selectedGateType,
  onGateDrop,
  onGateRemove,
}) => {
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [hoveredQubit, setHoveredQubit] = useState<number | null>(null);

  const columns = useMemo(() => {
    if (gates.length === 0) return 10;
    const maxColumn = Math.max(...gates.map((g) => g.column));
    return Math.max(maxColumn + 5, 10);
  }, [gates]);

  const getGatesAtColumn = (column: number) => {
    return gates.filter((g) => g.column === column);
  };

  const handleCanvasClick = (qubit: number, column: number) => {
    if (!selectedGateType) return;

    const existingGates = getGatesAtColumn(column);
    const qubitInUse = existingGates.some((g) => g.qubits.includes(qubit));
    if (qubitInUse) return;

    let qubits: number[] = [];
    
    switch (selectedGateType) {
      case 'CNOT':
      case 'Swap':
        qubits = [qubit, qubit < qubitCount - 1 ? qubit + 1 : qubit - 1];
        if (qubits[0] === qubits[1]) return;
        break;
      case 'Toffoli':
        if (qubit < qubitCount - 2) {
          qubits = [qubit, qubit + 1, qubit + 2];
        } else if (qubit >= 2) {
          qubits = [qubit - 2, qubit - 1, qubit];
        } else {
          return;
        }
        break;
      default:
        qubits = [qubit];
    }

    qubits.sort((a, b) => a - b);
    onGateDrop(selectedGateType, qubits, column);
  };

  const renderQubitLine = (qubitIndex: number) => {
    const qubitGates = gates.filter((g) => g.qubits.includes(qubitIndex));
    
    return (
      <div key={qubitIndex} className="qubit-line">
        <div className="qubit-label">q<sub>{qubitIndex}</sub></div>
        <div className="qubit-track">
          {Array.from({ length: columns }, (_, col) => {
            const gateAtPosition = gates.find(
              (g) => g.column === col && g.qubits.includes(qubitIndex)
            );
            const isHovered = hoveredColumn === col && hoveredQubit === qubitIndex;
            const canPlace = selectedGateType && !gateAtPosition;

            return (
              <div
                key={col}
                className={`circuit-cell ${isHovered ? 'hovered' : ''} ${
                  canPlace ? 'can-place' : ''
                }`}
                onClick={() => handleCanvasClick(qubitIndex, col)}
                onMouseEnter={() => {
                  setHoveredColumn(col);
                  setHoveredQubit(qubitIndex);
                }}
                onMouseLeave={() => {
                  setHoveredColumn(null);
                  setHoveredQubit(null);
                }}
              >
                {gateAtPosition && (
                  <div
                    className={`gate-node ${gateAtPosition.type}`}
                    style={{ backgroundColor: gateColors[gateAtPosition.type] || '#666' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (gateAtPosition.qubits[0] === qubitIndex) {
                        onGateRemove(gateAtPosition.id);
                      }
                    }}
                  >
                    {gateAtPosition.type}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMultiQubitGates = () => {
    const multiQubitGates = gates.filter((g) => g.qubits.length > 1);
    
    return multiQubitGates.map((gate) => {
      const minQubit = Math.min(...gate.qubits);
      const maxQubit = Math.max(...gate.qubits);
      const qubitSpan = maxQubit - minQubit;
      
      return (
        <div
          key={gate.id}
        >
          
        </div>
      );
    });
  };

  return (
    <div className="circuit-canvas">
      <div className="canvas-header">
        <h3>量子电路画布</h3>
        <div className="canvas-info">
          <span>{qubitCount} 量子比特</span>
          <span>{gates.length} 个门</span>
        </div>
      </div>
      
      <div className="canvas-content">
        <div className="circuit-grid">
          {Array.from({ length: qubitCount }, (_, i) => renderQubitLine(i))}
        </div>
        
        {selectedGateType && (
          <div className="placement-hint">
            当前选择: <span style={{ color: gateColors[selectedGateType] }}>
              {selectedGateType} 门
            </span>
            <span className="hint-text">点击量子比特线放置门</span>
          </div>
        )}
        
        <div className="canvas-instructions">
          <p>
            <strong>使用说明:</strong> 从左侧选择量子门，然后点击电路画布上的量子比特线来放置。
            点击已放置的门可以删除它。
          </p>
        </div>
      </div>
    </div>
  );
};

export default CircuitCanvas;

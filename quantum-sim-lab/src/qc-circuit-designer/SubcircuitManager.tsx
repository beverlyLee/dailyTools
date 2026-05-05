import { useState } from 'react';
import { Subcircuit } from '../types';
import './SubcircuitManager.css';

interface SubcircuitManagerProps {
  onSave: (name: string) => void;
  subcircuits: Subcircuit[];
  onLoad: (subcircuit: Subcircuit) => void;
  onDelete: (id: string) => void;
  hasGates: boolean;
}

const SubcircuitManager: React.FC<SubcircuitManagerProps> = ({
  onSave,
  subcircuits,
  onLoad,
  onDelete,
  hasGates,
}) => {
  const [newSubcircuitName, setNewSubcircuitName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const handleSave = () => {
    if (!newSubcircuitName.trim()) return;
    onSave(newSubcircuitName.trim());
    setNewSubcircuitName('');
    setShowSaveForm(false);
  };

  return (
    <div className="subcircuit-manager">
      <div className="manager-header">
        <h3>子电路管理</h3>
        <button
          onClick={() => setShowSaveForm(true)}
          disabled={!hasGates}
          className="btn btn-small btn-secondary"
        >
          保存当前电路
        </button>
      </div>

      {showSaveForm && (
        <div className="save-form">
          <input
            type="text"
            value={newSubcircuitName}
            onChange={(e) => setNewSubcircuitName(e.target.value)}
            placeholder="输入子电路名称..."
            className="form-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <div className="form-buttons">
            <button onClick={handleSave} className="btn btn-small btn-primary">
              保存
            </button>
            <button
              onClick={() => {
                setShowSaveForm(false);
                setNewSubcircuitName('');
              }}
              className="btn btn-small btn-secondary"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="subcircuit-list">
        {subcircuits.length === 0 ? (
          <div className="empty-state">
            <p>暂无保存的子电路</p>
            <p className="hint">在电路画布上添加门，然后点击"保存当前电路"按钮</p>
          </div>
        ) : (
          subcircuits.map((subcircuit) => (
            <div key={subcircuit.id} className="subcircuit-card">
              <div className="card-header">
                <span className="card-name">{subcircuit.name}</span>
                <span className="card-meta">
                  {subcircuit.gates.length} 门 · {subcircuit.inputQubits} 量子比特
                </span>
              </div>
              <div className="card-actions">
                <button
                  onClick={() => onLoad(subcircuit)}
                  className="btn btn-small btn-primary"
                >
                  加载
                </button>
                <button
                  onClick={() => onDelete(subcircuit.id)}
                  className="btn btn-small btn-danger"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="manager-info">
        <h4>关于子电路</h4>
        <p>
          子电路允许您保存常用的电路片段并在其他电路中复用。这对于构建复杂的量子算法非常有用。
        </p>
        <ul>
          <li>保存的子电路会保留所有门和量子比特配置</li>
          <li>加载子电路时会自动调整量子比特数量</li>
          <li>可以通过左侧面板快速访问保存的子电路</li>
        </ul>
      </div>
    </div>
  );
};

export default SubcircuitManager;

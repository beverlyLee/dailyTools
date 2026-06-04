import React, { useState } from 'react';

interface ManualInputProps {
  onAdd: (sessionId: string) => void;
  monitoringIds: Set<string>;
}

const ManualInput: React.FC<ManualInputProps> = ({ onAdd, monitoringIds }) => {
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedId = sessionId.trim();
    
    if (!trimmedId) {
      setError('请输入 Session ID');
      return;
    }
    
    if (monitoringIds.has(trimmedId)) {
      setError('该 Session 已在监控中');
      return;
    }
    
    onAdd(trimmedId);
    setSessionId('');
    setError('');
  };

  return (
    <div className="manual-input">
      <h3>➕ 手动添加</h3>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={sessionId}
          onChange={(e) => {
            setSessionId(e.target.value);
            setError('');
          }}
          placeholder="输入 Session ID"
          className="session-input"
        />
        <button type="submit" className="btn btn-primary">
          添加监控
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}

      <style>{`
        .manual-input {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .manual-input h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: #333;
        }
        
        .input-form {
          display: flex;
          gap: 12px;
        }
        
        .session-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          font-family: monospace;
          transition: border-color 0.2s;
        }
        
        .session-input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .session-input::placeholder {
          color: #aaa;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .error-text {
          margin: 12px 0 0 0;
          color: #ff3b30;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default ManualInput;

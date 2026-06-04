import React from 'react';
import { MonitorStatus } from '../types';

interface MonitorCardProps {
  monitor: MonitorStatus;
  onStop: (sessionId: string) => void;
  onRemove: (sessionId: string) => void;
  onMarkCompleted: (sessionId: string) => void;
}

const MonitorCard: React.FC<MonitorCardProps> = ({ monitor, onStop, onRemove, onMarkCompleted }) => {
  const formatTime = (seconds: number) => {
    if (!seconds || seconds < 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusColor = () => {
    switch (monitor.status) {
      case 'running':
        return '#ff9500';
      case 'completed':
        return '#34c759';
      case 'error':
        return '#ff3b30';
      case 'idle':
        return '#8e8e93';
      default:
        return '#8e8e93';
    }
  };

  const getStatusIcon = () => {
    switch (monitor.status) {
      case 'running':
        return '🔄';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      case 'idle':
        return '💤';
      default:
        return '❓';
    }
  };

  return (
    <div className={`monitor-card status-${monitor.status}`}>
      <div className="card-header">
        <div className="card-title">
          <span className="status-icon">{getStatusIcon()}</span>
          <div className="title-text">
            <span className="display-name" title={monitor.title || monitor.display_name || monitor.session_id}>
              {monitor.title || monitor.display_name || monitor.session_id.slice(0, 16)}
            </span>
            <span className="session-id-small" title={monitor.session_id}>
              {monitor.session_id.slice(0, 12)}...
            </span>
          </div>
        </div>
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor() }}
        >
          {monitor.status_text}
        </span>
      </div>

      <div className="card-body">
        <div className="stat-row">
          <span className="stat-label">CPU 使用率</span>
          <span className="stat-value">
            <div className="cpu-bar">
              <div
                className="cpu-fill"
                style={{
                  width: `${Math.min(monitor.avg_cpu, 100)}%`,
                  backgroundColor: getStatusColor(),
                }}
              />
            </div>
            <span className="cpu-text">{monitor.avg_cpu.toFixed(1)}%</span>
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">运行时间</span>
          <span className="stat-value text-value">
            {formatTime(monitor.elapsed_time)}
          </span>
        </div>

        {monitor.is_monitoring && (
          <div className="monitoring-indicator">
            <span className="pulse-dot" />
            实时监控中
          </div>
        )}
      </div>

      <div className="card-actions">
        {monitor.is_monitoring ? (
          <>
            <button
              className="btn btn-mark-done"
              onClick={() => onMarkCompleted(monitor.session_id)}
            >
              ✅ 标记完成
            </button>
            <button
              className="btn btn-stop"
              onClick={() => onStop(monitor.session_id)}
            >
              停止监控
            </button>
          </>
        ) : (
          monitor.status === 'completed' && (
            <button
              className="btn btn-remove"
              onClick={() => onRemove(monitor.session_id)}
            >
              移除
            </button>
          )
        )}
      </div>

      <style>{`
        .monitor-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #8e8e93;
          transition: all 0.3s;
        }
        
        .monitor-card.status-running {
          border-left-color: #ff9500;
          animation: pulse-border 2s infinite;
        }
        
        .monitor-card.status-completed {
          border-left-color: #34c759;
          background: linear-gradient(135deg, #f0fff4 0%, #ffffff 100%);
        }
        
        .monitor-card.status-error {
          border-left-color: #ff3b30;
        }
        
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          50% {
            box-shadow: 0 4px 20px rgba(255, 149, 0, 0.3);
          }
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        
        .title-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        
        .display-name {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }
        
        .session-id-small {
          font-family: monospace;
          font-size: 11px;
          color: #999;
        }
        
        .status-icon {
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: 500;
        }
        
        .card-body {
          margin-bottom: 16px;
        }
        
        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .stat-row:last-child {
          border-bottom: none;
        }
        
        .stat-label {
          color: #666;
          font-size: 13px;
        }
        
        .stat-value {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .stat-value.text-value {
          color: #333;
          font-weight: 500;
          font-size: 14px;
        }
        
        .cpu-bar {
          width: 80px;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .cpu-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s;
        }
        
        .cpu-text {
          font-size: 13px;
          font-weight: 600;
          color: #333;
          min-width: 50px;
          text-align: right;
        }
        
        .monitoring-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #fff3e0;
          border-radius: 6px;
          margin-top: 12px;
          font-size: 13px;
          color: #ff9500;
          font-weight: 500;
        }
        
        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #ff9500;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
        
        .card-actions {
          display: flex;
          gap: 8px;
        }
        
        .btn {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        
        .btn-mark-done {
          background: #34c759;
          color: white;
        }
        
        .btn-mark-done:hover {
          background: #2db84d;
        }
        
        .btn-stop {
          background: #ff3b30;
          color: white;
        }
        
        .btn-stop:hover {
          background: #ff6b6b;
        }
        
        .btn-remove {
          background: #8e8e93;
          color: white;
        }
        
        .btn-remove:hover {
          background: #a8a8ad;
        }
      `}</style>
    </div>
  );
};

export default MonitorCard;

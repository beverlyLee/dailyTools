import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Session, MonitorStatus, SSEMessage, SessionDetail } from './types';
import {
  getSessions,
  getChatSessions,
  startMonitor,
  stopMonitor,
  removeMonitor,
  markCompleted,
  createSSEConnection,
  getSessionDetail,
  ConnectionStatus,
} from './services/api';
import { playNotificationSound, testSound } from './utils/sound';
import MonitorCard from './components/MonitorCard';
import ManualInput from './components/ManualInput';
import SessionDetailModal from './components/SessionDetail';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [chatSessions, setChatSessions] = useState<Session[]>([]);
  const [monitors, setMonitors] = useState<Map<string, MonitorStatus>>(new Map());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const sseConnectionRef = useRef<{ close: () => void; reconnect: () => void } | null>(null);
  const hasInteractedRef = useRef(false);
  const [detailModalSession, setDetailModalSession] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lookupInput, setLookupInput] = useState('');

  const monitoringIds = new Set(monitors.keys());

  const handleSSEMessage = useCallback(
    (msg: SSEMessage) => {
      switch (msg.type) {
        case 'init':
          if (msg.data.sessions) {
            setSessions(msg.data.sessions);
          }
          if (msg.data.monitors) {
            const monitorMap = new Map<string, MonitorStatus>();
            msg.data.monitors.forEach((m: MonitorStatus) => {
              monitorMap.set(m.session_id, m);
            });
            setMonitors(monitorMap);
          }
          break;

        case 'status_update':
          if (msg.data) {
            setMonitors((prev) => {
              const next = new Map(prev);
              msg.data.forEach((m: MonitorStatus) => {
                next.set(m.session_id, m);
              });
              return next;
            });
          }
          break;

        case 'completed':
          if (msg.data && soundEnabled && hasInteractedRef.current) {
            playNotificationSound();
          }
          if (msg.data) {
            setMonitors((prev) => {
              const next = new Map(prev);
              next.set(msg.data.session_id, msg.data);
              return next;
            });
          }
          break;
      }
    },
    [soundEnabled]
  );

  useEffect(() => {
    const loadInitialData = async () => {
      const sessionsData = await getSessions();
      setSessions(sessionsData);
      const chatSessionsData = await getChatSessions();
      setChatSessions(chatSessionsData);
    };

    loadInitialData();

    const connection = createSSEConnection({
      onMessage: handleSSEMessage,
      onStatusChange: setConnectionStatus,
      maxReconnectAttempts: 10,
      reconnectDelay: 2000,
    });
    sseConnectionRef.current = connection;

    return () => {
      connection.close();
    };
  }, [handleSSEMessage]);

  useEffect(() => {
    const handleInteraction = () => {
      hasInteractedRef.current = true;
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const handleStartMonitor = async (sessionId: string) => {
    const result = await startMonitor(sessionId);
    if (result.success && result.status) {
      setMonitors((prev) => {
        const next = new Map(prev);
        next.set(sessionId, result.status!);
        return next;
      });
    }
  };

  const handleStopMonitor = async (sessionId: string) => {
    await stopMonitor(sessionId);
    setMonitors((prev) => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
  };

  const handleRemoveMonitor = async (sessionId: string) => {
    const result = await removeMonitor(sessionId);
    if (result.success) {
      setMonitors((prev) => {
        const next = new Map(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const handleMarkCompleted = async (sessionId: string) => {
    const result = await markCompleted(sessionId);
    if (result.success && result.status) {
      setMonitors((prev) => {
        const next = new Map(prev);
        next.set(sessionId, result.status!);
        return next;
      });
      if (soundEnabled && hasInteractedRef.current) {
        playNotificationSound();
      }
    }
  };

  const handleTestSound = () => {
    hasInteractedRef.current = true;
    testSound();
  };

  const handleViewDetail = async (sessionId: string) => {
    setDetailLoading(true);
    try {
      const detail = await getSessionDetail(sessionId);
      if (detail) {
        setDetailModalSession(detail);
      } else {
        alert('未找到该 Session');
      }
    } catch (e) {
      alert('获取 Session 详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLookupSession = async () => {
    const sessionId = lookupInput.trim();
    if (!sessionId) {
      alert('请输入 Session ID');
      return;
    }
    await handleViewDetail(sessionId);
  };

  const handleRefreshSessions = async () => {
    const sessionsData = await getSessions();
    setSessions(sessionsData);
    const chatSessionsData = await getChatSessions();
    setChatSessions(chatSessionsData);
  };

  const handleReconnect = () => {
    sseConnectionRef.current?.reconnect();
  };

  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: '已连接', color: '#34c759', icon: '🟢' };
      case 'reconnecting':
        return { text: '重连中...', color: '#ff9500', icon: '🟡' };
      case 'disconnected':
        return { text: '已断开', color: '#ff3b30', icon: '🔴' };
      default:
        return { text: '未知', color: '#8e8e93', icon: '⚪' };
    }
  };

  const statusInfo = getConnectionStatusInfo();

  const monitorList = Array.from(monitors.values());
  const runningMonitors = monitorList.filter((m) => m.is_monitoring);
  const completedMonitors = monitorList.filter(
    (m) => !m.is_monitoring && m.status === 'completed'
  );

  const activeSessions = sessions.filter((s) => s.is_active);
  const inactiveSessions = sessions.filter((s) => !s.is_active);
  const activeChatSessions = chatSessions.filter((s) => s.is_active);
  const inactiveChatSessions = chatSessions.filter((s) => !s.is_active);
  const allActiveSessions = [...activeSessions, ...activeChatSessions];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>
            <span className="logo">🔍</span>
            Task Monitor
          </h1>
          <p className="subtitle">Trae Solo 任务监控工具</p>
        </div>
        <div className="header-actions">
          <div
            className="connection-status"
            style={{ color: statusInfo.color }}
            onClick={connectionStatus !== 'connected' ? handleReconnect : undefined}
            title={connectionStatus !== 'connected' ? '点击重新连接' : ''}
          >
            <span className="status-icon">{statusInfo.icon}</span>
            <span className="status-text">{statusInfo.text}</span>
          </div>
          <label className="sound-toggle">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
            />
            <span>🔊 提示音</span>
          </label>
          <button className="btn btn-secondary" onClick={handleTestSound}>
            测试声音
          </button>
        </div>
      </header>

      {connectionStatus === 'disconnected' && (
        <div className="connection-banner">
          <span>⚠️ 与后端服务断开连接</span>
          <button className="btn btn-small btn-primary" onClick={handleReconnect}>
            重新连接
          </button>
        </div>
      )}

      <main className="app-main">
        <div className="monitor-section">
          <div className="section-header">
            <h2>📊 监控列表</h2>
            {runningMonitors.length > 0 && (
              <span className="badge badge-running">
                {runningMonitors.length} 个进行中
              </span>
            )}
            {completedMonitors.length > 0 && (
              <span className="badge badge-completed">
                {completedMonitors.length} 个已完成
              </span>
            )}
          </div>

          {monitorList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>暂无监控任务</p>
              <p className="empty-hint">
                从右侧列表选择 Session 或手动输入开始监控
              </p>
            </div>
          ) : (
            <div className="monitor-grid">
              {monitorList.map((monitor) => (
                <MonitorCard
                  key={monitor.session_id}
                  monitor={monitor}
                  onStop={handleStopMonitor}
                  onRemove={handleRemoveMonitor}
                  onMarkCompleted={handleMarkCompleted}
                />
              ))}
            </div>
          )}
        </div>

        <div className="session-section">
          <ManualInput
            onAdd={handleStartMonitor}
            monitoringIds={monitoringIds}
          />

          <div className="lookup-section">
            <h3>🔍 查询 Session 详情</h3>
            <div className="lookup-form">
              <input
                type="text"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                placeholder="输入 Session ID 查询详情"
                className="lookup-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLookupSession();
                  }
                }}
              />
              <button
                className="btn btn-primary"
                onClick={handleLookupSession}
                disabled={detailLoading}
              >
                {detailLoading ? '查询中...' : '查询'}
              </button>
            </div>
          </div>

          {allActiveSessions.length > 0 && (
            <>
              <div className="session-header">
                <h3>🟢 活跃任务</h3>
                <button
                  className="btn btn-small btn-secondary"
                  onClick={handleRefreshSessions}
                >
                  🔄 刷新
                </button>
              </div>
              <div className="session-list-container active">
                {allActiveSessions.map((session) => (
                  <div
                    key={session.session_id}
                    className={`session-row active ${monitoringIds.has(session.session_id) ? 'monitoring' : ''}`}
                  >
                    <div className="session-info">
                      <div className="session-top-row">
                        <span className="session-display-name" title={session.title || session.display_name}>
                          {session.title || session.display_name || session.session_id.slice(0, 16)}
                        </span>
                        <span className="session-badge active-badge">活跃</span>
                        <span className={`session-badge ${session.session_type === 'chat' ? 'chat-badge' : 'sandbox-badge'}`}>
                          {session.session_type === 'chat' ? 'Chat' : 'Sandbox'}
                        </span>
                      </div>
                      <span className="session-id-small" title={session.session_id}>
                        {session.workspace || session.session_id.slice(0, 16)}
                      </span>
                    </div>
                    <div className="session-actions">
                      <button
                        className="btn btn-small btn-outline"
                        onClick={() => handleViewDetail(session.session_id)}
                      >
                        详情
                      </button>
                      <button
                        className={`btn btn-small ${
                          monitoringIds.has(session.session_id)
                            ? 'btn-secondary'
                            : 'btn-primary'
                        }`}
                        onClick={() => handleStartMonitor(session.session_id)}
                        disabled={monitoringIds.has(session.session_id)}
                      >
                        {monitoringIds.has(session.session_id) ? '监控中' : '监控'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {inactiveChatSessions.length > 0 && (
            <>
              <div className="session-header">
                <h3>💬 历史任务</h3>
              </div>
              <div className="session-list-container">
                {inactiveChatSessions.map((session) => (
                  <div
                    key={session.session_id}
                    className={`session-row chat ${monitoringIds.has(session.session_id) ? 'monitoring' : ''}`}
                  >
                    <div className="session-info">
                      <div className="session-top-row">
                        <span className="session-display-name" title={session.title || session.display_name}>
                          {session.title || session.display_name || session.session_id.slice(0, 16)}
                        </span>
                        <span className="session-badge chat-badge">{session.workspace}</span>
                      </div>
                    </div>
                    <div className="session-actions">
                      <button
                        className="btn btn-small btn-outline"
                        onClick={() => handleViewDetail(session.session_id)}
                      >
                        详情
                      </button>
                      <button
                        className={`btn btn-small ${
                          monitoringIds.has(session.session_id)
                            ? 'btn-secondary'
                            : 'btn-outline'
                        }`}
                        onClick={() => handleStartMonitor(session.session_id)}
                        disabled={monitoringIds.has(session.session_id)}
                      >
                        {monitoringIds.has(session.session_id) ? '监控中' : '监控'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {inactiveSessions.length > 0 && (
            <>
              <div className="session-header">
                <h3>📋 历史任务 (Sandbox)</h3>
              </div>
              <div className="session-list-container">
                {inactiveSessions.slice(0, 10).map((session) => (
                  <div
                    key={session.session_id}
                    className={`session-row ${monitoringIds.has(session.session_id) ? 'monitoring' : ''}`}
                  >
                    <div className="session-info">
                      <div className="session-top-row">
                        <span className="session-display-name" title={session.display_name}>
                          {session.display_name}
                        </span>
                        {session.source && (
                          <span className="session-source">{session.source}</span>
                        )}
                      </div>
                      <span className="session-id-small" title={session.session_id}>
                        {session.session_id}
                      </span>
                      <span className="session-time">{session.created_at_str}</span>
                    </div>
                    <div className="session-actions">
                      <button
                        className="btn btn-small btn-outline"
                        onClick={() => handleViewDetail(session.session_id)}
                      >
                        详情
                      </button>
                      <button
                        className={`btn btn-small ${
                          monitoringIds.has(session.session_id)
                            ? 'btn-secondary'
                            : 'btn-outline'
                        }`}
                        onClick={() => handleStartMonitor(session.session_id)}
                        disabled={monitoringIds.has(session.session_id)}
                      >
                        {monitoringIds.has(session.session_id) ? '监控中' : '监控'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {sessions.length === 0 && chatSessions.length === 0 && (
            <div className="empty-state small">
              <p>暂无可用 Session</p>
              <p className="empty-hint">请确保 Trae Solo 或 Trae CN 正在运行</p>
            </div>
          )}
        </div>
      </main>

      <SessionDetailModal
        session={detailModalSession}
        onClose={() => setDetailModalSession(null)}
      />

      <style>{`
        .app {
          min-height: 100vh;
          padding: 20px;
        }
        
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 30px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          margin-bottom: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .header-content h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #333;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .logo {
          font-size: 32px;
        }
        
        .subtitle {
          margin: 4px 0 0 0;
          color: #666;
          font-size: 14px;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .connection-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .connection-status:hover {
          background: rgba(0, 0, 0, 0.08);
        }
        
        .status-icon {
          font-size: 10px;
        }
        
        .connection-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #fff3e0;
          border-radius: 12px;
          margin-bottom: 16px;
          color: #e65100;
          font-weight: 500;
        }
        
        .sound-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #333;
          user-select: none;
        }
        
        .sound-toggle input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        
        .btn-small {
          padding: 6px 12px;
          font-size: 12px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background: #e0e0e0;
        }
        
        .btn-outline {
          background: white;
          color: #667eea;
          border: 1px solid #667eea;
        }
        
        .btn-outline:hover:not(:disabled) {
          background: #f0f3ff;
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .app-main {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        @media (max-width: 1024px) {
          .app-main {
            grid-template-columns: 1fr;
          }
        }
        
        .monitor-section {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .section-header h2 {
          margin: 0;
          font-size: 20px;
          color: #333;
        }
        
        .badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .badge-running {
          background: #fff3e0;
          color: #ff9500;
        }
        
        .badge-completed {
          background: #d4edda;
          color: #28a745;
        }
        
        .monitor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }
        
        .empty-state.small {
          padding: 30px 20px;
        }
        
        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        
        .empty-state p {
          margin: 4px 0;
        }
        
        .empty-hint {
          font-size: 13px;
          color: #aaa;
        }
        
        .session-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 4px;
        }
        
        .session-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }
        
        .session-list-container {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-height: 400px;
          overflow-y: auto;
        }
        
        .session-list-container.active {
          border: 2px solid #34c759;
          max-height: none;
        }
        
        .session-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 8px;
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        
        .session-row:last-child {
          margin-bottom: 0;
        }
        
        .session-row.active {
          background: #f0fff0;
          border-color: #34c759;
        }
        
        .session-row.monitoring {
          border-color: #667eea;
          background: #f0f3ff;
        }
        
        .session-row:hover {
          background: #f0f0f0;
        }
        
        .session-row.active:hover {
          background: #e8ffe8;
        }
        
        .session-row.monitoring:hover {
          background: #e8ecff;
        }
        
        .session-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          flex: 1;
          margin-right: 12px;
        }
        
        .session-top-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .session-id {
          font-family: monospace;
          font-size: 13px;
          color: #333;
          font-weight: 500;
        }
        
        .session-display-name {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }
        
        .session-id-small {
          font-family: monospace;
          font-size: 11px;
          color: #999;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .session-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
        }
        
        .active-badge {
          background: #34c759;
          color: white;
        }
        
        .chat-badge {
          background: #5856d6;
          color: white;
        }
        
        .sandbox-badge {
          background: #ff9500;
          color: white;
        }
        
        .session-source {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          background: #e0e0e0;
          color: #555;
          font-weight: 500;
        }
        
        .session-workspace {
          font-size: 12px;
          color: #666;
        }
        
        .session-command {
          font-size: 11px;
          color: #888;
          font-family: monospace;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .session-time {
          font-size: 11px;
          color: #999;
        }
        
        .session-list-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .session-list-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .session-list-container::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 3px;
        }
        
        .session-list-container::-webkit-scrollbar-thumb:hover {
          background: #aaa;
        }
        
        .lookup-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .lookup-section h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: #333;
        }
        
        .lookup-form {
          display: flex;
          gap: 12px;
        }
        
        .lookup-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          font-family: monospace;
          transition: border-color 0.2s;
        }
        
        .lookup-input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .lookup-input::placeholder {
          color: #aaa;
        }
        
        .session-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
      `}</style>
    </div>
  );
};

export default App;

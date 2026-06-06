import React from 'react';
import { SessionDetail as SessionDetailType } from '../types';

interface SessionDetailProps {
  session: SessionDetailType | null;
  onClose: () => void;
}

const SessionDetailModal: React.FC<SessionDetailProps> = ({ session, onClose }) => {
  if (!session) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Session 详情</h2>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            <h3>基本信息</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Session ID</span>
                <span className="detail-value mono">{session.session_id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">类型</span>
                <span className={`detail-value badge ${session.session_type === 'chat' ? 'chat-badge' : 'sandbox-badge'}`}>
                  {session.session_type === 'chat' ? 'Chat' : 'Sandbox'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">标题</span>
                <span className="detail-value">{session.title || session.display_name || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">工作区</span>
                <span className="detail-value">{session.workspace || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">来源</span>
                <span className="detail-value">{session.source || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">状态</span>
                <span className={`detail-value badge ${session.is_active ? 'active-badge' : ''}`}>
                  {session.is_active ? '活跃' : '已完成'}
                </span>
              </div>
              <div className="detail-item full-width">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{session.created_at_str}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>📝 Prompt (用户输入)</h3>
            <div className="content-box prompt-box">
              {session.prompt ? (
                <pre className="content-text">{session.prompt}</pre>
              ) : (
                <p className="content-empty">暂无 prompt 数据</p>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3>📤 输出结果</h3>
            <div className="content-box output-box">
              {session.output_available && session.output ? (
                <pre className="content-text">{session.output}</pre>
              ) : (
                <p className="content-empty">
                  ⚠️ 输出结果暂不支持查看
                  <br />
                  <span className="empty-hint">数据存储在加密数据库中，正在探索中...</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .modal-content {
            background: white;
            border-radius: 16px;
            width: 90%;
            max-width: 800px;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #eee;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 20px;
            color: #333;
          }

          .btn-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
            padding: 4px 8px;
            border-radius: 6px;
            transition: all 0.2s;
          }

          .btn-close:hover {
            background: #f0f0f0;
            color: #333;
          }

          .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px 24px;
          }

          .detail-section {
            margin-bottom: 24px;
          }

          .detail-section:last-child {
            margin-bottom: 0;
          }

          .detail-section h3 {
            margin: 0 0 12px 0;
            font-size: 16px;
            color: #333;
            font-weight: 600;
          }

          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .detail-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .detail-item.full-width {
            grid-column: 1 / -1;
          }

          .detail-label {
            font-size: 12px;
            color: #888;
            font-weight: 500;
          }

          .detail-value {
            font-size: 14px;
            color: #333;
            word-break: break-all;
          }

          .detail-value.mono {
            font-family: monospace;
            font-size: 12px;
          }

          .content-box {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 16px;
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #e0e0e0;
          }

          .prompt-box {
            background: #f0f7ff;
            border-color: #b8daff;
          }

          .output-box {
            background: #f0fff4;
            border-color: #b8dfb8;
          }

          .content-text {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            font-size: 13px;
            line-height: 1.6;
            color: #333;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          .content-empty {
            margin: 0;
            color: #999;
            text-align: center;
            padding: 20px;
          }

          .empty-hint {
            font-size: 12px;
            color: #bbb;
          }

          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
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

          .modal-footer {
            display: flex;
            justify-content: flex-end;
            padding: 16px 24px;
            border-top: 1px solid #eee;
            gap: 12px;
          }

          .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
          }

          .btn-secondary {
            background: #f0f0f0;
            color: #333;
          }

          .btn-secondary:hover {
            background: #e0e0e0;
          }

          .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }

          .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }

          .content-box::-webkit-scrollbar {
            width: 6px;
          }

          .content-box::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }

          .content-box::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 3px;
          }

          .content-box::-webkit-scrollbar-thumb:hover {
            background: #aaa;
          }

          .modal-body::-webkit-scrollbar {
            width: 8px;
          }

          .modal-body::-webkit-scrollbar-track {
            background: #f1f1f1;
          }

          .modal-body::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 4px;
          }
        `}</style>
      </div>
    </div>
  );
};

export default SessionDetailModal;

import { useState, useEffect, useCallback } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { Visualizer } from '@/components/Visualizer';
import { MusicPlayer } from '@/components/MusicPlayer';
import { EmotionProvider, useEmotion, EmotionType } from '@/contexts/EmotionContext';

const EMOTION_ICONS: Record<EmotionType, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  calm: '😌',
  neutral: '😐',
  surprised: '😲',
  fearful: '😨',
  love: '❤️',
};

const EMOTION_LABELS: Record<EmotionType, string> = {
  happy: '开心',
  sad: '悲伤',
  angry: '愤怒',
  calm: '平静',
  neutral: '中性',
  surprised: '惊讶',
  fearful: '恐惧',
  love: '爱意',
};

const HomeContent = () => {
  const {
    currentEmotion,
    currentPlaylist,
    isLoading,
    error,
    isRecording,
    logs,
    setEmotion,
    startRecording,
    stopRecording,
    clearError,
  } = useEmotion();

  const handleSimulateSad = useCallback(() => {
    setEmotion('sad', 0.9, 'manual');
  }, [setEmotion]);

  const handleSimulateHappy = useCallback(() => {
    setEmotion('happy', 0.9, 'manual');
  }, [setEmotion]);

  const handleSimulateCalm = useCallback(() => {
    setEmotion('calm', 0.85, 'manual');
  }, [setEmotion]);

  const handleSimulateAngry = useCallback(() => {
    setEmotion('angry', 0.85, 'manual');
  }, [setEmotion]);

  const handleSimulateLove = useCallback(() => {
    setEmotion('love', 0.8, 'manual');
  }, [setEmotion]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (err) {
        console.error('启动录音失败:', err);
      }
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <>
      <Visualizer />

      <main className="main-content">
        <header className="header">
          <div className="logo">
            <span className="logo-icon">🎵</span>
            <h1>情绪音乐播放器</h1>
          </div>
          <p className="subtitle">感知您的情绪，奏响心灵的旋律</p>
        </header>

        <div className="content-grid">
          <div className="left-panel">
            <div className="emotion-section card">
              <h2 className="section-title">🎤 情绪检测</h2>
              
              <div className="current-emotion-display">
                <div className="emotion-icon-big">
                  {EMOTION_ICONS[currentEmotion.emotion] || '😐'}
                </div>
                <div className="emotion-info">
                  <h3>当前情绪</h3>
                  <p className="emotion-name">{EMOTION_LABELS[currentEmotion.emotion] || currentEmotion.emotion}</p>
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill" 
                      style={{ 
                        width: `${currentEmotion.confidence * 100}%`,
                      }}
                    />
                  </div>
                  <p className="confidence-text">
                    置信度: {Math.round(currentEmotion.confidence * 100)}%
                  </p>
                  <div className="recording-status">
                    <span className={`status-dot ${isRecording ? 'active' : ''}`} />
                    <span>{isRecording ? '正在录音中...' : '未录音'}</span>
                  </div>
                </div>
              </div>

              <div className="control-buttons">
                <button
                  className={`record-btn ${isRecording ? 'recording' : ''}`}
                  onClick={toggleRecording}
                >
                  <span className="btn-icon">{isRecording ? '🔴' : '🎤'}</span>
                  <span className="btn-text">
                    {isRecording ? '停止录音' : '开始语音检测'}
                  </span>
                </button>

                <div className="simulate-section">
                  <p className="simulate-label">🎯 模拟情绪测试（点击立即生效）:</p>
                  <div className="simulate-buttons">
                    <button 
                      className="simulate-btn sad" 
                      onClick={handleSimulateSad}
                      title="模拟悲伤情绪 - 背景变冷色调，推荐治愈系音乐"
                    >
                      😢 悲伤
                    </button>
                    <button 
                      className="simulate-btn happy" 
                      onClick={handleSimulateHappy}
                      title="模拟开心情绪 - 背景变暖色调，推荐欢快音乐"
                    >
                      😊 开心
                    </button>
                    <button 
                      className="simulate-btn calm" 
                      onClick={handleSimulateCalm}
                      title="模拟平静情绪 - 背景变中性色调，推荐舒缓音乐"
                    >
                      😌 平静
                    </button>
                    <button 
                      className="simulate-btn angry" 
                      onClick={handleSimulateAngry}
                      title="模拟愤怒情绪 - 背景变暖色调，推荐激昂音乐"
                    >
                      😠 愤怒
                    </button>
                    <button 
                      className="simulate-btn love" 
                      onClick={handleSimulateLove}
                      title="模拟爱意情绪 - 背景变暖色调，推荐浪漫音乐"
                    >
                      ❤️ 爱意
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="error-message" onClick={clearError}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {isLoading && (
                <div className="loading-message">
                  <div className="spinner" />
                  <span>正在为您匹配最佳歌单...</span>
                </div>
              )}
            </div>

            <div className="debug-panel card">
              <h2 className="section-title">🔍 实时日志</h2>
              <div className="log-container">
                {logs.length === 0 ? (
                  <p className="empty-log">暂无日志，点击按钮开始测试...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="log-item">
                      {log}
                    </div>
                  ))
                )}
              </div>
              <div className="connection-info">
                <p>📡 后端API地址: <code>http://localhost:8000</code></p>
                <p>💡 请确保后端服务已启动，否则无法获取歌单数据</p>
                <p>🎧 提示: 点击模拟情绪按钮可以快速测试背景颜色变化</p>
              </div>
            </div>
          </div>

          <div className="right-panel">
            <div className="player-section">
              <MusicPlayer />
            </div>

            {currentPlaylist && (
              <div className="theme-preview card">
                <h2 className="section-title">🎨 当前色彩主题</h2>
                <div className="color-swatches">
                  <div 
                    className="swatch primary" 
                    style={{ backgroundColor: currentPlaylist.color_theme.primary }}
                    title="主色"
                  />
                  <div 
                    className="swatch secondary" 
                    style={{ backgroundColor: currentPlaylist.color_theme.secondary }}
                    title="次色"
                  />
                  <div 
                    className="swatch accent" 
                    style={{ backgroundColor: currentPlaylist.color_theme.accent }}
                    title="强调色"
                  />
                  <div 
                    className="swatch background" 
                    style={{ backgroundColor: currentPlaylist.color_theme.background }}
                    title="背景色"
                  />
                </div>
                <div className="theme-type">
                  <span className={`theme-badge ${currentPlaylist.color_theme.type}`}>
                    {currentPlaylist.color_theme.type === 'cool' ? '❄️ 冷色调' : '🔥 暖色调'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="info-section">
          <div className="info-card">
            <h3>🎤 语音情绪识别</h3>
            <p>通过 Web Audio API 实时分析语音的音调、节奏和能量，智能识别您当前的情绪状态。支持中英文关键词检测。</p>
          </div>
          <div className="info-card">
            <h3>🎵 智能歌单匹配</h3>
            <p>基于情绪类型和置信度，通过 FastAPI 后端从精心策划的歌单中推荐最匹配的音乐，悲伤时自动推荐治愈系歌单。</p>
          </div>
          <div className="info-card">
            <h3>✨ 动态视觉效果</h3>
            <p>Three.js 粒子系统和波浪动画随情绪实时变换冷暖色调，创造沉浸式音乐体验。点击模拟按钮可快速预览效果。</p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html,
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          overflow-x: hidden;
          background: #0f172a;
        }

        .container {
          min-height: 100vh;
          position: relative;
        }
      `}</style>

      <style jsx>{`
        .main-content {
          position: relative;
          z-index: 1;
          padding: 20px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .header {
          text-align: center;
          padding: 20px 0;
          color: white;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .logo-icon {
          font-size: 40px;
        }

        .header h1 {
          font-size: 32px;
          font-weight: 700;
        }

        .subtitle {
          font-size: 16px;
          opacity: 0.9;
          font-weight: 300;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .emotion-section {
          margin-bottom: 20px;
        }

        .current-emotion-display {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }

        .emotion-icon-big {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 50px;
          flex-shrink: 0;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
        }

        .emotion-info h3 {
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .emotion-name {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 12px;
        }

        .confidence-bar {
          width: 100%;
          max-width: 200px;
          height: 8px;
          background: #eee;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .confidence-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
          background: linear-gradient(90deg, #667eea, #764ba2);
        }

        .confidence-text {
          font-size: 13px;
          color: #888;
          margin-bottom: 8px;
        }

        .recording-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #666;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ddd;
          transition: all 0.3s ease;
        }

        .status-dot.active {
          background: #ef4444;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .control-buttons {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .record-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px 32px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .record-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .record-btn.recording {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .btn-icon {
          font-size: 24px;
        }

        .simulate-section {
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .simulate-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 12px;
        }

        .simulate-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .simulate-btn {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .simulate-btn:hover {
          transform: translateY(-2px);
        }

        .simulate-btn.sad {
          background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
          color: white;
        }

        .simulate-btn.happy {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
        }

        .simulate-btn.calm {
          background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
          color: white;
        }

        .simulate-btn.angry {
          background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
          color: white;
        }

        .simulate-btn.love {
          background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
          color: white;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          color: #dc2626;
          margin-top: 20px;
          cursor: pointer;
        }

        .loading-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 12px;
          color: #0284c7;
          margin-top: 20px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #bae6fd;
          border-top-color: #0284c7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .debug-panel {
          margin-bottom: 20px;
        }

        .log-container {
          max-height: 250px;
          overflow-y: auto;
          background: #f8fafc;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
        }

        .log-item {
          font-size: 12px;
          font-family: 'SF Mono', Monaco, monospace;
          padding: 4px 0;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }

        .log-item:last-child {
          border-bottom: none;
        }

        .empty-log {
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
          padding: 20px 0;
        }

        .connection-info {
          font-size: 13px;
          color: #64748b;
          line-height: 1.8;
        }

        .connection-info code {
          background: #e2e8f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, monospace;
        }

        .player-section {
          margin-bottom: 20px;
        }

        .theme-preview {
          margin-bottom: 20px;
        }

        .color-swatches {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .swatch {
          flex: 1;
          height: 50px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .swatch:hover {
          transform: scale(1.05);
        }

        .theme-type {
          text-align: center;
        }

        .theme-badge {
          display: inline-block;
          padding: 8px 20px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
        }

        .theme-badge.cool {
          background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
          color: white;
        }

        .theme-badge.warm {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
        }

        .info-section {
          max-width: 1000px;
          margin: 0 auto 30px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .info-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .info-card h3 {
          font-size: 18px;
          color: #1a1a2e;
          margin-bottom: 8px;
        }

        .info-card p {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .header h1 {
            font-size: 24px;
          }

          .current-emotion-display {
            flex-direction: column;
            text-align: center;
          }

          .simulate-buttons {
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
};

const Home: NextPage = () => {
  return (
    <div className="container">
      <Head>
        <title>情绪音乐播放器 - Mood Music Player</title>
        <meta name="description" content="通过语音识别情绪，智能推荐匹配心情的音乐，Three.js动态背景随情绪变化冷暖色调" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎵</text></svg>" />
      </Head>

      <EmotionProvider>
        <HomeContent />
      </EmotionProvider>

      <footer className="footer">
        <p>Mood Music Player • 让音乐懂你的心情</p>
        <style jsx>{`
          .footer {
            position: relative;
            z-index: 1;
            text-align: center;
            padding: 20px;
            color: white;
            text-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
            opacity: 0.8;
            margin-top: auto;
          }
        `}</style>
      </footer>
    </div>
  );
};

export default Home;

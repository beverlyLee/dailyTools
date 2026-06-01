'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Role = 'speaker' | 'listener';
type Language = 'zh-CN' | 'en-US';
type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping';

interface TranslationChunk {
  type: string;
  original: string;
  translated: string;
  position?: number;
  role: string;
}

interface Terminology {
  [key: string]: string;
}

const LANGUAGES = {
  'zh-CN': { name: '中文', flag: '🇨🇳' },
  'en-US': { name: 'English', flag: '🇺🇸' }
};

const ROLE_LANGUAGES = {
  speaker: { source: 'zh-CN' as Language, target: 'en-US' as Language },
  listener: { source: 'en-US' as Language, target: 'zh-CN' as Language }
};

export default function Home() {
  const [role, setRole] = useState<Role>('speaker');
  const [inputText, setInputText] = useState('');
  const [translations, setTranslations] = useState<TranslationChunk[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingStatus, setRecordingStatus] = useState('');
  const [terminology, setTerminology] = useState<Terminology>({
    "元宝": "Yuanbao",
    "AI": "AI",
    "API": "API"
  });
  const [newSourceTerm, setNewSourceTerm] = useState('');
  const [newTargetTerm, setNewTargetTerm] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionStateRef = useRef<{ isListening: boolean; isRestarting: boolean }>({
    isListening: false,
    isRestarting: false
  });
  const finalTranscriptRef = useRef('');

  const sourceLang = ROLE_LANGUAGES[role].source;
  const targetLang = ROLE_LANGUAGES[role].target;

  const preprocessWithTerminology = useCallback((text: string): string => {
    let result = text;
    const sortedTerms = Object.keys(terminology).sort((a, b) => b.length - a.length);
    for (const source of sortedTerms) {
      const target = terminology[source];
      const regex = new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, `{{TERM_${target}}}`);
    }
    return result;
  }, [terminology]);

  const postprocessWithTerminology = useCallback((text: string): string => {
    let result = text;
    const regex = /\{\{TERM_(.*?)\}\}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      result = result.replace(match[0], match[1]);
    }
    return result;
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket('ws://localhost:8000/ws/translate');
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        const data: TranslationChunk = JSON.parse(event.data);
        if (data.type === 'chunk') {
          const processedTranslated = postprocessWithTerminology(data.translated);
          setTranslations(prev => [...prev, {
            ...data,
            translated: processedTranslated
          }]);
        } else if (data.type === 'complete') {
          const processedTranslated = postprocessWithTerminology(data.translated);
          setTranslations(prev => [...prev.filter(t => t.type !== 'chunk'), {
            ...data,
            translated: processedTranslated
          }]);
          setIsTranslating(false);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('Failed to connect:', e);
    }
  }, [postprocessWithTerminology]);

  const startTranslation = useCallback((text: string) => {
    if (!text.trim()) return;
    
    setIsTranslating(true);
    setTranslations([]);

    const processedText = preprocessWithTerminology(text);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        text: processedText,
        source_lang: sourceLang,
        target_lang: targetLang,
        role: role,
        terminology: {}
      }));
    } else {
      console.warn('WebSocket not connected, using fallback');
      const fallbackDict: { [key: string]: string } = {
        "你好": "Hello", "我是": "I am", "我们": "we", "今天": "today",
        "会议": "meeting", "开始": "start", "结束": "end", "谢谢": "thank you",
        "元宝": "Yuanbao"
      };
      let translated = processedText;
      for (const [cn, en] of Object.entries(fallbackDict)) {
        translated = translated.replace(new RegExp(cn, 'g'), en);
      }
      const finalTranslated = postprocessWithTerminology(translated);
      setTranslations([{
        type: 'complete',
        original: text,
        translated: finalTranslated,
        role: role
      }]);
      setIsTranslating(false);
    }
  }, [sourceLang, targetLang, role, preprocessWithTerminology, postprocessWithTerminology]);

  const safeStopRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
    
    const state = recognitionStateRef.current;
    state.isRestarting = false;
    state.isListening = false;
    
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.log('Recognition already stopped');
    }
  }, []);

  const safeStartRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
    
    const state = recognitionStateRef.current;
    
    if (state.isListening || state.isRestarting) {
      console.log('Recognition already active, skipping start');
      return;
    }
    
    state.isRestarting = true;
    
    try {
      recognitionRef.current.start();
      state.isListening = true;
    } catch (e) {
      console.warn('Failed to start recognition, retrying:', e);
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
            state.isListening = true;
          } catch (e2) {
            console.error('Failed to start recognition after retry:', e2);
          } finally {
            state.isRestarting = false;
          }
        }, 100);
      } catch (e2) {
        state.isRestarting = false;
        console.error('Failed to stop recognition for restart:', e2);
      }
    }
  }, []);

  const initSpeechRecognition = useCallback(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('Web Speech API not supported');
        return;
      }

      try {
        safeStopRecognition();
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = sourceLang;

        recognition.onstart = () => {
          console.log('Speech recognition started');
          recognitionStateRef.current.isListening = true;
          recognitionStateRef.current.isRestarting = false;
          setRecordingState('recording');
          setRecordingStatus('正在录音...');
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            if (result.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            finalTranscriptRef.current += finalTranscript;
          }
          
          const currentText = finalTranscriptRef.current + interimTranscript;
          if (currentText) {
            setInputText(currentText);
            setRecordingStatus(finalTranscript ? '识别完成' : '识别中...');
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          const state = recognitionStateRef.current;
          
          if (event.error === 'no-speech') {
            setRecordingStatus('未检测到语音...');
            return;
          }
          
          if (event.error === 'not-allowed') {
            setRecordingStatus('麦克风权限被拒绝');
            state.isListening = false;
            state.isRestarting = false;
            setRecordingState('idle');
            return;
          }
          
          setRecordingStatus('错误: ' + event.error);
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
          const state = recognitionStateRef.current;
          
          if (state.isListening && !state.isRestarting) {
            console.log('Auto-restarting recognition');
            state.isRestarting = true;
            setTimeout(() => {
              if (state.isListening) {
                safeStartRecognition();
              }
            }, 50);
          } else if (!state.isListening) {
            setRecordingState('idle');
            setRecordingStatus('');
          }
        };

        recognitionRef.current = recognition;
        console.log('Speech recognition initialized for language:', sourceLang);
      } catch (e) {
        console.error('Failed to initialize speech recognition:', e);
      }
    }
  }, [sourceLang, safeStopRecognition, safeStartRecognition]);

  useEffect(() => {
    connectWebSocket();
    initSpeechRecognition();
    
    return () => {
      const state = recognitionStateRef.current;
      state.isListening = false;
      state.isRestarting = false;
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket, initSpeechRecognition]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = sourceLang;
    }
  }, [sourceLang]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器');
      return;
    }

    const state = recognitionStateRef.current;

    if (recordingState === 'recording') {
      console.log('Stopping recording...');
      state.isListening = false;
      state.isRestarting = false;
      safeStopRecognition();
      setRecordingState('idle');
      setRecordingStatus('');
      
      const finalText = finalTranscriptRef.current || inputText;
      if (finalText.trim()) {
        setTimeout(() => startTranslation(finalText), 300);
      }
    } else if (recordingState === 'idle') {
      console.log('Starting recording...');
      setInputText('');
      setTranslations([]);
      finalTranscriptRef.current = '';
      state.isListening = true;
      state.isRestarting = false;
      setRecordingState('starting');
      safeStartRecognition();
    }
  };

  const handleTranslate = () => {
    startTranslation(inputText);
  };

  const handleDemo = () => {
    const demoText = role === 'speaker' ? '你好，我是元宝' : 'Hello, I am Yuanbao';
    setInputText(demoText);
    startTranslation(demoText);
  };

  const addTerminology = () => {
    if (!newSourceTerm.trim() || !newTargetTerm.trim()) {
      alert('请输入完整的术语对');
      return;
    }
    setTerminology(prev => ({
      ...prev,
      [newSourceTerm]: newTargetTerm
    }));
    setNewSourceTerm('');
    setNewTargetTerm('');
    console.log('Terminology updated, new terms will apply to next translation');
  };

  const deleteTerminology = (key: string) => {
    setTerminology(prev => {
      const newTerms = { ...prev };
      delete newTerms[key];
      return newTerms;
    });
  };

  const isRecording = recordingState === 'recording' || recordingState === 'starting';

  return (
    <main className="container">
      <header>
        <h1>🌐 实时翻译板</h1>
        <p className="subtitle">跨国会议沟通障碍解决方案</p>
        <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 已连接' : '🔴 未连接'}
        </div>
      </header>

      <div className="content">
        <div className="sidebar">
          <div className="role-selector">
            <h3>🎭 角色选择</h3>
            <div className="role-buttons">
              <button
                className={role === 'speaker' ? 'active' : ''}
                onClick={() => setRole('speaker')}
              >
                🎤 发言者
                <span className="lang-label">
                  {LANGUAGES['zh-CN'].flag} {LANGUAGES['zh-CN'].name} → {LANGUAGES['en-US'].flag} {LANGUAGES['en-US'].name}
                </span>
              </button>
              <button
                className={role === 'listener' ? 'active' : ''}
                onClick={() => setRole('listener')}
              >
                👥 收听者
                <span className="lang-label">
                  {LANGUAGES['en-US'].flag} {LANGUAGES['en-US'].name} → {LANGUAGES['zh-CN'].flag} {LANGUAGES['zh-CN'].name}
                </span>
              </button>
            </div>
          </div>

          <div className="terminology-manager">
            <h3>📚 术语表管理</h3>
            <div className="add-term">
              <input
                type="text"
                placeholder="原文术语"
                value={newSourceTerm}
                onChange={(e) => setNewSourceTerm(e.target.value)}
              />
              <input
                type="text"
                placeholder="翻译术语"
                value={newTargetTerm}
                onChange={(e) => setNewTargetTerm(e.target.value)}
              />
              <button onClick={addTerminology} className="add-btn">
                ➕ 添加术语
              </button>
            </div>
            <div className="term-list">
              {Object.entries(terminology).map(([source, target]) => (
                <div key={source} className="term-item">
                  <span className="source">{source}</span>
                  <span className="arrow">→</span>
                  <span className="target">{target}</span>
                  <button 
                    className="delete-btn" 
                    onClick={() => deleteTerminology(source)}
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="main-area">
          <div className="input-section">
            <h3>
              输入文本 
              <span className="lang-badge source">
                {LANGUAGES[sourceLang].flag} {LANGUAGES[sourceLang].name}
              </span>
              <span className="voice-hint">（支持语音输入）</span>
            </h3>
            <div className="textarea-wrapper">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`请输入${LANGUAGES[sourceLang].name}文本，或点击下方麦克风按钮进行语音输入...`}
                rows={4}
                disabled={isRecording}
              />
              {recordingStatus && (
                <div className="recording-indicator">
                  <span className="recording-dot"></span>
                  {recordingStatus}
                </div>
              )}
            </div>
            <div className="button-group">
              <button 
                onClick={toggleRecording}
                className={`record-btn ${isRecording ? 'recording' : ''}`}
              >
                {isRecording ? '⏹ 停止录音' : '🎤 开始录音'}
              </button>
              <button 
                onClick={handleTranslate}
                disabled={!inputText.trim() || isTranslating || isRecording}
                className="translate-btn"
              >
                {isTranslating ? '翻译中...' : '开始翻译'}
              </button>
              <button onClick={handleDemo} className="demo-btn" disabled={isRecording}>
                🎯 演示
              </button>
            </div>
          </div>

          <div className="output-section">
            <h3>
              实时翻译结果
              <span className="lang-badge target">
                {LANGUAGES[targetLang].flag} {LANGUAGES[targetLang].name}
              </span>
            </h3>
            <div className="translation-area">
              {translations.length === 0 ? (
                <p className="placeholder">翻译结果将在这里实时显示...</p>
              ) : (
                <div className="translations">
                  {translations.map((t, idx) => (
                    <div key={idx} className={`translation-item ${t.type}`}>
                      <div className="role-tag">
                        {t.role === 'speaker' ? '🎤 发言者' : '👥 收听者'}
                      </div>
                      <div className="original">{t.original}</div>
                      <div className="arrow">↓</div>
                      <div className="translated">{t.translated}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        header {
          text-align: center;
          margin-bottom: 30px;
          color: white;
        }
        h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
        }
        .subtitle {
          margin: 0 0 16px 0;
          opacity: 0.9;
        }
        .status {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }
        .status.connected {
          background: rgba(40, 167, 69, 0.9);
        }
        .status.disconnected {
          background: rgba(220, 53, 69, 0.9);
        }
        .content {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 20px;
        }
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .role-selector {
          padding: 16px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
        }
        .role-selector h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #333;
        }
        .role-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .role-buttons button {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          text-align: left;
        }
        .role-buttons button:hover {
          border-color: #667eea;
        }
        .role-buttons button.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
        .lang-label {
          display: block;
          font-size: 12px;
          font-weight: normal;
          margin-top: 4px;
          opacity: 0.8;
        }
        .terminology-manager {
          padding: 16px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
        }
        .terminology-manager h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #333;
        }
        .add-term {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .add-term input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }
        .add-btn {
          padding: 10px 16px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
        }
        .add-btn:hover {
          background: #218838;
        }
        .term-list {
          max-height: 280px;
          overflow-y: auto;
        }
        .term-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .source {
          font-weight: 500;
          color: #333;
          flex: 1;
        }
        .arrow {
          color: #999;
        }
        .target {
          color: #667eea;
          flex: 1;
        }
        .delete-btn {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .delete-btn:hover {
          opacity: 1;
        }
        .main-area {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .input-section, .output-section {
          margin-bottom: 24px;
        }
        h3 {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lang-badge {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: normal;
        }
        .lang-badge.source {
          background: #e3f2fd;
          color: #1976d2;
        }
        .lang-badge.target {
          background: #e8f5e9;
          color: #388e3c;
        }
        .voice-hint {
          font-size: 14px;
          color: #667eea;
          font-weight: normal;
          margin-left: auto;
        }
        .textarea-wrapper {
          position: relative;
        }
        textarea {
          width: 100%;
          padding: 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
          resize: none;
          transition: border-color 0.2s;
        }
        textarea:focus {
          outline: none;
          border-color: #667eea;
        }
        textarea:disabled {
          background: #f5f5f5;
        }
        .recording-indicator {
          position: absolute;
          bottom: 12px;
          left: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: #fff3cd;
          border-radius: 20px;
          font-size: 14px;
          color: #856404;
        }
        .recording-dot {
          width: 10px;
          height: 10px;
          background: #dc3545;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }
        .record-btn, .translate-btn, .demo-btn {
          flex: 1;
          padding: 14px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .record-btn {
          background: #dc3545;
          color: white;
        }
        .record-btn:hover {
          background: #c82333;
        }
        .record-btn.recording {
          background: #c82333;
          animation: pulse-border 1s infinite;
        }
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
        }
        .translate-btn {
          background: #667eea;
          color: white;
        }
        .translate-btn:hover:not(:disabled) {
          background: #5a67d8;
        }
        .translate-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .demo-btn {
          background: #f0f0f0;
          color: #333;
        }
        .demo-btn:hover:not(:disabled) {
          background: #e0e0e0;
        }
        .demo-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .translation-area {
          min-height: 200px;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
        }
        .placeholder {
          color: #999;
          text-align: center;
          padding: 40px 0;
          margin: 0;
        }
        .translations {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .translation-item {
          background: white;
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        .translation-item.chunk {
          opacity: 0.8;
          border-left-color: #ffc107;
        }
        .role-tag {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        .original {
          font-size: 16px;
          color: #333;
          margin-bottom: 4px;
        }
        .arrow {
          color: #999;
          font-size: 14px;
          margin: 4px 0;
        }
        .translated {
          font-size: 18px;
          color: #667eea;
          font-weight: 500;
        }
      `}</style>
    </main>
  );
}

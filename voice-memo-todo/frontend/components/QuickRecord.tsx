import { useState, useRef, useEffect, useCallback } from 'react';

interface QuickRecordProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onTextParse: (text: string) => void;
  onTranscriptReady: (text: string) => void;
  isLoading: boolean;
  manualText: string;
  onManualTextChange: (text: string) => void;
}

const QuickRecord = ({ 
  onRecordingComplete, 
  onTextParse, 
  onTranscriptReady,
  isLoading, 
  manualText,
  onManualTextChange
}: QuickRecordProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('点击开始录音');
  const [errorMessage, setErrorMessage] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopRecordingInternal = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('停止录音失败:', e);
      }
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.error('停止音频轨道失败:', e);
        }
      });
      streamRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const startRecording = async () => {
    setErrorMessage('');
    setTranscript('');
    
    if (isRecording) {
      console.warn('已经在录音中，先停止当前录音');
      stopRecordingInternal();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(audioBlob);
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setRecordingStatus('正在录音...');

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error: any) {
      console.error('启动录音失败:', error);
      let errorMsg = '无法访问麦克风，请检查权限设置';
      
      if (error.name === 'NotAllowedError') {
        errorMsg = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风';
      } else if (error.name === 'NotFoundError') {
        errorMsg = '未找到麦克风设备，请连接麦克风后重试';
      } else if (error.name === 'NotReadableError') {
        errorMsg = '麦克风被其他应用占用，请关闭其他应用后重试';
      }
      
      setErrorMessage(errorMsg);
      setRecordingStatus('录音失败');
    }
  };

  const stopRecording = () => {
    if (!isRecording) {
      return;
    }
    
    setRecordingStatus('正在处理音频...');
    stopRecordingInternal();
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setRecordingStatus('正在转写文字...');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.text) {
          setTranscript(result.text);
          onTranscriptReady(result.text);
          setRecordingStatus('转写完成！正在解析...');
          
          setTimeout(() => {
            onTextParse(result.text);
          }, 500);
        } else {
          setTranscript('（未能识别到语音，请重试）');
          setRecordingStatus('未识别到语音');
        }
      } else {
        const error = await response.json();
        setErrorMessage(error.detail || '语音识别失败，请重试');
        setRecordingStatus('转写失败');
      }
    } catch (error) {
      console.error('语音识别请求失败:', error);
      setErrorMessage('语音识别服务暂时不可用，请使用文字输入');
      setRecordingStatus('转写失败');
    } finally {
      setIsTranscribing(false);
      if (recordingStatus === '转写完成！正在解析...') {
        setRecordingStatus('点击开始录音');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleParseText = () => {
    const textToParse = manualText.trim();
    if (textToParse) {
      onTextParse(textToParse);
    }
  };

  const useTranscript = () => {
    if (transcript && !transcript.includes('未能识别')) {
      onManualTextChange(transcript);
    }
  };

  const clearAll = () => {
    setTranscript('');
    onManualTextChange('');
    setErrorMessage('');
    setRecordingStatus('点击开始录音');
  };

  useEffect(() => {
    return () => {
      stopRecordingInternal();
    };
  }, [stopRecordingInternal]);

  return (
    <div className="quick-record">
      <h2>🎙️ 语音笔记</h2>
      
      {errorMessage && (
        <div style={{
          background: '#ffebee',
          color: '#c62828',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '15px',
          fontSize: '0.9em'
        }}>
          ⚠️ {errorMessage}
        </div>
      )}
      
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <button
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading || isTranscribing}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>
        
        <div className="record-status">
          {isRecording ? (
            <div>
              <span style={{ color: '#ee5a24', fontWeight: 'bold' }}>
                🔴 {recordingStatus}
              </span>
              <div style={{ marginTop: '5px', fontSize: '0.9em' }}>
                录音时长: {formatTime(recordingTime)}
              </div>
            </div>
          ) : isTranscribing ? (
            <span style={{ color: '#667eea' }}>
              ⏳ {recordingStatus}
            </span>
          ) : (
            <span>{recordingStatus}</span>
          )}
        </div>

        {isRecording && (
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={stopRecording}
              style={{
                background: '#4caf50',
                color: 'white',
                border: 'none',
                padding: '10px 30px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '1em',
                fontWeight: 'bold'
              }}
            >
              ✓ 完成录音
            </button>
          </div>
        )}
      </div>

      {transcript && (
        <div style={{ 
          background: '#e8f5e9', 
          padding: '15px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          borderLeft: '4px solid #4caf50'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <strong style={{ color: '#2e7d32' }}>📝 语音转写结果：</strong>
            <div>
              {!transcript.includes('未能识别') && (
                <button
                  onClick={useTranscript}
                  style={{
                    background: '#4caf50',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.85em',
                    marginRight: '8px'
                  }}
                >
                  使用此文本
                </button>
              )}
              <button
                onClick={clearAll}
                style={{
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '0.85em'
                }}
              >
                清空
              </button>
            </div>
          </div>
          <div style={{ color: '#333', lineHeight: '1.6', minHeight: '40px' }}>
            {transcript}
          </div>
        </div>
      )}

      <div className="text-input-section">
        <label style={{ 
          display: 'block', 
          marginBottom: '10px', 
          fontWeight: 'bold',
          color: '#333'
        }}>
          ✏️ 或者手动输入文字：
        </label>
        <textarea
          placeholder="例如：下午三点开会，买牛奶；这家店卖彩色郁金香"
          value={manualText}
          onChange={(e) => onManualTextChange(e.target.value)}
          disabled={isLoading}
          rows={4}
        />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
          <button
            className="parse-btn"
            onClick={handleParseText}
            disabled={isLoading || (!manualText.trim() && !transcript)}
          >
            {isLoading ? '🔄 智能解析中...' : '✨ 智能解析'}
          </button>
        </div>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: '#f5f5f5', 
        borderRadius: '10px',
        fontSize: '0.9em'
      }}>
        <strong style={{ color: '#666' }}>💡 使用说明：</strong>
        <ul style={{ marginTop: '10px', color: '#666', paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>点击 🎤 麦克风按钮开始说话</li>
          <li>点击 ✓ 完成录音 按钮结束录音</li>
          <li>系统会自动将语音转换为文字并智能解析</li>
          <li><strong>待办事项：</strong>包含动作+时间/明确任务（如：下午三点开会，买牛奶）</li>
          <li><strong>笔记：</strong>纯描述性信息（如：这家店卖彩色郁金香）</li>
        </ul>
      </div>
    </div>
  );
};

export default QuickRecord;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface Marker {
  type: 'silence' | 'filler';
  start: number;
  end: number;
  text?: string;
  duration?: number;
}

interface AudioWaveformProps {
  audioUrl: string;
  markers?: Marker[];
  onReady?: (duration: number) => void;
  onError?: (error: Error) => void;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ 
  audioUrl, 
  markers = [], 
  onReady,
  onError 
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const eventHandlersRef = useRef<Set<string>>(new Set());

  const cleanupWaveSurfer = useCallback(() => {
    if (wavesurferRef.current) {
      try {
        eventHandlersRef.current.forEach(eventName => {
          wavesurferRef.current?.un(eventName);
        });
        eventHandlersRef.current.clear();
        wavesurferRef.current.destroy();
      } catch (e) {
        console.warn('WaveSurfer cleanup error:', e);
      }
      wavesurferRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!waveformRef.current || !audioUrl) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    cleanupWaveSurfer();

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#667eea',
      progressColor: '#764ba2',
      cursorColor: '#764ba2',
      barWidth: 3,
      barRadius: 3,
      height: 120,
      normalize: true,
      backend: 'WebAudio',
    });

    wavesurferRef.current = ws;

    const addEventHandler = (eventName: string, handler: (...args: any[]) => void) => {
      ws.on(eventName, handler);
      eventHandlersRef.current.add(eventName);
    };

    addEventHandler('ready', () => {
      const dur = ws.getDuration() || 0;
      setDuration(dur);
      setIsLoading(false);
      onReady?.(dur);
    });

    addEventHandler('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime() || 0);
    });

    addEventHandler('play', () => setIsPlaying(true));
    addEventHandler('pause', () => setIsPlaying(false));
    addEventHandler('finish', () => setIsPlaying(false));

    addEventHandler('error', (err: Error) => {
      console.error('WaveSurfer error:', err);
      setLoadError('音频加载失败');
      setIsLoading(false);
      onError?.(err);
    });

    const loadAudio = async () => {
      try {
        await ws.load(audioUrl);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Audio load aborted (expected during cleanup)');
        } else {
          console.error('Failed to load audio:', err);
          setLoadError('音频加载失败: ' + (err.message || '未知错误'));
          setIsLoading(false);
          onError?.(err);
        }
      }
    };

    loadAudio();

    return () => {
      cleanupWaveSurfer();
    };
  }, [audioUrl, cleanupWaveSurfer, onReady, onError]);

  const togglePlay = () => {
    if (wavesurferRef.current && !isLoading) {
      wavesurferRef.current.playPause();
    }
  };

  const skipBackward = () => {
    if (wavesurferRef.current && !isLoading) {
      wavesurferRef.current.skip(-5);
    }
  };

  const skipForward = () => {
    if (wavesurferRef.current && !isLoading) {
      wavesurferRef.current.skip(5);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="waveform-container">
      {isLoading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#666' 
        }}>
          <div className="spinner" style={{ margin: '0 auto 10px' }} />
          <p>正在加载音频波形...</p>
        </div>
      )}
      
      {loadError && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#721c24',
          backgroundColor: '#f8d7da',
          borderRadius: '8px'
        }}>
          <p>⚠️ {loadError}</p>
        </div>
      )}

      <div ref={waveformRef} style={{ display: isLoading || loadError ? 'none' : 'block' }} />
      
      {markers.length > 0 && !isLoading && !loadError && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#fff', borderRadius: '8px' }}>
          <h4 style={{ marginBottom: '12px', color: '#333' }}>检测到的剪辑点</h4>
          <div className="markers-list">
            {markers.map((marker, index) => (
              <div key={index} className="marker-item">
                <span className={`marker-type ${marker.type}`}>
                  {marker.type === 'silence' ? '静音' : '口癖'}
                </span>
                <span className="marker-time">
                  {formatTime(marker.start)} - {formatTime(marker.end)}
                </span>
                {marker.text && <span style={{ color: '#666' }}>{marker.text}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !loadError && (
        <div className="controls">
          <button className="btn btn-primary" onClick={skipBackward} disabled={isLoading}>
            ⏪ -5秒
          </button>
          <button className="btn btn-primary" onClick={togglePlay} disabled={isLoading}>
            {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
          </button>
          <button className="btn btn-primary" onClick={skipForward} disabled={isLoading}>
            +5秒 ⏩
          </button>
          <span className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
};

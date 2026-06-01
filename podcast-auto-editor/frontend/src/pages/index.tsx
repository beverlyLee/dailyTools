import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AudioWaveform } from '../components/AudioWaveform';
import { SubtitleGenerator, TranscriptWord } from '../components/SubtitleGenerator';

interface AnalysisResult {
  success: boolean;
  file_id: string;
  file_name: string;
  audio_path: string;
  duration: number;
  estimated_duration: number;
  markers: Array<{
    type: 'silence' | 'filler';
    start: number;
    end: number;
    text?: string;
    duration?: number;
  }>;
  transcript: TranscriptWord[];
  full_text: string;
  silence_count: number;
  filler_count: number;
  is_mock?: boolean;
}

interface PolishResult {
  success: boolean;
  original_text: string;
  polished_text: string;
  changes: Array<{
    type: string;
    count: number;
    removed_fillers: string[];
  }>;
  word_count_original: number;
  word_count_polished: number;
  reduction_ratio: number;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [polishText, setPolishText] = useState('');
  const [polishedResult, setPolishedResult] = useState<PolishResult | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousAudioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previousAudioUrlRef.current) {
        URL.revokeObjectURL(previousAudioUrlRef.current);
      }
    };
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile && selectedFile.type.startsWith('audio/')) {
      if (previousAudioUrlRef.current) {
        URL.revokeObjectURL(previousAudioUrlRef.current);
      }

      const newAudioUrl = URL.createObjectURL(selectedFile);
      previousAudioUrlRef.current = newAudioUrl;
      
      setFile(selectedFile);
      setAudioUrl(newAudioUrl);
      setAnalysisResult(null);
      setOutputFilename('');
      setPolishedResult(null);
      setPolishText('');
      setError(null);
      setAudioLoaded(false);
    } else {
      setError('请上传有效的音频文件');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleAudioReady = useCallback(() => {
    setAudioLoaded(true);
  }, []);

  const handleAudioError = useCallback((err: Error) => {
    console.error('Audio load error:', err);
    setError('音频加载失败，请检查文件格式');
    setAudioLoaded(false);
  }, []);

  const analyzeAudio = useCallback(async () => {
    if (!file) {
      setError('请先上传音频文件');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/analyze-audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      if (response.data.success) {
        setAnalysisResult(response.data);
        setPolishText(response.data.full_text || '');
        
        if (response.data.is_mock) {
          console.log('注意：当前使用模拟转写模式，未安装 Whisper 模型');
        }
      } else {
        setError('音频分析失败，请重试');
      }
    } catch (err: any) {
      console.error('Analysis failed:', err);
      if (err.code === 'ECONNABORTED') {
        setError('分析超时，请上传较短的音频文件');
      } else if (err.response) {
        setError(`分析失败: ${err.response.data.detail || '服务器错误'}`);
      } else {
        setError('音频分析失败，请检查后端服务是否启动');
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [file]);

  const polishTextContent = useCallback(async () => {
    if (!polishText) {
      setError('请先输入要润色的文本');
      return;
    }

    try {
      const response = await axios.post('/api/polish-text', {
        text: polishText,
        language: 'zh',
        preserve_meaning: true,
      }, {
        timeout: 30000,
      });

      if (response.data.success) {
        setPolishedResult(response.data);
      } else {
        setError('文本润色失败');
      }
    } catch (err: any) {
      console.error('Polishing failed:', err);
      setError('文本润色失败，请重试');
    }
  }, [polishText]);

  const renderAudio = useCallback(async () => {
    if (!analysisResult) {
      setError('请先完成音频分析');
      return;
    }

    setIsRendering(true);
    setError(null);

    try {
      const segments = [];
      let lastEnd = 0;

      for (const marker of analysisResult.markers) {
        if (marker.start > lastEnd) {
          segments.push({ start: lastEnd, end: marker.start, keep: true });
        }
        segments.push({ start: marker.start, end: marker.end, keep: false });
        lastEnd = marker.end;
      }

      if (lastEnd < analysisResult.duration) {
        segments.push({ start: lastEnd, end: analysisResult.duration, keep: true });
      }

      const response = await axios.post('/api/render-audio', {
        audio_file: analysisResult.audio_path,
        segments: segments,
      }, {
        timeout: 120000,
      });

      if (response.data.success) {
        setOutputFilename(response.data.output_filename);
      } else {
        setError('音频导出失败');
      }
    } catch (err: any) {
      console.error('Rendering failed:', err);
      if (err.code === 'ECONNABORTED') {
        setError('导出超时，请重试');
      } else {
        setError('音频导出失败，请检查 FFmpeg 是否安装');
      }
    } finally {
      setIsRendering(false);
    }
  }, [analysisResult]);

  const exportSRT = useCallback(() => {
    if (!analysisResult?.transcript) {
      setError('请先完成音频分析');
      return;
    }
    
    try {
      const cues = SubtitleGenerator.generateFromTranscript(analysisResult.transcript);
      const srtContent = SubtitleGenerator.generateSRT(cues);
      SubtitleGenerator.downloadSRT(srtContent, `${analysisResult.file_name}.srt`);
    } catch (err) {
      console.error('SRT export failed:', err);
      setError('字幕导出失败');
    }
  }, [analysisResult]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className="container">
      <header className="header">
        <h1>🎙️ 播客自动剪辑工具</h1>
        <p>智能识别静音和口癖，一键导出流畅的播客内容</p>
      </header>

      {error && (
        <div style={{ 
          padding: '16px', 
          marginBottom: '20px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button 
            onClick={() => setError(null)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '18px', 
              cursor: 'pointer',
              color: '#721c24'
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="card">
        <h2>1. 上传音频</h2>
        <div
          className={`upload-section ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">📁</div>
          <p>{file ? file.name : '点击或拖拽上传音频文件'}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
        </div>

        {audioUrl && (
          <AudioWaveform
            audioUrl={audioUrl}
            markers={analysisResult?.markers || []}
            onReady={handleAudioReady}
            onError={handleAudioError}
          />
        )}

        {file && (
          <button
            className="btn btn-primary"
            onClick={analyzeAudio}
            disabled={isAnalyzing || !audioLoaded}
            style={{ marginTop: '16px' }}
          >
            {isAnalyzing ? '🔍 分析中...' : '开始智能分析'}
          </button>
        )}
      </div>

      {analysisResult && (
        <>
          <div className="card">
            <h2>2. 分析结果</h2>
            
            {analysisResult.is_mock && (
              <div style={{
                padding: '12px',
                marginBottom: '16px',
                backgroundColor: '#fff3cd',
                color: '#856404',
                borderRadius: '8px'
              }}>
                💡 提示：Whisper 模型未安装，当前使用模拟转写。安装 Whisper 后可获得真正的音频转写。
              </div>
            )}
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{formatTime(analysisResult.duration)}</div>
                <div className="stat-label">原始时长</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{formatTime(analysisResult.estimated_duration)}</div>
                <div className="stat-label">预计剪辑后时长</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{analysisResult.silence_count}</div>
                <div className="stat-label">静音片段</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{analysisResult.filler_count}</div>
                <div className="stat-label">口癖词汇</div>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <h3>转写文本</h3>
              <textarea
                className="text-area"
                value={polishText}
                onChange={(e) => setPolishText(e.target.value)}
                style={{ marginTop: '12px' }}
                placeholder="转写的文本将显示在这里，您可以手动编辑后再润色..."
              />
              <div className="btn-group" style={{ marginTop: '12px' }}>
                <button className="btn btn-primary" onClick={polishTextContent}>
                  ✨ AI 润色文本
                </button>
                <button className="btn btn-primary" onClick={exportSRT}>
                  📝 导出 SRT 字幕
                </button>
              </div>

              {polishedResult && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <h3>润色后文本</h3>
                    <span style={{ 
                      fontSize: '14px', 
                      color: '#28a745',
                      backgroundColor: '#d4edda',
                      padding: '4px 12px',
                      borderRadius: '20px'
                    }}>
                      精简率: {(polishedResult.reduction_ratio * 100).toFixed(1)}%
                    </span>
                  </div>
                  <textarea
                    className="text-area"
                    value={polishedResult.polished_text}
                    readOnly
                    style={{ marginTop: '12px' }}
                  />
                  {polishedResult.changes[0]?.removed_fillers?.length > 0 && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      <strong>移除的口癖词：</strong>
                      {polishedResult.changes[0].removed_fillers.join('、')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2>3. 导出剪辑</h2>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              一键移除所有检测到的静音片段和口癖词汇，导出流畅的播客音频
            </p>
            <div className="btn-group">
              <button
                className="btn btn-success"
                onClick={renderAudio}
                disabled={isRendering}
              >
                {isRendering ? '🎬 导出中...' : '🚀 一键导出剪辑版'}
              </button>
            </div>

            {outputFilename && (
              <div style={{ marginTop: '20px', padding: '20px', background: '#d4edda', borderRadius: '8px' }}>
                <h3 style={{ color: '#155724', marginBottom: '12px' }}>✅ 导出成功！</h3>
                <a
                  href={`/api/download/${outputFilename}`}
                  className="btn btn-success"
                  download
                >
                  📥 下载剪辑后的音频
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

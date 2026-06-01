import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import type { ColorTheme, Track } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type EmotionType = 'sad' | 'happy' | 'angry' | 'calm' | 'neutral' | 'surprised' | 'fearful' | 'love';

export interface EmotionState {
  emotion: EmotionType;
  confidence: number;
  source: 'manual' | 'audio' | 'text' | 'api';
  timestamp: number;
}

export interface PlaylistState {
  playlist_id: string;
  playlist_name: string;
  description: string;
  icon: string;
  color_theme: ColorTheme;
  tracks: Track[];
  matched_emotion: string;
}

interface EmotionContextType {
  currentEmotion: EmotionState;
  currentPlaylist: PlaylistState | null;
  isLoading: boolean;
  error: string | null;
  isRecording: boolean;
  logs: string[];
  
  setEmotion: (emotion: EmotionType, confidence?: number, source?: string) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearError: () => void;
  addLog: (message: string) => void;
}

const EMOTION_ANIMATION_PARAMS: Record<EmotionType, { particleSpeed: number; waveAmplitude: number; colorIntensity: number }> = {
  sad: { particleSpeed: 0.3, waveAmplitude: 0.4, colorIntensity: 0.7 },
  happy: { particleSpeed: 1.2, waveAmplitude: 1.0, colorIntensity: 1.0 },
  angry: { particleSpeed: 1.8, waveAmplitude: 1.5, colorIntensity: 1.2 },
  calm: { particleSpeed: 0.5, waveAmplitude: 0.3, colorIntensity: 0.6 },
  neutral: { particleSpeed: 0.8, waveAmplitude: 0.5, colorIntensity: 0.8 },
  surprised: { particleSpeed: 1.5, waveAmplitude: 1.2, colorIntensity: 1.1 },
  fearful: { particleSpeed: 0.6, waveAmplitude: 0.7, colorIntensity: 0.9 },
  love: { particleSpeed: 1.0, waveAmplitude: 0.8, colorIntensity: 1.0 },
};

const EmotionContext = createContext<EmotionContextType | null>(null);

export const useEmotion = () => {
  const context = useContext(EmotionContext);
  if (!context) {
    throw new Error('useEmotion must be used within EmotionProvider');
  }
  return context;
};

export const getAnimationParams = (emotion: EmotionType) => {
  return EMOTION_ANIMATION_PARAMS[emotion] || EMOTION_ANIMATION_PARAMS.neutral;
};

export const EmotionProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentEmotion, setCurrentEmotion] = useState<EmotionState>({
    emotion: 'neutral',
    confidence: 0.5,
    source: 'manual',
    timestamp: Date.now(),
  });
  
  const [currentPlaylist, setCurrentPlaylist] = useState<PlaylistState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastApiCallRef = useRef<number>(0);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [logMessage, ...prev.slice(0, 49)]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchPlaylist = useCallback(async (emotion: EmotionType, confidence: number) => {
    const now = Date.now();
    if (now - lastApiCallRef.current < 500) {
      addLog('⏳ API调用过于频繁，跳过');
      return;
    }
    lastApiCallRef.current = now;

    setIsLoading(true);
    setError(null);

    try {
      addLog(`📨 请求歌单匹配: 情绪=${emotion}, 置信度=${confidence.toFixed(2)}`);
      
      const response = await axios.post(`${API_BASE_URL}/api/match-playlist`, {
        emotion,
        confidence,
        source: 'frontend',
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      addLog(`✅ 歌单匹配成功: ${response.data.playlist_name}`);
      setCurrentPlaylist(response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || '网络请求失败';
      setError(`歌单匹配失败: ${errorMsg}`);
      addLog(`❌ 歌单匹配失败: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  const setEmotion = useCallback(async (
    emotion: EmotionType, 
    confidence: number = 0.85, 
    source: 'manual' | 'audio' | 'text' | 'api' = 'manual'
  ) => {
    addLog(`🎯 更新情绪: ${emotion}, 置信度=${confidence.toFixed(2)}, 来源=${source}`);
    
    setCurrentEmotion({
      emotion,
      confidence,
      source,
      timestamp: Date.now(),
    });

    await fetchPlaylist(emotion, confidence);
  }, [addLog, fetchPlaylist]);

  const analyzeAudioFeatures = useCallback((analyser: AnalyserNode): { energy: number; variance: number; zeroCrossingRate: number } => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeData = new Float32Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);
    analyser.getFloatTimeDomainData(timeData);

    const sum = dataArray.reduce((a, b) => a + b, 0);
    const energy = sum / bufferLength / 255;

    const mean = sum / bufferLength;
    const squaredDiffs = dataArray.map(v => Math.pow(v - mean, 2));
    const variance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / bufferLength) / 255;

    let zeroCrossings = 0;
    for (let i = 1; i < bufferLength; i++) {
      if ((timeData[i - 1] >= 0 && timeData[i] < 0) || (timeData[i - 1] < 0 && timeData[i] >= 0)) {
        zeroCrossings++;
      }
    }
    const zeroCrossingRate = zeroCrossings / bufferLength;

    return { energy, variance, zeroCrossingRate };
  }, []);

  const inferEmotionFromFeatures = useCallback((features: { energy: number; variance: number; zeroCrossingRate: number }): EmotionType => {
    const { energy, variance, zeroCrossingRate } = features;

    if (energy < 0.25 && variance < 0.3) return 'sad';
    if (energy > 0.6 && variance > 0.5) return 'happy';
    if (energy > 0.7 && (variance > 0.6 || zeroCrossingRate > 0.5)) return 'angry';
    if (energy < 0.35 && variance < 0.25) return 'calm';
    if (variance > 0.7 && energy > 0.5) return 'surprised';
    if (energy > 0.3 && energy < 0.5 && zeroCrossingRate > 0.4) return 'fearful';
    
    return 'neutral';
  }, []);

  const sendAudioToBackend = useCallback(async (audioBlob: Blob) => {
    try {
      addLog(`📤 发送音频到后端: ${audioBlob.size} bytes`);
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');

      const response = await axios.post(`${API_BASE_URL}/api/analyze-audio`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 15000,
      });

      addLog(`✅ 后端分析结果: 情绪=${response.data.emotion}, 置信度=${response.data.confidence.toFixed(2)}`);
      
      const confidence = Math.min(response.data.confidence, 0.95);
      await setEmotion(response.data.emotion as EmotionType, confidence, 'api');
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || '网络请求失败';
      addLog(`❌ 音频分析失败: ${errorMsg}`);
    }
  }, [addLog, setEmotion]);

  const audioBufferToWav = useCallback((buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const float32Array: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      float32Array.push(buffer.getChannelData(i));
    }
    
    const byteRate = sampleRate * blockAlign;
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = float32Array[channel][i];
        const clampedSample = Math.max(-1, Math.min(1, sample));
        const intSample = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7FFF;
        view.setInt16(offset, Math.floor(intSample), true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }, []);

  const startRecording = useCallback(async () => {
    try {
      addLog('🎤 正在初始化录音...');

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        analyserRef.current.smoothingTimeConstant = 0.8;
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        } 
      });
      
      streamRef.current = stream;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      try {
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
      } catch {
        try {
          mediaRecorderRef.current = new MediaRecorder(stream, {
            mimeType: 'audio/wav',
          });
        } catch {
          mediaRecorderRef.current = new MediaRecorder(stream);
        }
      }

      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          addLog(`🎵 录音完成，文件大小: ${audioBlob.size} bytes`);
          await sendAudioToBackend(audioBlob);
          audioChunksRef.current = [];
        }
      };

      mediaRecorderRef.current.start(2000);

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = false;
          recognitionRef.current.lang = 'zh-CN';
          recognitionRef.current.maxAlternatives = 1;

          recognitionRef.current.onresult = async (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            addLog(`📝 语音识别文本: "${transcript}"`);
            
            const textLower = transcript.toLowerCase();
            let detectedEmotion: EmotionType = 'neutral';
            let confidence = 0.6;

            if (['悲伤', '难过', '伤心', '郁闷', 'sad', 'unhappy', 'depressed'].some(k => textLower.includes(k))) {
              detectedEmotion = 'sad';
              confidence = 0.8;
            } else if (['开心', '高兴', '快乐', '兴奋', 'happy', 'great', 'awesome', 'excited'].some(k => textLower.includes(k))) {
              detectedEmotion = 'happy';
              confidence = 0.85;
            } else if (['生气', '愤怒', '恼火', 'angry', 'mad', 'hate', 'annoyed'].some(k => textLower.includes(k))) {
              detectedEmotion = 'angry';
              confidence = 0.75;
            } else if (['平静', '放松', '安静', '宁静', 'calm', 'peaceful', 'relax', 'quiet'].some(k => textLower.includes(k))) {
              detectedEmotion = 'calm';
              confidence = 0.8;
            } else if (['爱', '喜欢', '浪漫', '甜蜜', 'love', 'romantic', 'sweet', 'dear'].some(k => textLower.includes(k))) {
              detectedEmotion = 'love';
              confidence = 0.75;
            } else if (['惊讶', '惊喜', 'surprised', 'shocked', 'wow', 'amazing'].some(k => textLower.includes(k))) {
              detectedEmotion = 'surprised';
              confidence = 0.7;
            } else if (['害怕', '恐惧', '紧张', 'fear', 'scared', 'afraid', 'nervous', 'anxious'].some(k => textLower.includes(k))) {
              detectedEmotion = 'fearful';
              confidence = 0.7;
            }

            if (detectedEmotion !== 'neutral') {
              await setEmotion(detectedEmotion, confidence, 'text');
            }
          };

          recognitionRef.current.onerror = (event: any) => {
            if (event.error === 'not-allowed') {
              addLog('⚠️ 语音识别权限被拒绝');
            } else if (event.error === 'network') {
              addLog('⚠️ 语音识别网络错误');
            } else {
              addLog(`⚠️ 语音识别错误: ${event.error}`);
            }
          };

          recognitionRef.current.start();
          addLog('✅ 语音识别已启动');
        } catch (e: any) {
          addLog(`ℹ️ 浏览器语音识别不可用: ${e.message}`);
        }
      }

      let frameCount = 0;
      const analyzeLoop = () => {
        if (!analyserRef.current || !isRecording) return;
        
        frameCount++;
        
        if (frameCount % 120 === 0) {
          const features = analyzeAudioFeatures(analyserRef.current);
          const detectedEmotion = inferEmotionFromFeatures(features);
          
          const confidence = 0.5 + Math.random() * 0.2;
          
          if (detectedEmotion !== currentEmotion.emotion) {
            addLog(`🎵 音频特征分析: 能量=${features.energy.toFixed(2)}, 波动=${features.variance.toFixed(2)} → 情绪=${detectedEmotion}`);
            setEmotion(detectedEmotion, confidence, 'audio');
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(analyzeLoop);
      };

      analyzeLoop();
      setIsRecording(true);
      addLog('✅ 录音已启动，请开始说话');
    } catch (err: any) {
      const errorMsg = err.message || '无法访问麦克风';
      setError(`启动录音失败: ${errorMsg}`);
      addLog(`❌ 启动录音失败: ${errorMsg}`);
    }
  }, [addLog, analyzeAudioFeatures, currentEmotion.emotion, inferEmotionFromFeatures, isRecording, sendAudioToBackend, setEmotion]);

  const stopRecording = useCallback(() => {
    addLog('⏹️ 停止录音...');

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // 忽略停止错误
      }
      recognitionRef.current = null;
    }

    setIsRecording(false);
    addLog('✅ 录音已停止');
  }, [addLog]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopRecording]);

  return (
    <EmotionContext.Provider value={{
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
      addLog,
    }}>
      {children}
    </EmotionContext.Provider>
  );
};

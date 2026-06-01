import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import type { EmotionData } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AudioFeatures {
  energy: number;
  valence: number;
  tempo: number;
  pitch: number;
  variance: number;
  zeroCrossingRate: number;
}

interface EmotionResult {
  emotion: string;
  confidence: number;
  source: 'audio' | 'text' | 'hybrid' | 'api' | 'manual';
}

export const useEmotionDetector = () => {
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [confidence, setConfidence] = useState<number>(0.5);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastApiCallRef = useRef<number>(0);
  const emotionHistoryRef = useRef<{ emotion: string; confidence: number; timestamp: number }[]>([]);

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
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
        const intSample = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, intSample < 0 ? intSample * 0x8000 : intSample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const extractAudioFeatures = useCallback((analyser: AnalyserNode): AudioFeatures => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeData = new Float32Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);
    analyser.getFloatTimeDomainData(timeData);

    const sum = dataArray.reduce((a, b) => a + b, 0);
    const energy = sum / bufferLength / 255;

    const lowFreq = dataArray.slice(0, bufferLength / 4).reduce((a, b) => a + b, 0) / (bufferLength / 4);
    const highFreq = dataArray.slice(bufferLength / 2).reduce((a, b) => a + b, 0) / (bufferLength / 2);
    
    const valence = Math.min(1, (highFreq - lowFreq) / 255 + 0.5);
    const tempo = energy * 180 + 60;
    const pitch = (highFreq / 255) * 1000 + 100;

    let zeroCrossings = 0;
    for (let i = 1; i < bufferLength; i++) {
      if ((timeData[i - 1] >= 0 && timeData[i] < 0) || (timeData[i - 1] < 0 && timeData[i] >= 0)) {
        zeroCrossings++;
      }
    }
    const zeroCrossingRate = zeroCrossings / bufferLength;

    const mean = sum / bufferLength;
    const squaredDiffs = dataArray.map(v => Math.pow(v - mean, 2));
    const variance = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / bufferLength) / 255;

    return { energy, valence, tempo, pitch, variance, zeroCrossingRate };
  }, []);

  const inferEmotionFromAudio = useCallback((features: AudioFeatures): EmotionResult => {
    const { energy, variance, zeroCrossingRate } = features;

    if (energy < 0.25 && variance < 0.3) {
      return { emotion: 'sad', confidence: 0.75 + (0.3 - energy) * 0.4, source: 'audio' };
    }

    if (energy > 0.6 && variance > 0.5) {
      return { emotion: 'happy', confidence: 0.65 + energy * 0.35, source: 'audio' };
    }

    if (energy > 0.7 && (variance > 0.6 || zeroCrossingRate > 0.5)) {
      return { emotion: 'angry', confidence: 0.55 + energy * 0.3, source: 'audio' };
    }

    if (energy < 0.35 && variance < 0.25) {
      return { emotion: 'calm', confidence: 0.6 + (1 - energy) * 0.3, source: 'audio' };
    }

    if (variance > 0.7 && energy > 0.5) {
      return { emotion: 'surprised', confidence: 0.55 + variance * 0.3, source: 'audio' };
    }

    if (energy > 0.3 && energy < 0.5 && zeroCrossingRate > 0.4) {
      return { emotion: 'fearful', confidence: 0.5 + zeroCrossingRate * 0.3, source: 'audio' };
    }

    return { emotion: 'neutral', confidence: 0.5, source: 'audio' };
  }, []);

  const analyzeTextEmotion = useCallback((text: string): EmotionResult | null => {
    if (!text || text.trim().length < 2) return null;
    
    const textLower = text.toLowerCase();
    const keywords: Record<string, string[]> = {
      sad: ['悲伤', '难过', '伤心', '郁闷', '低落', 'sad', 'sorrow', 'down', 'unhappy', 'depressed', 'blue'],
      happy: ['开心', '高兴', '快乐', '兴奋', '喜悦', 'happy', 'joy', 'excited', 'great', 'awesome', 'wonderful'],
      angry: ['生气', '愤怒', '恼火', 'angry', 'mad', 'furious', 'hate', 'annoyed'],
      calm: ['平静', '放松', '安静', '宁静', 'calm', 'peaceful', 'relaxed', 'chill', 'quiet'],
      surprised: ['惊讶', '惊喜', 'surprised', 'shocked', 'amazed', 'wow', 'oh'],
      fearful: ['害怕', '恐惧', '紧张', 'fear', 'scared', 'afraid', 'nervous', 'anxious'],
      love: ['爱', '喜欢', '浪漫', '甜蜜', 'love', 'romantic', 'sweet', 'dear'],
    };
    const scores: Record<string, number> = {};

    for (const [emotion, keywordList] of Object.entries(keywords)) {
      let count = 0;
      for (const keyword of keywordList) {
        if (textLower.includes(keyword.toLowerCase())) {
          count++;
        }
      }
      if (count > 0) {
        scores[emotion] = Math.min(count * 0.25, 1.0);
      }
    }

    if (Object.keys(scores).length === 0) {
      return null;
    }

    const maxEmotion = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
    return { emotion: maxEmotion[0], confidence: maxEmotion[1], source: 'text' };
  }, []);

  const sendAudioToBackend = useCallback(async (audioBlob: Blob): Promise<EmotionResult | null> => {
    try {
      console.log('📤 发送音频到后端，大小:', audioBlob.size, 'bytes');
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');

      const response = await axios.post(`${API_BASE_URL}/api/analyze-audio`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 15000,
      });

      console.log('✅ 后端音频分析结果:', response.data);
      return {
        emotion: response.data.emotion,
        confidence: response.data.confidence,
        source: 'api',
      };
    } catch (error) {
      console.error('❌ 发送音频到后端失败:', error);
      return null;
    }
  }, []);

  const matchPlaylist = useCallback(async (emotion: string, confidence: number) => {
    try {
      const now = Date.now();
      if (now - lastApiCallRef.current < 2000) {
        console.log('⏳ API调用过于频繁，跳过:', now - lastApiCallRef.current, 'ms');
        return null;
      }
      lastApiCallRef.current = now;

      console.log('📨 调用歌单匹配API:', { emotion, confidence, source: 'microphone' });
      
      const response = await axios.post(`${API_BASE_URL}/api/match-playlist`, {
        emotion,
        confidence,
        source: 'microphone',
      }, {
        timeout: 8000,
      });

      console.log('✅ 歌单匹配成功:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ 歌单匹配失败:', error);
      return null;
    }
  }, []);

  const smoothEmotion = useCallback((newEmotion: string, newConfidence: number): { emotion: string; confidence: number } => {
    const now = Date.now();
    emotionHistoryRef.current.push({ emotion: newEmotion, confidence: newConfidence, timestamp: now });
    emotionHistoryRef.current = emotionHistoryRef.current.filter(e => now - e.timestamp < 4000);

    if (emotionHistoryRef.current.length < 3) {
      return { emotion: newEmotion, confidence: newConfidence };
    }

    const emotionCounts: Record<string, number> = {};
    emotionHistoryRef.current.forEach(e => {
      emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + e.confidence;
    });

    const sortedEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
    const dominantEmotion = sortedEmotions[0];
    
    const matchingCount = emotionHistoryRef.current.filter(e => e.emotion === dominantEmotion[0]).length;
    const avgConfidence = dominantEmotion[1] / matchingCount;

    return { emotion: dominantEmotion[0], confidence: avgConfidence };
  }, []);

  const shouldChangeEmotion = useCallback((newEmotion: string, currentEmotion: string): boolean => {
    const now = Date.now();
    const timeSinceLastChange = now - lastApiCallRef.current;
    
    if (newEmotion === currentEmotion) return false;
    if (timeSinceLastChange < 2000) return false;
    
    const recentSameEmotion = emotionHistoryRef.current
      .filter(e => e.emotion === newEmotion && now - e.timestamp < 1500)
      .length;
    
    return recentSameEmotion >= 2;
  }, []);

  const updateEmotionState = useCallback((emotion: string, conf: number, source: string) => {
    console.log(`🎯 更新情绪状态: ${emotion}, 置信度: ${conf.toFixed(3)}, 来源: ${source}`);
    setCurrentEmotion(emotion);
    setConfidence(conf);
  }, []);

  const init = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        analyserRef.current.smoothingTimeConstant = 0.8;

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'zh-CN,en-US';
          recognitionRef.current.maxAlternatives = 3;

          recognitionRef.current.onresult = async (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              }
            }
            
            if (finalTranscript) {
              console.log('🎤 识别到语音文本:', finalTranscript);
              const textEmotion = analyzeTextEmotion(finalTranscript);
              if (textEmotion) {
                console.log('📝 文本情绪识别:', textEmotion);
                const smoothed = smoothEmotion(textEmotion.emotion, textEmotion.confidence);
                
                if (shouldChangeEmotion(smoothed.emotion, currentEmotion)) {
                  updateEmotionState(smoothed.emotion, smoothed.confidence, 'text');
                  await matchPlaylist(smoothed.emotion, smoothed.confidence);
                }
              }
            }
          };

          recognitionRef.current.onerror = (event: any) => {
            console.warn('⚠️ 语音识别错误:', event.error);
          };
        } else {
          console.warn('⚠️ 浏览器不支持语音识别 API');
        }

        setIsInitialized(true);
        console.log('✅ 情绪检测器初始化完成');
      }
    } catch (error) {
      console.error('❌ 情绪检测器初始化失败:', error);
      throw error;
    }
  }, [analyzeTextEmotion, smoothEmotion, shouldChangeEmotion, currentEmotion, updateEmotionState, matchPlaylist]);

  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 开始录音...');
      
      if (!audioContextRef.current || !analyserRef.current) {
        await init();
      }

      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        } 
      });
      streamRef.current = stream;
      
      microphoneRef.current = audioContextRef.current!.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current!);

      try {
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } catch {
        try {
          mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/wav' });
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
          await sendAudioToBackend(audioBlob);
          audioChunksRef.current = [];
        }
      };

      mediaRecorderRef.current.start(1000);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log('✅ 语音识别已启动');
        } catch (e) {
          console.log('ℹ️ 语音识别已在运行');
        }
      }

      let frameCount = 0;
      const analyzeLoop = () => {
        if (analyserRef.current && isRecording) {
          frameCount++;
          
          if (frameCount % 60 === 0) {
            const features = extractAudioFeatures(analyserRef.current);
            const audioEmotion = inferEmotionFromAudio(features);
            
            const smoothed = smoothEmotion(audioEmotion.emotion, audioEmotion.confidence);
            
            if (shouldChangeEmotion(smoothed.emotion, currentEmotion)) {
              console.log('🎵 音频情绪变化:', smoothed, '特征:', features);
              updateEmotionState(smoothed.emotion, smoothed.confidence, 'audio');
              matchPlaylist(smoothed.emotion, smoothed.confidence);
            }
          }
        }
        animationFrameRef.current = requestAnimationFrame(analyzeLoop);
      };

      analyzeLoop();
      setIsRecording(true);
      console.log('✅ 录音已启动');
    } catch (error: any) {
      console.error('❌ 启动录音失败:', error);
      alert(`无法访问麦克风: ${error.message}\n请确保已授予麦克风权限。`);
      throw error;
    }
  }, [init, extractAudioFeatures, inferEmotionFromAudio, smoothEmotion, shouldChangeEmotion, isRecording, currentEmotion, updateEmotionState, matchPlaylist, sendAudioToBackend]);

  const stopRecording = useCallback(() => {
    console.log('⏹️ 停止录音...');
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
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
        console.log('ℹ️ 语音识别已停止');
      }
    }

    emotionHistoryRef.current = [];
    
    setIsRecording(false);
    setCurrentEmotion('neutral');
    setConfidence(0.5);
    
    console.log('✅ 录音已停止');
  }, []);

  const simulateEmotion = useCallback(async (emotion: string, confidence: number = 0.85) => {
    console.log('🎯 模拟情绪:', emotion, '置信度:', confidence);
    lastApiCallRef.current = Date.now();
    emotionHistoryRef.current = [];
    for (let i = 0; i < 10; i++) {
      emotionHistoryRef.current.push({ emotion, confidence, timestamp: Date.now() - i * 100 });
    }
    
    updateEmotionState(emotion, confidence, 'manual');
    
    const playlist = await matchPlaylist(emotion, confidence);
    if (playlist) {
      console.log('✅ 模拟情绪歌单匹配成功:', playlist.playlist_name);
    }
    
    return playlist;
  }, [updateEmotionState, matchPlaylist]);

  const getEmotionData = useCallback((): EmotionData => {
    return {
      emotion: currentEmotion,
      confidence: confidence,
      source: 'microphone',
    };
  }, [currentEmotion, confidence]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopRecording]);

  return {
    isRecording,
    isInitialized,
    currentEmotion,
    confidence,
    init,
    startRecording,
    stopRecording,
    simulateEmotion,
    getEmotionData,
    matchPlaylist,
    updateEmotionState,
  };
};

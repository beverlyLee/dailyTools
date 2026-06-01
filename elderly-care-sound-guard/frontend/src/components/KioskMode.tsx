'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, AlertTriangle, CheckCircle, Heart, Bell, Shield, Home, Settings, Volume2, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { AlertResponse } from '@/types';

interface KioskModeProps {
  onAlert?: (alert: AlertResponse) => void;
}

export default function KioskMode({ onAlert }: KioskModeProps) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isAlerting, setIsAlerting] = useState(false);
  const [lastAlert, setLastAlert] = useState<AlertResponse | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  const isKioskRef = useRef(false);
  const isMonitoringRef = useRef(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const enterKioskMode = useCallback(() => {
    isKioskRef.current = true;
    document.documentElement.style.setProperty('--kiosk-scale', '1');
  }, []);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isMonitoringRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const sum = dataArray.reduce((a, b) => a + b, 0);
    const avg = sum / dataArray.length;
    setAudioLevel(Math.min(100, Math.round(avg * 2)));

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      isMonitoringRef.current = true;
      setIsMonitoring(true);
      enterKioskMode();
      setIsConnected(true);

      updateAudioLevel();
    } catch (err) {
      console.error('无法访问麦克风:', err);
      setIsConnected(false);
      isMonitoringRef.current = false;
      setIsMonitoring(false);
    }
  }, [enterKioskMode, updateAudioLevel]);

  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;

    setIsMonitoring(false);
    setAudioLevel(0);
  }, []);

  const triggerTestAlert = useCallback(async () => {
    setSimulating(true);
    try {
      const result = await api.triggerTestAlert();
      setLastAlert(result);
      setIsAlerting(true);
      onAlert?.(result);
      
      setTimeout(() => {
        setIsAlerting(false);
      }, 10000);
    } catch (err) {
      console.error('测试告警失败:', err);
    } finally {
      setSimulating(false);
    }
  }, [onAlert]);

  const simulateFall = useCallback(async () => {
    setSimulating(true);
    try {
      const result = await api.detectAlert({
        detected_sound: 'fall',
        confidence: 0.92,
        location: '客厅',
      });
      
      if ('alert_id' in result) {
        setLastAlert(result);
        setIsAlerting(true);
        onAlert?.(result);
        
        setTimeout(() => {
          setIsAlerting(false);
        }, 15000);
      }
    } catch (err) {
      console.error('模拟跌倒失败:', err);
    } finally {
      setSimulating(false);
    }
  }, [onAlert]);

  const dismissAlert = useCallback(() => {
    setIsAlerting(false);
    if (lastAlert) {
      api.resolveAlert(lastAlert.alert_id).catch(console.error);
    }
  }, [lastAlert]);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const getAudioLevelColor = () => {
    if (audioLevel > 70) return 'bg-red-500';
    if (audioLevel > 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBgColor = () => {
    if (isAlerting) return 'bg-red-600 animate-pulse-fast';
    if (isMonitoring) return 'bg-green-600';
    return 'bg-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {isAlerting && lastAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/90 backdrop-blur-sm animate-pulse">
          <div className="max-w-2xl w-full mx-4 p-8 bg-red-900 rounded-3xl shadow-2xl border-4 border-red-400">
            <div className="flex items-center justify-center mb-6">
              <div className="p-6 bg-red-800 rounded-full animate-bounce-slow">
                <AlertTriangle className="w-24 h-24 text-red-300" />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-center mb-4 text-red-100">
              ⚠️ 紧急告警
            </h2>
            <p className="text-2xl text-center mb-6 text-red-200">
              {lastAlert.message}
            </p>
            <div className="bg-red-950/50 rounded-2xl p-6 mb-6">
              <p className="text-lg font-semibold mb-3 text-red-200">已通知联系人:</p>
              <div className="space-y-2">
                {lastAlert.contacts_notified.map((contact, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-red-100">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-xl">{contact.name}</span>
                    <span className="text-red-300">- {contact.phone}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center">
              <button
                onClick={dismissAlert}
                className="px-12 py-4 bg-green-600 hover:bg-green-700 text-white text-2xl font-bold rounded-2xl transition-all transform hover:scale-105"
              >
                确认已处理
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`${getStatusBgColor()} py-3 px-6 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <Shield className="w-8 h-8" />
          <span className="text-xl font-semibold">老人居家安全监护系统</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {isMonitoring ? (
              <Mic className="w-6 h-6 animate-pulse-slow" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
            <span className="text-lg">
              {isMonitoring ? '监听中' : '未监听'}
            </span>
          </div>
          <div className="text-xl font-mono">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <Heart className="w-10 h-10 text-red-400" />
                  安全状态
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse-slow`}></span>
                  <span className="text-lg">{isConnected ? '连接正常' : '连接异常'}</span>
                </div>
              </div>

              <div className="text-center py-12">
                <div className={`inline-flex items-center justify-center w-48 h-48 rounded-full ${isMonitoring ? 'bg-green-900/50' : 'bg-gray-800'} border-4 ${isMonitoring ? 'border-green-500' : 'border-gray-600'} mb-8`}>
                  {isMonitoring ? (
                    <Mic className="w-24 h-24 text-green-400 animate-pulse-slow" />
                  ) : (
                    <MicOff className="w-24 h-24 text-gray-500" />
                  )}
                </div>
                <h3 className="text-4xl font-bold mb-4">
                  {isMonitoring ? '正在监听环境声音' : '点击开始监护'}
                </h3>
                <p className="text-xl text-gray-400">
                  {isMonitoring ? '系统正在主动保护老人安全' : '点击下方按钮开始安全监护'}
                </p>
              </div>

              {isMonitoring && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg text-gray-400">环境音量</span>
                    <span className="text-lg font-mono">{audioLevel}%</span>
                  </div>
                  <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getAudioLevelColor()} transition-all duration-100 rounded-full`}
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-gray-500">
                    <span>安静</span>
                    <span>正常</span>
                    <span>响亮</span>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-4 justify-center">
                {!isMonitoring ? (
                  <button
                    onClick={startMonitoring}
                    className="px-12 py-5 bg-green-600 hover:bg-green-700 text-white text-2xl font-bold rounded-2xl transition-all transform hover:scale-105 flex items-center gap-3"
                  >
                    <Mic className="w-8 h-8" />
                    开始监护
                  </button>
                ) : (
                  <button
                    onClick={stopMonitoring}
                    className="px-12 py-5 bg-red-600 hover:bg-red-700 text-white text-2xl font-bold rounded-2xl transition-all transform hover:scale-105 flex items-center gap-3"
                  >
                    <MicOff className="w-8 h-8" />
                    停止监护
                  </button>
                )}
              </div>
            </div>

            <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Bell className="w-8 h-8 text-yellow-400" />
                模拟测试
              </h2>
              <p className="text-gray-400 mb-6">
                点击下方按钮模拟异常声音事件，测试系统告警流程
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={simulateFall}
                  disabled={simulating}
                  className="p-6 bg-orange-900/50 hover:bg-orange-900 border-2 border-orange-700 hover:border-orange-500 rounded-2xl transition-all disabled:opacity-50"
                >
                  <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                  <p className="text-xl font-bold">模拟跌倒声</p>
                  <p className="text-sm text-gray-400 mt-1">触发高优先级告警</p>
                </button>
                <button
                  onClick={triggerTestAlert}
                  disabled={simulating}
                  className="p-6 bg-blue-900/50 hover:bg-blue-900 border-2 border-blue-700 hover:border-blue-500 rounded-2xl transition-all disabled:opacity-50"
                >
                  <Volume2 className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                  <p className="text-xl font-bold">测试告警</p>
                  <p className="text-sm text-gray-400 mt-1">完整告警流程测试</p>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-400" />
                时间信息
              </h2>
              <div className="text-center py-6">
                <p className="text-6xl font-mono font-bold text-blue-400 mb-4">
                  {formatTime(currentTime)}
                </p>
                <p className="text-xl text-gray-400">
                  {formatDate(currentTime)}
                </p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Home className="w-8 h-8 text-purple-400" />
                系统信息
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-800 rounded-xl">
                  <span className="text-gray-400">监听状态</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isMonitoring ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {isMonitoring ? '活动' : '未活动'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-800 rounded-xl">
                  <span className="text-gray-400">后端连接</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isConnected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {isConnected ? '已连接' : '未连接'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-800 rounded-xl">
                  <span className="text-gray-400">Kiosk 模式</span>
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-900 text-purple-300">
                    {isKioskRef.current ? '已启用' : '可启用'}
                  </span>
                </div>
              </div>
            </div>

            {lastAlert && !isAlerting && (
              <div className="bg-yellow-900/30 rounded-3xl p-8 border border-yellow-700">
                <h2 className="text-xl font-bold mb-4 text-yellow-300">上次告警</h2>
                <p className="text-yellow-200 mb-2">{lastAlert.message}</p>
                <p className="text-sm text-yellow-400">
                  告警 ID: {lastAlert.alert_id.slice(0, 8)}...
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

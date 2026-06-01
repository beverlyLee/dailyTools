"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Send, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCopilotWS } from "@/hooks/useCopilotWS";
import type { Transcript, Recommendation, ConnectionStatus } from "@/types";
import { formatTime } from "@/lib/utils";

interface AudioCaptureProps {
  onTranscript: (transcript: Transcript) => void;
  onRecommendation: (recommendation: Recommendation) => void;
  onStatus: (status: ConnectionStatus) => void;
}

export function AudioCapture({
  onTranscript,
  onRecommendation,
  onStatus,
}: AudioCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [testText, setTestText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(30).fill(5));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<number | null>(null);

  const { status, connect, disconnect, sendText, sendAudio, reset } = useCopilotWS({
    onTranscript,
    onRecommendation,
    onStatusChange: onStatus,
  });

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const avg = sum / dataArray.length;
      setAudioLevel(avg);

      const newWaveform = new Array(30).fill(0).map(() =>
        Math.max(5, Math.min(100, avg * (0.5 + Math.random())))
      );
      setWaveformData(newWaveform);

      animationRef.current = requestAnimationFrame(update);
    };

    update();
  }, []);

  const startRecording = async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          if (status.connected) {
            sendAudio(event.data);
          }
        }
      };

      mediaRecorder.start(500);
      setIsRecording(true);
      animateWaveform();

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      setError("无法访问麦克风，请检查权限设置");
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleSendTestText = () => {
    if (!testText.trim()) return;
    if (!status.connected) {
      setError("未连接到服务器，请稍后重试");
      return;
    }
    sendText(testText.trim());
    setTestText("");
  };

  const handleReset = () => {
    reset();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              status.connected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-muted-foreground">
            {status.message || "未连接"}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} disabled={!status.connected}>
          <RefreshCw className="mr-2 h-4 w-4" />
          重置会话
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            size="lg"
            className="bg-red-500 hover:bg-red-600 text-white"
            disabled={!status.connected}
          >
            <Mic className="mr-2 h-5 w-5" />
            开始录音
          </Button>
        ) : (
          <Button onClick={stopRecording} size="lg" variant="destructive">
            <Square className="mr-2 h-5 w-5" />
            停止录音 ({formatTime(recordingTime)})
          </Button>
        )}
      </div>

      {(isRecording || recordingTime > 0) && (
        <div className="flex items-center justify-center gap-1 h-16 py-4">
          {waveformData.map((height, i) => (
            <div
              key={i}
              className="w-1.5 bg-blue-500 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(4, Math.min(48, height * 0.4))}px`,
                opacity: isRecording ? 1 : 0.3,
              }}
            />
          ))}
        </div>
      )}

      <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
        <div className="text-sm font-medium flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          测试模式：输入客户话术进行模拟
        </div>
        <div className="flex gap-2">
          <Textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="例如：太贵了"
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendTestText();
              }
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSendTestText}
            disabled={!testText.trim() || !status.connected}
          >
            <Send className="mr-2 h-4 w-4" />
            发送测试
          </Button>
          <Button
            variant="outline"
            onClick={() => setTestText("太贵了")}
            size="sm"
          >
            试：太贵了
          </Button>
          <Button
            variant="outline"
            onClick={() => setTestText("有什么功能")}
            size="sm"
          >
            试：功能
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          提示：输入后按 Enter 快速发送，按 Shift+Enter 换行
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 p-3 bg-red-50 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

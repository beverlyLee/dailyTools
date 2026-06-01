"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  Square,
  Upload,
  Text,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { meetingApi } from "@/lib/api";

interface RecordingControlProps {
  meetingId: number;
  onTranscriptionComplete?: () => void;
  onProcessingComplete?: () => void;
}

type RecordingStatus =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "stopping"
  | "uploading"
  | "uploaded"
  | "inputting_text"
  | "processing"
  | "success"
  | "error";

export function RecordingControl({
  meetingId,
  onTranscriptionComplete,
  onProcessingComplete,
}: RecordingControlProps) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(30).fill(5));
  const [manualText, setManualText] = useState("");
  const [hasAudioUploaded, setHasAudioUploaded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<number | null>(null);

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

  const cleanUp = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
  }, []);

  const startRecording = async () => {
    setError(null);
    setStatus("requesting_permission");
    setStatusMessage("正在请求麦克风权限...");

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
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      animateWaveform();
      setStatus("recording");
      setStatusMessage("正在录音...");

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      setError("无法访问麦克风，请检查浏览器权限设置");
      setStatus("idle");
      setStatusMessage("");
    }
  };

  const [isRecording, setIsRecording] = useState(false);

  const stopRecording = async () => {
    setStatus("stopping");
    setStatusMessage("正在停止录音...");
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
      await new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => resolve();
        } else {
          resolve();
        }
      });
    }

    cleanUp();

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });

    setStatus("uploading");
    setStatusMessage("正在上传音频...");

    try {
      const result = await meetingApi.uploadAudio(meetingId, audioFile);
      console.log("Audio uploaded:", result);
      setHasAudioUploaded(true);
      setStatus("uploaded");
      setStatusMessage("音频已保存。请输入会议内容文本以生成摘要。");
    } catch (err) {
      setError("音频上传失败，请检查网络连接");
      setStatus("error");
      setStatusMessage("");
    }
  };

  const handleProcessWithText = async () => {
    if (!manualText.trim()) {
      setError("请输入会议内容");
      return;
    }

    setError(null);
    setStatus("processing");
    setStatusMessage("正在调用 AI 生成摘要，请稍候...");

    try {
      const result = await meetingApi.processMeeting(meetingId, manualText);
      console.log("Processing result:", result);

      setStatus("success");
      setStatusMessage("处理完成！正在跳转到会议详情页...");

      setTimeout(() => {
        onProcessingComplete?.();
        onTranscriptionComplete?.();
      }, 1000);
    } catch (err: any) {
      console.error("Processing error:", err);
      const errorMessage =
        err?.message ||
        "处理失败，请检查 API 配置或稍后重试";
      setError(errorMessage);
      setStatus("error");
      setStatusMessage("");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const statusColors: Record<RecordingStatus, string> = {
    idle: "bg-gray-100 text-gray-700",
    requesting_permission: "bg-blue-100 text-blue-700",
    recording: "bg-red-100 text-red-700",
    stopping: "bg-yellow-100 text-yellow-700",
    uploading: "bg-blue-100 text-blue-700",
    uploaded: "bg-green-100 text-green-700",
    inputting_text: "bg-gray-100 text-gray-700",
    processing: "bg-purple-100 text-purple-700",
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  useEffect(() => {
    return cleanUp;
  }, [cleanUp]);

  const canShowTextInput =
    status === "idle" ||
    status === "uploaded" ||
    status === "error" ||
    status === "inputting_text";

  const isBusy =
    status === "requesting_permission" ||
    status === "recording" ||
    status === "stopping" ||
    status === "uploading" ||
    status === "processing";

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          className={`flex items-center justify-center gap-2 p-3 rounded-lg text-sm ${
            statusColors[status]
          }`}
        >
          {status === "recording" && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          {status === "processing" && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {status === "success" && <CheckCircle2 className="w-4 h-4" />}
          {status === "error" && <AlertCircle className="w-4 h-4" />}
          {status === "uploaded" && <FileAudio className="w-4 h-4" />}
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <div className="flex gap-3">
            <Button
              onClick={startRecording}
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={isBusy}
            >
              <Mic className="mr-2 h-5 w-5" />
              开始录音
            </Button>
            <Button
              onClick={() => setStatus("inputting_text")}
              variant="outline"
              size="lg"
              disabled={isBusy}
            >
              <Text className="mr-2 h-5 w-5" />
              直接输入文本
            </Button>
          </div>
        ) : (
          <Button onClick={stopRecording} size="lg" variant="destructive">
            <Square className="mr-2 h-5 w-5" />
            停止录音 ({formatTime(recordingTime)})
          </Button>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center justify-center gap-1 h-16 py-4">
          {waveformData.map((height, i) => (
            <div
              key={i}
              className="w-1.5 bg-red-500 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(4, Math.min(48, height * 0.4))}px`,
              }}
            />
          ))}
        </div>
      )}

      {hasAudioUploaded && status !== "recording" && (
        <div className="flex items-center justify-center gap-2 text-sm text-green-600">
          <FileAudio className="w-4 h-4" />
          <span>音频已保存（录音时长：{formatTime(recordingTime)}）</span>
        </div>
      )}

      {canShowTextInput && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-1">
            <div className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              输入会议内容
            </div>
            <p className="text-xs text-muted-foreground">
              输入或粘贴会议内容，AI 将自动提取主题、决策和待办事项。
            </p>
          </div>

          <Textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="例如：今天我们决定上线新版本，张三负责测试，李四负责文档，截止周五"
            className="min-h-[150px]"
            disabled={isBusy}
          />

          <div className="bg-amber-50/50 border border-amber-200 rounded-md p-3">
            <p className="text-amber-700 text-xs">
              💡 <strong>测试提示：</strong>输入以下内容进行测试
            </p>
            <code className="block mt-1 text-xs text-amber-900 bg-amber-100 p-2 rounded">
              今天我们决定上线新版本，张三负责测试，李四负责文档，截止周五
            </code>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleProcessWithText}
              disabled={isBusy || !manualText.trim()}
            >
              {status === "processing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI 正在处理...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  生成 AI 摘要
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      )}

      {status === "uploaded" && !manualText && (
        <div className="text-center text-sm text-muted-foreground">
          <p>💡 提示：由于火山大模型没有直接的语音识别功能，</p>
          <p>请在上方输入框中输入或粘贴会议内容文本。</p>
        </div>
      )}
    </div>
  );
}

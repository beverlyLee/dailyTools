import { useState, useRef, useEffect } from "react";
import {
  Play,
  Mic,
  Volume2,
  RotateCcw,
  AlertCircle,
  Zap,
  MicOff,
  MessageSquare,
  Info
} from "lucide-react";
import type { PracticeSentence, VoiceDetectionInfo, TextAlignmentInfo } from "@/lib/api";
import { getAudioWaveformData, getAudioContext, blobToBase64, createSpeechRecognition, detectVoiceActivity } from "@/lib/audioUtils";
import { WaveformDisplay } from "./WaveformDisplay";
import { clsx } from "clsx";

interface PracticeModeProps {
  sentence: PracticeSentence;
  onRecordingComplete: (
    audioBase64: string,
    waveformData: number[],
    voiceDetection: VoiceDetectionInfo,
    alignment?: TextAlignmentInfo
  ) => void;
  isLoading: boolean;
}

export function PracticeMode({
  sentence,
  onRecordingComplete,
  isLoading,
}: PracticeModeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [userWaveform, setUserWaveform] = useState<number[]>([]);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [playbackWaveform, setPlaybackWaveform] = useState<number[]>([]);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [recordingStatus, setRecordingStatus] = useState<"idle" | "countdown" | "recording" | "analyzing">("idle");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const audioDataRef = useRef<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const speechRecognitionRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);
  const intervalRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    audioContextRef.current = getAudioContext();
    const recognition = createSpeechRecognition("en-US");
    setSpeechRecognitionAvailable(recognition !== null);
    speechRecognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    const words = sentence.sentence.split(" ");
    const segmentsPerWord = Math.floor(200 / words.length);
    const waveform: number[] = [];

    words.forEach(() => {
      const baseAmplitude = 0.5 + Math.random() * 0.4;
      for (let i = 0; i < segmentsPerWord; i++) {
        const position = i / segmentsPerWord;
        const envelope = Math.sin(Math.PI * position);
        waveform.push(baseAmplitude * envelope * (0.7 + Math.random() * 0.3));
      }
    });

    while (waveform.length < 200) {
      waveform.push(0.05);
    }

    setPlaybackWaveform(waveform.slice(0, 200));
  }, [sentence]);

  const playOriginal = async () => {
    if (!audioContextRef.current) return;

    setIsPlaying(true);

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    const utterance = new SpeechSynthesisUtterance(sentence.sentence);
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    utterance.pitch = 1;

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  const startCountdown = async () => {
    setRecordingStatus("countdown");
    setCountdown(3);

    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setCountdown(0);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setCountdown(null);
    startRecording();
  };

  const startRecording = async () => {
    if (!audioContextRef.current) return;

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    try {
      setRecordingStatus("recording");
      setCurrentTranscript("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];
      audioDataRef.current = [];

      const analyser = audioContextRef.current.createAnalyser();
      analyserRef.current = analyser;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioData = new Float32Array(audioDataRef.current);
        const waveform = getAudioWaveformData(
          audioContextRef.current!,
          audioData,
          200
        );
        setUserWaveform(waveform);
        setHasRecorded(true);

        const sampleRate = audioContextRef.current!.sampleRate || 48000;
        const voiceDetection = detectVoiceActivity(audioData, sampleRate);

        let recognizedText = "";
        if (speechRecognitionRef.current && speechRecognitionRef.current.isRunning()) {
          try {
            recognizedText = await speechRecognitionRef.current.stop();
            setCurrentTranscript(recognizedText);
          } catch (e) {
            console.warn("语音识别停止失败:", e);
          }
        }

        let alignment: TextAlignmentInfo | undefined;
        if (recognizedText.length > 0) {
          const targetWords = sentence.sentence
            .split(/\s+/)
            .map((w) => w.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
            .filter((w) => w.length > 0);

          const recognizedWords = recognizedText
            .split(/\s+/)
            .map((w) => w.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
            .filter((w) => w.length > 0);

          const matchedWords: string[] = [];
          const matchedIndices: number[] = [];

          for (const recWord of recognizedWords) {
            for (let i = 0; i < targetWords.length; i++) {
              if (matchedIndices.includes(i)) continue;
              if (targetWords[i] === recWord || 
                  targetWords[i].includes(recWord) || 
                  recWord.includes(targetWords[i])) {
                matchedWords.push(targetWords[i]);
                matchedIndices.push(i);
                break;
              }
            }
          }

          matchedIndices.sort((a, b) => a - b);

          const unmatchedWords = targetWords.filter(
            (_, idx) => !matchedIndices.includes(idx)
          );

          alignment = {
            recognizedText,
            targetWords,
            matchedWords,
            unmatchedWords,
            matchRatio: targetWords.length > 0 ? matchedIndices.length / targetWords.length : 0,
            isComplete: matchedIndices.length === targetWords.length,
          };
        }

        const base64 = await blobToBase64(blob);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        }

        onRecordingComplete(base64, waveform, voiceDetection, alignment);
      };

      if (speechRecognitionRef.current) {
        try {
          await speechRecognitionRef.current.start();
        } catch (e) {
          console.warn("语音识别启动失败:", e);
        }
      }

      mediaRecorder.start();
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      setRecordingTime(0);

      const updateVoiceLevel = () => {
        if (!analyserRef.current || !mediaRecorderRef.current) return;
        if (mediaRecorderRef.current.state !== "recording") return;

        const dataArray = new Float32Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getFloatTimeDomainData(dataArray);
        audioDataRef.current.push(...Array.from(dataArray));

        let level = 0;
        for (const sample of dataArray) {
          level += Math.abs(sample);
        }
        level = Math.min(1, level / dataArray.length * 5);
        setVoiceLevel(level);

        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingTime(elapsed);

        if (speechRecognitionRef.current) {
          const transcript = speechRecognitionRef.current.getCurrentTranscript();
          if (transcript.length > 0) {
            setCurrentTranscript(transcript);
          }
        }

        intervalRef.current = window.requestAnimationFrame(updateVoiceLevel);
      };

      intervalRef.current = window.requestAnimationFrame(updateVoiceLevel);

      setTimeout(() => {
        stopRecording();
      }, 8000);
    } catch (error) {
      console.error("录音失败:", error);
      alert("无法访问麦克风，请检查权限设置。");
      setRecordingStatus("idle");
    }
  };

  const stopRecording = () => {
    if (intervalRef.current) {
      cancelAnimationFrame(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      setVoiceLevel(0);
      setRecordingStatus("idle");
    }
  };

  const resetRecording = () => {
    setUserWaveform([]);
    setHasRecorded(false);
    setCurrentTranscript("");
    setRecordingStatus("idle");
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-700";
      case "intermediate":
        return "bg-yellow-100 text-yellow-700";
      case "advanced":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "初级";
      case "intermediate":
        return "中级";
      case "advanced":
        return "高级";
      default:
        return difficulty;
    }
  };

  const getVoiceLevelColor = (level: number) => {
    if (level < 0.2) return "bg-gray-300";
    if (level < 0.5) return "bg-green-400";
    if (level < 0.8) return "bg-yellow-400";
    return "bg-red-400";
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Volume2 className="w-6 h-6 text-blue-600" />
          跟读练习
        </h3>
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "px-3 py-1 rounded-full text-sm font-medium",
              getDifficultyColor(sentence.difficulty)
            )}
          >
            {getDifficultyText(sentence.difficulty)}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <MessageSquare className="w-3 h-3" />
            语音识别: {speechRecognitionAvailable ? "可用" : "不可用"}
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
        <div className="text-2xl font-bold text-gray-800 mb-2 text-center">
          {sentence.sentence}
        </div>
        <div className="text-center text-gray-500 text-sm">
          {sentence.phonetic}
        </div>
      </div>

      <div className="mb-6">
        <WaveformDisplay
          waveformData={playbackWaveform}
          color="#3b82f6"
          label="标准发音波形"
        />
      </div>

      {isRecording && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-500" />
              实时语音输入检测
            </span>
            <span className="text-sm text-gray-500">{recordingTime}s / 8s</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={clsx("h-full transition-all duration-100", getVoiceLevelColor(voiceLevel))}
              style={{ width: `${voiceLevel * 100}%` }}
            />
          </div>
          {currentTranscript && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <span className="font-medium">识别中: </span>
              {currentTranscript}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={playOriginal}
          disabled={isPlaying || isRecording || isLoading}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
            isPlaying || isRecording || isLoading
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg"
          )}
        >
          {isPlaying ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              播放中...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              播放原声
            </>
          )}
        </button>

        {countdown !== null ? (
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-500 text-white text-2xl font-bold animate-pulse">
            {countdown || "开始!"}
          </div>
        ) : isRecording ? (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-red-500 text-white shadow-md"
          >
            <MicOff className="w-5 h-5" />
            停止录音
          </button>
        ) : (
          <button
            onClick={startCountdown}
            disabled={isLoading}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
              isLoading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-md hover:shadow-lg"
            )}
          >
            <Mic className="w-5 h-5" />
            开始跟读
          </button>
        )}

        {hasRecorded && !isRecording && (
          <button
            onClick={resetRecording}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            重新录制
          </button>
        )}
      </div>

      {hasRecorded && (
        <div className="mb-6">
          <WaveformDisplay
            waveformData={userWaveform}
            color="#10b981"
            label="你的发音波形"
          />
        </div>
      )}

      {sentence.focusWords.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            重点练习单词：
          </div>
          <div className="flex flex-wrap gap-2">
            {sentence.focusWords.map((word) => (
              <span
                key={word}
                className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">录音提示：</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>倒计时结束后请开始朗读句子</li>
              <li>保持正常语速，清晰发音</li>
              <li>请在 8 秒内完成朗读，或点击"停止录音"按钮</li>
              <li>如果没有检测到有效语音，系统将提示重新录制</li>
            </ul>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 py-8 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-700 font-medium text-lg">语音分析中...</span>
          </div>
          <p className="text-blue-600 text-sm">AI 正在分析您的发音，请稍候</p>
        </div>
      )}
    </div>
  );
}

export default PracticeMode;

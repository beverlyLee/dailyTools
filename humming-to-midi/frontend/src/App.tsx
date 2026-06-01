import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Square, Loader2, Music, Sparkles, RefreshCw, AlertCircle, Volume2, Activity, Info } from "lucide-react";
import { Player } from "./components/Player";
import { PitchDetector, type RecordingResult, type RealtimeAudioState } from "./lib/PitchDetector";
import { transcribeMelody, generateChords, type Note, type Chord } from "./lib/api";

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [chords, setChords] = useState<Chord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [key, setKey] = useState<string>("");
  const [progression, setProgression] = useState<string[]>([]);

  const [audioState, setAudioState] = useState<RealtimeAudioState>({
    isRecording: false,
    currentRMS: 0,
    currentNote: null,
    currentFrequency: null,
    isAudioInputActive: false,
  });

  const [debugInfo, setDebugInfo] = useState<{
    show: boolean;
    totalFrames?: number;
    framesWithPitch?: number;
    averageRMS?: number;
    maxRMS?: number;
  }>({ show: false });

  const detectorRef = useRef<PitchDetector | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    detectorRef.current = new PitchDetector();

    const handleAudioState = (state: RealtimeAudioState) => {
      setAudioState(state);
    };

    detectorRef.current.setAudioCallback(handleAudioState);

    return () => {
      if (detectorRef.current) {
        detectorRef.current.setAudioCallback(null);
        detectorRef.current.destroy();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setNotes([]);
    setChords([]);
    setRecordingTime(0);
    setKey("");
    setProgression([]);
    setDebugInfo({ show: false });

    try {
      if (!detectorRef.current) {
        detectorRef.current = new PitchDetector();
        detectorRef.current.setAudioCallback((state) => setAudioState(state));
      }

      const success = await detectorRef.current.startRecording();
      if (!success) {
        setError("无法启动录音");
        return;
      }

      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 0.1);
      }, 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "无法访问麦克风，请检查权限设置";
      setError(errorMessage);
      console.error("录音启动失败:", err);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!detectorRef.current || !isRecording) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setIsProcessing(true);

    try {
      const result: RecordingResult = detectorRef.current.stopRecording();

      console.log("录音结果:", {
        frames: result.frames.length,
        audioDataLength: result.audioData.length,
        debugInfo: result.debugInfo,
      });

      setDebugInfo({
        show: true,
        ...result.debugInfo,
      });

      if (result.frames.length === 0) {
        if (result.debugInfo.maxRMS < 0.005) {
          setError(
            `麦克风输入信号太弱 (最大RMS: ${result.debugInfo.maxRMS.toFixed(4)})。请确保麦克风正在接收音频输入，或增大麦克风音量。`
          );
        } else if (result.debugInfo.framesWithPitch === 0) {
          setError(
            `检测到音频信号 (RMS: ${result.debugInfo.averageRMS.toFixed(4)})，但未能识别出音高。请哼唱更清晰的旋律。`
          );
        } else {
          setError("未检测到有效的音符帧，请确保哼唱了清晰的旋律");
        }
        setIsProcessing(false);
        return;
      }

      const transcribeResult = await transcribeMelody(result.audioData, result.sampleRate);
      setNotes(transcribeResult.notes);
      setKey(transcribeResult.key);

      if (transcribeResult.notes.length === 0) {
        setError("后端未能识别出旋律，请重试");
        setIsProcessing(false);
        return;
      }

      const chordResult = await generateChords(transcribeResult.notes);
      setChords(chordResult.chords);
      setProgression(chordResult.progression);
      if (!key) {
        setKey(chordResult.key);
      }
    } catch (err) {
      setError("处理失败，请确保后端服务已启动 (http://localhost:8001)");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [isRecording, key]);

  const resetAll = useCallback(() => {
    setNotes([]);
    setChords([]);
    setError(null);
    setRecordingTime(0);
    setKey("");
    setProgression([]);
    setDebugInfo({ show: false });
    setAudioState({
      isRecording: false,
      currentRMS: 0,
      currentNote: null,
      currentFrequency: null,
      isAudioInputActive: false,
    });
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
  };

  const getRMSLevel = (rms: number) => {
    const normalized = Math.min(rms * 50, 1);
    if (normalized < 0.1) return "bg-gray-200";
    if (normalized < 0.3) return "bg-green-300";
    if (normalized < 0.5) return "bg-green-500";
    if (normalized < 0.7) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getRMSWidth = (rms: number) => {
    const width = Math.min(rms * 200, 100);
    return `${width}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl shadow-lg">
              <Music className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              哼唱转乐谱
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            将您的哼唱快速转换为乐谱与伴奏
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              AI 和弦配器
            </span>
            <span className="flex items-center gap-1">
              <Music className="w-4 h-4" />
              即时播放
            </span>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">错误</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100 mb-8">
          <div className="flex flex-col items-center">
            <div className="relative mb-6">
              <div className="relative w-32 h-32">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300 ${
                    isRecording
                      ? "bg-gradient-to-br from-red-500 to-pink-500 shadow-2xl"
                      : "bg-gradient-to-br from-purple-500 to-blue-500 hover:shadow-2xl"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isRecording && (
                    <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
                  )}
                  {isProcessing ? (
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-12 h-12 text-white" />
                  ) : (
                    <Mic className="w-12 h-12 text-white" />
                  )}
                </button>

                {isRecording && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-48">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-gray-500" />
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-100 rounded-full ${
                            audioState.isAudioInputActive
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                          style={{
                            width: getRMSWidth(audioState.currentRMS)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center mb-4 mt-8">
              <p className="text-3xl font-mono font-bold text-gray-800">
                {formatTime(recordingTime)}
              </p>
              <p className="text-gray-500 mt-2">
                {isRecording
                  ? "正在录制...点击停止"
                  : isProcessing
                  ? "正在处理..."
                  : "点击开始录制"}
              </p>
            </div>

            {isRecording && (
              <div className="w-full max-w-md space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    音频输入状态
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      audioState.isAudioInputActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {audioState.isAudioInputActive ? "有信号" : "无信号"}
                  </span>
                </div>

                {audioState.currentNote && (
                  <div className="flex items-center justify-center gap-4">
                    <div className="px-6 py-3 bg-purple-100 rounded-2xl">
                      <span className="text-2xl font-bold text-purple-700">
                        {audioState.currentNote}
                      </span>
                    </div>
                    {audioState.currentFrequency && (
                      <span className="text-sm text-gray-500">
                        {audioState.currentFrequency.toFixed(1)} Hz
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-6 rounded-sm transition-all duration-75 ${
                          i < Math.min(Math.floor(audioState.currentRMS * 100) / 5, 20)
                            ? getRMSLevel(audioState.currentRMS)
                            : "bg-gray-200"
                        }`}
                        style={{
                          height: `${Math.max(8, Math.min(audioState.currentRMS * 200, 24))}px`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(notes.length > 0 || chords.length > 0) && (
              <button
                onClick={resetAll}
                className="mt-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                重新录制
              </button>
            )}
          </div>
        </div>

        {debugInfo.show && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-blue-700">
                录音调试信息
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-2 bg-white rounded-lg">
                <span className="text-gray-500">处理帧数</span>
                <p className="font-mono font-bold text-blue-700">
                  {debugInfo.totalFrames}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <span className="text-gray-500">有效音高帧</span>
                <p className="font-mono font-bold text-blue-700">
                  {debugInfo.framesWithPitch}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <span className="text-gray-500">平均RMS</span>
                <p className="font-mono font-bold text-blue-700">
                  {debugInfo.averageRMS?.toFixed(4)}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <span className="text-gray-500">最大RMS</span>
                <p className="font-mono font-bold text-blue-700">
                  {debugInfo.maxRMS?.toFixed(4)}
                </p>
              </div>
            </div>
            {debugInfo.maxRMS !== undefined &&
              debugInfo.maxRMS < 0.01 && (
                <p className="mt-2 text-sm text-yellow-600">
                  ⚠️ 音频信号较弱，请检查麦克风音量
                </p>
              )}
          </div>
        )}

        <div className="space-y-6">
          {notes.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Music className="w-6 h-6 text-purple-600" />
                识别结果
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-purple-600 mb-1">旋律音符</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {notes.length} 个
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600 mb-1">和弦数量</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {chords.length} 个
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-green-600 mb-1">识别调性</p>
                  <p className="text-2xl font-bold text-green-700">
                    {key || "-"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {notes.map((note, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full text-sm font-medium text-gray-700 shadow-sm"
                  >
                    {note.name}
                    <span className="ml-2 text-xs text-gray-500">
                      {note.start.toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Player notes={notes} chords={chords} />
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-100">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            使用提示
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• 确保麦克风已连接并授权访问</li>
            <li>• 在安静的环境下录制效果更佳</li>
            <li>• 尝试哼唱简单的旋律，如"哆瑞咪发嗦"</li>
            <li>• 录制时长建议 5-30 秒</li>
            <li>• 确保后端服务已启动 (http://localhost:8001)</li>
            <li>• 如果录音失败，请检查：</li>
            <li className="ml-4">1. 检查浏览器麦克风权限</li>
            <li className="ml-4">2. 确认麦克风是否被其他应用占用</li>
            <li className="ml-4">3. 增大麦克风输入音量</li>
          </ul>
        </div>

        <footer className="mt-12 text-center text-gray-400 text-sm">
          <p>Humming to MIDI - 让音乐创作更简单</p>
        </footer>
      </div>
    </div>
  );
}

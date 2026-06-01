import { useState, useEffect, useCallback } from "react";
import { Mic, BookOpen, Award, AlertCircle, CheckCircle } from "lucide-react";
import { PracticeMode } from "./components/PracticeMode";
import { ResultDisplay } from "./components/ResultDisplay";
import { getPracticeSentences, analyzePronunciation } from "./lib/api";
import type {
  PracticeSentence,
  PronunciationAnalysisResponse,
  VoiceDetectionInfo,
  TextAlignmentInfo
} from "./lib/api";
import { clsx } from "clsx";

type AppState = "selecting" | "practicing" | "analyzing" | "result";

export default function App() {
  const [sentences, setSentences] = useState<PracticeSentence[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [appState, setAppState] = useState<AppState>("selecting");
  const [analysisResult, setAnalysisResult] =
    useState<PronunciationAnalysisResponse | null>(null);
  const [userWaveform, setUserWaveform] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSentences = async () => {
      try {
        const data = await getPracticeSentences();
        setSentences(data);
      } catch (err) {
        console.error("加载练习句子失败:", err);
        setBackendHealthy(false);
      }
    };
    loadSentences();
  }, []);

  const currentSentence = sentences[currentSentenceIndex];

  const handleRecordingComplete = useCallback(
    async (
      audioBase64: string,
      waveform: number[],
      voiceDetection: VoiceDetectionInfo,
      alignment?: TextAlignmentInfo
    ) => {
      if (!currentSentence) return;

      setUserWaveform(waveform);
      setAppState("analyzing");
      setIsLoading(true);
      setError(null);

      try {
        const result = await analyzePronunciation({
          targetSentence: currentSentence.sentence,
          targetPhonetic: currentSentence.phonetic,
          userAudioBase64: audioBase64,
          audioFormat: "webm",
          voiceDetection,
          alignment,
        });

        setAnalysisResult(result);
        setAppState("result");
      } catch (err) {
        console.error("分析失败:", err);
        setError("分析失败，请重试。后端可能未启动。");
        setAppState("practicing");
      } finally {
        setIsLoading(false);
      }
    },
    [currentSentence]
  );

  const handleSelectSentence = (index: number) => {
    setCurrentSentenceIndex(index);
    setAppState("practicing");
    setAnalysisResult(null);
    setUserWaveform([]);
  };

  const handleRetry = () => {
    setAppState("practicing");
    setAnalysisResult(null);
    setUserWaveform([]);
  };

  const handleNextSentence = () => {
    const nextIndex = (currentSentenceIndex + 1) % sentences.length;
    setCurrentSentenceIndex(nextIndex);
    setAppState("practicing");
    setAnalysisResult(null);
    setUserWaveform([]);
  };

  const handleBackToSelect = () => {
    setAppState("selecting");
    setAnalysisResult(null);
    setUserWaveform([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  英语发音教练
                </h1>
                <p className="text-xs text-gray-500">Pronunciation Coach</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {backendHealthy ? (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>服务正常</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>后端未连接（将使用模拟数据）</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {appState === "selecting" && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
                <BookOpen className="w-4 h-4" />
                选择练习句子
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                开始你的发音练习
              </h2>
              <p className="text-gray-500">
                选择一个句子，听原声，然后跟读。AI 将为你提供专业的发音反馈。
              </p>
            </div>

            <div className="grid gap-4">
              {sentences.map((sentence, index) => {
                const difficultyColors = {
                  beginner: "from-green-100 to-emerald-50 border-green-200 hover:border-green-300",
                  intermediate:
                    "from-yellow-100 to-amber-50 border-yellow-200 hover:border-yellow-300",
                  advanced:
                    "from-red-100 to-rose-50 border-red-200 hover:border-red-300",
                };
                const difficultyLabels = {
                  beginner: "初级",
                  intermediate: "中级",
                  advanced: "高级",
                };
                const difficultyTextColors = {
                  beginner: "text-green-700 bg-green-100",
                  intermediate: "text-yellow-700 bg-yellow-100",
                  advanced: "text-red-700 bg-red-100",
                };

                return (
                  <button
                    key={sentence.id}
                    onClick={() => handleSelectSentence(index)}
                    className={clsx(
                      "w-full text-left p-5 rounded-xl border-2 transition-all bg-gradient-to-br shadow-sm hover:shadow-md",
                      difficultyColors[sentence.difficulty as keyof typeof difficultyColors] ||
                        "from-gray-100 to-slate-50 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-gray-800 mb-1">
                          {sentence.sentence}
                        </div>
                        <div className="text-sm text-gray-500 mb-2">
                          {sentence.phonetic}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {sentence.focusWords.map((word) => (
                            <span
                              key={word}
                              className="px-2 py-0.5 bg-white/60 rounded text-xs text-gray-600 font-mono"
                            >
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span
                        className={clsx(
                          "px-3 py-1 rounded-full text-xs font-medium flex-shrink-0",
                          difficultyTextColors[sentence.difficulty as keyof typeof difficultyTextColors]
                        )}
                      >
                        {difficultyLabels[sentence.difficulty as keyof typeof difficultyLabels]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(appState === "practicing" || appState === "analyzing") && currentSentence && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={handleBackToSelect}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                ← 返回选择
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  进度: {currentSentenceIndex + 1} / {sentences.length}
                </span>
              </div>
            </div>

            <PracticeMode
              sentence={currentSentence}
              onRecordingComplete={handleRecordingComplete}
              isLoading={appState === "analyzing" || isLoading}
            />
          </div>
        )}

        {appState === "result" && analysisResult && currentSentence && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={handleBackToSelect}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                ← 返回选择
              </button>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-500">
                  练习完成
                </span>
              </div>
            </div>

            <ResultDisplay
              result={analysisResult}
              sentence={currentSentence}
              userWaveform={userWaveform}
              onRetry={handleRetry}
              onNextSentence={handleNextSentence}
            />
          </div>
        )}
      </main>

      <footer className="mt-auto py-6 text-center text-sm text-gray-400">
        <p>AI 英语发音教练 • Powered by Volcengine</p>
      </footer>
    </div>
  );
}

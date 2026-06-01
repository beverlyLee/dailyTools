import {
  Trophy,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronRight,
  MicOff,
  Clock,
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react";
import type { PracticeSentence, PronunciationAnalysisResponse, DetectionStatus } from "@/lib/api";
import { clsx } from "clsx";

interface ResultDisplayProps {
  result: PronunciationAnalysisResponse;
  sentence: PracticeSentence;
  userWaveform: number[];
  onRetry: () => void;
  onNextSentence: () => void;
}

function getStatusInfo(status: DetectionStatus): {
  icon: typeof CheckCircle;
  color: string;
  bgColor: string;
  label: string;
} {
  switch (status) {
    case "complete":
      return {
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
        label: "完整朗读"
      };
    case "partial":
      return {
        icon: AlertTriangle,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        label: "部分朗读"
      };
    case "silent":
      return {
        icon: MicOff,
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        label: "未检测到语音"
      };
    case "too_short":
      return {
        icon: Clock,
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        label: "录音过短"
      };
    case "error":
      return {
        icon: AlertCircle,
        color: "text-red-600",
        bgColor: "bg-red-100",
        label: "分析错误"
      };
    default:
      return {
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
        label: "完整朗读"
      };
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 75) return "text-blue-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBgColor(score: number): string {
  if (score >= 90) return "bg-green-100";
  if (score >= 75) return "bg-blue-100";
  if (score >= 60) return "bg-yellow-100";
  return "bg-red-100";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "优秀";
  if (score >= 75) return "良好";
  if (score >= 60) return "及格";
  return "需要改进";
}

function getScoreEmoji(score: number): string {
  if (score >= 90) return "🌟";
  if (score >= 75) return "👍";
  if (score >= 60) return "💪";
  return "📚";
}

export function ResultDisplay({
  result,
  sentence,
  userWaveform,
  onRetry,
  onNextSentence,
}: ResultDisplayProps) {
  const statusInfo = getStatusInfo(result.detectionStatus);
  const StatusIcon = statusInfo.icon;
  const hasValidScore = result.detectionStatus === "complete" || result.detectionStatus === "partial";
  const showScore = hasValidScore && result.overallScore > 0;

  const hasErrors = result.wordFeedback.some((w) => !w.isCorrect);
  const incorrectWords = result.wordFeedback.filter((w) => !w.isCorrect);

  const renderSentenceWithHighlights = () => {
    const words = sentence.sentence.split(" ");

    return words.map((word, index) => {
      const feedback = result.wordFeedback.find(
        (w) => w.word.toLowerCase() === word.toLowerCase().replace(/[.,!?]/g, "")
      );

      const isRead = feedback !== undefined;
      const isError = feedback && !feedback.isCorrect;

      let wordClasses = "inline-block mr-1 mb-1 px-2 py-0.5 rounded-md transition-all ";

      if (!isRead && result.isPartialResult) {
        wordClasses += "bg-gray-100 text-gray-400 border border-gray-200";
      } else if (isError) {
        wordClasses += "bg-red-100 text-red-700 border-2 border-red-300";
      } else {
        wordClasses += "bg-green-100 text-green-700 border border-green-200";
      }

      return (
        <span
          key={index}
          className={wordClasses}
          title={feedback?.phonetic || ""}
        >
          {word}
          {isError && (
            <sup className="ml-1 text-red-500 font-bold">!</sup>
          )}
          {!isRead && result.isPartialResult && (
            <sup className="ml-1 text-gray-400">未读</sup>
          )}
        </span>
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          发音分析结果
        </h3>
        <span className={clsx(
          "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
          statusInfo.bgColor,
          statusInfo.color
        )}>
          <StatusIcon className="w-4 h-4" />
          {statusInfo.label}
        </span>
      </div>

      <div className={clsx(
        "rounded-xl p-4 mb-6 border",
        result.detectionStatus === "silent" || result.detectionStatus === "too_short"
          ? "bg-red-50 border-red-200"
          : result.detectionStatus === "partial"
            ? "bg-yellow-50 border-yellow-200"
            : "bg-blue-50 border-blue-200"
      )}>
        <div className="flex items-start gap-3">
          {result.detectionStatus === "silent" || result.detectionStatus === "too_short" ? (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          ) : result.detectionStatus === "partial" ? (
            <Info className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className={clsx(
              "font-medium",
              result.detectionStatus === "silent" || result.detectionStatus === "too_short"
                ? "text-red-700"
                : result.detectionStatus === "partial"
                  ? "text-yellow-700"
                  : "text-blue-700"
            )}>
              {result.detectionMessage}
            </p>
            {result.alignment && (
              <p className="text-sm mt-1 text-gray-600">
                语音时长: {(result.voiceDetection.voiceDurationMs / 1000).toFixed(1)}秒
                {result.alignment.isComplete !== undefined && (
                  <span className="ml-2">
                    识别匹配: {result.alignment.matchedWords.length}/{result.alignment.targetWords.length} 个单词
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {showScore && (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 mb-6 text-center">
          <div className="text-5xl mb-3">{getScoreEmoji(result.overallScore)}</div>
          <div className={clsx("text-6xl font-bold mb-2", getScoreColor(result.overallScore))}>
            {Math.round(result.overallScore)}
          </div>
          <div className="text-gray-500 text-sm">发音得分 / 100</div>
          <div className={clsx(
            "inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium",
            getScoreBgColor(result.overallScore),
            getScoreColor(result.overallScore)
          )}>
            {getScoreLabel(result.overallScore)}
          </div>
        </div>
      )}

      {(result.detectionStatus === "silent" || result.detectionStatus === "too_short") && (
        <div className="bg-red-50 rounded-xl p-6 mb-6 text-center border border-red-200">
          <div className="text-5xl mb-4">
            {result.detectionStatus === "silent" ? "🔇" : "⏱️"}
          </div>
          <div className="text-xl font-bold text-red-700 mb-2">
            {result.detectionStatus === "silent" ? "无有效语音" : "有效语音过短"}
          </div>
          <div className="text-sm text-red-600">
            {result.detectionStatus === "silent"
              ? "无有效语音，请重新录。请确保麦克风正常工作并大声朗读。"
              : "有效语音时长过短，请重新录。请在录音时间内完整朗读句子。"}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">请点击下方"重新练习"按钮重新录制</span>
          </div>
        </div>
      )}

      {hasValidScore && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            {hasErrors ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
            句子发音分析
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 text-lg">
            {renderSentenceWithHighlights()}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-100 border border-green-200" />
              发音正确
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-100 border-2 border-red-300" />
              需要改进
            </span>
            {result.isPartialResult && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
                未朗读
              </span>
            )}
          </div>
        </div>
      )}

      {hasValidScore && incorrectWords.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            需要改进的单词
          </h4>
          <div className="space-y-3">
            {incorrectWords.map((word, index) => (
              <div
                key={index}
                className="bg-red-50 border border-red-100 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-700 text-lg">
                      {word.word}
                    </span>
                    <span className="text-red-500 text-sm">
                      {word.phonetic}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className={clsx(
                      "text-sm font-bold",
                      getScoreColor(word.overallScore)
                    )}>
                      {Math.round(word.overallScore)}分
                    </span>
                  </div>
                </div>
                <div className="text-xs text-red-600 bg-red-100 rounded px-2 py-1">
                  提示：请注意该单词的元音发音
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            {result.detectionStatus === "silent" || result.detectionStatus === "too_short"
              ? "操作建议"
              : "改进建议"}
          </h4>
          <div className="space-y-2">
            {result.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={clsx(
                  "border-l-4 rounded-r-lg p-3",
                  result.detectionStatus === "silent" || result.detectionStatus === "too_short"
                    ? "bg-blue-50 border-blue-400"
                    : "bg-amber-50 border-amber-400"
                )}
              >
                <p className={clsx(
                  "text-sm",
                  result.detectionStatus === "silent" || result.detectionStatus === "too_short"
                    ? "text-blue-800"
                    : "text-amber-800"
                )}>
                  <span className="font-semibold mr-2">{index + 1}.</span>
                  {suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasValidScore && result.wordFeedback.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            各单词得分详情
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {result.wordFeedback.map((word, index) => (
              <div
                key={index}
                className={clsx(
                  "rounded-lg p-3 flex items-center justify-between",
                  word.isCorrect ? "bg-green-50" : "bg-red-50"
                )}
              >
                <div className="flex items-center gap-2">
                  {word.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={clsx(
                    "text-sm font-medium",
                    word.isCorrect ? "text-green-700" : "text-red-700"
                  )}>
                    {word.word}
                  </span>
                </div>
                <span className={clsx(
                  "text-sm font-bold",
                  getScoreColor(word.overallScore)
                )}>
                  {Math.round(word.overallScore)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all"
        >
          <RefreshCw className="w-5 h-5" />
          重新练习
        </button>
        <button
          onClick={onNextSentence}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-md hover:shadow-lg transition-all"
        >
          下一句
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default ResultDisplay;

export interface PracticeSentence {
  id: number;
  sentence: string;
  phonetic: string;
  difficulty: string;
  focusWords: string[];
}

export interface PhonemeFeedback {
  phoneme: string;
  expected: string;
  actual: string;
  isCorrect: boolean;
  confidence: number;
}

export interface SyllableFeedback {
  syllable: string;
  index: number;
  isCorrect: boolean;
  phonemes: PhonemeFeedback[];
}

export interface WordFeedback {
  word: string;
  isCorrect: boolean;
  phonetic: string;
  syllables: SyllableFeedback[];
  overallScore: number;
}

export type DetectionStatus = "complete" | "partial" | "silent" | "too_short" | "error";

export interface VoiceDetectionInfo {
  hasValidVoice: boolean;
  voiceDurationMs: number;
  avgEnergy: number;
  isSilent: boolean;
  isTooShort: boolean;
}

export interface TextAlignmentInfo {
  recognizedText: string;
  targetWords: string[];
  matchedWords: string[];
  unmatchedWords: string[];
  matchRatio: number;
  isComplete: boolean;
}

export interface PronunciationAnalysisRequest {
  targetSentence: string;
  targetPhonetic?: string;
  userAudioBase64: string;
  audioFormat: string;
  voiceDetection?: VoiceDetectionInfo;
  alignment?: TextAlignmentInfo;
}

export interface PronunciationAnalysisResponse {
  overallScore: number;
  wordFeedback: WordFeedback[];
  suggestions: string[];
  waveformComparison?: Record<string, unknown>;
  detectionStatus: DetectionStatus;
  detectionMessage: string;
  voiceDetection: VoiceDetectionInfo;
  alignment?: TextAlignmentInfo;
  isPartialResult: boolean;
  analyzedSentence: string;
}

const API_BASE = '/api';

export async function getPracticeSentences(): Promise<PracticeSentence[]> {
  const response = await fetch(`${API_BASE}/practice-sentences`);
  const data = await response.json();
  return data.sentences;
}

export async function analyzePronunciation(
  request: PronunciationAnalysisRequest
): Promise<PronunciationAnalysisResponse> {
  const response = await fetch(`${API_BASE}/analyze-pronunciation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`分析失败: ${response.statusText}`);
  }

  return response.json();
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

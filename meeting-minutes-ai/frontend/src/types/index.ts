export interface ActionItem {
  task: string;
  assignee?: string | null;
  deadline?: string | null;
  priority?: string;
}

export interface Meeting {
  id: number;
  title: string;
  transcription?: string | null;
  summary?: string | null;
  topic?: string | null;
  decisions?: string[];
  action_items?: ActionItem[];
  created_at: string;
  updated_at: string;
}

export interface MeetingCreate {
  title?: string;
}

export interface MeetingUpdate {
  title?: string;
  transcription?: string;
  summary?: string;
  topic?: string;
  decisions?: string[];
  action_items?: ActionItem[];
}

export interface SettingsConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export interface PracticeSentence {
  id: number;
  text: string;
  phonetics: string;
  difficulty: "easy" | "medium" | "hard";
  focus_words: string[];
  description: string;
}

export interface PhonemeAnalysis {
  word: string;
  expected?: string;
  spoken?: string;
  error_type?: "vowel" | "consonant" | "stress" | "other";
  is_correct: boolean;
  position?: number;
}

export interface PronunciationSuggestion {
  type: "vowel" | "consonant" | "stress" | "rhythm";
  title: string;
  description: string;
  example?: string;
  tip?: string;
}

export interface PronunciationAnalysisResult {
  overall_score: number;
  is_correct: boolean;
  confidence: number;
  phoneme_analysis: PhonemeAnalysis[];
  suggestions: PronunciationSuggestion[];
  summary: string;
  next_steps: string[];
}

export interface PronunciationResponse {
  success: boolean;
  message?: string;
  data?: PronunciationAnalysisResult;
}

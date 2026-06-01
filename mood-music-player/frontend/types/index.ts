export interface EmotionData {
  emotion: string;
  confidence: number;
  source: 'microphone' | 'camera' | 'text';
}

export interface ColorTheme {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
  type: 'warm' | 'cool';
}

export interface Track {
  title: string;
  artist: string;
  url: string;
}

export interface Playlist {
  playlist_id: string;
  playlist_name: string;
  description: string;
  icon: string;
  color_theme: ColorTheme;
  tracks: Track[];
  matched_emotion: string;
}

export interface EmotionDetectorState {
  isRecording: boolean;
  isInitialized: boolean;
  currentEmotion: string;
  confidence: number;
}

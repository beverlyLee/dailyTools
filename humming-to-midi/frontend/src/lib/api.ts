const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

export interface Note {
  midi: number;
  name: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface Chord {
  name: string;
  start: number;
  end: number;
  notes: number[];
  roman_numeral: string;
}

export interface TranscribeResponse {
  notes: Note[];
  melody: string;
  key: string;
}

export interface ChordResponse {
  chords: Chord[];
  progression: string[];
  key: string;
}

export async function transcribeMelody(audioData: Float32Array, sampleRate: number): Promise<TranscribeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/transcribe-melody`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_data: Array.from(audioData),
      sample_rate: sampleRate,
    }),
  });

  if (!response.ok) {
    throw new Error(`转写失败: ${response.statusText}`);
  }

  return response.json();
}

export async function generateChords(notes: Note[]): Promise<ChordResponse> {
  const response = await fetch(`${API_BASE_URL}/api/generate-chords`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    throw new Error(`生成和弦失败: ${response.statusText}`);
  }

  return response.json();
}

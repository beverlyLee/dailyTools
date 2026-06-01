import type {
  Meeting,
  MeetingCreate,
  MeetingUpdate,
  ActionItem,
  SettingsConfig,
  ModelOption,
  PracticeSentence,
  PronunciationResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export const meetingApi = {
  async create(data: MeetingCreate = {}): Promise<Meeting> {
    return request<Meeting>("/api/meetings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async list(): Promise<Meeting[]> {
    return request<Meeting[]>("/api/meetings");
  },

  async get(id: number): Promise<Meeting> {
    return request<Meeting>(`/api/meetings/${id}`);
  },

  async update(id: number, data: MeetingUpdate): Promise<Meeting> {
    return request<Meeting>(`/api/meetings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/meetings/${id}`, {
      method: "DELETE",
    });
  },

  async uploadAudio(id: number, file: File): Promise<{ filename: string; meeting_id: number }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/api/meetings/${id}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`);
    }

    return response.json();
  },

  async transcribeText(id: number, text: string): Promise<{ transcription: string; meeting_id: number }> {
    return request<{ transcription: string; meeting_id: number }>("/api/meetings/transcribe-text", {
      method: "POST",
      body: JSON.stringify({
        meeting_id: id,
        transcription_text: text,
      }),
    });
  },

  async generateSummary(id: number): Promise<{
    summary: string;
    topic: string;
    decisions: string[];
    action_items: ActionItem[];
  }> {
    return request<{
      summary: string;
      topic: string;
      decisions: string[];
      action_items: ActionItem[];
    }>("/api/meetings/summary", {
      method: "POST",
      body: JSON.stringify({ meeting_id: id }),
    });
  },

  async processMeeting(id: number, transcriptionText?: string): Promise<{
    summary: string;
    topic: string;
    decisions: string[];
    action_items: ActionItem[];
    meeting_id: number;
    status: string;
  }> {
    return request<{
      summary: string;
      topic: string;
      decisions: string[];
      action_items: ActionItem[];
      meeting_id: number;
      status: string;
    }>("/api/meetings/process", {
      method: "POST",
      body: JSON.stringify({
        meeting_id: id,
        transcription_text: transcriptionText || "",
      }),
    });
  },
};

export const settingsApi = {
  async testConnection(config: SettingsConfig): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>("/api/settings/test", {
      method: "POST",
      body: JSON.stringify({
        api_key: config.apiKey,
        base_url: config.baseUrl,
        model: config.model,
      }),
    });
  },

  async getModels(): Promise<{ models: ModelOption[]; default_base_url: string }> {
    return request<{ models: ModelOption[]; default_base_url: string }>("/api/settings/models");
  },
};

export const pronunciationApi = {
  async getPracticeSentences(): Promise<{ sentences: PracticeSentence[] }> {
    return request<{ sentences: PracticeSentence[] }>("/api/pronunciation/practice-sentences");
  },

  async analyzePronunciation(
    targetSentence: string,
    audioBase64: string
  ): Promise<PronunciationResponse> {
    return request<PronunciationResponse>("/api/pronunciation/analyze", {
      method: "POST",
      body: JSON.stringify({
        target_sentence: targetSentence,
        user_audio_base64: audioBase64,
      }),
    });
  },
};

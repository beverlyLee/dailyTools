import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8001',
  timeout: 30000,
});

export interface UploadResponse {
  success: boolean;
  audiobook_id: number;
  status: string;
  message: string;
  audio_info: {
    filename: string;
    duration: string;
    size: string;
  };
}

export interface AudiobookStatus {
  audiobook_id: number;
  status: string;
  error_message: string | null;
}

export interface Chapter {
  id: number;
  title: string;
  timestamp: number;
  formatted_time: string;
  content: string;
}

export interface KeyPoint {
  id: number;
  content: string;
  timestamp: number;
  formatted_time: string;
}

export interface MindMapNode {
  id: string;
  type?: string;
  data: { label: string };
  position: { x: number; y: number };
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
}

export interface MindMap {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface Notes {
  topic: string;
  summary: string;
  chapters: Chapter[];
  key_points: KeyPoint[];
  mind_map: MindMap | null;
}

export interface AudiobookDetail {
  audiobook: {
    id: number;
    original_filename: string;
    duration: string;
    status: string;
    created_at: string;
  };
  notes: Notes | null;
}

export const audiobookApi = {
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/audiobooks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getStatus: async (audiobookId: number): Promise<AudiobookStatus> => {
    const response = await api.get(`/api/audiobooks/${audiobookId}/status`);
    return response.data;
  },

  getDetail: async (audiobookId: number): Promise<AudiobookDetail> => {
    const response = await api.get(`/api/audiobooks/${audiobookId}`);
    return response.data;
  },
};

export default api;

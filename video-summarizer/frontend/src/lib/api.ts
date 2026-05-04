import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Video {
  id: number;
  original_filename: string;
  duration: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface VideoDetail extends Video {
  transcript: Transcript | null;
  keyframes: Keyframe[];
  summary: Summary | null;
}

export interface Transcript {
  full_text: string;
  language: string;
  segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  start_time: number;
  end_time: number;
  text: string;
  formatted_time: string;
}

export interface Keyframe {
  id: number;
  timestamp: number;
  formatted_time: string;
  frame_path: string;
  description: string | null;
}

export interface Summary {
  text: string;
  key_points: KeyPoint[];
}

export interface KeyPoint {
  text: string;
  score: number;
  position: number;
}

export interface UploadResponse {
  success: boolean;
  video_id: number;
  status: string;
  message: string;
  video_info: {
    filename: string;
    duration: string;
    size: string;
    resolution: string;
    fps: number;
  };
}

export interface VideoListResponse {
  total: number;
  videos: Video[];
}

export interface StatusResponse {
  video_id: number;
  status: string;
  error_message: string | null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export const videoApi = {
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<UploadResponse>('/api/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getStatus: async (videoId: number): Promise<StatusResponse> => {
    const response = await api.get<StatusResponse>(`/api/videos/${videoId}/status`);
    return response.data;
  },

  getDetail: async (videoId: number): Promise<VideoDetail> => {
    const response = await api.get<VideoDetail>(`/api/videos/${videoId}`);
    return response.data;
  },

  list: async (skip: number = 0, limit: number = 20): Promise<VideoListResponse> => {
    const response = await api.get<VideoListResponse>(`/api/videos/`, {
      params: { skip, limit },
    });
    return response.data;
  },
};

export default api;

import axios from 'axios';
import type { EmotionData, Playlist } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const matchPlaylist = async (emotionData: EmotionData): Promise<Playlist> => {
  try {
    const response = await apiClient.post<Playlist>('/api/match-playlist', emotionData);
    return response.data;
  } catch (error) {
    console.error('Failed to match playlist:', error);
    throw error;
  }
};

export const getAllPlaylists = async () => {
  try {
    const response = await apiClient.get('/api/playlists');
    return response.data;
  } catch (error) {
    console.error('Failed to get playlists:', error);
    throw error;
  }
};

export const getEmotionMapping = async () => {
  try {
    const response = await apiClient.get('/api/emotion-mapping');
    return response.data;
  } catch (error) {
    console.error('Failed to get emotion mapping:', error);
    throw error;
  }
};

export default apiClient;

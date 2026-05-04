import axios from 'axios';

const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// NPC API
export const getNPCs = async () => {
  try {
    const response = await api.get('/npcs');
    return response.data;
  } catch (error) {
    console.error('获取NPC列表失败:', error);
    throw error;
  }
};

export const createNPC = async (npcData) => {
  try {
    const response = await api.post('/npcs', npcData);
    return response.data;
  } catch (error) {
    console.error('创建NPC失败:', error);
    throw error;
  }
};

export const updateNPC = async (npcId, updateData) => {
  try {
    const response = await api.put(`/npcs/${npcId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('更新NPC失败:', error);
    throw error;
  }
};

export const deleteNPC = async (npcId) => {
  try {
    const response = await api.delete(`/npcs/${npcId}`);
    return response.data;
  } catch (error) {
    console.error('删除NPC失败:', error);
    throw error;
  }
};

// NPC对话历史
export const getNPCConversations = async (npcId) => {
  try {
    const response = await api.get(`/npcs/${npcId}/conversations`);
    return response.data;
  } catch (error) {
    console.error('获取NPC对话列表失败:', error);
    throw error;
  }
};

// NPC记忆
export const getNPCMemories = async (npcId) => {
  try {
    const response = await api.get(`/npcs/${npcId}/memories`);
    return response.data;
  } catch (error) {
    console.error('获取NPC记忆失败:', error);
    throw error;
  }
};

export const addNPCMemory = async (npcId, content, memoryType = 'long_term', importanceScore = 5) => {
  try {
    const response = await api.post(`/npcs/${npcId}/memories`, null, {
      params: {
        content,
        memory_type: memoryType,
        importance_score: importanceScore
      }
    });
    return response.data;
  } catch (error) {
    console.error('添加NPC记忆失败:', error);
    throw error;
  }
};

// 对话API
export const sendMessage = async (data) => {
  try {
    const response = await api.post('/chat', data);
    return response.data;
  } catch (error) {
    console.error('发送消息失败:', error);
    throw error;
  }
};

// 对话历史API
export const getConversationHistory = async (conversationId) => {
  try {
    const response = await api.get(`/history/${conversationId}`);
    return response.data;
  } catch (error) {
    console.error('获取对话历史失败:', error);
    throw error;
  }
};

export const clearConversation = async (conversationId) => {
  try {
    const response = await api.delete(`/history/${conversationId}`);
    return response.data;
  } catch (error) {
    console.error('清除对话历史失败:', error);
    throw error;
  }
};

// 健康检查
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('健康检查失败:', error);
    throw error;
  }
};

export default api;

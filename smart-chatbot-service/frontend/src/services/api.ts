import axios from 'axios';
import {
  Conversation,
  MessageRequest,
  MessageResponse,
  Ticket,
  TicketDetail,
  TicketStatistics,
  Agent,
  Document
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatApi = {
  sendMessage: async (request: MessageRequest): Promise<MessageResponse> => {
    const response = await api.post('/chat/message', request);
    return response.data;
  },

  getConversations: async (): Promise<{ conversations: Conversation[] }> => {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  getConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await api.get(`/chat/conversations/${conversationId}`);
    return response.data;
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    await api.delete(`/chat/conversations/${conversationId}`);
  },

  healthCheck: async (): Promise<any> => {
    const response = await api.get('/chat/health');
    return response.data;
  },
};

export const ticketApi = {
  createTicket: async (data: {
    title: string;
    description: string;
    user_identifier?: string;
    user_email?: string;
    priority?: string;
    conversation_id?: string;
  }): Promise<any> => {
    const response = await api.post('/tickets/', data);
    return response.data;
  },

  getTickets: async (params?: {
    status?: string;
    assigned_agent_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; tickets: Ticket[] }> => {
    const response = await api.get('/tickets/', { params });
    return response.data;
  },

  getTicket: async (ticketId: string): Promise<TicketDetail> => {
    const response = await api.get(`/tickets/${ticketId}`);
    return response.data;
  },

  updateTicket: async (
    ticketId: string,
    data: {
      status?: string;
      priority?: string;
      assigned_agent_id?: string;
      note?: string;
    }
  ): Promise<any> => {
    const response = await api.patch(`/tickets/${ticketId}`, data);
    return response.data;
  },

  getStatistics: async (): Promise<TicketStatistics> => {
    const response = await api.get('/tickets/statistics');
    return response.data;
  },

  createAgent: async (data: {
    name: string;
    email: string;
    department?: string;
  }): Promise<any> => {
    const response = await api.post('/tickets/agents/', data);
    return response.data;
  },

  getAgents: async (): Promise<{ total: number; agents: Agent[] }> => {
    const response = await api.get('/tickets/agents/');
    return response.data;
  },
};

export const documentApi = {
  uploadDocuments: async (files: File[]): Promise<any> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  addTextDocument: async (content: string, source: string = 'manual'): Promise<any> => {
    const response = await api.post('/documents/add-text', null, {
      params: { content, source },
    });
    return response.data;
  },

  getDocuments: async (): Promise<{ total: number; documents: Document[] }> => {
    const response = await api.get('/documents/list');
    return response.data;
  },

  deleteDocument: async (documentId: string): Promise<any> => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },

  clearAllDocuments: async (): Promise<any> => {
    const response = await api.post('/documents/clear');
    return response.data;
  },

  searchDocuments: async (query: string, k: number = 4): Promise<any> => {
    const response = await api.get('/documents/search', {
      params: { query, k },
    });
    return response.data;
  },
};

export const systemApi = {
  getInfo: async (): Promise<any> => {
    const response = await api.get('/info');
    return response.data;
  },

  healthCheck: async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;

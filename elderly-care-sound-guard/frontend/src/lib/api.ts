import { Alert, AlertResponse, Contact, AppSettings } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
  async health(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_URL}/api/health`);
    return response.json();
  },

  async testConnection(): Promise<{ status: string; message: string; api_configured: boolean }> {
    const response = await fetch(`${API_URL}/api/settings/test-connection`, {
      method: 'POST',
    });
    return response.json();
  },

  async detectAlert(data: {
    audio_data?: string;
    audio_url?: string;
    detected_sound?: string;
    confidence?: number;
    location?: string;
  }): Promise<AlertResponse | { status: string; message: string }> {
    const response = await fetch(`${API_URL}/api/detect-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async triggerTestAlert(): Promise<AlertResponse> {
    const response = await fetch(`${API_URL}/api/test-alert`, {
      method: 'POST',
    });
    return response.json();
  },

  async getAlerts(): Promise<{ alerts: Alert[] }> {
    const response = await fetch(`${API_URL}/api/alerts`);
    return response.json();
  },

  async resolveAlert(alertId: string): Promise<{ status: string; alert_id: string }> {
    const response = await fetch(`${API_URL}/api/alerts/${alertId}/resolve`, {
      method: 'POST',
    });
    return response.json();
  },

  async getContacts(): Promise<{ contacts: Contact[] }> {
    const response = await fetch(`${API_URL}/api/settings/contacts`);
    return response.json();
  },

  async updateContacts(data: AppSettings): Promise<{ status: string; contacts: Contact[] }> {
    const response = await fetch(`${API_URL}/api/settings/contacts`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

import { Session, MonitorStatus, SSEMessage, SessionDetail } from '../types';

const API_BASE = '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = MAX_RETRIES
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export async function getSessions(): Promise<Session[]> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/sessions`);
    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('Failed to get sessions:', error);
    return [];
  }
}

export async function getChatSessions(): Promise<Session[]> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/chat-sessions`);
    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('Failed to get chat sessions:', error);
    return [];
  }
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/sessions/${sessionId}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to get session detail:', error);
    return null;
  }
}

export async function getMonitorStatus(): Promise<MonitorStatus[]> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/monitor/status`);
    const data = await response.json();
    return data.monitors || [];
  } catch (error) {
    console.error('Failed to get monitor status:', error);
    return [];
  }
}

export async function startMonitor(
  sessionId: string
): Promise<{ success: boolean; status: MonitorStatus | null }> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/monitor/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    return response.json();
  } catch (error) {
    console.error('Failed to start monitor:', error);
    return { success: false, status: null };
  }
}

export async function stopMonitor(
  sessionId: string
): Promise<{ success: boolean; status: MonitorStatus | null }> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/monitor/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    return response.json();
  } catch (error) {
    console.error('Failed to stop monitor:', error);
    return { success: false, status: null };
  }
}

export async function removeMonitor(
  sessionId: string
): Promise<{ success: boolean }> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/monitor/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    return response.json();
  } catch (error) {
    console.error('Failed to remove monitor:', error);
    return { success: false };
  }
}

export async function markCompleted(
  sessionId: string
): Promise<{ success: boolean; status: MonitorStatus | null }> {
  try {
    const response = await fetchWithRetry(`${API_BASE}/monitor/mark-completed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    return response.json();
  } catch (error) {
    console.error('Failed to mark completed:', error);
    return { success: false, status: null };
  }
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface SSEConnectionOptions {
  onMessage: (msg: SSEMessage) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export function createSSEConnection(
  options: SSEConnectionOptions
): { close: () => void; reconnect: () => void } {
  const {
    onMessage,
    onStatusChange,
    maxReconnectAttempts = 10,
    reconnectDelay = 2000,
  } = options;

  let eventSource: EventSource | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: number | null = null;
  let isManualClose = false;

  const setStatus = (status: ConnectionStatus) => {
    onStatusChange?.(status);
  };

  const connect = () => {
    if (eventSource) {
      eventSource.close();
    }

    isManualClose = false;
    eventSource = new EventSource(`${API_BASE}/monitor/stream`);

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      reconnectAttempts = 0;
      setStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error('[SSE] Failed to parse message:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Error:', err);

      if (isManualClose) {
        return;
      }

      if (eventSource?.readyState === EventSource.CLOSED) {
        setStatus('disconnected');
      } else {
        setStatus('reconnecting');
      }

      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = reconnectDelay * Math.min(
          Math.pow(2, reconnectAttempts - 1),
          16
        );
        console.log(
          `[SSE] Reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts}, delay ${delay}ms)`
        );

        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        reconnectTimeout = window.setTimeout(() => {
          connect();
        }, delay);
      } else {
        console.error('[SSE] Max reconnect attempts reached');
        setStatus('disconnected');
      }
    };
  };

  const close = () => {
    isManualClose = true;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    setStatus('disconnected');
  };

  const reconnect = () => {
    reconnectAttempts = 0;
    connect();
  };

  connect();

  return { close, reconnect };
}

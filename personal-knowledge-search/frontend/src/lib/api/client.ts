const API_BASE = '/api/v1';

interface Document {
  id: string;
  title: string;
  content: string;
  url?: string;
  document_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  embedding_id?: number;
  screenshot_path?: string;
  metadata: Record<string, unknown>;
}

interface SearchResult {
  document: Document;
  score: number;
  highlight?: string;
}

interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResult[];
  search_time_ms: number;
}

interface Entity {
  name: string;
  type: string;
  count: number;
}

interface Relation {
  source: string;
  target: string;
  relation_type: string;
  count: number;
}

interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    title: string;
    group: string;
    value: number;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    label: string;
    value: number;
    arrows: string;
  }>;
}

interface Card {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  document_id?: string;
  status: 'new' | 'learning' | 'review' | 'graduated';
  created_at: string;
  updated_at: string;
  last_reviewed?: string;
  sm2_stats: {
    interval: number;
    repetitions: number;
    ease_factor: number;
    next_review?: string;
  };
}

interface ReviewResponse {
  card_id: string;
  next_review: string;
  new_interval: number;
  new_ease_factor: number;
  new_repetitions: number;
  status: string;
}

interface DailyStats {
  date: string;
  cards_reviewed: number;
  average_quality: number;
  cards_added: number;
}

interface Stats {
  documents: { count: number };
  vectors: { count: number; dimension: number };
  cards: Record<string, number>;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  async getStats(): Promise<Stats> {
    return request<Stats>('/stats');
  },

  async captureDocument(data: {
    title: string;
    content: string;
    url?: string;
    document_type?: string;
    tags?: string[];
    screenshot?: string;
    screenshot_filename?: string;
  }): Promise<Document> {
    return request<Document>('/documents/capture', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getDocuments(limit: number = 100): Promise<Document[]> {
    return request<Document[]>(`/documents?limit=${limit}`);
  },

  async getDocument(id: string): Promise<Document> {
    return request<Document>(`/documents/${id}`);
  },

  async deleteDocument(id: string): Promise<void> {
    return request<void>(`/documents/${id}`, { method: 'DELETE' });
  },

  async searchText(query: string, limit: number = 20, tags?: string[]): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (tags?.length) {
      tags.forEach((tag) => params.append('tags', tag));
    }
    return request<SearchResponse>(`/documents/search/text?${params}`);
  },

  async searchSemantic(query: string, limit: number = 20): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return request<SearchResponse>(`/documents/search/semantic?${params}`);
  },

  async getEntities(limit: number = 100): Promise<Entity[]> {
    return request<Entity[]>(`/graph/entities?limit=${limit}`);
  },

  async getRelations(limit: number = 100): Promise<Relation[]> {
    return request<Relation[]>(`/graph/relations?limit=${limit}`);
  },

  async getGraphData(): Promise<GraphData> {
    return request<GraphData>('/graph/visualize');
  },

  async searchRelated(entityName: string, limit: number = 20): Promise<GraphData> {
    return request<GraphData>(`/graph/search/${encodeURIComponent(entityName)}?limit=${limit}`);
  },

  async createCard(data: {
    question: string;
    answer: string;
    tags?: string[];
    document_id?: string;
  }): Promise<Card> {
    return request<Card>('/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCards(limit: number = 100, status?: string): Promise<Card[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (status) params.set('status', status);
    return request<Card[]>(`/cards?${params}`);
  },

  async getDueCards(limit: number = 50): Promise<Card[]> {
    return request<Card[]>(`/cards/due?limit=${limit}`);
  },

  async getCard(id: string): Promise<Card> {
    return request<Card>(`/cards/${id}`);
  },

  async deleteCard(id: string): Promise<void> {
    return request<void>(`/cards/${id}`, { method: 'DELETE' });
  },

  async reviewCard(id: string, quality: number): Promise<ReviewResponse> {
    return request<ReviewResponse>(`/cards/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ quality }),
    });
  },

  async getDailyStats(days: number = 30): Promise<DailyStats[]> {
    return request<DailyStats[]>(`/cards/stats/daily?days=${days}`);
  },

  async getCardStatusCounts(): Promise<Record<string, number>> {
    return request<Record<string, number>>('/cards/stats/status');
  },
};

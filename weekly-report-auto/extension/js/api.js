class APIClient {
  constructor() {
    this.baseURL = 'http://localhost:5000';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async checkHealth() {
    return this.request('/api/health', { method: 'GET' });
  }

  async generateReport(context) {
    return this.request('/api/generate-report', {
      method: 'POST',
      body: JSON.stringify(context)
    });
  }

  async getGitCommits(repoPath, since, author) {
    return this.request('/api/git-commits', {
      method: 'POST',
      body: JSON.stringify({ repoPath, since, author })
    });
  }

  async submitFeedback(reportId, originalReport, modifiedReport, feedback) {
    return this.request('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        reportId,
        originalReport,
        modifiedReport,
        feedback
      })
    });
  }

  async getEmbeddings(texts) {
    return this.request('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify({ texts })
    });
  }

  async searchSimilar(query, topK = 5) {
    return this.request('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query, topK })
    });
  }

  async addDocuments(documents) {
    return this.request('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ documents })
    });
  }

  async getConfig() {
    return chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
  }

  async saveConfig(config) {
    return chrome.runtime.sendMessage({
      type: 'SAVE_CONFIG',
      config
    });
  }
}

const apiClient = new APIClient();
window.apiClient = apiClient;

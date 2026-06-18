import type {
  VerifyRequest,
  VerifyResponse,
  LabelCheckRequest,
  LabelCheckResponse,
  BlacklistedCompany,
  ReportGenerateRequest,
  ReportLetter,
  SubscribeRequest,
  SubscribeResponse
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  verifySeed: (data: VerifyRequest): Promise<VerifyResponse> =>
    request<VerifyResponse>('/seed/verify', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  checkLabel: (data: LabelCheckRequest): Promise<LabelCheckResponse> =>
    request<LabelCheckResponse>('/label/check', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getBlacklist: (): Promise<BlacklistedCompany[]> =>
    request<BlacklistedCompany[]>('/blacklist'),

  searchBlacklist: (keyword: string): Promise<BlacklistedCompany[]> =>
    request<BlacklistedCompany[]>(`/blacklist/search?keyword=${encodeURIComponent(keyword)}`),

  subscribe: (data: SubscribeRequest): Promise<SubscribeResponse> =>
    request<SubscribeResponse>('/blacklist/subscribe', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  generateReport: (data: ReportGenerateRequest): Promise<ReportLetter> =>
    request<ReportLetter>('/report/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

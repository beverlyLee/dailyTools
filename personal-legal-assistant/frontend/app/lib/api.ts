import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

export interface Case {
  id: number;
  title: string;
  description: string;
  case_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CaseCreate {
  title: string;
  description: string;
  case_type?: string;
}

export interface CaseUpdate {
  title?: string;
  description?: string;
  case_type?: string;
  status?: string;
}

export interface Entity {
  text: string;
  type: string;
  start_pos?: number;
  end_pos?: number;
}

export interface Relation {
  relation_type: string;
  subject: string;
  object: string;
  sentence: string;
}

export interface LegalArticle {
  article_name: string;
  article_content: string;
  law_type: string;
  relevance_score?: number;
}

export interface AnalysisResult {
  entities: Entity[];
  relations: Relation[];
  legal_articles: LegalArticle[];
  case_type?: string;
}

export interface SimilarCaseResult {
  title: string;
  description: string;
  similarity_score: number;
  source?: string;
}

export interface RAGSearchResult {
  query: string;
  similar_cases: SimilarCaseResult[];
  legal_articles: LegalArticle[];
}

export interface Document {
  id: number;
  case_id: number;
  document_type: string;
  document_name: string;
  content: string;
  created_at: string;
}

export interface GeneratedDocument {
  document_type: string;
  document_name: string;
  content: string;
}

export interface Template {
  name: string;
  template_file: string;
  description: string;
  category: string;
}

export interface TemplateRequirements {
  required_fields: string[];
  optional_fields: string[];
  example?: Record<string, unknown>;
}

export const caseApi = {
  list: (params?: { skip?: number; limit?: number; case_type?: string; status?: string }) =>
    apiClient.get<Case[]>("/cases/", { params }),
  
  get: (id: number) =>
    apiClient.get<Case>(`/cases/${id}`),
  
  create: (data: CaseCreate) =>
    apiClient.post<Case>("/cases/", data),
  
  update: (id: number, data: CaseUpdate) =>
    apiClient.put<Case>(`/cases/${id}`, data),
  
  delete: (id: number) =>
    apiClient.delete(`/cases/${id}`),
  
  getDocuments: (id: number) =>
    apiClient.get<Document[]>(`/cases/${id}/documents`),
};

export const analysisApi = {
  analyze: (text: string, caseId?: number) =>
    apiClient.post<AnalysisResult>("/analysis/analyze", { text, case_id: caseId }),
  
  extractEntities: (text: string) =>
    apiClient.post("/analysis/entities", { text }),
  
  extractRelations: (text: string) =>
    apiClient.post("/analysis/relations", { text }),
  
  classifyCaseType: (text: string) =>
    apiClient.post<{ case_type: string }>("/analysis/classify", { text }),
  
  matchLegalArticles: (text: string) =>
    apiClient.post<{ case_type: string; legal_articles: LegalArticle[] }>("/analysis/legal-articles", { text }),
};

export const ragApi = {
  search: (query: string, topK: number = 5) =>
    apiClient.get<RAGSearchResult>("/rag/search", { params: { query, top_k: topK } }),
  
  getCases: () =>
    apiClient.get<{ count: number; cases: unknown[] }>("/rag/cases"),
  
  getCaseById: (id: number) =>
    apiClient.get(`/rag/cases/${id}`),
  
  addCase: (data: { title: string; description: string; case_type: string }) =>
    apiClient.post("/rag/cases", data),
  
  searchLegalArticles: (query: string) =>
    apiClient.get<{ count: number; legal_articles: LegalArticle[] }>("/rag/legal-articles", { params: { query } }),
};

export const documentApi = {
  listTemplates: () =>
    apiClient.get<{ templates: Template[] }>("/documents/templates"),
  
  getTemplateInfo: (templateName: string) =>
    apiClient.get<TemplateRequirements>(`/documents/templates/${templateName}`),
  
  generate: (data: { template_name: string; context: Record<string, unknown>; case_id?: number; document_name?: string }) =>
    apiClient.post<GeneratedDocument>("/documents/generate", data),
  
  generateWord: async (data: { template_name: string; context: Record<string, unknown>; case_id?: number; document_name?: string }) => {
    const response = await apiClient.post("/documents/generate/word", data, {
      responseType: "blob",
    });
    return response.data;
  },
  
  get: (id: number) =>
    apiClient.get<Document>(`/documents/${id}`),
  
  delete: (id: number) =>
    apiClient.delete(`/documents/${id}`),
};

export default apiClient;

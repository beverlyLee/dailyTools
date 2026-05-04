import axios from 'axios';
import type {
  VisaApplication,
  VisaQueryResult,
  Country,
  VisaType,
  ChecklistResult,
  OCRResult,
  OCRRecord,
} from '../types';

const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const visaApi = {
  getCountries: async (): Promise<Country[]> => {
    const response = await api.get('/visa/countries');
    return response.data.countries;
  },

  queryStatus: async (
    country: string,
    applicationNumber: string,
    useCache: boolean = true,
    additionalParams?: Record<string, any>
  ): Promise<VisaQueryResult> => {
    const response = await api.post('/visa/query', {
      country,
      application_number: applicationNumber,
      use_cache: useCache,
      additional_params: additionalParams,
    });
    return response.data;
  },

  getApplications: async (skip: number = 0, limit: number = 100): Promise<{
    total: number;
    applications: VisaApplication[];
  }> => {
    const response = await api.get('/visa/applications', {
      params: { skip, limit },
    });
    return response.data;
  },

  getApplication: async (id: number): Promise<VisaApplication> => {
    const response = await api.get(`/visa/applications/${id}`);
    return response.data;
  },

  createApplication: async (data: {
    application_number: string;
    country: string;
    visa_type: string;
    applicant_name?: string;
    applicant_nationality?: string;
    passport_number?: string;
    submit_date?: string;
  }): Promise<{ message: string; application: VisaApplication }> => {
    const response = await api.post('/visa/applications', data);
    return response.data;
  },

  updateApplication: async (
    id: number,
    updates: Partial<VisaApplication>
  ): Promise<{ message: string; application: VisaApplication }> => {
    const response = await api.put(`/visa/applications/${id}`, updates);
    return response.data;
  },

  deleteApplication: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/visa/applications/${id}`);
    return response.data;
  },

  refreshApplication: async (id: number): Promise<{
    message: string;
    result: VisaQueryResult;
  }> => {
    const response = await api.post(`/visa/applications/${id}/refresh`);
    return response.data;
  },
};

export const checklistApi = {
  getCountries: async (): Promise<Country[]> => {
    const response = await api.get('/checklist/countries');
    return response.data.countries;
  },

  getVisaTypes: async (countryCode: string): Promise<{
    country: string;
    visa_types: VisaType[];
  }> => {
    const response = await api.get(`/checklist/countries/${countryCode}/visa-types`);
    return response.data;
  },

  generateChecklist: async (
    country: string,
    visaType: string,
    nationality?: string,
    context?: Record<string, any>
  ): Promise<ChecklistResult> => {
    const response = await api.post('/checklist/generate', {
      country,
      visa_type: visaType,
      nationality,
      context,
    });
    return response.data;
  },

  getDocumentDetails: async (
    countryCode: string,
    visaType: string,
    documentId: string
  ): Promise<Record<string, any>> => {
    const response = await api.get(
      `/checklist/countries/${countryCode}/visa-types/${visaType}/documents/${documentId}`
    );
    return response.data;
  },
};

export const ocrApi = {
  recognizeDocument: async (
    file: File,
    documentType?: string,
    applicationId?: number
  ): Promise<OCRResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (documentType) formData.append('document_type', documentType);
    if (applicationId) formData.append('application_id', applicationId.toString());

    const response = await api.post('/ocr/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  extractFromText: async (
    text: string,
    documentType?: string
  ): Promise<{
    success: boolean;
    original_text: string;
    extracted_fields: Record<string, any>;
    document_type?: string;
  }> => {
    const formData = new FormData();
    formData.append('text', text);
    if (documentType) formData.append('document_type', documentType);

    const response = await api.post('/ocr/recognize/text', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getRecord: async (recordId: number): Promise<OCRRecord> => {
    const response = await api.get(`/ocr/records/${recordId}`);
    return response.data;
  },

  getRecordsByApplication: async (applicationId: number): Promise<{
    application_id: number;
    total_records: number;
    records: OCRRecord[];
  }> => {
    const response = await api.get(`/ocr/records/application/${applicationId}`);
    return response.data;
  },

  deleteRecord: async (recordId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/ocr/records/${recordId}`);
    return response.data;
  },
};

export default api;

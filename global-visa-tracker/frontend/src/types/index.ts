export enum VisaStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  READY_FOR_PICKUP = 'ready_for_pickup',
  IN_TRANSIT = 'in_transit',
  UNKNOWN = 'unknown',
}

export interface VisaApplication {
  id: number;
  application_number: string;
  country: string;
  visa_type: string;
  applicant_name?: string;
  applicant_nationality?: string;
  passport_number?: string;
  status: VisaStatus;
  status_details?: string;
  submit_date?: string;
  estimated_completion_date?: string;
  last_checked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VisaQueryResult {
  status: VisaStatus;
  status_details?: string;
  application_number: string;
  country: string;
  last_checked: string;
  from_cache?: boolean;
  cache_expires_at?: string;
  raw_response?: string;
}

export interface Country {
  code: string;
  name: string;
}

export interface VisaType {
  code: string;
  name: string;
  processing_time: string;
  validity: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  sample_url?: string;
  ocr_fields: string[];
  category?: 'mandatory' | 'recommended' | 'conditional';
}

export interface ChecklistResult {
  country: string;
  country_code: string;
  visa_type: string;
  visa_type_code: string;
  processing_time: string;
  validity: string;
  application_steps: string[];
  documents: {
    mandatory: DocumentItem[];
    recommended: DocumentItem[];
    conditional: DocumentItem[];
  };
  general_notes: Record<string, any>;
  generated_at: string;
  version: string;
}

export interface OCRResult {
  success: boolean;
  text: string;
  text_lines: string[];
  bounding_boxes: number[][];
  confidences: number[];
  language: string;
  processed_at: string;
  extracted_fields?: Record<string, any>;
  record_id?: number;
}

export interface OCRRecord {
  id: number;
  application_id?: number;
  file_name: string;
  file_path: string;
  ocr_text: string;
  extracted_fields?: Record<string, any>;
  created_at: string;
}

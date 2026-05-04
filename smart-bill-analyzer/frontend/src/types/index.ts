export interface Bill {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  source: 'wechat' | 'alipay' | 'ocr';
  created_at: string;
}

export interface BillStats {
  total_expense: number;
  total_income: number;
  total_count: number;
  expense_by_category: Record<string, number>;
  expense_by_month: Record<string, number>;
}

export interface UploadResult {
  success: boolean;
  message: string;
  bills?: Bill[];
  count?: number;
}

export interface OCRResult {
  success: boolean;
  text?: string;
  bills?: Bill[];
  message?: string;
}

export interface UploadFile {
  file: File;
  name: string;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
}

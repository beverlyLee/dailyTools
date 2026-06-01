export interface Category {
  level1: string;
  level2: string;
  level3?: string;
}

export interface Transaction {
  id: string;
  date: Date;
  type: 'income' | 'expense';
  amount: number;
  counterparty: string;
  description: string;
  paymentMethod: string;
  category: Category;
  source: 'wechat' | 'alipay';
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
  startDate: Date;
  endDate: Date;
}

export interface CategoryStats {
  name: string;
  amount: number;
  count: number;
  percentage: number;
  children?: CategoryStats[];
}

export interface ParseResult {
  transactions: Transaction[];
  source: 'wechat' | 'alipay';
  success: boolean;
  error?: string;
}

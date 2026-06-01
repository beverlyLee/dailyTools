import { Category, Transaction } from '@/types/transaction';
import { keywordRules, brandRules, incomeKeywords } from './keywords';

export function categorizeTransaction(counterparty: string, description: string): Category {
  const text = `${counterparty} ${description}`.toLowerCase();
  
  const isIncome = incomeKeywords.some(keyword => 
    text.includes(keyword.toLowerCase())
  );
  
  if (isIncome) {
    return {
      level1: '收入',
      level2: '其他收入'
    };
  }
  
  for (const brandRule of brandRules) {
    const matched = brandRule.keywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    if (matched) {
      return {
        level1: brandRule.level1,
        level2: brandRule.level2,
        level3: brandRule.brand
      };
    }
  }
  
  for (const rule of keywordRules) {
    const matched = rule.keywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    if (matched) {
      return {
        level1: rule.level1,
        level2: rule.level2
      };
    }
  }
  
  return {
    level1: '其他支出',
    level2: '未分类'
  };
}

export function detectTransactionType(counterparty: string, description: string): 'income' | 'expense' {
  const text = `${counterparty} ${description}`.toLowerCase();
  const isIncome = incomeKeywords.some(keyword => 
    text.includes(keyword.toLowerCase())
  );
  return isIncome ? 'income' : 'expense';
}

export function calculateCategorizationAccuracy(transactions: Transaction[]): number {
  const categorized = transactions.filter(t => 
    t.category.level1 !== '其他支出' && t.category.level2 !== '未分类'
  );
  return transactions.length > 0 ? categorized.length / transactions.length : 0;
}

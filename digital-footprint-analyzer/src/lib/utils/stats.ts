import { Transaction, TransactionSummary, CategoryStats } from '@/types/transaction';

export function calculateSummary(transactions: Transaction[]): TransactionSummary {
  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');
  
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  
  const dates = transactions.map(t => t.date.getTime());
  
  return {
    totalIncome,
    totalExpense,
    transactionCount: transactions.length,
    startDate: dates.length > 0 ? new Date(Math.min(...dates)) : new Date(),
    endDate: dates.length > 0 ? new Date(Math.max(...dates)) : new Date()
  };
}

export function calculateCategoryStats(transactions: Transaction[]): CategoryStats[] {
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalAmount = expenses.reduce((sum, t) => sum + t.amount, 0);
  
  const level1Map = new Map<string, Map<string, { amount: number; count: number }>>();
  
  for (const t of expenses) {
    const level1 = t.category.level1;
    const level2 = t.category.level2;
    
    if (!level1Map.has(level1)) {
      level1Map.set(level1, new Map());
    }
    
    const level2Map = level1Map.get(level1)!;
    if (!level2Map.has(level2)) {
      level2Map.set(level2, { amount: 0, count: 0 });
    }
    
    const stats = level2Map.get(level2)!;
    stats.amount += t.amount;
    stats.count += 1;
  }
  
  const result: CategoryStats[] = [];
  
  for (const [level1, level2Map] of level1Map.entries()) {
    let level1Amount = 0;
    let level1Count = 0;
    const children: CategoryStats[] = [];
    
    for (const [level2, stats] of level2Map.entries()) {
      level1Amount += stats.amount;
      level1Count += stats.count;
      
      children.push({
        name: level2,
        amount: stats.amount,
        count: stats.count,
        percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0
      });
    }
    
    children.sort((a, b) => b.amount - a.amount);
    
    result.push({
      name: level1,
      amount: level1Amount,
      count: level1Count,
      percentage: totalAmount > 0 ? (level1Amount / totalAmount) * 100 : 0,
      children
    });
  }
  
  return result.sort((a, b) => b.amount - a.amount);
}

export function calculateSunburstData(transactions: Transaction[]) {
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const categoryTree: Record<string, Record<string, Record<string, number>>> = {};
  
  for (const t of expenses) {
    const level1 = t.category.level1;
    const level2 = t.category.level2;
    const level3 = t.category.level3 || '其他';
    
    if (!categoryTree[level1]) {
      categoryTree[level1] = {};
    }
    
    if (!categoryTree[level1][level2]) {
      categoryTree[level1][level2] = {};
    }
    
    if (!categoryTree[level1][level2][level3]) {
      categoryTree[level1][level2][level3] = 0;
    }
    
    categoryTree[level1][level2][level3] += t.amount;
  }
  
  function buildTree(): any[] {
    const result: any[] = [];
    
    for (const [level1, level2Data] of Object.entries(categoryTree)) {
      const level1Children: any[] = [];
      
      for (const [level2, level3Data] of Object.entries(level2Data)) {
        const level2Children: any[] = [];
        
        for (const [level3, amount] of Object.entries(level3Data)) {
          if (Object.keys(level3Data).length > 1 || level3 !== '其他') {
            level2Children.push({
              name: level3,
              value: amount
            });
          }
        }
        
        if (level2Children.length > 0) {
          level1Children.push({
            name: level2,
            children: level2Children
          });
        } else {
          const totalAmount = Object.values(level3Data).reduce((a, b) => a + b, 0);
          level1Children.push({
            name: level2,
            value: totalAmount
          });
        }
      }
      
      result.push({
        name: level1,
        children: level1Children
      });
    }
    
    return result;
  }
  
  return buildTree();
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

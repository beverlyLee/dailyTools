import Papa from 'papaparse';
import { Transaction, ParseResult } from '@/types/transaction';
import { categorizeTransaction } from '../categorizer';

export function detectWechatFormat(content: string): boolean {
  return content.includes('微信支付账单') || 
         content.includes('微信支付') || 
         content.includes('交易时间') && content.includes('交易类型');
}

export function parseWechatCSV(content: string): ParseResult {
  try {
    const lines = content.split('\n');
    let dataStartIndex = 0;
    
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      if (lines[i].includes('交易时间') || lines[i].includes('交易类型')) {
        dataStartIndex = i;
        break;
      }
    }
    
    const dataContent = lines.slice(dataStartIndex).join('\n');
    
    const result = Papa.parse(dataContent, {
      header: true,
      skipEmptyLines: true
    });
    
    const transactions: Transaction[] = [];
    let idCounter = 0;
    
    for (const row of result.data) {
      const r = row as Record<string, string>;
      
      const dateStr = r['交易时间'] || r['Date'] || r['Time'];
      const typeStr = r['交易类型'] || r['Type'];
      const counterparty = r['交易对方'] || r['Counterparty'] || r['收款方'] || '';
      const description = r['商品'] || r['商品说明'] || r['Description'] || r['备注'] || '';
      const amountStr = r['金额(元)'] || r['金额'] || r['Amount'] || '0';
      const paymentMethod = r['支付方式'] || r['Payment Method'] || '';
      
      if (!dateStr || !amountStr) continue;
      
      const amount = parseFloat(amountStr.replace(/¥/g, '').replace(/,/g, ''));
      const date = new Date(dateStr);
      
      const isIncome = typeStr?.includes('收入') || typeStr?.includes('收款') || 
                       typeStr?.includes('转账收入') || amount < 0;
      
      const category = categorizeTransaction(counterparty, description);
      
      transactions.push({
        id: `wechat-${++idCounter}`,
        date: isNaN(date.getTime()) ? new Date() : date,
        type: isIncome ? 'income' : 'expense',
        amount: Math.abs(amount),
        counterparty: counterparty || '未知',
        description: description || '无描述',
        paymentMethod: paymentMethod || '微信支付',
        category,
        source: 'wechat'
      });
    }
    
    return {
      transactions,
      source: 'wechat',
      success: true
    };
  } catch (error) {
    return {
      transactions: [],
      source: 'wechat',
      success: false,
      error: error instanceof Error ? error.message : '解析失败'
    };
  }
}

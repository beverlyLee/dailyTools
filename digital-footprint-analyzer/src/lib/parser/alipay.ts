import Papa from 'papaparse';
import { Transaction, ParseResult } from '@/types/transaction';
import { categorizeTransaction } from '../categorizer';

export function detectAlipayFormat(content: string): boolean {
  return content.includes('支付宝') || 
         content.includes('Alipay') ||
         content.includes('交易时间') && content.includes('交易对方');
}

export function parseAlipayCSV(content: string): ParseResult {
  try {
    const lines = content.split('\n');
    let dataStartIndex = 0;
    
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      if (lines[i].includes('交易时间') && lines[i].includes('交易对方')) {
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
      
      const dateStr = r['交易时间'] || r['Time'] || r['Date'];
      const counterparty = r['交易对方'] || r['Counterparty'] || r['对方'] || '';
      const description = r['商品说明'] || r['商品名称'] || r['Description'] || r['备注'] || '';
      const amountStr = r['金额'] || r['Amount'] || '0';
      const typeStr = r['收/支'] || r['Type'] || r['收支类型'] || '';
      const paymentMethod = r['支付方式'] || r['Payment Method'] || r['来源'] || '';
      const status = r['交易状态'] || r['Status'] || '';
      
      if (!dateStr || !amountStr) continue;
      
      if (status && (status.includes('关闭') || status.includes('失败') || status.includes('退款'))) {
        continue;
      }
      
      const amount = parseFloat(amountStr.replace(/¥/g, '').replace(/,/g, ''));
      const date = new Date(dateStr);
      
      const isIncome = typeStr?.includes('收入') || typeStr?.includes('收款');
      
      const category = categorizeTransaction(counterparty, description);
      
      transactions.push({
        id: `alipay-${++idCounter}`,
        date: isNaN(date.getTime()) ? new Date() : date,
        type: isIncome ? 'income' : 'expense',
        amount: Math.abs(amount),
        counterparty: counterparty || '未知',
        description: description || '无描述',
        paymentMethod: paymentMethod || '支付宝',
        category,
        source: 'alipay'
      });
    }
    
    return {
      transactions,
      source: 'alipay',
      success: true
    };
  } catch (error) {
    return {
      transactions: [],
      source: 'alipay',
      success: false,
      error: error instanceof Error ? error.message : '解析失败'
    };
  }
}

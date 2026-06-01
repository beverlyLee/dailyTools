import { ParseResult } from '@/types/transaction';
import { detectWechatFormat, parseWechatCSV } from './wechat';
import { detectAlipayFormat, parseAlipayCSV } from './alipay';

export async function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      if (detectWechatFormat(content)) {
        const result = parseWechatCSV(content);
        resolve(result);
      } else if (detectAlipayFormat(content)) {
        const result = parseAlipayCSV(content);
        resolve(result);
      } else {
        const wechatResult = parseWechatCSV(content);
        if (wechatResult.transactions.length > 0) {
          resolve(wechatResult);
          return;
        }
        
        const alipayResult = parseAlipayCSV(content);
        if (alipayResult.transactions.length > 0) {
          resolve(alipayResult);
          return;
        }
        
        resolve({
          transactions: [],
          source: 'wechat',
          success: false,
          error: '无法识别账单格式，请确保上传的是微信或支付宝账单CSV文件'
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        transactions: [],
        source: 'wechat',
        success: false,
        error: '文件读取失败'
      });
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}

export * from './wechat';
export * from './alipay';

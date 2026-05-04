import Tesseract from 'tesseract.js';
import type { OCRResult } from '../types';

export class OCRService {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      this.worker = await Tesseract.createWorker('chi_sim+eng', 1, {
        logger: (m) => console.log(m),
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Tesseract:', error);
      throw error;
    }
  }

  async recognizeImage(imageFile: File): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      return {
        success: false,
        message: 'OCR 引擎初始化失败',
      };
    }

    try {
      const { data: { text } } = await this.worker.recognize(imageFile);
      
      const parsedBills = this.parseOCRText(text);
      
      return {
        success: true,
        text,
        bills: parsedBills,
      };
    } catch (error) {
      console.error('OCR recognition failed:', error);
      return {
        success: false,
        message: 'OCR 识别失败，请重试',
      };
    }
  }

  private parseOCRText(text: string): any[] {
    const bills: any[] = [];
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    let currentBill: any = {};
    let amountPattern = /([￥¥$]?\s*[\d,]+\.?\d{0,2})/;
    let datePattern = /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      const dateMatch = trimmedLine.match(datePattern);
      if (dateMatch) {
        if (Object.keys(currentBill).length > 0) {
          bills.push({ ...currentBill });
        }
        currentBill = {
          date: this.normalizeDate(dateMatch[1]),
          description: '',
          amount: 0,
          type: 'expense' as const,
        };
      }
      
      const amountMatch = trimmedLine.match(amountPattern);
      if (amountMatch && currentBill.date) {
        const amountStr = amountMatch[1].replace(/[￥¥$,\s]/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
          currentBill.amount = amount;
          currentBill.description = trimmedLine.replace(amountPattern, '').trim() || '未知消费';
        }
      }
    }
    
    if (Object.keys(currentBill).length > 0 && currentBill.amount > 0) {
      bills.push(currentBill);
    }
    
    if (bills.length === 0 && text.length > 0) {
      let totalAmount = 0;
      const amountMatches = text.match(/[￥¥$]?\s*[\d,]+\.?\d{0,2}/g);
      if (amountMatches) {
        for (const match of amountMatches) {
          const amountStr = match.replace(/[￥¥$,\s]/g, '');
          const amount = parseFloat(amountStr);
          if (!isNaN(amount) && amount > totalAmount) {
            totalAmount = amount;
          }
        }
      }
      
      if (totalAmount > 0) {
        bills.push({
          date: new Date().toISOString().split('T')[0],
          description: text.substring(0, 100),
          amount: totalAmount,
          type: 'expense' as const,
        });
      }
    }
    
    return bills;
  }

  private normalizeDate(dateStr: string): string {
    const normalized = dateStr
      .replace(/年/g, '-')
      .replace(/月/g, '-')
      .replace(/日/g, '')
      .replace(/\//g, '-');
    
    const parts = normalized.split('-');
    if (parts.length === 3) {
      const year = parts[0].padStart(4, '20');
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return normalized;
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

export const ocrService = new OCRService();

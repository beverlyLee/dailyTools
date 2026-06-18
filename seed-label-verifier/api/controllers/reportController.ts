import type { Request, Response } from 'express';
import { generateReportLetter } from '../services/reportService';
import type { ReportGenerateRequest } from '../../shared/types';

export async function generateReportController(req: Request, res: Response): Promise<void> {
  try {
    const request = req.body as ReportGenerateRequest;

    if (!request.qrContent || !request.verifyResult) {
      res.status(400).json({
        title: '',
        content: '请提供完整的二维码内容和核验结果',
        timestamp: new Date().toISOString(),
        evidence: []
      });
      return;
    }

    const result = generateReportLetter(request);
    res.json(result);
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      title: '',
      content: '服务器内部错误',
      timestamp: new Date().toISOString(),
      evidence: []
    });
  }
}

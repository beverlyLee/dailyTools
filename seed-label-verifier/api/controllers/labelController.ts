import type { Request, Response } from 'express';
import { checkLabelCompliance } from '../services/labelService';
import type { LabelCheckRequest } from '../../shared/types';

export async function checkLabelController(req: Request, res: Response): Promise<void> {
  try {
    const { qrContent, seedInfo } = req.body as LabelCheckRequest;

    if (!qrContent && !seedInfo) {
      res.status(400).json({
        compliant: false,
        checks: [],
        missingFields: [],
        suggestions: ['请提供二维码内容或种子信息进行审查']
      });
      return;
    }

    const result = checkLabelCompliance(qrContent, seedInfo);
    res.json(result);
  } catch (error) {
    console.error('Check label error:', error);
    res.status(500).json({
      compliant: false,
      checks: [],
      missingFields: [],
      suggestions: ['服务器内部错误']
    });
  }
}

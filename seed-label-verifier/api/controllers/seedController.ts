import type { Request, Response } from 'express';
import { verifySeed } from '../services/seedService';
import type { VerifyRequest } from '../../shared/types';

export async function verifySeedController(req: Request, res: Response): Promise<void> {
  try {
    const { qrContent } = req.body as VerifyRequest;

    if (!qrContent) {
      res.status(400).json({
        success: false,
        message: '请提供二维码内容',
        isRegistered: false
      });
      return;
    }

    const result = verifySeed(qrContent);
    res.json(result);
  } catch (error) {
    console.error('Verify seed error:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      isRegistered: false
    });
  }
}

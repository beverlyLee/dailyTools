import type { Request, Response } from 'express';
import { getBlacklist, searchBlacklist, subscribe } from '../services/blacklistService';
import type { SubscribeRequest } from '../../shared/types';

export async function getBlacklistController(_req: Request, res: Response): Promise<void> {
  try {
    const result = getBlacklist();
    res.json(result);
  } catch (error) {
    console.error('Get blacklist error:', error);
    res.status(500).json([]);
  }
}

export async function searchBlacklistController(req: Request, res: Response): Promise<void> {
  try {
    const keyword = req.query.keyword as string;
    const result = searchBlacklist(keyword || '');
    res.json(result);
  } catch (error) {
    console.error('Search blacklist error:', error);
    res.status(500).json([]);
  }
}

export async function subscribeController(req: Request, res: Response): Promise<void> {
  try {
    const { email, phone, manufacturerIds } = req.body as SubscribeRequest;
    const result = subscribe(email, phone, manufacturerIds);
    res.json(result);
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

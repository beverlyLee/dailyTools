import { Router, type Request, type Response } from 'express';
import type { ApiResponse, UserConfig } from '../../shared/types.js';
import { configDB } from '../db.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = configDB.get();
    const response: ApiResponse<UserConfig> = {
      success: true,
      data: config,
      message: '获取用户配置成功',
    };
    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[config] GET / error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '获取用户配置失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

router.put('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<UserConfig>;
    const config = configDB.update(body);
    const response: ApiResponse<UserConfig> = {
      success: true,
      data: config,
      message: '更新用户配置成功',
    };
    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[config] PUT / error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '更新用户配置失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

export default router;

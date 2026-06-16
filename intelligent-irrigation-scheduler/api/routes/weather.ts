import { Router, type Request, type Response } from 'express';
import type { ApiResponse, WeatherResponse } from '../../shared/types.js';
import { getWeather } from '../services/weatherService.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const city = (req.query.city as string) || '北京';
    const forceRain = req.query.forceRain === 'true';
    const data: WeatherResponse = await getWeather(city, forceRain);
    const response: ApiResponse<WeatherResponse> = {
      success: true,
      data,
      message: '获取天气数据成功',
    };
    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[weather] GET / error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '获取天气数据失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

export default router;

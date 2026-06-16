import { Router, type Request, type Response } from 'express';
import type { ApiResponse, SoilSimulationRequest, SoilSimulationResponse } from '../../shared/types.js';
import { simulateMoisture } from '../services/soilService.js';

const router = Router();

router.post('/simulate', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<SoilSimulationRequest>;
    if (!body.crop || !body.soil || !body.startDate || !body.city) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '请求参数不完整',
        error: '缺少必填字段: crop, soil, startDate, city',
      };
      res.status(400).json(response);
      return;
    }
    const data: SoilSimulationResponse = simulateMoisture(body as SoilSimulationRequest);
    const response: ApiResponse<SoilSimulationResponse> = {
      success: true,
      data,
      message: '土壤墒情模拟完成',
    };
    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[soil] POST /simulate error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '土壤墒情模拟失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

export default router;

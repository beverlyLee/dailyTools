import { Router, type Request, type Response } from 'express';
import type {
  ApiResponse,
  CostCalculateRequest,
  CostDetail,
  CostCompareRequest,
  CostCompareResponse,
} from '../../shared/types.js';
import { calculateCost, compareCosts } from '../services/costService.js';

const router = Router();

router.post('/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<CostCalculateRequest>;
    if (!body.config || body.waterAmount === undefined || body.durationMinutes === undefined || body.area === undefined) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '请求参数不完整',
        error: '缺少必填字段: config, waterAmount, durationMinutes, area',
      };
      res.status(400).json(response);
      return;
    }
    const data: CostDetail = calculateCost(body as CostCalculateRequest);
    const response: ApiResponse<CostDetail> = {
      success: true,
      data,
      message: '成本核算完成',
    };
    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[cost] POST /calculate error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '成本核算失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

router.post('/compare', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<CostCompareRequest>;
    if (
      !body.config ||
      body.months === undefined ||
      body.area === undefined ||
      !body.irrigationFrequency ||
      !body.avgWaterPerIrrigation
    ) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '请求参数不完整',
        error: '缺少必填字段',
      };
      res.status(400).json(response);
      return;
    }
    const data: CostCompareResponse = compareCosts(body as CostCompareRequest);
    const response: ApiResponse<CostCompareResponse> = {
      success: true,
      data,
      message: '成本对比分析完成',
    };
    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[cost] POST /compare error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '成本对比分析失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

export default router;

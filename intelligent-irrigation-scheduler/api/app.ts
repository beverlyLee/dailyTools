/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import weatherRoutes from './routes/weather.js';
import soilRoutes from './routes/soil.js';
import prescriptionRoutes from './routes/prescription.js';
import costRoutes from './routes/cost.js';
import calendarRoutes from './routes/calendar.js';
import configRoutes from './routes/config.js';

import type { CalendarTask, TaskStatus, ApiResponse } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const taskStatusColors: Record<TaskStatus, { backgroundColor: string; borderColor: string }> = {
  pending: { backgroundColor: '#4A90B8', borderColor: '#3A7BA0' },
  in_progress: { backgroundColor: '#E8A838', borderColor: '#C98E2A' },
  completed: { backgroundColor: '#2D5A3D', borderColor: '#234831' },
  cancelled: { backgroundColor: '#888888', borderColor: '#666666' },
};

function decorateTaskColors(task: CalendarTask): CalendarTask {
  const colors = taskStatusColors[task.status] ?? taskStatusColors.pending;
  return {
    ...task,
    backgroundColor: colors.backgroundColor,
    borderColor: colors.borderColor,
  };
}

function decorateResponseColors(body: any): any {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body.data)) {
    body.data = body.data.map((item: any) => {
      if (item && typeof item === 'object' && 'status' in item && 'extendedProps' in item) {
        return decorateTaskColors(item as CalendarTask);
      }
      return item;
    });
  } else if (body.data && typeof body.data === 'object') {
    if ('status' in body.data && 'extendedProps' in body.data) {
      body.data = decorateTaskColors(body.data as CalendarTask);
    }
  }
  return body;
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  (res as any).json = (body: any) => {
    const url = req.originalUrl || req.url || '';
    const isCalendarRoute = url.includes('/calendar');
    if (isCalendarRoute && body && body.success) {
      body = decorateResponseColors(body);
    }
    return originalJson(body);
  };
  next();
});

app.use('/api/weather', weatherRoutes);
app.use('/api/soil', soilRoutes);
app.use('/api/prescription', prescriptionRoutes);
app.use('/api/cost', costRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/config', configRoutes);

app.get(
  '/api/presets',
  (req: Request, res: Response, next: NextFunction): void => {
    import('./data/cropPresets.js')
      .then(({ cropPresetsMap, soilTextureDefaults }) => {
        const presets = Object.values(cropPresetsMap).map((preset) => ({
          cropType: preset.cropType,
          cropName: preset.cropName,
          stages: preset.stages,
        }));
        const response: ApiResponse<any> = {
          success: true,
          data: { cropPresets: presets, soilDefaults: soilTextureDefaults },
          message: '获取预设参数成功',
        };
        res.status(200).json(response);
      })
      .catch(next);
  },
);

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    });
  },
);

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[app] Unhandled error:', error.message, error.stack);
  res.status(500).json({
    success: false,
    error: 'Server internal error',
    message: error.message,
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  });
});

export default app;

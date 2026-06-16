import { Router, type Request, type Response } from 'express';
import type {
  ApiResponse,
  CalendarTask,
  TaskCreateRequest,
  TaskUpdateRequest,
  TaskStatus,
} from '../../shared/types.js';
import { taskDB } from '../db.js';

const router = Router();

router.get('/tasks', async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = taskDB.getAll();
    const response: ApiResponse<CalendarTask[]> = {
      success: true,
      data: tasks,
      message: '获取任务列表成功',
    };
    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[calendar] GET /tasks error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '获取任务列表失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

router.post('/tasks', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<TaskCreateRequest>;
    if (!body.title || !body.start || !body.end || !body.extendedProps) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '请求参数不完整',
        error: '缺少必填字段: title, start, end, extendedProps',
      };
      res.status(400).json(response);
      return;
    }
    const task = taskDB.create(body as TaskCreateRequest);
    const response: ApiResponse<CalendarTask> = {
      success: true,
      data: task,
      message: '创建任务成功',
    };
    res.status(201).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[calendar] POST /tasks error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '创建任务失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

router.put('/tasks/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as TaskUpdateRequest;
    const task = taskDB.update(id, body);
    if (!task) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '任务不存在',
        error: `Task with id ${id} not found`,
      };
      res.status(404).json(response);
      return;
    }
    const response: ApiResponse<CalendarTask> = {
      success: true,
      data: task,
      message: '更新任务成功',
    };
    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[calendar] PUT /tasks/:id error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '更新任务失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

router.patch('/tasks/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: TaskStatus };
    if (!status || !['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '状态参数无效',
        error: 'status must be one of: pending, in_progress, completed, cancelled',
      };
      res.status(400).json(response);
      return;
    }
    const task = taskDB.updateStatus(id, status);
    if (!task) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '任务不存在',
        error: `Task with id ${id} not found`,
      };
      res.status(404).json(response);
      return;
    }
    const response: ApiResponse<CalendarTask> = {
      success: true,
      data: task,
      message: '更新任务状态成功',
    };
    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[calendar] PATCH /tasks/:id/status error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '更新任务状态失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

router.delete('/tasks/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const ok = taskDB.remove(id);
    if (!ok) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: '任务不存在',
        error: `Task with id ${id} not found`,
      };
      res.status(404).json(response);
      return;
    }
    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
      message: '删除任务成功',
    };
    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[calendar] DELETE /tasks/:id error:', error.message);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      message: '删除任务失败',
      error: error.message,
    };
    res.status(500).json(response);
  }
});

export default router;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarTask, UserConfig, TaskCreateRequest, TaskUpdateRequest } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

interface DatabaseSchema {
  irrigation_tasks: CalendarTask[];
  user_config: UserConfig;
}

const defaultUserConfig: UserConfig = {
  id: 'default',
  electricityPrice: 0.6,
  waterPrice: 2.5,
  pumpPower: 7.5,
  pumpFlow: 50,
  laborCost: 30,
  defaultCity: '北京',
  defaultCrop: 'wheat',
  irrigationEfficiency: 0.85,
  plantingArea: 10,
  defaultSoilTexture: 'loam',
};

const defaultDB: DatabaseSchema = {
  irrigation_tasks: [],
  user_config: defaultUserConfig,
};

function ensureDB(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
  }
}

function readDB(): DatabaseSchema {
  ensureDB();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.irrigation_tasks) parsed.irrigation_tasks = [];
    if (!parsed.user_config) parsed.user_config = { ...defaultUserConfig };
    return parsed;
  } catch {
    return { ...defaultDB, irrigation_tasks: [], user_config: { ...defaultUserConfig } };
  }
}

function writeDB(db: DatabaseSchema): void {
  ensureDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export const taskDB = {
  getAll(): CalendarTask[] {
    const db = readDB();
    return db.irrigation_tasks;
  },

  getById(id: string): CalendarTask | undefined {
    const db = readDB();
    return db.irrigation_tasks.find((t) => t.id === id);
  },

  create(data: TaskCreateRequest): CalendarTask {
    const db = readDB();
    const task: CalendarTask = {
      id: uuidv4(),
      title: data.title,
      start: data.start,
      end: data.end,
      allDay: data.allDay ?? false,
      status: data.status ?? 'pending',
      extendedProps: data.extendedProps,
    };
    db.irrigation_tasks.push(task);
    writeDB(db);
    return task;
  },

  update(id: string, data: TaskUpdateRequest): CalendarTask | null {
    const db = readDB();
    const idx = db.irrigation_tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const existing = db.irrigation_tasks[idx];
    const updated: CalendarTask = {
      ...existing,
      ...(data.title !== undefined && { title: data.title }),
      ...(data.start !== undefined && { start: data.start }),
      ...(data.end !== undefined && { end: data.end }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.extendedProps !== undefined && {
        extendedProps: { ...existing.extendedProps, ...data.extendedProps },
      }),
    };
    db.irrigation_tasks[idx] = updated;
    writeDB(db);
    return updated;
  },

  updateStatus(id: string, status: CalendarTask['status']): CalendarTask | null {
    return this.update(id, { status });
  },

  remove(id: string): boolean {
    const db = readDB();
    const idx = db.irrigation_tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    db.irrigation_tasks.splice(idx, 1);
    writeDB(db);
    return true;
  },
};

export const configDB = {
  get(): UserConfig {
    const db = readDB();
    return db.user_config;
  },

  update(partial: Partial<UserConfig>): UserConfig {
    const db = readDB();
    db.user_config = { ...db.user_config, ...partial };
    writeDB(db);
    return db.user_config;
  },

  reset(): UserConfig {
    const db = readDB();
    db.user_config = { ...defaultUserConfig };
    writeDB(db);
    return db.user_config;
  },
};

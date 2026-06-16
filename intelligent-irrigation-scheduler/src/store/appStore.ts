import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  WeatherResponse,
  SoilSimulationResponse,
  PrescriptionResponse,
  CropParams,
  SoilParams,
  UserConfig,
  CalendarTask,
  CropType,
  SoilTexture,
  SoilSimulationRequest,
  PrescriptionRequest,
  TaskCreateRequest,
  TaskUpdateRequest
} from '../../shared/types';
import { weatherApi, soilApi, prescriptionApi, taskApi, userApi } from '@/api';
import dayjs from 'dayjs';

const DEFAULT_CROP_PARAMS: CropParams = {
  cropType: 'wheat',
  cropName: '冬小麦',
  growthStage: '返青期',
  rootDepth: 0.8,
  plantingArea: 100,
  cropCoefficient: 0.85,
};

const DEFAULT_SOIL_PARAMS: SoilParams = {
  fieldCapacity: 28,
  wiltingPoint: 12,
  bulkDensity: 1.4,
  initialMoisture: 22,
  soilTexture: 'loam',
};

const DEFAULT_USER_CONFIG: UserConfig = {
  id: 'default',
  electricityPrice: 0.56,
  waterPrice: 2.5,
  pumpPower: 15,
  pumpFlow: 80,
  laborCost: 80,
  defaultCity: '郑州',
  defaultCrop: 'wheat',
  irrigationEfficiency: 0.85,
  plantingArea: 100,
  defaultSoilTexture: 'loam',
};

interface AppState {
  weather: WeatherResponse | null;
  weatherLoading: boolean;
  soilSim: SoilSimulationResponse | null;
  soilSimLoading: boolean;
  prescription: PrescriptionResponse | null;
  prescriptionLoading: boolean;
  cropParams: CropParams;
  soilParams: SoilParams;
  userConfig: UserConfig;
  tasks: CalendarTask[];
  tasksLoading: boolean;
  forceRainMode: boolean;

  setWeather: (weather: WeatherResponse | null) => void;
  setSoilSim: (sim: SoilSimulationResponse | null) => void;
  setPrescription: (prescription: PrescriptionResponse | null) => void;
  setCropParams: (params: Partial<CropParams>) => void;
  setSoilParams: (params: Partial<SoilParams>) => void;
  setUserConfig: (config: Partial<UserConfig>) => void;
  setTasks: (tasks: CalendarTask[]) => void;
  setForceRainMode: (enabled: boolean) => void;

  fetchWeather: (city?: string, forceRain?: boolean) => Promise<void>;
  fetchSoilSimulation: (overrides?: Partial<SoilSimulationRequest>) => Promise<void>;
  fetchPrescription: (overrides?: Partial<PrescriptionRequest>) => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchUserConfig: () => Promise<void>;
  saveUserConfig: () => Promise<void>;

  createTask: (task: TaskCreateRequest) => Promise<CalendarTask | null>;
  updateTask: (id: string, data: TaskUpdateRequest) => Promise<CalendarTask | null>;
  deleteTask: (id: string) => Promise<boolean>;
}

const CROP_NAME_MAP: Record<CropType, string> = {
  wheat: '冬小麦',
  corn: '夏玉米',
  cotton: '棉花',
  soybean: '大豆',
  rice: '水稻',
  other: '其他作物',
};

const GROWTH_STAGES: Record<CropType, string[]> = {
  wheat: ['播种期', '越冬期', '返青期', '拔节期', '抽穗期', '灌浆期', '成熟期'],
  corn: ['播种期', '苗期', '拔节期', '抽雄期', '吐丝期', '灌浆期', '成熟期'],
  cotton: ['播种期', '苗期', '蕾期', '花铃期', '吐絮期'],
  soybean: ['播种期', '苗期', '开花期', '结荚期', '鼓粒期', '成熟期'],
  rice: ['育秧期', '分蘖期', '拔节期', '抽穗期', '灌浆期', '成熟期'],
  other: ['生长期'],
};

const SOIL_DEFAULTS: Record<SoilTexture, Partial<SoilParams>> = {
  sand: { fieldCapacity: 18, wiltingPoint: 6, bulkDensity: 1.6, initialMoisture: 14 },
  loam: { fieldCapacity: 28, wiltingPoint: 12, bulkDensity: 1.4, initialMoisture: 22 },
  clay: { fieldCapacity: 38, wiltingPoint: 18, bulkDensity: 1.2, initialMoisture: 30 },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      weather: null,
      weatherLoading: false,
      soilSim: null,
      soilSimLoading: false,
      prescription: null,
      prescriptionLoading: false,
      cropParams: DEFAULT_CROP_PARAMS,
      soilParams: DEFAULT_SOIL_PARAMS,
      userConfig: DEFAULT_USER_CONFIG,
      tasks: [],
      tasksLoading: false,
      forceRainMode: false,

      setWeather: (weather) => set({ weather }),
      setSoilSim: (sim) => set({ soilSim: sim }),
      setPrescription: (prescription) => set({ prescription }),
      setCropParams: (params) =>
        set((state) => {
          const newParams = { ...state.cropParams, ...params };
          if (params.cropType) {
            newParams.cropName = CROP_NAME_MAP[params.cropType];
            const stages = GROWTH_STAGES[params.cropType];
            if (!stages.includes(newParams.growthStage)) {
              newParams.growthStage = stages[0];
            }
          }
          return { cropParams: newParams };
        }),
      setSoilParams: (params) =>
        set((state) => {
          const newParams = { ...state.soilParams, ...params };
          if (params.soilTexture) {
            const defaults = SOIL_DEFAULTS[params.soilTexture];
            Object.assign(newParams, defaults, { soilTexture: params.soilTexture });
          }
          return { soilParams: newParams };
        }),
      setUserConfig: (config) =>
        set((state) => ({ userConfig: { ...state.userConfig, ...config } })),
      setTasks: (tasks) => set({ tasks }),
      setForceRainMode: (enabled) => set({ forceRainMode: enabled }),

      fetchWeather: async (city, forceRain) => {
        const targetCity = city || get().userConfig.defaultCity;
        const useForceRain = forceRain !== undefined ? forceRain : get().forceRainMode;
        set({ weatherLoading: true });
        try {
          const data = await weatherApi.getWeather(targetCity, useForceRain);
          if (data) {
            set({ weather: data as unknown as WeatherResponse });
          }
        } catch (e) {
          console.error('获取天气失败:', e);
        } finally {
          set({ weatherLoading: false });
        }
      },

      fetchSoilSimulation: async (overrides) => {
        const state = get();
        if (!state.weather) {
          await state.fetchWeather();
        }
        set({ soilSimLoading: true });
        try {
          const req: SoilSimulationRequest = {
            crop: { ...state.cropParams, ...overrides?.crop },
            soil: { ...state.soilParams, ...overrides?.soil },
            startDate: overrides?.startDate || dayjs().format('YYYY-MM-DD'),
            city: overrides?.city || state.userConfig.defaultCity,
          };
          const data = await soilApi.simulate(req);
          if (data) {
            set({ soilSim: data as unknown as SoilSimulationResponse });
          }
        } catch (e) {
          console.error('土壤模拟失败:', e);
        } finally {
          set({ soilSimLoading: false });
        }
      },

      fetchPrescription: async (overrides) => {
        const state = get();
        if (!state.weather) await state.fetchWeather();
        if (!state.soilSim) await state.fetchSoilSimulation();
        set({ prescriptionLoading: true });
        try {
          const latestState = get();
          const req: PrescriptionRequest = {
            crop: { ...latestState.cropParams, ...overrides?.crop },
            soil: { ...latestState.soilParams, ...overrides?.soil },
            soilSimulation: latestState.soilSim!,
            weather: latestState.weather!,
            pumpFlow: overrides?.pumpFlow || latestState.userConfig.pumpFlow,
            irrigationEfficiency:
              overrides?.irrigationEfficiency || latestState.userConfig.irrigationEfficiency,
            preferredTime: overrides?.preferredTime,
            preferredDate: overrides?.preferredDate,
          };
          const data = await prescriptionApi.generate(req);
          if (data) {
            set({ prescription: data as unknown as PrescriptionResponse });
          }
        } catch (e) {
          console.error('生成处方失败:', e);
        } finally {
          set({ prescriptionLoading: false });
        }
      },

      fetchTasks: async () => {
        set({ tasksLoading: true });
        try {
          const data = await taskApi.list();
          if (data) {
            set({ tasks: data as unknown as CalendarTask[] });
          }
        } catch (e) {
          console.error('获取任务失败:', e);
        } finally {
          set({ tasksLoading: false });
        }
      },

      fetchUserConfig: async () => {
        try {
          const data = await userApi.getConfig();
          if (data) {
            set({ userConfig: data as unknown as UserConfig });
          }
        } catch (e) {
          console.error('获取用户配置失败:', e);
        }
      },

      saveUserConfig: async () => {
        try {
          const data = await userApi.saveConfig(get().userConfig);
          if (data) {
            set({ userConfig: data as unknown as UserConfig });
          }
        } catch (e) {
          console.error('保存用户配置失败:', e);
        }
      },

      createTask: async (task) => {
        try {
          const data = await taskApi.create(task);
          if (data) {
            const newTask = data as unknown as CalendarTask;
            set((state) => ({ tasks: [...state.tasks, newTask] }));
            return newTask;
          }
          return null;
        } catch (e) {
          console.error('创建任务失败:', e);
          return null;
        }
      },

      updateTask: async (id, updateData) => {
        try {
          const data = await taskApi.update(id, updateData);
          if (data) {
            const updated = data as unknown as CalendarTask;
            set((state) => ({
              tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
            }));
            return updated;
          }
          return null;
        } catch (e) {
          console.error('更新任务失败:', e);
          return null;
        }
      },

      deleteTask: async (id) => {
        try {
          await taskApi.delete(id);
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
          }));
          return true;
        } catch (e) {
          console.error('删除任务失败:', e);
          return false;
        }
      },
    }),
    {
      name: 'irrigation-app-store',
      partialize: (state) => ({
        cropParams: state.cropParams,
        soilParams: state.soilParams,
        userConfig: state.userConfig,
        tasks: state.tasks,
        forceRainMode: state.forceRainMode,
      }),
    }
  )
);

export { CROP_NAME_MAP, GROWTH_STAGES, SOIL_DEFAULTS };

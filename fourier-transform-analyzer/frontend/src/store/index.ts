import { create } from 'zustand';
import { 
  SignalParams, 
  FilterParams, 
  SignalResponse, 
  SnapshotListResponse,
  SignalType,
  FilterType,
  CompositeComponent
} from '../types';

interface AppState {
  signalParams: SignalParams;
  filterParams: FilterParams;
  performSTFT: boolean;
  stftWindowSize: number;
  stftOverlap: number;
  signalResponse: SignalResponse | null;
  snapshots: SnapshotListResponse[];
  loading: boolean;
  error: string | null;

  setSignalParam: <K extends keyof SignalParams>(key: K, value: SignalParams[K]) => void;
  setFilterParam: <K extends keyof FilterParams>(key: K, value: FilterParams[K]) => void;
  setPerformSTFT: (value: boolean) => void;
  setSTFTWindowSize: (value: number) => void;
  setSTFTOverlap: (value: number) => void;
  setSignalResponse: (response: SignalResponse | null) => void;
  setSnapshots: (snapshots: SnapshotListResponse[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetFilterParams: () => void;
  addCompositeComponent: () => void;
  removeCompositeComponent: (index: number) => void;
  updateCompositeComponent: (index: number, component: Partial<CompositeComponent>) => void;
}

const defaultSignalParams: SignalParams = {
  signal_type: 'sine',
  amplitude: 1.0,
  frequency: 10.0,
  phase: 0.0,
  duration: 1.0,
  sampling_rate: 1000.0,
  noise_level: 0.0,
};

const defaultFilterParams: FilterParams = {
  filter_type: 'none',
  cutoff_low: 50.0,
  cutoff_high: 100.0,
  order: 4,
};

export const useAppStore = create<AppState>((set, get) => ({
  signalParams: defaultSignalParams,
  filterParams: defaultFilterParams,
  performSTFT: false,
  stftWindowSize: 256,
  stftOverlap: 0.5,
  signalResponse: null,
  snapshots: [],
  loading: false,
  error: null,

  setSignalParam: (key, value) =>
    set((state) => ({
      signalParams: { ...state.signalParams, [key]: value },
    })),

  setFilterParam: (key, value) =>
    set((state) => ({
      filterParams: { ...state.filterParams, [key]: value },
    })),

  setPerformSTFT: (value) => set({ performSTFT: value }),

  setSTFTWindowSize: (value) => set({ stftWindowSize: value }),

  setSTFTOverlap: (value) => set({ stftOverlap: value }),

  setSignalResponse: (response) => set({ signalResponse: response }),

  setSnapshots: (snapshots) => set({ snapshots }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  resetFilterParams: () => set({ filterParams: defaultFilterParams }),

  addCompositeComponent: () =>
    set((state) => {
      const currentComponents = state.signalParams.composite_components || [];
      const newComponent: CompositeComponent = {
        type: 'sine',
        frequency: 20.0,
        amplitude: 0.5,
        phase: 0.0,
      };
      return {
        signalParams: {
          ...state.signalParams,
          composite_components: [...currentComponents, newComponent],
        },
      };
    }),

  removeCompositeComponent: (index) =>
    set((state) => {
      const currentComponents = state.signalParams.composite_components || [];
      const newComponents = currentComponents.filter((_, i) => i !== index);
      return {
        signalParams: {
          ...state.signalParams,
          composite_components: newComponents.length > 0 ? newComponents : undefined,
        },
      };
    }),

  updateCompositeComponent: (index, component) =>
    set((state) => {
      const currentComponents = [...(state.signalParams.composite_components || [])];
      if (currentComponents[index]) {
        currentComponents[index] = { ...currentComponents[index], ...component };
      }
      return {
        signalParams: {
          ...state.signalParams,
          composite_components: currentComponents,
        },
      };
    }),
}));

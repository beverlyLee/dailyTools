import { create } from 'zustand';
import type {
  Season,
  GrowthYear,
  TreeSpecies,
  TreeConfig,
  LightingAssessment,
  WindowData,
} from '../types';
import { assessWindowLighting } from '../utils/shadow';

const DEFAULT_LATITUDE = 39.9;

const DEFAULT_WINDOWS: WindowData[] = [
  { id: 'W1', position: [-3, 2.5, 0.01], size: [1.5, 2], normal: [0, 0, 1] },
  { id: 'W2', position: [0, 2.5, 0.01], size: [1.5, 2], normal: [0, 0, 1] },
  { id: 'W3', position: [3, 2.5, 0.01], size: [1.5, 2], normal: [0, 0, 1] },
  { id: 'W4', position: [-1.5, 5.5, 0.01], size: [1.2, 1.5], normal: [0, 0, 1] },
  { id: 'W5', position: [1.5, 5.5, 0.01], size: [1.2, 1.5], normal: [0, 0, 1] },
];

interface SimulationStoreState {
  season: Season;
  year: GrowthYear;
  tree: TreeConfig;
  latitude: number;
  windows: WindowData[];
  assessment: LightingAssessment;
}

interface SimulationStoreActions {
  setSeason: (season: Season) => void;
  setYear: (year: GrowthYear) => void;
  setTreeSpecies: (species: TreeSpecies) => void;
  setTreePosition: (position: [number, number, number]) => void;
  reassess: () => void;
}

function computeAssessment(state: SimulationStoreState): LightingAssessment {
  return assessWindowLighting(
    state.windows,
    state.tree.species,
    state.tree.years,
    state.tree.position,
    state.latitude,
    state.season
  );
}

const initialTree: TreeConfig = {
  species: 'deciduous',
  position: [-5, 0, 5],
  years: 5,
};

const baseInitialState = {
  season: 'summer' as const,
  year: 5 as const,
  tree: initialTree,
  latitude: DEFAULT_LATITUDE,
  windows: DEFAULT_WINDOWS,
};

const initialState: SimulationStoreState = {
  ...baseInitialState,
  assessment: computeAssessment(baseInitialState as SimulationStoreState),
};

export type SimulationStore = SimulationStoreState & SimulationStoreActions;

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  ...initialState,
  assessment: computeAssessment(initialState),
  setSeason: (season: Season) =>
    set((state) => {
      const newState = { ...state, season };
      return {
        season,
        assessment: computeAssessment(newState),
      };
    }),
  setYear: (year: GrowthYear) =>
    set((state) => {
      const newTree = { ...state.tree, years: year };
      const newState = { ...state, year, tree: newTree };
      return {
        year,
        tree: newTree,
        assessment: computeAssessment(newState),
      };
    }),
  setTreeSpecies: (species: TreeSpecies) =>
    set((state) => {
      const newTree = { ...state.tree, species };
      const newState = { ...state, tree: newTree };
      return {
        tree: newTree,
        assessment: computeAssessment(newState),
      };
    }),
  setTreePosition: (position: [number, number, number]) =>
    set((state) => {
      const newTree = { ...state.tree, position };
      const newState = { ...state, tree: newTree };
      return {
        tree: newTree,
        assessment: computeAssessment(newState),
      };
    }),
  reassess: () => set((state) => ({ assessment: computeAssessment(state) })),
}));

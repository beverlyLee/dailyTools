export type TreeSpecies = 'deciduous' | 'evergreen';
export type Season = 'summer' | 'winter';
export type GrowthYear = 5 | 10;

export interface TreeConfig {
  species: TreeSpecies;
  position: [number, number, number];
  years: GrowthYear;
}

export interface CanopySize {
  radius: number;
  height: number;
  trunkHeight: number;
}

export interface WindowData {
  id: string;
  position: [number, number, number];
  size: [number, number];
  normal: [number, number, number];
}

export interface WindowAssessment {
  id: string;
  shadowCoverage: number;
  isPermanentlyBlocked: boolean;
  hasDirectLight: boolean;
}

export interface LightingAssessment {
  totalWindows: number;
  blockedWindows: number;
  averageCoverage: number;
  windows: WindowAssessment[];
  warnings: string[];
}

export interface SimulationState {
  season: Season;
  year: GrowthYear;
  tree: TreeConfig;
  latitude: number;
}

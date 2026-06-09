export type WindowType = 'sliding' | 'casement';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  life: number;
  active: boolean;
  type: 'rain' | 'splash';
}

export interface WeatherConfig {
  rainIntensity: number;
  windSpeed: number;
  windDirection: number;
}

export interface DetectionResult {
  waterTightness: 'good' | 'warning' | 'danger';
  airTightness: 'good' | 'warning' | 'danger';
  waterAmount: number;
}

export interface WindowGap {
  position: THREE.Vector3;
  width: number;
  height: number;
  depth: number;
  normal: THREE.Vector3;
}

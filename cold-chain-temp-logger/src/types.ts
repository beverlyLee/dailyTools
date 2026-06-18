export interface TemperatureRecord {
  time: number;
  temperature: number;
  doorOpen: boolean;
  refrigerationPower: number;
  ambientTemp: number;
  threshold: number;
  isAlert: boolean;
}

export interface AlertRecord {
  startTime: number;
  endTime: number | null;
  maxTemp: number;
  ongoing: boolean;
}

export interface SystemState {
  currentTemp: number;
  doorOpen: boolean;
  refrigerationPower: number;
  ambientTemp: number;
  threshold: number;
  time: number;
  isAlert: boolean;
  totalAlertDuration: number;
  alertHistory?: AlertRecord[];
}

export interface ProductInfo {
  name: string;
  threshold: number;
  minTemp: number;
}

export interface Report {
  totalDuration: number;
  alertDuration: number;
  alertDurationPercent: number;
  alertCount: number;
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
  threshold: number;
  isQualified: boolean;
  temperatureHistory: TemperatureRecord[];
  alertHistory: AlertRecord[];
}

export interface HandoffDoc {
  id: string;
  timestamp: string;
  receiverName: string;
  signature: string;
  notes: string;
  report: Report;
  hash: string;
}

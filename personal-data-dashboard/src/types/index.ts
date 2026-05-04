export type ChartType = 'line' | 'bar' | 'pie' | 'area';

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface WidgetConfig {
  id: string;
  title: string;
  chartType: ChartType;
  dataKeys: string[];
  labelKey: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
}

export interface DashboardConfig {
  id: string;
  name: string;
  widgets: WidgetConfig[];
}

export interface CSVData {
  columns: string[];
  rows: Record<string, string | number>[];
  fileName: string;
}

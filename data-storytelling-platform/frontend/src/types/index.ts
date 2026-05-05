export interface Slide {
  id: string;
  title: string;
  elements: SlideElement[];
  parameters: Parameter[];
}

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'chart';
  content: string;
  style: Record<string, unknown>;
  dataSource?: string;
}

export interface Parameter {
  id: string;
  name: string;
  type: 'slider' | 'dropdown';
  label: string;
  value: number | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
}

export interface ChartData {
  [key: string]: number | string;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  parameters: Parameter[];
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSchedule {
  id: string;
  templateId: string;
  parameters: Record<string, number | string>;
  emailRecipients: string[];
  schedule: string;
  format: 'html' | 'pdf' | 'pptx';
  enabled: boolean;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  parameters: Record<string, number | string>;
  format: 'html' | 'pdf' | 'pptx';
  downloadUrl: string;
  createdAt: string;
}

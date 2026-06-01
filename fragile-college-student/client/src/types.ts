export interface IllnessInfo {
  base_rate: number;
  seasonal_peaks: { month: number; intensity: number }[];
  symptoms: string[];
  description: string;
}

export interface College {
  name: string;
  region: string;
  student_count: number;
}

export interface DailyRecord {
  date: string;
  college: string;
  region: string;
  illness: string;
  case_count: number;
  risk_level: number;
  symptoms: string[];
  incidence_rate: number;
}

export interface HeatmapDataPoint {
  date: string;
  value: number;
}

export interface HighRiskPeriod {
  illness: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  avg_risk: number;
  peak_risk: number;
}

export interface MonthlyIllness {
  name: string;
  total_cases: number;
  avg_risk: number;
  risk_level: "low" | "medium" | "high";
  avg_daily_cases: number;
  symptoms: string[];
  description: string;
}

export interface MonthlySummary {
  month: number;
  month_name: string;
  illnesses: MonthlyIllness[];
}

export interface SocialMediaTopic {
  illness: string;
  mention_count: number;
  sentiment: number;
  trending_score: number;
}

export interface SocialMediaTrend {
  date: string;
  topics: SocialMediaTopic[];
}

export interface DashboardData {
  current_month: number;
  monthly_summary: MonthlySummary;
  high_risk_periods: HighRiskPeriod[];
  social_trends: SocialMediaTrend[];
  heatmaps: Record<string, [string, number][]>;
  illnesses: Record<string, IllnessInfo>;
  colleges: College[];
}

export interface ValidationResult {
  autumn_influenza: boolean;
  autumn_conjunctivitis: boolean;
  winter_southern_flu: boolean;
  all_passed: boolean;
  details: Record<string, any>;
}

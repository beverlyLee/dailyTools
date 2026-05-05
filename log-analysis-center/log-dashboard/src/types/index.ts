export interface LogEntry {
  id: string;
  timestamp: string;
  source: LogSource;
  level: LogLevel;
  message: string;
  service?: string;
  hostname?: string;
  tags: string[];
  fields: Record<string, unknown>;
}

export type LogSource = 'Syslog' | 'Kafka' | 'Filebeat' | 'Http';

export type LogLevel = 'Trace' | 'Debug' | 'Info' | 'Warn' | 'Error' | 'Fatal';

export interface Alert {
  id: string;
  rule_id?: string;
  rule_name?: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  log_entries: string[];
}

export type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved' | 'Closed';

export interface Rule {
  id: string;
  name: string;
  description?: string;
  conditions: Condition[];
  actions: Action[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Condition {
  field: string;
  operator: Operator;
  value: unknown;
}

export type Operator = 
  | 'Equals' 
  | 'NotEquals' 
  | 'Contains' 
  | 'NotContains' 
  | 'GreaterThan' 
  | 'LessThan' 
  | 'GreaterThanOrEqual' 
  | 'LessThanOrEqual' 
  | 'RegexMatch' 
  | 'RegexNotMatch' 
  | 'In' 
  | 'NotIn';

export interface Action {
  action_type: ActionType;
  config: Record<string, unknown>;
}

export type ActionType = 'Email' | 'Webhook' | 'CreateAlert' | 'AddTag';

export interface Stats {
  logs: {
    total: number;
    by_level: Record<string, number>;
    by_service: Record<string, number>;
    error_rate_percent: number;
  };
  alerts: {
    total: number;
    by_severity: Record<string, number>;
  };
}

export interface SearchQuery {
  query: string;
  limit?: number;
  level?: string;
  service?: string;
  from_time?: string;
  to_time?: string;
}

export interface SearchResult {
  total: number;
  logs: LogEntry[];
}

export interface DashboardData {
  logs: LogEntry[];
  alerts: Alert[];
  stats: Stats;
}

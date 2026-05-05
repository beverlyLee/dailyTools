import type { LogLevel, AlertSeverity } from '@/types';

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  Trace: '#808080',
  Debug: '#0066CC',
  Info: '#00CC00',
  Warn: '#FFCC00',
  Error: '#FF3300',
  Fatal: '#990000',
};

export const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  Trace: 'TRACE',
  Debug: 'DEBUG',
  Info: 'INFO',
  Warn: 'WARN',
  Error: 'ERROR',
  Fatal: 'FATAL',
};

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  Low: '#3498db',
  Medium: '#f39c12',
  High: '#e74c3c',
  Critical: '#8e44ad',
};

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  Low: '低',
  Medium: '中',
  High: '高',
  Critical: '严重',
};

export const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export const LUCENE_SYNTAX_EXAMPLES = [
  'message:error',
  'level:ERROR AND service:api',
  'tags:production',
  'fields.status_code:>400',
  'NOT service:internal',
  '(level:ERROR OR level:WARN) AND service:web',
];

export const LOG_LEVEL_ORDER: LogLevel[] = ['Trace', 'Debug', 'Info', 'Warn', 'Error', 'Fatal'];

export const ALERT_SEVERITY_ORDER: AlertSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

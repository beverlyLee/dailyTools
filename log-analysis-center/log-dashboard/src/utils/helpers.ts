import dayjs from 'dayjs';
import type { LogEntry, Alert, Stats } from '@/types';
import { LOG_LEVEL_ORDER, ALERT_SEVERITY_ORDER } from './constants';

export const formatDate = (date: string | Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
  return dayjs(date).format(format);
};

export const formatRelativeTime = (date: string | Date): string => {
  const now = dayjs();
  const target = dayjs(date);
  const diff = now.diff(target, 'second');

  if (diff < 60) {
    return '刚刚';
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)} 分钟前`;
  } else if (diff < 86400) {
    return `${Math.floor(diff / 3600)} 小时前`;
  } else if (diff < 604800) {
    return `${Math.floor(diff / 86400)} 天前`;
  } else {
    return formatDate(date);
  }
};

export const getLogLevelBadgeColor = (level: string): string => {
  const levelMap: Record<string, string> = {
    Trace: 'default',
    Debug: 'processing',
    Info: 'success',
    Warn: 'warning',
    Error: 'error',
    Fatal: 'error',
  };
  return levelMap[level] || 'default';
};

export const getAlertSeverityBadgeColor = (severity: string): string => {
  const severityMap: Record<string, string> = {
    Low: 'default',
    Medium: 'warning',
    High: 'error',
    Critical: 'error',
  };
  return severityMap[severity] || 'default';
};

export const groupLogsByLevel = (logs: LogEntry[]): Record<string, LogEntry[]> => {
  return logs.reduce((acc, log) => {
    const level = log.level;
    if (!acc[level]) {
      acc[level] = [];
    }
    acc[level].push(log);
    return acc;
  }, {} as Record<string, LogEntry[]>);
};

export const groupLogsByService = (logs: LogEntry[]): Record<string, LogEntry[]> => {
  return logs.reduce((acc, log) => {
    const service = log.service || 'unknown';
    if (!acc[service]) {
      acc[service] = [];
    }
    acc[service].push(log);
    return acc;
  }, {} as Record<string, LogEntry[]>);
};

export const groupLogsByTime = (logs: LogEntry[], interval: 'minute' | 'hour' | 'day' = 'hour'): Array<{
  time: string;
  count: number;
  byLevel: Record<string, number>;
}> => {
  const grouped: Record<string, { count: number; byLevel: Record<string, number> }> = {};

  logs.forEach((log) => {
    const time = dayjs(log.timestamp);
    let timeKey: string;

    switch (interval) {
      case 'minute':
        timeKey = time.format('YYYY-MM-DD HH:mm');
        break;
      case 'day':
        timeKey = time.format('YYYY-MM-DD');
        break;
      case 'hour':
      default:
        timeKey = time.format('YYYY-MM-DD HH:00');
        break;
    }

    if (!grouped[timeKey]) {
      grouped[timeKey] = {
        count: 0,
        byLevel: {},
      };
    }

    grouped[timeKey].count++;
    const level = log.level;
    grouped[timeKey].byLevel[level] = (grouped[timeKey].byLevel[level] || 0) + 1;
  });

  return Object.entries(grouped)
    .map(([time, data]) => ({
      time,
      ...data,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
};

export const calculateErrorRate = (logs: LogEntry[]): number => {
  if (logs.length === 0) return 0;

  const errorCount = logs.filter(
    (log) => log.level === 'Error' || log.level === 'Fatal'
  ).length;

  return (errorCount / logs.length) * 100;
};

export const prepareChartData = (stats: Stats | null) => {
  if (!stats) return { levelData: [], serviceData: [], severityData: [] };

  const levelData = LOG_LEVEL_ORDER.map((level) => ({
    level,
    count: stats.logs.by_level[level] || 0,
  }));

  const serviceData = Object.entries(stats.logs.by_service).map(([service, count]) => ({
    service,
    count,
  }));

  const severityData = ALERT_SEVERITY_ORDER.map((severity) => ({
    severity,
    count: stats.alerts.by_severity[severity] || 0,
  }));

  return { levelData, serviceData, severityData };
};

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const jsonToPrettyString = (obj: unknown): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

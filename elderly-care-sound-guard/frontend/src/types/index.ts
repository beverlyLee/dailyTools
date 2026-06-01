export type AlertLevel = 'low' | 'medium' | 'high' | 'critical';
export type SoundType = 'fall' | 'cry' | 'scream' | 'unknown';

export interface Contact {
  name: string;
  phone: string;
  email?: string;
  relation: 'primary' | 'secondary' | 'emergency';
}

export interface Alert {
  alert_id: string;
  timestamp: string;
  level: AlertLevel;
  sound_type: SoundType;
  message: string;
  contacts: Contact[];
  resolved: boolean;
  confidence?: number;
}

export interface AlertResponse {
  status: string;
  alert_id: string;
  message: string;
  level: AlertLevel;
  contacts_notified: Contact[];
}

export interface AppSettings {
  contacts: Contact[];
  sensitivity: 'low' | 'medium' | 'high';
  enable_auto_notification: boolean;
}

export interface MonitoringStatus {
  isActive: boolean;
  audioLevel: number;
  lastUpdate: Date;
  isAlert: boolean;
}

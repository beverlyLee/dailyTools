export interface PasswordEntry {
  id: number;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

export interface NewPasswordEntry {
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category?: string;
}

export interface PasswordStrength {
  score: number;
  label: string;
  issues: string[];
}

export interface DuplicatePassword {
  passwordHash: string;
  entries: PasswordEntry[];
}

export interface SecurityAuditReport {
  totalEntries: number;
  weakPasswords: PasswordEntry[];
  duplicatePasswords: DuplicatePassword[];
  pwnedPasswords: PasswordEntry[];
  lastAudit: string;
}

export interface AppState {
  isLocked: boolean;
  isInitialized: boolean;
  entries: PasswordEntry[];
  currentView: 'lock' | 'vault' | 'generator' | 'audit' | 'settings';
  editingEntry: PasswordEntry | null;
  auditReport: SecurityAuditReport | null;
}

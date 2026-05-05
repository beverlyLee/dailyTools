export interface PasswordEntry {
  id: number;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category?: string;
  created_at: string;
  updated_at: string;
  last_used?: string;
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
  password_hash: string;
  entries: PasswordEntry[];
}

export interface SecurityAuditReport {
  total_entries: number;
  weak_passwords: PasswordEntry[];
  duplicate_passwords: DuplicatePassword[];
  pwned_passwords: PasswordEntry[];
  last_audit: string;
}

export interface RegexPattern {
  id: number;
  name: string;
  pattern: string;
  flags: string;
  description?: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface NewRegexPattern {
  name: string;
  pattern: string;
  flags?: string;
  description?: string;
  category?: string;
}

export interface RegexMatch {
  text: string;
  index: number;
  groups: string[];
}

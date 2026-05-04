import { invoke } from '@tauri-apps/api';
import type { PasswordEntry, NewPasswordEntry, PasswordStrength, SecurityAuditReport } from '../types';

export async function initializeDatabase(): Promise<void> {
  return invoke('initialize_database');
}

export async function setMasterPassword(password: string): Promise<void> {
  return invoke('set_master_password', { password });
}

export async function verifyMasterPassword(password: string): Promise<boolean> {
  return invoke('verify_master_password', { password });
}

export async function unlockVault(password: string): Promise<boolean> {
  return invoke('unlock_vault', { password });
}

export async function lockVault(): Promise<void> {
  return invoke('lock_vault');
}

export async function isVaultLocked(): Promise<boolean> {
  return invoke('is_vault_locked');
}

export async function generatePassword(
  length: number,
  includeUppercase: boolean,
  includeLowercase: boolean,
  includeNumbers: boolean,
  includeSymbols: boolean
): Promise<string> {
  return invoke('generate_password', {
    length,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols
  });
}

export async function generatePassphrase(wordCount: number, separator?: string): Promise<string> {
  return invoke('generate_passphrase', { wordCount, separator });
}

export async function addPasswordEntry(entry: NewPasswordEntry): Promise<number> {
  return invoke('add_password_entry', { entry });
}

export async function getAllPasswordEntries(): Promise<PasswordEntry[]> {
  return invoke('get_all_password_entries');
}

export async function updatePasswordEntry(id: number, entry: NewPasswordEntry): Promise<void> {
  return invoke('update_password_entry', { id, entry });
}

export async function deletePasswordEntry(id: number): Promise<void> {
  return invoke('delete_password_entry', { id });
}

export async function auditPasswordStrength(password: string): Promise<PasswordStrength> {
  return invoke('audit_password_strength', { password });
}

export async function checkPwnedPassword(password: string): Promise<boolean> {
  return invoke('check_pwned_password', { password });
}

export async function getSecurityAuditReport(entries: PasswordEntry[]): Promise<SecurityAuditReport> {
  return invoke('get_security_audit_report', { entries });
}

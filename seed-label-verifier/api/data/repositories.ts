import { getDatabase } from './database';
import type { SeedInfo, BlacklistedCompany } from '../../shared/types';

interface SeedRow {
  seed_id: string;
  seed_name: string;
  crop_type: string;
  variety: string;
  registration_number: string;
  production_date: string;
  net_content: string;
  manufacturer_id: string;
  warning: string;
  quality: string;
  qr_code: string;
  manufacturer_name: string;
}

interface ManufacturerRow {
  manufacturer_id: string;
  name: string;
  license_number: string;
  address: string;
  contact: string;
  is_blacklisted: number;
}

interface BlacklistRow {
  id: string;
  manufacturer_id: string;
  reason: string;
  date_added: string;
  status: string;
  name: string;
  license_number: string;
  address: string;
  contact: string;
}

export function findSeedByQrCode(qrCode: string): SeedInfo | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT s.*, m.name as manufacturer_name
    FROM seeds s
    JOIN manufacturers m ON s.manufacturer_id = m.manufacturer_id
    WHERE s.qr_code = ?
  `);
  const row = stmt.get(qrCode) as SeedRow | undefined;
  
  if (!row) return null;
  
  return {
    seedId: row.seed_id,
    seedName: row.seed_name,
    cropType: row.crop_type,
    variety: row.variety,
    registrationNumber: row.registration_number,
    productionDate: row.production_date,
    netContent: row.net_content,
    manufacturer: row.manufacturer_name,
    manufacturerId: row.manufacturer_id,
    warning: row.warning,
    quality: row.quality
  };
}

export function getAllBlacklistedCompanies(): BlacklistedCompany[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT b.*, m.name, m.license_number, m.address, m.contact
    FROM blacklist b
    JOIN manufacturers m ON b.manufacturer_id = m.manufacturer_id
    WHERE b.status = 'active'
    ORDER BY b.date_added DESC
  `);
  const rows = stmt.all() as BlacklistRow[];
  
  return rows.map(row => ({
    id: row.id,
    manufacturerId: row.manufacturer_id,
    name: row.name,
    reason: row.reason,
    dateAdded: row.date_added,
    status: row.status,
    licenseNumber: row.license_number,
    address: row.address,
    contact: row.contact
  }));
}

export function searchBlacklistedCompanies(keyword: string): BlacklistedCompany[] {
  const db = getDatabase();
  const searchKeyword = `%${keyword}%`;
  const stmt = db.prepare(`
    SELECT b.*, m.name, m.license_number, m.address, m.contact
    FROM blacklist b
    JOIN manufacturers m ON b.manufacturer_id = m.manufacturer_id
    WHERE b.status = 'active'
    AND (m.name LIKE ? OR b.reason LIKE ? OR m.license_number LIKE ?)
    ORDER BY b.date_added DESC
  `);
  const rows = stmt.all(searchKeyword, searchKeyword, searchKeyword) as BlacklistRow[];
  
  return rows.map(row => ({
    id: row.id,
    manufacturerId: row.manufacturer_id,
    name: row.name,
    reason: row.reason,
    dateAdded: row.date_added,
    status: row.status,
    licenseNumber: row.license_number,
    address: row.address,
    contact: row.contact
  }));
}

export function isManufacturerBlacklisted(manufacturerId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM blacklist
    WHERE manufacturer_id = ? AND status = 'active'
  `);
  const result = stmt.get(manufacturerId) as { count: number };
  return result.count > 0;
}

export function addSubscription(email: string | undefined, phone: string | undefined, manufacturerIds: string[]): string {
  const db = getDatabase();
  const id = `SUB${Date.now()}`;
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO subscriptions (id, email, phone, manufacturer_ids, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, email || null, phone || null, JSON.stringify(manufacturerIds), createdAt);
  return id;
}

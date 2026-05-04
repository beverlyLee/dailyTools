import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as crypto from './crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/digital-legacy.db');

let db = null;
let SQL = null;
let currentMasterKey = null;

async function ensureSqlJsReady() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function saveDatabase() {
  if (!db) return;
  ensureDataDir();
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

async function loadOrCreateDatabase() {
  await ensureSqlJsReady();
  ensureDataDir();
  
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  createTables();
  saveDatabase();
  
  return db;
}

function createTables() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_salt TEXT NOT NULL,
      wrapped_master_key TEXT NOT NULL,
      wrapped_master_key_nonce TEXT NOT NULL,
      wrapped_master_key_tag TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      asset_type TEXT NOT NULL,
      title TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      nonce TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS dead_mans_switch (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      is_enabled INTEGER DEFAULT 0,
      last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      heartbeat_interval_days INTEGER DEFAULT 30,
      cool_off_period_days INTEGER DEFAULT 7,
      trigger_date TIMESTAMP,
      is_triggered INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS beneficiaries (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      encrypted_contact_info TEXT NOT NULL,
      nonce TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `;
  
  db.run(sql);
}

function runQuery(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDatabase();
}

function getOne(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result;
  }
  stmt.free();
  return undefined;
}

function getAll(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function getLastInsertRowId() {
  const result = getOne('SELECT last_insert_rowid() as id');
  return result?.id || 0;
}

function getChanges() {
  const result = getOne('SELECT changes() as changes');
  return result?.changes || 0;
}

export async function initDatabase() {
  if (db) return db;
  return await loadOrCreateDatabase();
}

export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
  if (currentMasterKey) {
    crypto.secureWipe(currentMasterKey);
    currentMasterKey = null;
  }
}

export function userExists(username) {
  const result = getOne('SELECT id FROM users WHERE username = ?', [username]);
  return !!result;
}

export async function createUser(username, password) {
  if (userExists(username)) {
    throw new Error('User already exists');
  }

  const { key: derivedKey, salt } = await crypto.deriveKeyFromPassword(password);
  const masterKey = await crypto.generateMasterKey();
  const wrapped = await crypto.wrapMasterKey(masterKey, derivedKey);

  runQuery(`
    INSERT INTO users (username, password_salt, wrapped_master_key, wrapped_master_key_nonce, wrapped_master_key_tag)
    VALUES (?, ?, ?, ?, ?)
  `, [
    username,
    crypto.toBase64(salt),
    crypto.toBase64(wrapped.ciphertext),
    crypto.toBase64(wrapped.nonce),
    crypto.toBase64(wrapped.tag)
  ]);

  crypto.secureWipe(derivedKey);

  const userId = getLastInsertRowId();
  
  await initializeDeadMansSwitch(userId);

  return {
    id: userId,
    username
  };
}

export async function verifyUser(username, password) {
  const user = getOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) {
    return null;
  }

  const salt = crypto.fromBase64(user.password_salt);
  const { key: derivedKey } = await crypto.deriveKeyFromPassword(password, salt);

  try {
    const wrapped = {
      ciphertext: crypto.fromBase64(user.wrapped_master_key),
      nonce: crypto.fromBase64(user.wrapped_master_key_nonce),
      tag: crypto.fromBase64(user.wrapped_master_key_tag)
    };

    currentMasterKey = await crypto.unwrapMasterKey(wrapped, derivedKey);
    
    runQuery('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);

    return {
      id: user.id,
      username: user.username
    };
  } catch (e) {
    crypto.secureWipe(derivedKey);
    return null;
  }
}

export async function initializeDeadMansSwitch(userId) {
  const existing = getOne('SELECT id FROM dead_mans_switch WHERE user_id = ?', [userId]);
  if (existing) return;

  runQuery(`
    INSERT INTO dead_mans_switch (user_id, is_enabled, heartbeat_interval_days, cool_off_period_days)
    VALUES (?, 0, 30, 7)
  `, [userId]);
}

export function getDeadMansSwitch(userId) {
  const result = getOne('SELECT * FROM dead_mans_switch WHERE user_id = ?', [userId]);
  if (!result) return null;
  
  return {
    ...result,
    isEnabled: result.is_enabled === 1,
    heartbeatIntervalDays: result.heartbeat_interval_days,
    coolOffPeriodDays: result.cool_off_period_days,
    lastHeartbeat: result.last_heartbeat,
    triggerDate: result.trigger_date,
    isTriggered: result.is_triggered === 1
  };
}

export function updateDeadMansSwitch(userId, { isEnabled, heartbeatIntervalDays, coolOffPeriodDays }) {
  const fields = [];
  const values = [];

  if (isEnabled !== undefined) {
    fields.push('is_enabled = ?');
    values.push(isEnabled ? 1 : 0);
  }
  if (heartbeatIntervalDays !== undefined) {
    fields.push('heartbeat_interval_days = ?');
    values.push(heartbeatIntervalDays);
  }
  if (coolOffPeriodDays !== undefined) {
    fields.push('cool_off_period_days = ?');
    values.push(coolOffPeriodDays);
  }

  if (fields.length === 0) return;

  values.push(userId);

  runQuery(`
    UPDATE dead_mans_switch
    SET ${fields.join(', ')}
    WHERE user_id = ?
  `, values);
}

export function recordHeartbeat(userId) {
  const switchConfig = getDeadMansSwitch(userId);
  if (!switchConfig) return;

  runQuery(`
    UPDATE dead_mans_switch
    SET last_heartbeat = datetime("now"),
        trigger_date = NULL,
        is_triggered = 0
    WHERE user_id = ?
  `, [userId]);
}

export async function createAsset(userId, asset) {
  if (!currentMasterKey) {
    throw new Error('Not authenticated');
  }

  const encryptedData = await crypto.encrypt(
    JSON.stringify(asset.data),
    currentMasterKey
  );

  runQuery(`
    INSERT INTO assets (id, user_id, asset_type, title, encrypted_data, nonce, tag)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    asset.id,
    userId,
    asset.type,
    asset.title,
    crypto.toBase64(encryptedData.ciphertext),
    crypto.toBase64(encryptedData.nonce),
    crypto.toBase64(encryptedData.tag)
  ]);

  return asset;
}

export async function getAsset(userId, assetId) {
  if (!currentMasterKey) {
    throw new Error('Not authenticated');
  }

  const asset = getOne(`
    SELECT * FROM assets WHERE id = ? AND user_id = ?
  `, [assetId, userId]);

  if (!asset) return null;

  const decryptedData = await crypto.decrypt(
    {
      ciphertext: crypto.fromBase64(asset.encrypted_data),
      nonce: crypto.fromBase64(asset.nonce),
      tag: crypto.fromBase64(asset.tag)
    },
    currentMasterKey
  );

  return {
    id: asset.id,
    type: asset.asset_type,
    title: asset.title,
    data: JSON.parse(decryptedData),
    createdAt: asset.created_at,
    updatedAt: asset.updated_at
  };
}

export async function listAssets(userId) {
  if (!currentMasterKey) {
    throw new Error('Not authenticated');
  }

  const assets = getAll(`
    SELECT id, asset_type, title, created_at, updated_at
    FROM assets
    WHERE user_id = ?
    ORDER BY created_at DESC
  `, [userId]);

  return assets.map(asset => ({
    id: asset.id,
    type: asset.asset_type,
    title: asset.title,
    createdAt: asset.created_at,
    updatedAt: asset.updated_at
  }));
}

export async function updateAsset(userId, assetId, updates) {
  if (!currentMasterKey) {
    throw new Error('Not authenticated');
  }

  const fields = ['updated_at = datetime("now")'];
  const values = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }

  if (updates.data !== undefined) {
    const encryptedData = await crypto.encrypt(
      JSON.stringify(updates.data),
      currentMasterKey
    );
    fields.push('encrypted_data = ?');
    fields.push('nonce = ?');
    fields.push('tag = ?');
    values.push(crypto.toBase64(encryptedData.ciphertext));
    values.push(crypto.toBase64(encryptedData.nonce));
    values.push(crypto.toBase64(encryptedData.tag));
  }

  if (values.length === 0) return;

  values.push(assetId);
  values.push(userId);

  runQuery(`
    UPDATE assets
    SET ${fields.join(', ')}
    WHERE id = ? AND user_id = ?
  `, values);
}

export function deleteAsset(userId, assetId) {
  runQuery(`
    DELETE FROM assets WHERE id = ? AND user_id = ?
  `, [assetId, userId]);
  return getChanges() > 0;
}

export function logout() {
  if (currentMasterKey) {
    crypto.secureWipe(currentMasterKey);
    currentMasterKey = null;
  }
}

export function isAuthenticated() {
  return currentMasterKey !== null;
}

export function checkDeadMansSwitchTriggers() {
  const now = new Date();
  
  const switches = getAll(`
    SELECT dms.*, u.username
    FROM dead_mans_switch dms
    JOIN users u ON dms.user_id = u.id
    WHERE dms.is_enabled = 1 AND dms.is_triggered = 0
  `);

  for (const sw of switches) {
    const lastHeartbeat = new Date(sw.last_heartbeat);
    const heartbeatDeadline = new Date(lastHeartbeat);
    heartbeatDeadline.setDate(heartbeatDeadline.getDate() + sw.heartbeat_interval_days);

    if (now > heartbeatDeadline) {
      if (!sw.trigger_date) {
        runQuery(`
          UPDATE dead_mans_switch
          SET trigger_date = datetime("now")
          WHERE user_id = ?
        `, [sw.user_id]);
      } else {
        const triggerDate = new Date(sw.trigger_date);
        const coolOffDeadline = new Date(triggerDate);
        coolOffDeadline.setDate(coolOffDeadline.getDate() + sw.cool_off_period_days);

        if (now > coolOffDeadline) {
          runQuery(`
            UPDATE dead_mans_switch
            SET is_triggered = 1
            WHERE user_id = ?
          `, [sw.user_id]);
        }
      }
    }
  }
}

export { currentMasterKey };

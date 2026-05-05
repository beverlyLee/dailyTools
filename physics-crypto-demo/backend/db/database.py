import sqlite3
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "physics_crypto.db"

def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 流体模拟表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS fluid_simulations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reynolds_number REAL,
            inlet_velocity REAL,
            grid_size INTEGER,
            steps INTEGER,
            created_at TEXT,
            parameters TEXT,
            snapshot TEXT
        )
    ''')
    
    # RSA 密钥对表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rsa_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            p TEXT,
            q TEXT,
            n TEXT,
            phi_n TEXT,
            e TEXT,
            d TEXT,
            created_at TEXT,
            steps TEXT
        )
    ''')
    
    # RSA 加解密历史表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rsa_operations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operation_type TEXT,
            key_id INTEGER,
            input_text TEXT,
            output_text TEXT,
            created_at TEXT,
            FOREIGN KEY (key_id) REFERENCES rsa_keys (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# 流体模拟相关操作
def save_fluid_simulation(reynolds_number, inlet_velocity, grid_size, steps, parameters, snapshot):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO fluid_simulations 
        (reynolds_number, inlet_velocity, grid_size, steps, created_at, parameters, snapshot)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        reynolds_number,
        inlet_velocity,
        grid_size,
        steps,
        datetime.now().isoformat(),
        json.dumps(parameters),
        json.dumps(snapshot)
    ))
    
    sim_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return sim_id

def get_fluid_simulations(limit=20):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, reynolds_number, inlet_velocity, grid_size, steps, created_at
        FROM fluid_simulations
        ORDER BY created_at DESC
        LIMIT ?
    ''', (limit,))
    
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

def get_fluid_simulation(sim_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM fluid_simulations WHERE id = ?
    ''', (sim_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        result = dict(row)
        result['parameters'] = json.loads(result['parameters'])
        result['snapshot'] = json.loads(result['snapshot'])
        return result
    return None

# RSA 密钥相关操作
def save_rsa_key(p, q, n, phi_n, e, d, steps):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO rsa_keys 
        (p, q, n, phi_n, e, d, created_at, steps)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        str(p),
        str(q),
        str(n),
        str(phi_n),
        str(e),
        str(d),
        datetime.now().isoformat(),
        json.dumps(steps)
    ))
    
    key_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return key_id

def get_rsa_keys(limit=20):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, p, q, n, e, created_at
        FROM rsa_keys
        ORDER BY created_at DESC
        LIMIT ?
    ''', (limit,))
    
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

def get_rsa_key(key_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM rsa_keys WHERE id = ?
    ''', (key_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        result = dict(row)
        result['steps'] = json.loads(result['steps'])
        return result
    return None

# RSA 加解密操作记录
def save_rsa_operation(operation_type, key_id, input_text, output_text):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO rsa_operations 
        (operation_type, key_id, input_text, output_text, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        operation_type,
        key_id,
        input_text,
        output_text,
        datetime.now().isoformat()
    ))
    
    op_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return op_id

def get_rsa_operations(key_id=None, limit=20):
    conn = get_connection()
    cursor = conn.cursor()
    
    if key_id:
        cursor.execute('''
            SELECT * FROM rsa_operations
            WHERE key_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (key_id, limit))
    else:
        cursor.execute('''
            SELECT * FROM rsa_operations
            ORDER BY created_at DESC
            LIMIT ?
        ''', (limit,))
    
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

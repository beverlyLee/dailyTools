import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager

class SerialDatabase:
    def __init__(self, db_path=None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), '..', 'serial_logs.db')
        
        self.db_path = os.path.abspath(db_path)
        self._init_database()
    
    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def _init_database(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    port_name TEXT NOT NULL,
                    baudrate INTEGER NOT NULL,
                    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_time TIMESTAMP,
                    description TEXT
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS serial_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    direction TEXT NOT NULL,
                    data_type TEXT NOT NULL,
                    raw_data BLOB,
                    display_text TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions(id)
                )
            ''')
            
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON serial_logs(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_session ON serial_logs(session_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_direction ON serial_logs(direction)')
            
            conn.commit()
    
    def create_session(self, port_name, baudrate, description=''):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO sessions (port_name, baudrate, start_time, description)
                VALUES (?, ?, CURRENT_TIMESTAMP, ?)
            ''', (port_name, baudrate, description))
            conn.commit()
            return cursor.lastrowid
    
    def close_session(self, session_id):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE sessions SET end_time = CURRENT_TIMESTAMP WHERE id = ?
            ''', (session_id,))
            conn.commit()
    
    def log_data(self, session_id, direction, data_type, raw_data, display_text):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO serial_logs (session_id, direction, data_type, raw_data, display_text)
                VALUES (?, ?, ?, ?, ?)
            ''', (session_id, direction, data_type, raw_data, display_text))
            conn.commit()
    
    def log_received(self, session_id, data_type, raw_data, display_text):
        self.log_data(session_id, 'RX', data_type, raw_data, display_text)
    
    def log_sent(self, session_id, data_type, raw_data, display_text):
        self.log_data(session_id, 'TX', data_type, raw_data, display_text)
    
    def search_logs(self, keyword=None, session_id=None, direction=None, 
                     start_time=None, end_time=None, limit=100, offset=0):
        query = '''
            SELECT l.*, s.port_name, s.baudrate
            FROM serial_logs l
            LEFT JOIN sessions s ON l.session_id = s.id
            WHERE 1=1
        '''
        params = []
        
        if keyword:
            query += ' AND (l.display_text LIKE ? OR hex(l.raw_data) LIKE ?)'
            params.extend([f'%{keyword}%', f'%{keyword}%'])
        
        if session_id is not None:
            query += ' AND l.session_id = ?'
            params.append(session_id)
        
        if direction:
            query += ' AND l.direction = ?'
            params.append(direction)
        
        if start_time:
            query += ' AND l.timestamp >= ?'
            params.append(start_time)
        
        if end_time:
            query += ' AND l.timestamp <= ?'
            params.append(end_time)
        
        query += ' ORDER BY l.timestamp DESC LIMIT ? OFFSET ?'
        params.extend([limit, offset])
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_sessions(self, limit=50):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM sessions ORDER BY start_time DESC LIMIT ?
            ''', (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_session_logs(self, session_id, limit=1000):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM serial_logs 
                WHERE session_id = ? 
                ORDER BY timestamp ASC 
                LIMIT ?
            ''', (session_id, limit))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_log_count(self, session_id=None, keyword=None):
        query = 'SELECT COUNT(*) FROM serial_logs WHERE 1=1'
        params = []
        
        if session_id is not None:
            query += ' AND session_id = ?'
            params.append(session_id)
        
        if keyword:
            query += ' AND (display_text LIKE ? OR hex(raw_data) LIKE ?)'
            params.extend([f'%{keyword}%', f'%{keyword}%'])
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.fetchone()[0]
    
    def delete_session(self, session_id):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM serial_logs WHERE session_id = ?', (session_id,))
            cursor.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
            conn.commit()
    
    def clear_all_logs(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM serial_logs')
            cursor.execute('DELETE FROM sessions')
            conn.commit()

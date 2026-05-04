import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional


class Database:
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'monitor.db')
        
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db_path = db_path
        self._init_db()
    
    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_db(self):
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cpu_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME NOT NULL,
                total_usage REAL NOT NULL,
                per_core_usage TEXT NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memory_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME NOT NULL,
                total REAL NOT NULL,
                available REAL NOT NULL,
                used REAL NOT NULL,
                percent REAL NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS disk_io_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME NOT NULL,
                read_bytes INTEGER NOT NULL,
                write_bytes INTEGER NOT NULL,
                read_count INTEGER NOT NULL,
                write_count INTEGER NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS network_io_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME NOT NULL,
                bytes_sent INTEGER NOT NULL,
                bytes_recv INTEGER NOT NULL,
                packets_sent INTEGER NOT NULL,
                packets_recv INTEGER NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS gpu_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME NOT NULL,
                usage REAL NOT NULL,
                memory_used REAL,
                memory_total REAL
            )
        ''')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cpu_timestamp ON cpu_data(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory_data(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_disk_timestamp ON disk_io_data(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_network_timestamp ON network_io_data(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_gpu_timestamp ON gpu_data(timestamp)')
        
        conn.commit()
        conn.close()
    
    def insert_cpu_data(self, total_usage: float, per_core_usage: List[float]):
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT INTO cpu_data (timestamp, total_usage, per_core_usage) VALUES (?, ?, ?)',
            (datetime.now().isoformat(), total_usage, str(per_core_usage))
        )
        
        conn.commit()
        conn.close()
    
    def insert_memory_data(self, total: float, available: float, used: float, percent: float):
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT INTO memory_data (timestamp, total, available, used, percent) VALUES (?, ?, ?, ?, ?)',
            (datetime.now().isoformat(), total, available, used, percent)
        )
        
        conn.commit()
        conn.close()
    
    def insert_disk_io_data(self, read_bytes: int, write_bytes: int, read_count: int, write_count: int):
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT INTO disk_io_data (timestamp, read_bytes, write_bytes, read_count, write_count) VALUES (?, ?, ?, ?, ?)',
            (datetime.now().isoformat(), read_bytes, write_bytes, read_count, write_count)
        )
        
        conn.commit()
        conn.close()
    
    def insert_network_io_data(self, bytes_sent: int, bytes_recv: int, packets_sent: int, packets_recv: int):
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT INTO network_io_data (timestamp, bytes_sent, bytes_recv, packets_sent, packets_recv) VALUES (?, ?, ?, ?, ?)',
            (datetime.now().isoformat(), bytes_sent, bytes_recv, packets_sent, packets_recv)
        )
        
        conn.commit()
        conn.close()
    
    def insert_gpu_data(self, usage: float, memory_used: Optional[float] = None, memory_total: Optional[float] = None):
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'INSERT INTO gpu_data (timestamp, usage, memory_used, memory_total) VALUES (?, ?, ?, ?)',
            (datetime.now().isoformat(), usage, memory_used, memory_total)
        )
        
        conn.commit()
        conn.close()
    
    def get_cpu_history(self, hours: float = 1) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT timestamp, total_usage, per_core_usage 
               FROM cpu_data 
               WHERE timestamp >= datetime('now', ?)
               ORDER BY timestamp''',
            (f'-{hours} hours',)
        )
        
        rows = cursor.fetchall()
        conn.close()
        
        result = []
        for row in rows:
            result.append({
                'timestamp': row['timestamp'],
                'total_usage': row['total_usage'],
                'per_core_usage': eval(row['per_core_usage'])
            })
        
        return result
    
    def get_memory_history(self, hours: float = 1) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT timestamp, total, available, used, percent 
               FROM memory_data 
               WHERE timestamp >= datetime('now', ?)
               ORDER BY timestamp''',
            (f'-{hours} hours',)
        )
        
        rows = cursor.fetchall()
        conn.close()
        
        result = []
        for row in rows:
            result.append({
                'timestamp': row['timestamp'],
                'total': row['total'],
                'available': row['available'],
                'used': row['used'],
                'percent': row['percent']
            })
        
        return result
    
    def get_disk_io_history(self, hours: float = 1) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT timestamp, read_bytes, write_bytes, read_count, write_count 
               FROM disk_io_data 
               WHERE timestamp >= datetime('now', ?)
               ORDER BY timestamp''',
            (f'-{hours} hours',)
        )
        
        rows = cursor.fetchall()
        conn.close()
        
        result = []
        for row in rows:
            result.append({
                'timestamp': row['timestamp'],
                'read_bytes': row['read_bytes'],
                'write_bytes': row['write_bytes'],
                'read_count': row['read_count'],
                'write_count': row['write_count']
            })
        
        return result
    
    def get_network_io_history(self, hours: float = 1) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT timestamp, bytes_sent, bytes_recv, packets_sent, packets_recv 
               FROM network_io_data 
               WHERE timestamp >= datetime('now', ?)
               ORDER BY timestamp''',
            (f'-{hours} hours',)
        )
        
        rows = cursor.fetchall()
        conn.close()
        
        result = []
        for row in rows:
            result.append({
                'timestamp': row['timestamp'],
                'bytes_sent': row['bytes_sent'],
                'bytes_recv': row['bytes_recv'],
                'packets_sent': row['packets_sent'],
                'packets_recv': row['packets_recv']
            })
        
        return result
    
    def get_gpu_history(self, hours: float = 1) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT timestamp, usage, memory_used, memory_total 
               FROM gpu_data 
               WHERE timestamp >= datetime('now', ?)
               ORDER BY timestamp''',
            (f'-{hours} hours',)
        )
        
        rows = cursor.fetchall()
        conn.close()
        
        result = []
        for row in rows:
            result.append({
                'timestamp': row['timestamp'],
                'usage': row['usage'],
                'memory_used': row['memory_used'],
                'memory_total': row['memory_total']
            })
        
        return result
    
    def cleanup_old_data(self, days: int = 7):
        conn = self._get_connection()
        cursor = conn.cursor()
        
        tables = ['cpu_data', 'memory_data', 'disk_io_data', 'network_io_data', 'gpu_data']
        for table in tables:
            cursor.execute(
                f"DELETE FROM {table} WHERE timestamp < datetime('now', ?)",
                (f'-{days} days',)
            )
        
        conn.commit()
        conn.close()

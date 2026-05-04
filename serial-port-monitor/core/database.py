import sqlite3
import os
from datetime import datetime
from typing import List, Optional, Tuple


class Database:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.db_path = os.path.join(db_dir, "serial_logs.db")
        else:
            self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                direction TEXT NOT NULL,
                data_type TEXT NOT NULL,
                raw_data TEXT NOT NULL,
                decoded_data TEXT,
                port_name TEXT,
                baud_rate INTEGER
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON logs(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_decoded_data ON logs(decoded_data)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_direction ON logs(direction)")
        
        conn.commit()
        conn.close()

    def insert_log(self, direction: str, data_type: str, raw_data: str, 
                   decoded_data: str, port_name: str, baud_rate: int) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        
        cursor.execute("""
            INSERT INTO logs (timestamp, direction, data_type, raw_data, decoded_data, port_name, baud_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (timestamp, direction, data_type, raw_data, decoded_data, port_name, baud_rate))
        
        log_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return log_id

    def query_logs(self, keyword: str = "", direction: str = None, 
                   start_time: str = None, end_time: str = None,
                   limit: int = 1000) -> List[Tuple]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = "SELECT id, timestamp, direction, data_type, raw_data, decoded_data, port_name, baud_rate FROM logs WHERE 1=1"
        params = []
        
        if keyword:
            query += " AND (decoded_data LIKE ? OR raw_data LIKE ?)"
            params.extend([f"%{keyword}%", f"%{keyword}%"])
        
        if direction:
            query += " AND direction = ?"
            params.append(direction)
        
        if start_time:
            query += " AND timestamp >= ?"
            params.append(start_time)
        
        if end_time:
            query += " AND timestamp <= ?"
            params.append(end_time)
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        conn.close()
        return results

    def clear_logs(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM logs")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='logs'")
        conn.commit()
        conn.close()

    def get_log_count(self) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM logs")
        count = cursor.fetchone()[0]
        conn.close()
        return count

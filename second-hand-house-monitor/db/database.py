import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional, Tuple


class Database:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'house_prices.db')
        self.db_path = os.path.abspath(db_path)
        self._ensure_data_dir()
        self._init_tables()

    def _ensure_data_dir(self):
        data_dir = os.path.dirname(self.db_path)
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_tables(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS cities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    province TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS districts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    city_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    latitude REAL,
                    longitude REAL,
                    FOREIGN KEY (city_id) REFERENCES cities(id),
                    UNIQUE(city_id, name)
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS price_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    district_id INTEGER NOT NULL,
                    record_date DATE NOT NULL,
                    avg_price REAL NOT NULL,
                    median_price REAL,
                    total_listings INTEGER,
                    avg_area REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (district_id) REFERENCES districts(id),
                    UNIQUE(district_id, record_date)
                )
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_price_records_date 
                ON price_records(record_date)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_price_records_district 
                ON price_records(district_id)
            ''')
            
            conn.commit()

    def add_city(self, name: str, province: str = None) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT OR IGNORE INTO cities (name, province) VALUES (?, ?)',
                (name, province)
            )
            cursor.execute('SELECT id FROM cities WHERE name = ?', (name,))
            return cursor.fetchone()['id']

    def add_district(self, city_id: int, name: str, 
                     latitude: float = None, longitude: float = None) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT OR IGNORE INTO districts (city_id, name, latitude, longitude) VALUES (?, ?, ?, ?)',
                (city_id, name, latitude, longitude)
            )
            cursor.execute(
                'SELECT id FROM districts WHERE city_id = ? AND name = ?',
                (city_id, name)
            )
            return cursor.fetchone()['id']

    def add_price_record(self, district_id: int, record_date: str, 
                         avg_price: float, median_price: float = None,
                         total_listings: int = None, avg_area: float = None) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO price_records 
                (district_id, record_date, avg_price, median_price, total_listings, avg_area)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (district_id, record_date, avg_price, median_price, total_listings, avg_area))
            return cursor.lastrowid

    def get_cities(self) -> List[Dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM cities ORDER BY name')
            return [dict(row) for row in cursor.fetchall()]

    def get_districts(self, city_id: int = None) -> List[Dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if city_id:
                cursor.execute('''
                    SELECT d.*, c.name as city_name 
                    FROM districts d 
                    JOIN cities c ON d.city_id = c.id 
                    WHERE d.city_id = ? 
                    ORDER BY d.name
                ''', (city_id,))
            else:
                cursor.execute('''
                    SELECT d.*, c.name as city_name 
                    FROM districts d 
                    JOIN cities c ON d.city_id = c.id 
                    ORDER BY c.name, d.name
                ''')
            return [dict(row) for row in cursor.fetchall()]

    def get_price_records(self, district_id: int = None, city_id: int = None,
                          start_date: str = None, end_date: str = None) -> List[Dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            query = '''
                SELECT pr.*, d.name as district_name, c.name as city_name
                FROM price_records pr
                JOIN districts d ON pr.district_id = d.id
                JOIN cities c ON d.city_id = c.id
                WHERE 1=1
            '''
            params = []
            
            if district_id:
                query += ' AND pr.district_id = ?'
                params.append(district_id)
            
            if city_id:
                query += ' AND d.city_id = ?'
                params.append(city_id)
            
            if start_date:
                query += ' AND pr.record_date >= ?'
                params.append(start_date)
            
            if end_date:
                query += ' AND pr.record_date <= ?'
                params.append(end_date)
            
            query += ' ORDER BY pr.record_date DESC'
            
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_latest_records(self, city_id: int = None) -> List[Dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            query = '''
                SELECT pr.*, d.name as district_name, c.name as city_name,
                       d.latitude, d.longitude
                FROM price_records pr
                JOIN districts d ON pr.district_id = d.id
                JOIN cities c ON d.city_id = c.id
                WHERE (pr.district_id, pr.record_date) IN (
                    SELECT district_id, MAX(record_date)
                    FROM price_records
                    GROUP BY district_id
                )
            '''
            params = []
            if city_id:
                query += ' AND d.city_id = ?'
                params.append(city_id)
            
            query += ' ORDER BY c.name, d.name'
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_district_by_name(self, city_name: str, district_name: str) -> Optional[Dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT d.*, c.name as city_name
                FROM districts d
                JOIN cities c ON d.city_id = c.id
                WHERE c.name = ? AND d.name = ?
            ''', (city_name, district_name))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_city_by_name(self, name: str) -> Optional[Dict]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM cities WHERE name = ?', (name,))
            row = cursor.fetchone()
            return dict(row) if row else None

import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config.settings import settings


class Database:
    def __init__(self, db_path: str = None):
        self.db_path = db_path or settings.DATABASE_PATH
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def init_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform TEXT NOT NULL,
                product_name TEXT NOT NULL,
                product_url TEXT,
                sku TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER,
                price REAL NOT NULL,
                source_type TEXT NOT NULL DEFAULT 'mock',
                crawl_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER,
                comment_text TEXT NOT NULL,
                comment_user TEXT,
                comment_time TIMESTAMP,
                sentiment_score REAL,
                taste_score REAL,
                packaging_score REAL,
                logistics_score REAL,
                has_counterfeit_mention BOOLEAN DEFAULT 0,
                source_type TEXT NOT NULL DEFAULT 'mock',
                crawl_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
        ''')

        conn.commit()
        conn.close()

    def get_or_create_product(self, platform: str, product_name: str, product_url: str = None, sku: str = None) -> int:
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM products WHERE platform = ? AND product_name = ?',
                       (platform, product_name))
        result = cursor.fetchone()

        if result:
            product_id = result[0]
        else:
            cursor.execute(
                'INSERT INTO products (platform, product_name, product_url, sku) VALUES (?, ?, ?, ?)',
                (platform, product_name, product_url, sku)
            )
            product_id = cursor.lastrowid
            conn.commit()

        conn.close()
        return product_id

    def save_price(self, product_id: int, price: float, source_type: str = 'mock'):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO price_history (product_id, price, source_type) VALUES (?, ?, ?)',
            (product_id, price, source_type)
        )
        conn.commit()
        conn.close()

    def save_price_with_time(self, product_id: int, price: float, source_type: str = 'mock', crawl_time: str = None):
        conn = self.get_connection()
        cursor = conn.cursor()
        if crawl_time:
            cursor.execute(
                'INSERT INTO price_history (product_id, price, source_type, crawl_time) VALUES (?, ?, ?, ?)',
                (product_id, price, source_type, crawl_time)
            )
        else:
            cursor.execute(
                'INSERT INTO price_history (product_id, price, source_type) VALUES (?, ?, ?)',
                (product_id, price, source_type)
            )
        conn.commit()
        conn.close()

    def save_comment(self, product_id: int, comment_text: str, sentiment_data: Dict,
                     comment_user: str = None, comment_time: str = None, source_type: str = 'mock'):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO comments (product_id, comment_text, comment_user, comment_time,
                                  sentiment_score, taste_score, packaging_score, logistics_score,
                                  has_counterfeit_mention, source_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            product_id, comment_text, comment_user, comment_time,
            sentiment_data.get('sentiment_score', 0),
            sentiment_data.get('taste_score', 0),
            sentiment_data.get('packaging_score', 0),
            sentiment_data.get('logistics_score', 0),
            sentiment_data.get('has_counterfeit_mention', False),
            source_type
        ))
        conn.commit()
        conn.close()

    def get_price_history(self, product_id: int, limit: int = 100, source_type: str = None) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()

        if source_type:
            cursor.execute('''
                SELECT price, source_type, crawl_time FROM price_history
                WHERE product_id = ? AND source_type = ? ORDER BY crawl_time DESC LIMIT ?
            ''', (product_id, source_type, limit))
        else:
            cursor.execute('''
                SELECT price, source_type, crawl_time FROM price_history
                WHERE product_id = ? ORDER BY crawl_time DESC LIMIT ?
            ''', (product_id, limit))

        results = cursor.fetchall()
        conn.close()

        return [
            {
                'price': r[0],
                'source_type': r[1],
                'time': r[2]
            }
            for r in results
        ]

    def get_sentiment_stats(self, product_id: int, limit: int = 100, source_type: str = None) -> Dict:
        conn = self.get_connection()
        cursor = conn.cursor()

        if source_type:
            cursor.execute('''
                SELECT AVG(sentiment_score), AVG(taste_score), AVG(packaging_score),
                       AVG(logistics_score), SUM(has_counterfeit_mention), COUNT(*)
                FROM (SELECT * FROM comments WHERE product_id = ? AND source_type = ? ORDER BY crawl_time DESC LIMIT ?)
            ''', (product_id, source_type, limit))
        else:
            cursor.execute('''
                SELECT AVG(sentiment_score), AVG(taste_score), AVG(packaging_score),
                       AVG(logistics_score), SUM(has_counterfeit_mention), COUNT(*)
                FROM (SELECT * FROM comments WHERE product_id = ? ORDER BY crawl_time DESC LIMIT ?)
            ''', (product_id, limit))

        result = cursor.fetchone()
        conn.close()

        return {
            'avg_sentiment': result[0] or 0,
            'avg_taste': result[1] or 0,
            'avg_packaging': result[2] or 0,
            'avg_logistics': result[3] or 0,
            'counterfeit_count': result[4] or 0,
            'total_comments': result[5] or 0
        }

    def get_all_products(self) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, platform, product_name, product_url, sku FROM products')
        results = cursor.fetchall()
        conn.close()

        return [
            {
                'id': r[0],
                'platform': r[1],
                'name': r[2],
                'url': r[3],
                'sku': r[4]
            }
            for r in results
        ]

    def get_latest_price(self, product_id: int) -> Dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT price, source_type, crawl_time FROM price_history
            WHERE product_id = ? ORDER BY id DESC LIMIT 1
        ''', (product_id,))
        result = cursor.fetchone()
        conn.close()

        if result:
            return {
                'price': result[0],
                'source_type': result[1],
                'time': result[2]
            }
        return None


db = Database()

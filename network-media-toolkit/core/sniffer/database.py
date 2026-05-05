#!/usr/bin/env python3
"""
数据库模块：使用 SQLite 存储抓包数据
"""

import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional


class PacketDatabase:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'packets.db')
        self.db_path = db_path
        self._ensure_data_directory()
        self.conn = None
        self.init_database()

    def _ensure_data_directory(self):
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir)

    def init_database(self):
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        cursor = self.conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS packets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                source_ip TEXT,
                dest_ip TEXT,
                source_port INTEGER,
                dest_port INTEGER,
                protocol TEXT NOT NULL,
                length INTEGER,
                raw_hex TEXT,
                summary TEXT,
                details TEXT,
                http_method TEXT,
                http_url TEXT,
                http_headers TEXT,
                http_body TEXT,
                dns_query TEXT,
                dns_response TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_protocol ON packets(protocol)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_timestamp ON packets(timestamp)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_source_ip ON packets(source_ip)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_dest_ip ON packets(dest_ip)
        ''')
        
        self.conn.commit()

    def insert_packet(self, packet_info: Dict[str, Any]) -> int:
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO packets (
                timestamp, source_ip, dest_ip, source_port, dest_port,
                protocol, length, raw_hex, summary, details,
                http_method, http_url, http_headers, http_body,
                dns_query, dns_response
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            packet_info.get('timestamp', datetime.now().timestamp()),
            packet_info.get('source_ip'),
            packet_info.get('dest_ip'),
            packet_info.get('source_port'),
            packet_info.get('dest_port'),
            packet_info.get('protocol', 'UNKNOWN'),
            packet_info.get('length'),
            packet_info.get('raw_hex'),
            packet_info.get('summary'),
            packet_info.get('details'),
            packet_info.get('http_method'),
            packet_info.get('http_url'),
            packet_info.get('http_headers'),
            packet_info.get('http_body'),
            packet_info.get('dns_query'),
            packet_info.get('dns_response')
        ))
        self.conn.commit()
        return cursor.lastrowid

    def insert_packets(self, packets: List[Dict[str, Any]]) -> int:
        count = 0
        for packet in packets:
            self.insert_packet(packet)
            count += 1
        return count

    def get_packets(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT id, timestamp, source_ip, dest_ip, source_port, dest_port,
                   protocol, length, summary
            FROM packets
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        ''', (limit, offset))
        
        return [dict(row) for row in cursor.fetchall()]

    def get_packet_details(self, packet_id: int) -> Optional[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM packets WHERE id = ?
        ''', (packet_id,))
        
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None

    def search_packets(self, query: str, limit: int = 100) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        search_query = f"%{query}%"
        cursor.execute('''
            SELECT id, timestamp, source_ip, dest_ip, source_port, dest_port,
                   protocol, length, summary
            FROM packets
            WHERE source_ip LIKE ? OR dest_ip LIKE ? OR protocol LIKE ? OR summary LIKE ?
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (search_query, search_query, search_query, search_query, limit))
        
        return [dict(row) for row in cursor.fetchall()]

    def get_packet_count(self) -> int:
        cursor = self.conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM packets')
        return cursor.fetchone()[0]

    def clear_packets(self) -> int:
        cursor = self.conn.cursor()
        cursor.execute('DELETE FROM packets')
        count = cursor.rowcount
        self.conn.commit()
        return count

    def close(self):
        if self.conn:
            self.conn.close()
            self.conn = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

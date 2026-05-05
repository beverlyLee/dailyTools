import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager
import json

class NetworkDatabase:
    def __init__(self, db_path=None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), '..', 'network_captures.db')
        
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
                CREATE TABLE IF NOT EXISTS capture_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    interface TEXT NOT NULL,
                    bpf_filter TEXT,
                    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_time TIMESTAMP,
                    packet_count INTEGER DEFAULT 0
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS packets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    summary TEXT,
                    layers TEXT,
                    src_mac TEXT,
                    dst_mac TEXT,
                    src_ip TEXT,
                    dst_ip TEXT,
                    protocol INTEGER,
                    src_port INTEGER,
                    dst_port INTEGER,
                    tcp_flags TEXT,
                    http_type TEXT,
                    http_method TEXT,
                    http_path TEXT,
                    http_status INTEGER,
                    dns_type TEXT,
                    dns_questions TEXT,
                    dns_answers TEXT,
                    payload BLOB,
                    raw_packet BLOB,
                    FOREIGN KEY (session_id) REFERENCES capture_sessions(id)
                )
            ''')
            
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_packets_timestamp ON packets(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_packets_session ON packets(session_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_packets_protocol ON packets(protocol)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_packets_src_ip ON packets(src_ip)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_packets_dst_ip ON packets(dst_ip)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_packets_src_port ON packets(src_port)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_packets_dst_port ON packets(dst_port)')
            
            conn.commit()
    
    def create_session(self, interface, bpf_filter=''):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO capture_sessions (interface, bpf_filter, start_time)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            ''', (interface, bpf_filter))
            conn.commit()
            return cursor.lastrowid
    
    def close_session(self, session_id, packet_count=0):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE capture_sessions 
                SET end_time = CURRENT_TIMESTAMP, packet_count = ?
                WHERE id = ?
            ''', (packet_count, session_id))
            conn.commit()
    
    def save_packet(self, session_id, packet_info):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            dns_questions_json = None
            if packet_info.get('dns_questions'):
                dns_questions_json = json.dumps(packet_info['dns_questions'], ensure_ascii=False)
            
            dns_answers_json = None
            if packet_info.get('dns_answers'):
                dns_answers_json = json.dumps(packet_info['dns_answers'], ensure_ascii=False)
            
            layers_json = json.dumps(packet_info.get('layers', []), ensure_ascii=False)
            
            cursor.execute('''
                INSERT INTO packets (
                    session_id, timestamp, summary, layers, src_mac, dst_mac,
                    src_ip, dst_ip, protocol, src_port, dst_port, tcp_flags,
                    http_type, http_method, http_path, http_status,
                    dns_type, dns_questions, dns_answers, payload, raw_packet
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                session_id,
                packet_info.get('timestamp'),
                packet_info.get('summary'),
                layers_json,
                packet_info.get('src_mac'),
                packet_info.get('dst_mac'),
                packet_info.get('src_ip'),
                packet_info.get('dst_ip'),
                packet_info.get('protocol'),
                packet_info.get('src_port'),
                packet_info.get('dst_port'),
                packet_info.get('flags'),
                packet_info.get('http_type'),
                packet_info.get('http_method'),
                packet_info.get('http_path'),
                packet_info.get('http_status'),
                packet_info.get('dns_type'),
                dns_questions_json,
                dns_answers_json,
                packet_info.get('payload'),
                packet_info.get('raw_packet')
            ))
            conn.commit()
            return cursor.lastrowid
    
    def get_sessions(self, limit=50):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM capture_sessions ORDER BY start_time DESC LIMIT ?
            ''', (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_session_packets(self, session_id, limit=1000, offset=0):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM packets 
                WHERE session_id = ? 
                ORDER BY timestamp ASC 
                LIMIT ? OFFSET ?
            ''', (session_id, limit, offset))
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                row_dict = dict(row)
                if row_dict.get('dns_questions'):
                    try:
                        row_dict['dns_questions'] = json.loads(row_dict['dns_questions'])
                    except:
                        pass
                if row_dict.get('dns_answers'):
                    try:
                        row_dict['dns_answers'] = json.loads(row_dict['dns_answers'])
                    except:
                        pass
                if row_dict.get('layers'):
                    try:
                        row_dict['layers'] = json.loads(row_dict['layers'])
                    except:
                        pass
                results.append(row_dict)
            
            return results
    
    def search_packets(self, keyword=None, session_id=None, protocol=None,
                        src_ip=None, dst_ip=None, src_port=None, dst_port=None,
                        http_method=None, dns_type=None,
                        start_time=None, end_time=None,
                        limit=100, offset=0):
        query = 'SELECT * FROM packets WHERE 1=1'
        params = []
        
        if keyword:
            query += ''' AND (summary LIKE ? OR src_ip LIKE ? OR dst_ip LIKE ? 
                       OR http_path LIKE ? OR http_method LIKE ?)'''
            keyword_param = f'%{keyword}%'
            params.extend([keyword_param, keyword_param, keyword_param, keyword_param, keyword_param])
        
        if session_id is not None:
            query += ' AND session_id = ?'
            params.append(session_id)
        
        if protocol is not None:
            query += ' AND protocol = ?'
            params.append(protocol)
        
        if src_ip:
            query += ' AND src_ip = ?'
            params.append(src_ip)
        
        if dst_ip:
            query += ' AND dst_ip = ?'
            params.append(dst_ip)
        
        if src_port is not None:
            query += ' AND src_port = ?'
            params.append(src_port)
        
        if dst_port is not None:
            query += ' AND dst_port = ?'
            params.append(dst_port)
        
        if http_method:
            query += ' AND http_method = ?'
            params.append(http_method)
        
        if dns_type:
            query += ' AND dns_type = ?'
            params.append(dns_type)
        
        if start_time:
            query += ' AND timestamp >= ?'
            params.append(start_time)
        
        if end_time:
            query += ' AND timestamp <= ?'
            params.append(end_time)
        
        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
        params.extend([limit, offset])
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                row_dict = dict(row)
                if row_dict.get('dns_questions'):
                    try:
                        row_dict['dns_questions'] = json.loads(row_dict['dns_questions'])
                    except:
                        pass
                if row_dict.get('dns_answers'):
                    try:
                        row_dict['dns_answers'] = json.loads(row_dict['dns_answers'])
                    except:
                        pass
                if row_dict.get('layers'):
                    try:
                        row_dict['layers'] = json.loads(row_dict['layers'])
                    except:
                        pass
                results.append(row_dict)
            
            return results
    
    def get_packet_count(self, session_id=None, keyword=None):
        query = 'SELECT COUNT(*) FROM packets WHERE 1=1'
        params = []
        
        if session_id is not None:
            query += ' AND session_id = ?'
            params.append(session_id)
        
        if keyword:
            query += ''' AND (summary LIKE ? OR src_ip LIKE ? OR dst_ip LIKE ? 
                       OR http_path LIKE ? OR http_method LIKE ?)'''
            keyword_param = f'%{keyword}%'
            params.extend([keyword_param, keyword_param, keyword_param, keyword_param, keyword_param])
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.fetchone()[0]
    
    def delete_session(self, session_id):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM packets WHERE session_id = ?', (session_id,))
            cursor.execute('DELETE FROM capture_sessions WHERE id = ?', (session_id,))
            conn.commit()
    
    def clear_all_captures(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM packets')
            cursor.execute('DELETE FROM capture_sessions')
            conn.commit()

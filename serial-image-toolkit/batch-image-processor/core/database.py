import sqlite3
import os
import json
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from batch_image_processor.core.rule_engine import RenameRule


class ImageDatabase:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.db_path = os.path.join(db_dir, "data", "image_processor.db")
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        else:
            self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rename_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                use_sequence INTEGER DEFAULT 1,
                sequence_start INTEGER DEFAULT 1,
                sequence_padding INTEGER DEFAULT 4,
                sequence_prefix TEXT DEFAULT '',
                sequence_suffix TEXT DEFAULT '',
                use_date INTEGER DEFAULT 0,
                date_format TEXT DEFAULT '%Y%m%d',
                date_source TEXT DEFAULT 'file_modified',
                use_exif INTEGER DEFAULT 0,
                exif_fields TEXT,
                use_custom_text INTEGER DEFAULT 0,
                custom_text TEXT DEFAULT '',
                custom_text_position TEXT DEFAULT 'prefix',
                separator TEXT DEFAULT '_',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS processing_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_filename TEXT,
                new_filename TEXT,
                original_path TEXT,
                output_path TEXT,
                resize_width INTEGER,
                resize_height INTEGER,
                resize_keep_aspect INTEGER DEFAULT 1,
                crop_x INTEGER,
                crop_y INTEGER,
                crop_width INTEGER,
                crop_height INTEGER,
                rotation_angle REAL DEFAULT 0.0,
                output_format TEXT DEFAULT 'original',
                output_quality INTEGER DEFAULT 90,
                watermark_type TEXT,
                watermark_text TEXT,
                watermark_image_path TEXT,
                watermark_position TEXT DEFAULT 'bottom_right',
                watermark_opacity REAL DEFAULT 0.5,
                watermark_size INTEGER DEFAULT 32,
                rule_id INTEGER,
                processed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'success',
                error_message TEXT,
                FOREIGN KEY (rule_id) REFERENCES rename_rules (id)
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rules_name ON rename_rules(name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_processed_at ON processing_history(processed_at)")
        
        conn.commit()
        conn.close()

    def save_rule(self, rule: RenameRule) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        
        if rule.id:
            cursor.execute("""
                UPDATE rename_rules SET
                    name = ?, description = ?,
                    use_sequence = ?, sequence_start = ?, sequence_padding = ?,
                    sequence_prefix = ?, sequence_suffix = ?,
                    use_date = ?, date_format = ?, date_source = ?,
                    use_exif = ?, exif_fields = ?,
                    use_custom_text = ?, custom_text = ?, custom_text_position = ?,
                    separator = ?, updated_at = ?
                WHERE id = ?
            """, (
                rule.name, rule.description,
                1 if rule.use_sequence else 0, rule.sequence_start, rule.sequence_padding,
                rule.sequence_prefix, rule.sequence_suffix,
                1 if rule.use_date else 0, rule.date_format, rule.date_source,
                1 if rule.use_exif else 0, rule.exif_fields,
                1 if rule.use_custom_text else 0, rule.custom_text, rule.custom_text_position,
                rule.separator, now, rule.id
            ))
            rule_id = rule.id
        else:
            cursor.execute("""
                INSERT INTO rename_rules (
                    name, description,
                    use_sequence, sequence_start, sequence_padding,
                    sequence_prefix, sequence_suffix,
                    use_date, date_format, date_source,
                    use_exif, exif_fields,
                    use_custom_text, custom_text, custom_text_position,
                    separator, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                rule.name, rule.description,
                1 if rule.use_sequence else 0, rule.sequence_start, rule.sequence_padding,
                rule.sequence_prefix, rule.sequence_suffix,
                1 if rule.use_date else 0, rule.date_format, rule.date_source,
                1 if rule.use_exif else 0, rule.exif_fields,
                1 if rule.use_custom_text else 0, rule.custom_text, rule.custom_text_position,
                rule.separator, now, now
            ))
            rule_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return rule_id

    def get_rule(self, rule_id: int) -> Optional[RenameRule]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, description,
                   use_sequence, sequence_start, sequence_padding,
                   sequence_prefix, sequence_suffix,
                   use_date, date_format, date_source,
                   use_exif, exif_fields,
                   use_custom_text, custom_text, custom_text_position,
                   separator, created_at, updated_at
            FROM rename_rules WHERE id = ?
        """, (rule_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return self._row_to_rule(row)
        return None

    def get_rule_by_name(self, name: str) -> Optional[RenameRule]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, description,
                   use_sequence, sequence_start, sequence_padding,
                   sequence_prefix, sequence_suffix,
                   use_date, date_format, date_source,
                   use_exif, exif_fields,
                   use_custom_text, custom_text, custom_text_position,
                   separator, created_at, updated_at
            FROM rename_rules WHERE name = ?
        """, (name,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return self._row_to_rule(row)
        return None

    def get_all_rules(self) -> List[RenameRule]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, description,
                   use_sequence, sequence_start, sequence_padding,
                   sequence_prefix, sequence_suffix,
                   use_date, date_format, date_source,
                   use_exif, exif_fields,
                   use_custom_text, custom_text, custom_text_position,
                   separator, created_at, updated_at
            FROM rename_rules ORDER BY updated_at DESC
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        return [self._row_to_rule(row) for row in rows]

    def delete_rule(self, rule_id: int) -> bool:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM rename_rules WHERE id = ?", (rule_id,))
        deleted = cursor.rowcount > 0
        
        conn.commit()
        conn.close()
        return deleted

    def _row_to_rule(self, row) -> RenameRule:
        return RenameRule(
            id=row[0],
            name=row[1] or "",
            description=row[2] or "",
            use_sequence=bool(row[3]),
            sequence_start=row[4] or 1,
            sequence_padding=row[5] or 4,
            sequence_prefix=row[6] or "",
            sequence_suffix=row[7] or "",
            use_date=bool(row[8]),
            date_format=row[9] or "%Y%m%d",
            date_source=row[10] or "file_modified",
            use_exif=bool(row[11]),
            exif_fields=row[12] or "",
            use_custom_text=bool(row[13]),
            custom_text=row[14] or "",
            custom_text_position=row[15] or "prefix",
            separator=row[16] or "_",
            created_at=row[17],
            updated_at=row[18]
        )

    def log_processing(self, **kwargs) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        
        cursor.execute("""
            INSERT INTO processing_history (
                original_filename, new_filename, original_path, output_path,
                resize_width, resize_height, resize_keep_aspect,
                crop_x, crop_y, crop_width, crop_height,
                rotation_angle, output_format, output_quality,
                watermark_type, watermark_text, watermark_image_path,
                watermark_position, watermark_opacity, watermark_size,
                rule_id, processed_at, status, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            kwargs.get('original_filename'),
            kwargs.get('new_filename'),
            kwargs.get('original_path'),
            kwargs.get('output_path'),
            kwargs.get('resize_width'),
            kwargs.get('resize_height'),
            1 if kwargs.get('resize_keep_aspect', True) else 0,
            kwargs.get('crop_x'),
            kwargs.get('crop_y'),
            kwargs.get('crop_width'),
            kwargs.get('crop_height'),
            kwargs.get('rotation_angle', 0.0),
            kwargs.get('output_format', 'original'),
            kwargs.get('output_quality', 90),
            kwargs.get('watermark_type'),
            kwargs.get('watermark_text'),
            kwargs.get('watermark_image_path'),
            kwargs.get('watermark_position', 'bottom_right'),
            kwargs.get('watermark_opacity', 0.5),
            kwargs.get('watermark_size', 32),
            kwargs.get('rule_id'),
            now,
            kwargs.get('status', 'success'),
            kwargs.get('error_message')
        ))
        
        log_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return log_id

    def get_processing_history(self, limit: int = 100) -> List[Tuple]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, original_filename, new_filename, output_path,
                   processed_at, status, error_message
            FROM processing_history
            ORDER BY processed_at DESC
            LIMIT ?
        """, (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        return rows

    def get_rule_count(self) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM rename_rules")
        count = cursor.fetchone()[0]
        conn.close()
        return count

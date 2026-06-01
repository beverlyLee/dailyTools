import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple


class MedicineDatabase:
    def __init__(self, db_path: str = 'medicine_inventory.db'):
        self.db_path = db_path
        self._init_database()

    def _init_database(self) -> None:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS medicines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                barcode TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                manufacturer TEXT,
                expiry_date DATE NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()

    def add_medicine(self, barcode: str, name: str, expiry_date: str, 
                    manufacturer: str = '', quantity: int = 1, notes: str = '') -> bool:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO medicines 
                (barcode, name, manufacturer, expiry_date, quantity, notes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (barcode, name, manufacturer, expiry_date, quantity, notes))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error adding medicine: {e}")
            return False

    def get_medicine_by_barcode(self, barcode: str) -> Optional[Dict]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, barcode, name, manufacturer, expiry_date, quantity, notes, created_at
            FROM medicines WHERE barcode = ?
        ''', (barcode,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row[0],
                'barcode': row[1],
                'name': row[2],
                'manufacturer': row[3],
                'expiry_date': row[4],
                'quantity': row[5],
                'notes': row[6],
                'created_at': row[7]
            }
        return None

    def get_all_medicines(self) -> List[Dict]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, barcode, name, manufacturer, expiry_date, quantity, notes, created_at
            FROM medicines ORDER BY expiry_date ASC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        medicines = []
        for row in rows:
            medicines.append({
                'id': row[0],
                'barcode': row[1],
                'name': row[2],
                'manufacturer': row[3],
                'expiry_date': row[4],
                'quantity': row[5],
                'notes': row[6],
                'created_at': row[7]
            })
        return medicines

    def update_quantity(self, barcode: str, quantity: int) -> bool:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE medicines SET quantity = ?, updated_at = CURRENT_TIMESTAMP
                WHERE barcode = ?
            ''', (quantity, barcode))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error updating quantity: {e}")
            return False

    def delete_medicine(self, barcode: str) -> bool:
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('DELETE FROM medicines WHERE barcode = ?', (barcode,))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error deleting medicine: {e}")
            return False

    def get_expired_medicines(self) -> List[Dict]:
        today = datetime.now().strftime('%Y-%m-%d')
        medicines = self.get_all_medicines()
        return [med for med in medicines if med['expiry_date'] < today]

    def get_soon_expired_medicines(self, days: int = 30) -> List[Dict]:
        today = datetime.now()
        expiry_threshold = (today + timedelta(days=days)).strftime('%Y-%m-%d')
        today_str = today.strftime('%Y-%m-%d')
        
        medicines = self.get_all_medicines()
        return [med for med in medicines 
                if today_str <= med['expiry_date'] <= expiry_threshold]

    def check_expiry_status(self, expiry_date: str) -> str:
        today = datetime.now().date()
        expiry = datetime.strptime(expiry_date, '%Y-%m-%d').date()
        
        if expiry < today:
            return 'expired'
        elif (expiry - today).days <= 7:
            return 'critical'
        elif (expiry - today).days <= 30:
            return 'warning'
        else:
            return 'normal'

    def get_expiry_count(self) -> Tuple[int, int]:
        expired_count = len(self.get_expired_medicines())
        soon_count = len(self.get_soon_expired_medicines())
        return expired_count, soon_count

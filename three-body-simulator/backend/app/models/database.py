import sqlite3
import json
from datetime import datetime
from typing import List, Optional, Dict
from dataclasses import dataclass, asdict


@dataclass
class SimulationRecord:
    id: Optional[int]
    simulation_name: str
    created_at: str
    dt: float
    total_time: float
    initial_bodies: List[dict]
    trajectory_data: List[dict]
    notes: str = ""

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'simulation_name': self.simulation_name,
            'created_at': self.created_at,
            'dt': self.dt,
            'total_time': self.total_time,
            'initial_bodies': self.initial_bodies,
            'trajectory_data': self.trajectory_data,
            'notes': self.notes
        }


class DatabaseManager:
    def __init__(self, db_path: str = "three_body.db"):
        self.db_path = db_path
        self._init_database()

    def _init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS simulations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                simulation_name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                dt REAL NOT NULL,
                total_time REAL NOT NULL,
                initial_bodies TEXT NOT NULL,
                trajectory_data TEXT NOT NULL,
                notes TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_created_at 
            ON simulations(created_at)
        ''')
        
        conn.commit()
        conn.close()

    def save_simulation(self, record: SimulationRecord) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO simulations 
            (simulation_name, created_at, dt, total_time, initial_bodies, trajectory_data, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            record.simulation_name,
            record.created_at,
            record.dt,
            record.total_time,
            json.dumps(record.initial_bodies),
            json.dumps(record.trajectory_data),
            record.notes
        ))
        
        record_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return record_id

    def get_simulation(self, simulation_id: int) -> Optional[SimulationRecord]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, simulation_name, created_at, dt, total_time, initial_bodies, trajectory_data, notes
            FROM simulations WHERE id = ?
        ''', (simulation_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return SimulationRecord(
                id=row[0],
                simulation_name=row[1],
                created_at=row[2],
                dt=row[3],
                total_time=row[4],
                initial_bodies=json.loads(row[5]),
                trajectory_data=json.loads(row[6]),
                notes=row[7] if row[7] else ""
            )
        return None

    def get_all_simulations(self, limit: int = 100) -> List[SimulationRecord]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, simulation_name, created_at, dt, total_time, initial_bodies, trajectory_data, notes
            FROM simulations 
            ORDER BY created_at DESC 
            LIMIT ?
        ''', (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        records = []
        for row in rows:
            records.append(SimulationRecord(
                id=row[0],
                simulation_name=row[1],
                created_at=row[2],
                dt=row[3],
                total_time=row[4],
                initial_bodies=json.loads(row[5]),
                trajectory_data=json.loads(row[6]),
                notes=row[7] if row[7] else ""
            ))
        
        return records

    def delete_simulation(self, simulation_id: int) -> bool:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM simulations WHERE id = ?', (simulation_id,))
        affected = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        return affected > 0

    def create_simulation_record(
        self,
        simulation_name: str,
        dt: float,
        total_time: float,
        initial_bodies: List[dict],
        trajectory_data: List[dict],
        notes: str = ""
    ) -> SimulationRecord:
        return SimulationRecord(
            id=None,
            simulation_name=simulation_name,
            created_at=datetime.now().isoformat(),
            dt=dt,
            total_time=total_time,
            initial_bodies=initial_bodies,
            trajectory_data=trajectory_data,
            notes=notes
        )

    def analyze_periodicity(self, simulation_id: int) -> Dict:
        record = self.get_simulation(simulation_id)
        if not record or not record.trajectory_data:
            return {'error': 'No simulation data found'}

        trajectories = record.trajectory_data
        num_points = len(trajectories)
        num_bodies = len(trajectories[0]['bodies'])

        analysis = {
            'simulation_id': simulation_id,
            'simulation_name': record.simulation_name,
            'total_time': record.total_time,
            'dt': record.dt,
            'body_analysis': {}
        }

        for body_idx in range(num_bodies):
            positions = []
            for point in trajectories:
                pos = point['bodies'][body_idx]['position']
                positions.append(pos)

            initial_pos = positions[0]
            final_pos = positions[-1]
            
            displacement = [
                final_pos[0] - initial_pos[0],
                final_pos[1] - initial_pos[1],
                final_pos[2] - initial_pos[2]
            ]
            
            displacement_magnitude = (
                displacement[0]**2 + displacement[1]**2 + displacement[2]**2
            )**0.5

            max_distance = 0
            min_distance = float('inf')
            for pos in positions:
                dist = (pos[0]**2 + pos[1]**2 + pos[2]**2)**0.5
                if dist > max_distance:
                    max_distance = dist
                if dist < min_distance:
                    min_distance = dist

            body_name = trajectories[0]['bodies'][body_idx]['name']
            analysis['body_analysis'][body_name] = {
                'initial_position': initial_pos,
                'final_position': final_pos,
                'total_displacement': displacement,
                'displacement_magnitude': displacement_magnitude,
                'max_distance_from_origin': max_distance,
                'min_distance_from_origin': min_distance,
                'stability_estimate': 'stable' if displacement_magnitude < 1e-3 else 'unstable'
            }

        return analysis

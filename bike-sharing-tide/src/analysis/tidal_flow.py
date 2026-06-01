from typing import List, Dict, Any, Tuple
from collections import defaultdict
from datetime import datetime
import os
from dotenv import load_dotenv
from src.data.trip_flow import trip_flow

load_dotenv()


class TidalFlowAnalyzer:
    def __init__(self):
        self.morning_start = os.getenv('MORNING_PEAK_START', '08:00')
        self.morning_end = os.getenv('MORNING_PEAK_END', '10:00')
        self.evening_start = os.getenv('EVENING_PEAK_START', '18:00')
        self.evening_end = os.getenv('EVENING_PEAK_END', '20:00')

    def _parse_time(self, time_str: str) -> int:
        if ' ' in time_str:
            time_str = time_str.split(' ')[1]
        h, m, s = map(int, time_str.split(':'))
        return h * 3600 + m * 60 + s

    def _is_time_in_range(self, time_str: str, start_str: str, end_str: str) -> bool:
        time_val = self._parse_time(time_str)
        start_val = self._parse_time(start_str + ':00')
        end_val = self._parse_time(end_str + ':00')
        return start_val <= time_val <= end_val

    def _is_morning_peak(self, time_str: str) -> bool:
        return self._is_time_in_range(time_str, self.morning_start, self.morning_end)

    def _is_evening_peak(self, time_str: str) -> bool:
        return self._is_time_in_range(time_str, self.evening_start, self.evening_end)

    def get_flow_vectors(self, peak_type: str = 'morning') -> List[Dict[str, Any]]:
        trips = trip_flow.get_trips()
        flow_count = defaultdict(int)

        for trip in trips:
            start_time = trip['start_time']
            is_peak = self._is_morning_peak(start_time) if peak_type == 'morning' else self._is_evening_peak(start_time)
            
            if is_peak:
                key = (trip['start_station_id'], trip['end_station_id'])
                flow_count[key] += 1

        flow_vectors = []
        for (start_id, end_id), count in flow_count.items():
            start_station = trip_flow.get_station_by_id(start_id)
            end_station = trip_flow.get_station_by_id(end_id)
            
            if start_station and end_station:
                flow_vectors.append({
                    'start': {
                        'id': start_id,
                        'name': start_station.get('name', ''),
                        'type': start_station.get('type', ''),
                        'lng': start_station.get('lng', 0),
                        'lat': start_station.get('lat', 0)
                    },
                    'end': {
                        'id': end_id,
                        'name': end_station.get('name', ''),
                        'type': end_station.get('type', ''),
                        'lng': end_station.get('lng', 0),
                        'lat': end_station.get('lat', 0)
                    },
                    'count': count,
                    'coords': [
                        [start_station.get('lng', 0), start_station.get('lat', 0)],
                        [end_station.get('lng', 0), end_station.get('lat', 0)]
                    ]
                })

        return sorted(flow_vectors, key=lambda x: x['count'], reverse=True)

    def get_stations_with_type(self) -> Dict[str, List[Dict[str, Any]]]:
        return {
            'metro': trip_flow.get_metro_stations(),
            'office': trip_flow.get_office_stations()
        }

    def get_tidal_summary(self) -> Dict[str, Any]:
        morning_vectors = self.get_flow_vectors('morning')
        evening_vectors = self.get_flow_vectors('evening')

        morning_metro_to_office = sum(
            v['count'] for v in morning_vectors 
            if v['start']['type'] == 'metro' and v['end']['type'] == 'office'
        )
        evening_office_to_metro = sum(
            v['count'] for v in evening_vectors 
            if v['start']['type'] == 'office' and v['end']['type'] == 'metro'
        )

        return {
            'morning': {
                'total_trips': sum(v['count'] for v in morning_vectors),
                'metro_to_office': morning_metro_to_office,
                'vectors': morning_vectors
            },
            'evening': {
                'total_trips': sum(v['count'] for v in evening_vectors),
                'office_to_metro': evening_office_to_metro,
                'vectors': evening_vectors
            },
            'stations': self.get_stations_with_type()
        }


tidal_analyzer = TidalFlowAnalyzer()

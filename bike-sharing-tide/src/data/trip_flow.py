import json
import os
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()


class TripFlowData:
    def __init__(self, data_path: str = None):
        self.data_path = data_path or os.getenv('DATA_PATH', './data/trip_data.json')
        self._data = None

    def load_data(self) -> Dict[str, Any]:
        if self._data is None:
            with open(self.data_path, 'r', encoding='utf-8') as f:
                self._data = json.load(f)
        return self._data

    def get_stations(self) -> List[Dict[str, Any]]:
        data = self.load_data()
        return data.get('stations', [])

    def get_trips(self) -> List[Dict[str, Any]]:
        data = self.load_data()
        return data.get('trips', [])

    def get_station_by_id(self, station_id: str) -> Dict[str, Any]:
        stations = self.get_stations()
        for station in stations:
            if station['id'] == station_id:
                return station
        return {}

    def get_metro_stations(self) -> List[Dict[str, Any]]:
        return [s for s in self.get_stations() if s.get('type') == 'metro']

    def get_office_stations(self) -> List[Dict[str, Any]]:
        return [s for s in self.get_stations() if s.get('type') == 'office']

    def get_data_source(self) -> Dict[str, Any]:
        data = self.load_data()
        return data.get('data_source', {})


trip_flow = TripFlowData()

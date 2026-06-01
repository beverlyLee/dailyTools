import os
from typing import Dict, Any


class Config:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, "data")

    USE_REAL_DATA: bool = False

    EVENT_DATA: Dict[str, Any] = {
        "pdf_path": os.path.join(DATA_DIR, "marathon_calendar.pdf"),
        "csv_path": os.path.join(DATA_DIR, "marathon_events.csv"),
        "data_source": "sample",
        "official_url": "https://www.athletics.org.cn/competition/calendar/",
    }

    GDP_DATA: Dict[str, Any] = {
        "csv_path": os.path.join(DATA_DIR, "city_gdp.csv"),
        "data_source": "sample",
    }

    @classmethod
    def set_use_real_data(cls, use_real: bool):
        cls.USE_REAL_DATA = use_real
        cls.EVENT_DATA["data_source"] = "real" if use_real else "sample"
        cls.GDP_DATA["data_source"] = "real" if use_real else "sample"

    @classmethod
    def get_data_source_info(cls) -> Dict[str, str]:
        return {
            "event_data": cls.EVENT_DATA["data_source"],
            "gdp_data": cls.GDP_DATA["data_source"],
            "use_real_data": cls.USE_REAL_DATA,
        }


config = Config()

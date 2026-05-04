from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import logging

from ..models import VisaStatus

logger = logging.getLogger(__name__)


class BaseVisaParser(ABC):
    country: str = ""
    base_url: str = ""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
    
    @abstractmethod
    def parse_status(self, application_number: str, **kwargs) -> Dict[str, Any]:
        pass
    
    def _safe_extract(self, soup: BeautifulSoup, selector: str, default: str = "") -> str:
        try:
            element = soup.select_one(selector)
            return element.get_text(strip=True) if element else default
        except Exception as e:
            logger.warning(f"Error extracting {selector}: {e}")
            return default
    
    def _map_status(self, raw_status: str) -> VisaStatus:
        raw_lower = raw_status.lower()
        
        status_mappings = {
            "approved": VisaStatus.APPROVED,
            "granted": VisaStatus.APPROVED,
            "issued": VisaStatus.APPROVED,
            "rejected": VisaStatus.REJECTED,
            "refused": VisaStatus.REJECTED,
            "denied": VisaStatus.REJECTED,
            "processing": VisaStatus.PROCESSING,
            "under process": VisaStatus.PROCESSING,
            "under review": VisaStatus.PROCESSING,
            "in process": VisaStatus.PROCESSING,
            "pending": VisaStatus.PENDING,
            "received": VisaStatus.PENDING,
            "submitted": VisaStatus.PENDING,
            "ready": VisaStatus.READY_FOR_PICKUP,
            "ready for collection": VisaStatus.READY_FOR_PICKUP,
            "delivered": VisaStatus.READY_FOR_PICKUP,
            "in transit": VisaStatus.IN_TRANSIT,
            "dispatched": VisaStatus.IN_TRANSIT,
        }
        
        for keyword, status in status_mappings.items():
            if keyword in raw_lower:
                return status
        
        return VisaStatus.UNKNOWN
    
    def _make_request(self, method: str, url: str, **kwargs) -> requests.Response:
        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
            response.raise_for_status()
            return response
        except requests.exceptions.Timeout:
            raise ParserException(f"Request timeout for {self.country} visa center")
        except requests.exceptions.ConnectionError:
            raise ParserException(f"Connection error for {self.country} visa center")
        except requests.exceptions.HTTPError as e:
            raise ParserException(f"HTTP error {e.response.status_code} for {self.country}")
        except Exception as e:
            raise ParserException(f"Unexpected error: {str(e)}")


class ParserException(Exception):
    pass

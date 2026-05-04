import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from ..config import settings
from ..models import DocumentChecklist

logger = logging.getLogger(__name__)


class ChecklistService:
    def __init__(self):
        self.config_path = settings.DATA_DIR / "checklist_config.json"
        self._config: Optional[Dict[str, Any]] = None
    
    def _load_config(self) -> Dict[str, Any]:
        if self._config is None:
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    self._config = json.load(f)
            except FileNotFoundError:
                logger.warning(f"Checklist config not found at {self.config_path}")
                self._config = {"version": "0.0.0", "countries": {}}
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing checklist config: {e}")
                self._config = {"version": "0.0.0", "countries": {}}
        return self._config
    
    def get_countries(self) -> List[Dict[str, str]]:
        config = self._load_config()
        countries = []
        for key, country_data in config.get("countries", {}).items():
            countries.append({
                "code": key,
                "name": country_data.get("name", key.upper())
            })
        return countries
    
    def get_visa_types(self, country_code: str) -> List[Dict[str, str]]:
        config = self._load_config()
        country_data = config.get("countries", {}).get(country_code.lower())
        
        if not country_data:
            return []
        
        visa_types = []
        for key, visa_data in country_data.get("visa_types", {}).items():
            visa_types.append({
                "code": key,
                "name": visa_data.get("name", key),
                "processing_time": visa_data.get("processing_time", ""),
                "validity": visa_data.get("validity", "")
            })
        return visa_types
    
    def generate_checklist(
        self,
        country_code: str,
        visa_type: str,
        nationality: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        config = self._load_config()
        context = context or {}
        
        country_data = config.get("countries", {}).get(country_code.lower())
        if not country_data:
            raise ValueError(f"Country not found: {country_code}")
        
        visa_data = country_data.get("visa_types", {}).get(visa_type.lower())
        if not visa_data:
            raise ValueError(f"Visa type '{visa_type}' not found for country {country_code}")
        
        documents = visa_data.get("documents", {})
        mandatory_docs = documents.get("mandatory", [])
        recommended_docs = documents.get("recommended", [])
        conditional_docs = documents.get("conditional", [])
        
        applicable_conditional = []
        for doc in conditional_docs:
            condition = doc.get("condition", "")
            if self._evaluate_condition(condition, context):
                applicable_conditional.append(doc)
        
        return {
            "country": country_data.get("name", country_code),
            "country_code": country_code,
            "visa_type": visa_data.get("name", visa_type),
            "visa_type_code": visa_type,
            "processing_time": visa_data.get("processing_time", ""),
            "validity": visa_data.get("validity", ""),
            "application_steps": visa_data.get("application_steps", []),
            "documents": {
                "mandatory": mandatory_docs,
                "recommended": recommended_docs,
                "conditional": applicable_conditional
            },
            "general_notes": config.get("general_notes", {}),
            "generated_at": datetime.utcnow().isoformat(),
            "version": config.get("version", "0.0.0")
        }
    
    def _evaluate_condition(self, condition: str, context: Dict[str, Any]) -> bool:
        if not condition:
            return True
        
        try:
            parts = condition.split("==")
            if len(parts) == 2:
                key = parts[0].strip()
                value = parts[1].strip().strip("'\"")
                return context.get(key) == value
        except Exception:
            pass
        
        return False
    
    def get_document_details(
        self,
        country_code: str,
        visa_type: str,
        document_id: str
    ) -> Optional[Dict[str, Any]]:
        config = self._load_config()
        
        country_data = config.get("countries", {}).get(country_code.lower())
        if not country_data:
            return None
        
        visa_data = country_data.get("visa_types", {}).get(visa_type.lower())
        if not visa_data:
            return None
        
        documents = visa_data.get("documents", {})
        for category in ["mandatory", "recommended", "conditional"]:
            for doc in documents.get(category, []):
                if doc.get("id") == document_id:
                    return doc
        
        return None
    
    def get_ocr_fields_for_document(
        self,
        country_code: str,
        visa_type: str,
        document_id: str
    ) -> List[str]:
        doc = self.get_document_details(country_code, visa_type, document_id)
        if doc:
            return doc.get("ocr_fields", [])
        return []
    
    def get_all_documents_flat(
        self,
        country_code: str,
        visa_type: str
    ) -> List[Dict[str, Any]]:
        checklist = self.generate_checklist(country_code, visa_type)
        all_docs = []
        
        for category in ["mandatory", "recommended", "conditional"]:
            for doc in checklist["documents"].get(category, []):
                doc_copy = doc.copy()
                doc_copy["category"] = category
                all_docs.append(doc_copy)
        
        return all_docs


checklist_service = ChecklistService()

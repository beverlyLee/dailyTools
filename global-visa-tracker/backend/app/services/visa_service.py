from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlmodel import Session, select
import logging

from ..database import engine
from ..models import VisaApplication, QueryCache, VisaStatus
from ..parsers import get_parser, ParserException
from ..config import settings

logger = logging.getLogger(__name__)


class VisaQueryService:
    def __init__(self):
        self.cache_ttl_hours = settings.CACHE_TTL_HOURS
    
    def _get_cached_result(self, country: str, application_number: str) -> Optional[QueryCache]:
        with Session(engine) as session:
            query_key = f"{country.lower()}:{application_number}"
            statement = (
                select(QueryCache)
                .where(QueryCache.query_key == query_key)
                .where(QueryCache.expires_at > datetime.utcnow())
            )
            result = session.exec(statement).first()
            return result
    
    def _save_to_cache(self, country: str, application_number: str, result: Dict[str, Any]) -> QueryCache:
        with Session(engine) as session:
            query_key = f"{country.lower()}:{application_number}"
            
            existing = session.exec(
                select(QueryCache).where(QueryCache.query_key == query_key)
            ).first()
            
            if existing:
                session.delete(existing)
                session.commit()
            
            cache = QueryCache(
                query_key=query_key,
                country=country,
                application_number=application_number,
                status=result.get("status", VisaStatus.UNKNOWN),
                status_details=result.get("status_details"),
                raw_response=result.get("raw_response"),
                expires_at=datetime.utcnow() + timedelta(hours=self.cache_ttl_hours)
            )
            
            session.add(cache)
            session.commit()
            session.refresh(cache)
            
            return cache
    
    def query_status(
        self,
        country: str,
        application_number: str,
        use_cache: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        if use_cache:
            cached = self._get_cached_result(country, application_number)
            if cached:
                logger.info(f"Cache hit for {country}:{application_number}")
                return {
                    "status": cached.status.value,
                    "status_details": cached.status_details,
                    "application_number": cached.application_number,
                    "country": cached.country,
                    "last_checked": cached.created_at.isoformat(),
                    "from_cache": True,
                    "cache_expires_at": cached.expires_at.isoformat()
                }
        
        logger.info(f"Querying {country} visa center for {application_number}")
        
        try:
            parser = get_parser(country)
            result = parser.parse_status(application_number, **kwargs)
            
            self._save_to_cache(country, application_number, result)
            
            result["from_cache"] = False
            
            self._update_application_status(country, application_number, result)
            
            return result
            
        except ParserException as e:
            logger.error(f"Parser error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in visa query: {e}")
            raise ParserException(f"Failed to query visa status: {str(e)}")
    
    def _update_application_status(
        self,
        country: str,
        application_number: str,
        result: Dict[str, Any]
    ):
        with Session(engine) as session:
            statement = (
                select(VisaApplication)
                .where(VisaApplication.application_number == application_number)
                .where(VisaApplication.country == country)
            )
            application = session.exec(statement).first()
            
            if application:
                application.status = result.get("status", VisaStatus.UNKNOWN)
                application.status_details = result.get("status_details")
                application.last_checked_at = datetime.utcnow()
                application.updated_at = datetime.utcnow()
                session.add(application)
                session.commit()
    
    def create_application(
        self,
        application_number: str,
        country: str,
        visa_type: str,
        applicant_name: Optional[str] = None,
        applicant_nationality: Optional[str] = None,
        passport_number: Optional[str] = None,
        submit_date: Optional[str] = None,
        **kwargs
    ) -> VisaApplication:
        with Session(engine) as session:
            existing = session.exec(
                select(VisaApplication).where(
                    VisaApplication.application_number == application_number
                )
            ).first()
            
            if existing:
                raise ValueError(f"Application with number {application_number} already exists")
            
            application = VisaApplication(
                application_number=application_number,
                country=country,
                visa_type=visa_type,
                applicant_name=applicant_name,
                applicant_nationality=applicant_nationality,
                passport_number=passport_number,
                submit_date=submit_date,
                status=VisaStatus.PENDING,
                extra_data=kwargs
            )
            
            session.add(application)
            session.commit()
            session.refresh(application)
            
            return application
    
    def get_application(self, application_id: int) -> Optional[VisaApplication]:
        with Session(engine) as session:
            return session.get(VisaApplication, application_id)
    
    def get_all_applications(self, skip: int = 0, limit: int = 100) -> list[VisaApplication]:
        with Session(engine) as session:
            statement = (
                select(VisaApplication)
                .order_by(VisaApplication.created_at.desc())
                .offset(skip)
                .limit(limit)
            )
            return list(session.exec(statement).all())
    
    def update_application(
        self,
        application_id: int,
        **kwargs
    ) -> Optional[VisaApplication]:
        with Session(engine) as session:
            application = session.get(VisaApplication, application_id)
            if not application:
                return None
            
            for key, value in kwargs.items():
                if hasattr(application, key):
                    setattr(application, key, value)
            
            application.updated_at = datetime.utcnow()
            session.add(application)
            session.commit()
            session.refresh(application)
            
            return application
    
    def delete_application(self, application_id: int) -> bool:
        with Session(engine) as session:
            application = session.get(VisaApplication, application_id)
            if not application:
                return False
            
            session.delete(application)
            session.commit()
            return True
    
    def clear_expired_cache(self) -> int:
        with Session(engine) as session:
            statement = select(QueryCache).where(
                QueryCache.expires_at < datetime.utcnow()
            )
            expired = list(session.exec(statement).all())
            
            for cache in expired:
                session.delete(cache)
            
            session.commit()
            return len(expired)


visa_query_service = VisaQueryService()

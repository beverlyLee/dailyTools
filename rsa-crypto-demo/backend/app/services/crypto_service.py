from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.crypto_record import CryptoHistory


class CryptoService:
    @staticmethod
    def get_all_records(db: Session, skip: int = 0, limit: int = 100) -> List[CryptoHistory]:
        return db.query(CryptoHistory).order_by(desc(CryptoHistory.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_records_by_operation_type(
        db: Session, 
        operation_type: str, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[CryptoHistory]:
        return db.query(CryptoHistory).filter(
            CryptoHistory.operation_type == operation_type
        ).order_by(desc(CryptoHistory.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_records_by_key_pair_id(
        db: Session, 
        key_pair_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[CryptoHistory]:
        return db.query(CryptoHistory).filter(
            CryptoHistory.key_pair_id == key_pair_id
        ).order_by(desc(CryptoHistory.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_record_by_id(db: Session, record_id: int) -> Optional[CryptoHistory]:
        return db.query(CryptoHistory).filter(CryptoHistory.id == record_id).first()
    
    @staticmethod
    def create_record(db: Session, record_data: Dict[str, Any]) -> CryptoHistory:
        db_record = CryptoHistory(**record_data)
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        return db_record
    
    @staticmethod
    def delete_record(db: Session, record_id: int) -> bool:
        db_record = CryptoService.get_record_by_id(db, record_id)
        if db_record:
            db.delete(db_record)
            db.commit()
            return True
        return False
    
    @staticmethod
    def delete_all_records(db: Session) -> int:
        count = db.query(CryptoHistory).delete()
        db.commit()
        return count
    
    @staticmethod
    def record_to_dict(record: CryptoHistory) -> Dict[str, Any]:
        return {
            "id": record.id,
            "operation_type": record.operation_type,
            "key_pair_id": record.key_pair_id,
            "plain_text": record.plain_text,
            "cipher_text": record.cipher_text,
            "public_key": record.public_key,
            "private_key": record.private_key,
            "key_size": record.key_size,
            "created_at": record.created_at.isoformat() if record.created_at else None
        }

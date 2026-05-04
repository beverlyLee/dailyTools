from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.key_pair import KeyPairHistory


class KeyPairService:
    @staticmethod
    def get_all_key_pairs(db: Session, skip: int = 0, limit: int = 100) -> List[KeyPairHistory]:
        return db.query(KeyPairHistory).order_by(desc(KeyPairHistory.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_key_pair_by_id(db: Session, key_pair_id: int) -> Optional[KeyPairHistory]:
        return db.query(KeyPairHistory).filter(KeyPairHistory.id == key_pair_id).first()
    
    @staticmethod
    def create_key_pair(db: Session, key_pair_data: Dict[str, Any]) -> KeyPairHistory:
        db_key_pair = KeyPairHistory(**key_pair_data)
        db.add(db_key_pair)
        db.commit()
        db.refresh(db_key_pair)
        return db_key_pair
    
    @staticmethod
    def delete_key_pair(db: Session, key_pair_id: int) -> bool:
        db_key_pair = KeyPairService.get_key_pair_by_id(db, key_pair_id)
        if db_key_pair:
            db.delete(db_key_pair)
            db.commit()
            return True
        return False
    
    @staticmethod
    def key_pair_to_dict(key_pair: KeyPairHistory) -> Dict[str, Any]:
        return {
            "id": key_pair.id,
            "p": key_pair.p,
            "q": key_pair.q,
            "n": key_pair.n,
            "phi_n": key_pair.phi_n,
            "e": key_pair.e,
            "d": key_pair.d,
            "public_key": key_pair.public_key,
            "private_key": key_pair.private_key,
            "key_size": key_pair.key_size,
            "created_at": key_pair.created_at.isoformat() if key_pair.created_at else None,
            "updated_at": key_pair.updated_at.isoformat() if key_pair.updated_at else None
        }

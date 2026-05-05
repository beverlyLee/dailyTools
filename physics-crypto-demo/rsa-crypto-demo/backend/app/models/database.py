from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
import json
from typing import Dict, Any, Optional, List

Base = declarative_base()

class KeyPair(Base):
    __tablename__ = 'key_pairs'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    p = Column(Text, nullable=False)
    q = Column(Text, nullable=False)
    n = Column(Text, nullable=False)
    phi_n = Column(Text, nullable=False)
    e = Column(Text, nullable=False)
    d = Column(Text, nullable=False)
    key_size = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    crypto_records = relationship("CryptoRecord", back_populates="key_pair", cascade="all, delete-orphan")


class CryptoRecord(Base):
    __tablename__ = 'crypto_records'
    
    id = Column(Integer, primary_key=True, index=True)
    key_pair_id = Column(Integer, ForeignKey('key_pairs.id'), nullable=True)
    operation_type = Column(String(20), nullable=False)
    plain_text = Column(Text, nullable=True)
    cipher_text = Column(Text, nullable=True)
    encrypted_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    key_pair = relationship("KeyPair", back_populates="crypto_records")


class DatabaseManager:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
            os.makedirs(db_dir, exist_ok=True)
            db_path = os.path.join(db_dir, 'rsa_demo.db')
        
        self.db_path = db_path
        self.engine = create_engine(f'sqlite:///{db_path}')
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def get_session(self):
        return self.SessionLocal()
    
    def save_key_pair(self, key_data: Dict[str, Any], name: str = None) -> int:
        session = self.get_session()
        try:
            key_pair = KeyPair(
                name=name,
                p=str(key_data['p']),
                q=str(key_data['q']),
                n=str(key_data['n']),
                phi_n=str(key_data['phi_n']),
                e=str(key_data['e']),
                d=str(key_data['d']),
                key_size=key_data.get('key_size', 1024)
            )
            session.add(key_pair)
            session.commit()
            key_pair_id = key_pair.id
            return key_pair_id
        finally:
            session.close()
    
    def get_key_pair(self, key_pair_id: int) -> Optional[Dict[str, Any]]:
        session = self.get_session()
        try:
            key_pair = session.query(KeyPair).filter(KeyPair.id == key_pair_id).first()
            if key_pair:
                return {
                    'id': key_pair.id,
                    'name': key_pair.name,
                    'p': int(key_pair.p),
                    'q': int(key_pair.q),
                    'n': int(key_pair.n),
                    'phi_n': int(key_pair.phi_n),
                    'e': int(key_pair.e),
                    'd': int(key_pair.d),
                    'key_size': key_pair.key_size,
                    'created_at': key_pair.created_at.isoformat() if key_pair.created_at else None
                }
            return None
        finally:
            session.close()
    
    def get_all_key_pairs(self) -> List[Dict[str, Any]]:
        session = self.get_session()
        try:
            key_pairs = session.query(KeyPair).order_by(KeyPair.created_at.desc()).all()
            return [
                {
                    'id': kp.id,
                    'name': kp.name,
                    'n': kp.n[:50] + '...' if len(kp.n) > 50 else kp.n,
                    'key_size': kp.key_size,
                    'created_at': kp.created_at.isoformat() if kp.created_at else None
                }
                for kp in key_pairs
            ]
        finally:
            session.close()
    
    def delete_key_pair(self, key_pair_id: int) -> bool:
        session = self.get_session()
        try:
            key_pair = session.query(KeyPair).filter(KeyPair.id == key_pair_id).first()
            if key_pair:
                session.delete(key_pair)
                session.commit()
                return True
            return False
        finally:
            session.close()
    
    def save_crypto_record(self, record_data: Dict[str, Any]) -> int:
        session = self.get_session()
        try:
            record = CryptoRecord(
                key_pair_id=record_data.get('key_pair_id'),
                operation_type=record_data['operation_type'],
                plain_text=record_data.get('plain_text'),
                cipher_text=record_data.get('cipher_text'),
                encrypted_data=json.dumps(record_data.get('encrypted_data', [])) if record_data.get('encrypted_data') else None
            )
            session.add(record)
            session.commit()
            record_id = record.id
            return record_id
        finally:
            session.close()
    
    def get_crypto_record(self, record_id: int) -> Optional[Dict[str, Any]]:
        session = self.get_session()
        try:
            record = session.query(CryptoRecord).filter(CryptoRecord.id == record_id).first()
            if record:
                return {
                    'id': record.id,
                    'key_pair_id': record.key_pair_id,
                    'operation_type': record.operation_type,
                    'plain_text': record.plain_text,
                    'cipher_text': record.cipher_text,
                    'encrypted_data': json.loads(record.encrypted_data) if record.encrypted_data else None,
                    'created_at': record.created_at.isoformat() if record.created_at else None
                }
            return None
        finally:
            session.close()
    
    def get_all_crypto_records(self) -> List[Dict[str, Any]]:
        session = self.get_session()
        try:
            records = session.query(CryptoRecord).order_by(CryptoRecord.created_at.desc()).all()
            return [
                {
                    'id': record.id,
                    'key_pair_id': record.key_pair_id,
                    'operation_type': record.operation_type,
                    'plain_text': record.plain_text[:100] + '...' if record.plain_text and len(record.plain_text) > 100 else record.plain_text,
                    'cipher_text': record.cipher_text[:100] + '...' if record.cipher_text and len(record.cipher_text) > 100 else record.cipher_text,
                    'created_at': record.created_at.isoformat() if record.created_at else None
                }
                for record in records
            ]
        finally:
            session.close()
    
    def delete_crypto_record(self, record_id: int) -> bool:
        session = self.get_session()
        try:
            record = session.query(CryptoRecord).filter(CryptoRecord.id == record_id).first()
            if record:
                session.delete(record)
                session.commit()
                return True
            return False
        finally:
            session.close()

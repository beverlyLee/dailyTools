from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./model_storage.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class ModelMetadata(Base):
    __tablename__ = "model_metadata"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, index=True)
    training_date = Column(DateTime, default=datetime.utcnow)
    r2_score = Column(Float)
    mse = Column(Float)
    features = Column(String)
    target = Column(String)
    model_path = Column(String)
    scaler_path = Column(String)


class FeatureImportance(Base):
    __tablename__ = "feature_importance"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, index=True)
    feature_name = Column(String, index=True)
    coefficient = Column(Float)
    importance_score = Column(Float)


class ResidualData(Base):
    __tablename__ = "residual_data"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, index=True)
    actual_value = Column(Float)
    predicted_value = Column(Float)
    residual = Column(Float)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)

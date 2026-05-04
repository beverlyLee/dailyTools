from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.plant import Plant, HealthRecord
from app.schemas.plant import (
    PlantCreate, PlantResponse, PlantUpdate,
    HealthRecordCreate, HealthRecordResponse
)

router = APIRouter()


@router.get("/", response_model=List[PlantResponse])
async def get_plants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    plants = db.query(Plant).offset(skip).limit(limit).all()
    return plants


@router.get("/{plant_id}", response_model=PlantResponse)
async def get_plant(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="植物档案不存在")
    return plant


@router.post("/", response_model=PlantResponse)
async def create_plant(plant: PlantCreate, db: Session = Depends(get_db)):
    db_plant = Plant(**plant.model_dump())
    db.add(db_plant)
    db.commit()
    db.refresh(db_plant)
    return db_plant


@router.put("/{plant_id}", response_model=PlantResponse)
async def update_plant(
    plant_id: int,
    plant_update: PlantUpdate,
    db: Session = Depends(get_db)
):
    db_plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if db_plant is None:
        raise HTTPException(status_code=404, detail="植物档案不存在")
    
    update_data = plant_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_plant, key, value)
    
    db.commit()
    db.refresh(db_plant)
    return db_plant


@router.delete("/{plant_id}")
async def delete_plant(plant_id: int, db: Session = Depends(get_db)):
    db_plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if db_plant is None:
        raise HTTPException(status_code=404, detail="植物档案不存在")
    
    db.delete(db_plant)
    db.commit()
    return {"message": "植物档案已删除", "plant_id": plant_id}


@router.get("/{plant_id}/records", response_model=List[HealthRecordResponse])
async def get_plant_health_records(
    plant_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="植物档案不存在")
    
    records = db.query(HealthRecord).filter(
        HealthRecord.plant_id == plant_id
    ).offset(skip).limit(limit).order_by(HealthRecord.check_date.desc()).all()
    return records


@router.post("/{plant_id}/records", response_model=HealthRecordResponse)
async def create_health_record(
    plant_id: int,
    record: HealthRecordCreate,
    db: Session = Depends(get_db)
):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="植物档案不存在")
    
    db_record = HealthRecord(**record.model_dump())
    db.add(db_record)
    
    plant.current_health_status = record.health_status
    db.commit()
    db.refresh(db_record)
    return db_record


@router.get("/{plant_id}/records/{record_id}", response_model=HealthRecordResponse)
async def get_health_record(
    plant_id: int,
    record_id: int,
    db: Session = Depends(get_db)
):
    record = db.query(HealthRecord).filter(
        HealthRecord.id == record_id,
        HealthRecord.plant_id == plant_id
    ).first()
    if record is None:
        raise HTTPException(status_code=404, detail="健康记录不存在")
    return record


@router.delete("/{plant_id}/records/{record_id}")
async def delete_health_record(
    plant_id: int,
    record_id: int,
    db: Session = Depends(get_db)
):
    record = db.query(HealthRecord).filter(
        HealthRecord.id == record_id,
        HealthRecord.plant_id == plant_id
    ).first()
    if record is None:
        raise HTTPException(status_code=404, detail="健康记录不存在")
    
    db.delete(record)
    db.commit()
    return {"message": "健康记录已删除", "record_id": record_id}

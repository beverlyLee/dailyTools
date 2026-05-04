from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.orm_models import Snapshot
from app.models.schemas import (
    SnapshotCreate,
    SnapshotResponse,
    SnapshotListResponse
)

router = APIRouter()

@router.post("/", response_model=SnapshotResponse)
def create_snapshot(snapshot: SnapshotCreate, db: Session = Depends(get_db)):
    try:
        db_snapshot = Snapshot(
            name=snapshot.name,
            description=snapshot.description,
            signal_params=snapshot.signal_params,
            filter_params=snapshot.filter_params,
            time_data=snapshot.time_data,
            original_signal=snapshot.original_signal,
            filtered_signal=snapshot.filtered_signal,
            frequency=snapshot.frequency_domain,
            magnitude=snapshot.magnitude,
            stft_data=snapshot.stft_data
        )
        db.add(db_snapshot)
        db.commit()
        db.refresh(db_snapshot)
        
        return SnapshotResponse(
            id=db_snapshot.id,
            name=db_snapshot.name,
            description=db_snapshot.description,
            created_at=db_snapshot.created_at,
            signal_params=db_snapshot.signal_params,
            filter_params=db_snapshot.filter_params,
            time_data=db_snapshot.time_data,
            original_signal=db_snapshot.original_signal,
            filtered_signal=db_snapshot.filtered_signal,
            frequency=db_snapshot.frequency,
            magnitude=db_snapshot.magnitude,
            stft_data=db_snapshot.stft_data
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"创建快照失败: {str(e)}")

@router.get("/", response_model=List[SnapshotListResponse])
def list_snapshots(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        snapshots = db.query(Snapshot).offset(skip).limit(limit).order_by(Snapshot.created_at.desc()).all()
        return [
            SnapshotListResponse(
                id=s.id,
                name=s.name,
                description=s.description,
                created_at=s.created_at,
                signal_type=s.signal_type
            )
            for s in snapshots
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取快照列表失败: {str(e)}")

@router.get("/{snapshot_id}", response_model=SnapshotResponse)
def get_snapshot(snapshot_id: int, db: Session = Depends(get_db)):
    try:
        snapshot = db.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
        if snapshot is None:
            raise HTTPException(status_code=404, detail="快照不存在")
        
        return SnapshotResponse(
            id=snapshot.id,
            name=snapshot.name,
            description=snapshot.description,
            created_at=snapshot.created_at,
            signal_params=snapshot.signal_params,
            filter_params=snapshot.filter_params,
            time_data=snapshot.time_data,
            original_signal=snapshot.original_signal,
            filtered_signal=snapshot.filtered_signal,
            frequency=snapshot.frequency,
            magnitude=snapshot.magnitude,
            stft_data=snapshot.stft_data
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取快照失败: {str(e)}")

@router.delete("/{snapshot_id}")
def delete_snapshot(snapshot_id: int, db: Session = Depends(get_db)):
    try:
        snapshot = db.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
        if snapshot is None:
            raise HTTPException(status_code=404, detail="快照不存在")
        
        db.delete(snapshot)
        db.commit()
        return {"message": "快照已删除", "id": snapshot_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"删除快照失败: {str(e)}")

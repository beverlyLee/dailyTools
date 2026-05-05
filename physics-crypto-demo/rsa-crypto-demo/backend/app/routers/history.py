from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.models.database import DatabaseManager

router = APIRouter(prefix="/api/history", tags=["History"])

db_manager = DatabaseManager()


@router.get("/crypto-records")
async def get_crypto_records():
    try:
        records = db_manager.get_all_crypto_records()
        return {
            "success": True,
            "records": records
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/crypto-records/{record_id}")
async def get_crypto_record(record_id: int):
    try:
        record = db_manager.get_crypto_record(record_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Record not found")
        
        return {
            "success": True,
            "record": record
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/crypto-records/{record_id}")
async def delete_crypto_record(record_id: int):
    try:
        success = db_manager.delete_crypto_record(record_id)
        if not success:
            raise HTTPException(status_code=404, detail="Record not found")
        
        return {
            "success": True,
            "message": "Record deleted"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/key-pairs")
async def get_all_key_pairs():
    try:
        key_pairs = db_manager.get_all_key_pairs()
        return {
            "success": True,
            "key_pairs": key_pairs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/key-pairs/{key_pair_id}")
async def get_key_pair_detail(key_pair_id: int):
    try:
        key_pair = db_manager.get_key_pair(key_pair_id)
        if key_pair is None:
            raise HTTPException(status_code=404, detail="Key pair not found")
        
        return {
            "success": True,
            "key_pair": key_pair
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.services.key_pair_service import KeyPairService
from app.services.crypto_service import CryptoService

router = APIRouter(prefix="/api/v1/history", tags=["历史记录"])


@router.get("/key-pairs", summary="获取密钥对历史记录")
async def get_key_pair_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    key_pairs = KeyPairService.get_all_key_pairs(db, skip=skip, limit=limit)
    return {
        "total": len(key_pairs),
        "key_pairs": [KeyPairService.key_pair_to_dict(kp) for kp in key_pairs]
    }


@router.get("/crypto-operations", summary="获取加解密操作历史记录")
async def get_crypto_history(
    operation_type: Optional[str] = Query(None, description="操作类型: encrypt 或 decrypt"),
    key_pair_id: Optional[int] = Query(None, description="关联的密钥对ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    if operation_type:
        records = CryptoService.get_records_by_operation_type(
            db, operation_type=operation_type, skip=skip, limit=limit
        )
    elif key_pair_id:
        records = CryptoService.get_records_by_key_pair_id(
            db, key_pair_id=key_pair_id, skip=skip, limit=limit
        )
    else:
        records = CryptoService.get_all_records(db, skip=skip, limit=limit)
    
    return {
        "total": len(records),
        "records": [CryptoService.record_to_dict(r) for r in records]
    }


@router.get("/crypto-operations/{record_id}", summary="获取指定加解密记录详情")
async def get_crypto_record_by_id(record_id: int, db: Session = Depends(get_db)):
    record = CryptoService.get_record_by_id(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"记录 ID {record_id} 不存在")
    return CryptoService.record_to_dict(record)


@router.delete("/key-pairs/{key_pair_id}", summary="删除指定密钥对历史")
async def delete_key_pair_history(key_pair_id: int, db: Session = Depends(get_db)):
    success = KeyPairService.delete_key_pair(db, key_pair_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"密钥对 ID {key_pair_id} 不存在")
    return {"message": f"密钥对 ID {key_pair_id} 已删除"}


@router.delete("/crypto-operations/{record_id}", summary="删除指定加解密记录")
async def delete_crypto_record(record_id: int, db: Session = Depends(get_db)):
    success = CryptoService.delete_record(db, record_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"记录 ID {record_id} 不存在")
    return {"message": f"记录 ID {record_id} 已删除"}


@router.delete("/crypto-operations", summary="清空所有加解密历史记录")
async def clear_all_crypto_history(db: Session = Depends(get_db)):
    count = CryptoService.delete_all_records(db)
    return {
        "message": f"已清空 {count} 条加解密历史记录",
        "deleted_count": count
    }


@router.get("/stats", summary="获取统计信息")
async def get_statistics(db: Session = Depends(get_db)):
    key_pairs = KeyPairService.get_all_key_pairs(db)
    crypto_records = CryptoService.get_all_records(db)
    
    encrypt_count = len(CryptoService.get_records_by_operation_type(db, "encrypt"))
    decrypt_count = len(CryptoService.get_records_by_operation_type(db, "decrypt"))
    
    return {
        "key_pair_count": len(key_pairs),
        "crypto_operation_count": len(crypto_records),
        "encrypt_count": encrypt_count,
        "decrypt_count": decrypt_count
    }

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from app.core.database import get_db
from app.services.rsa_service import RSAService
from app.services.key_pair_service import KeyPairService

router = APIRouter(prefix="/api/v1/rsa", tags=["RSA密钥生成"])


class PrimeCheckRequest(BaseModel):
    number: int


class GenerateKeyPairRequest(BaseModel):
    p: Optional[int] = None
    q: Optional[int] = None
    e: int = 65537
    bit_length: int = 512


class GetKeyPairsResponse(BaseModel):
    total: int
    key_pairs: List[dict]


@router.post("/check-prime", summary="检查一个数是否为素数")
async def check_prime(request: PrimeCheckRequest):
    result = RSAService.check_prime(request.number)
    return result


@router.get("/generate-prime", summary="生成一个随机素数")
async def generate_prime(bit_length: int = Query(512, ge=8, le=2048)):
    result = RSAService.generate_prime_number(bit_length)
    return result


@router.post("/generate-key-pair", summary="分步生成RSA密钥对")
async def generate_key_pair(
    request: GenerateKeyPairRequest,
    db: Session = Depends(get_db)
):
    result = RSAService.generate_rsa_keys_step_by_step(
        p=request.p,
        q=request.q,
        e=request.e,
        bit_length=request.bit_length,
        db=db
    )
    return result


@router.get("/key-pairs", summary="获取所有密钥对历史")
async def get_key_pairs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    key_pairs = KeyPairService.get_all_key_pairs(db, skip=skip, limit=limit)
    total = len(key_pairs)
    return {
        "total": total,
        "key_pairs": [KeyPairService.key_pair_to_dict(kp) for kp in key_pairs]
    }


@router.get("/key-pairs/{key_pair_id}", summary="获取指定密钥对详情")
async def get_key_pair_by_id(key_pair_id: int, db: Session = Depends(get_db)):
    key_pair = KeyPairService.get_key_pair_by_id(db, key_pair_id)
    if not key_pair:
        raise HTTPException(status_code=404, detail=f"密钥对 ID {key_pair_id} 不存在")
    return KeyPairService.key_pair_to_dict(key_pair)


@router.delete("/key-pairs/{key_pair_id}", summary="删除指定密钥对")
async def delete_key_pair(key_pair_id: int, db: Session = Depends(get_db)):
    success = KeyPairService.delete_key_pair(db, key_pair_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"密钥对 ID {key_pair_id} 不存在")
    return {"message": f"密钥对 ID {key_pair_id} 已删除"}

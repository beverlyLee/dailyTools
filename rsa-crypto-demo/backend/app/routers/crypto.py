from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from app.core.database import get_db
from app.services.rsa_service import RSAService
from app.services.key_pair_service import KeyPairService

router = APIRouter(prefix="/api/v1/crypto", tags=["加密解密"])


class EncryptRequest(BaseModel):
    message: str
    e: int
    n: int
    key_pair_id: Optional[int] = None


class DecryptRequest(BaseModel):
    cipher_numbers: List[int]
    d: int
    n: int
    key_pair_id: Optional[int] = None


class EncryptWithKeyPairRequest(BaseModel):
    message: str
    key_pair_id: int


class DecryptWithKeyPairRequest(BaseModel):
    cipher_numbers: List[int]
    key_pair_id: int


@router.post("/encrypt", summary="使用公钥加密消息")
async def encrypt_message(
    request: EncryptRequest,
    db: Session = Depends(get_db)
):
    if request.n <= 0:
        raise HTTPException(status_code=400, detail="n 必须大于 0")
    if request.e <= 0 or request.e >= request.n:
        raise HTTPException(status_code=400, detail="e 必须在 1 到 n-1 之间")
    if not request.message:
        raise HTTPException(status_code=400, detail="消息不能为空")
    
    result = RSAService.encrypt_message(
        message=request.message,
        e=request.e,
        n=request.n,
        db=db,
        key_pair_id=request.key_pair_id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.post("/decrypt", summary="使用私钥解密密文")
async def decrypt_message(
    request: DecryptRequest,
    db: Session = Depends(get_db)
):
    if request.n <= 0:
        raise HTTPException(status_code=400, detail="n 必须大于 0")
    if request.d <= 0 or request.d >= request.n:
        raise HTTPException(status_code=400, detail="d 必须在 1 到 n-1 之间")
    if not request.cipher_numbers:
        raise HTTPException(status_code=400, detail="密文列表不能为空")
    
    result = RSAService.decrypt_message(
        cipher_numbers=request.cipher_numbers,
        d=request.d,
        n=request.n,
        db=db,
        key_pair_id=request.key_pair_id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.post("/encrypt-with-key-pair", summary="使用保存的密钥对加密消息")
async def encrypt_with_key_pair(
    request: EncryptWithKeyPairRequest,
    db: Session = Depends(get_db)
):
    key_pair = KeyPairService.get_key_pair_by_id(db, request.key_pair_id)
    if not key_pair:
        raise HTTPException(status_code=404, detail=f"密钥对 ID {request.key_pair_id} 不存在")
    
    result = RSAService.encrypt_message(
        message=request.message,
        e=int(key_pair.e),
        n=int(key_pair.n),
        db=db,
        key_pair_id=request.key_pair_id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.post("/decrypt-with-key-pair", summary="使用保存的密钥对解密密文")
async def decrypt_with_key_pair(
    request: DecryptWithKeyPairRequest,
    db: Session = Depends(get_db)
):
    key_pair = KeyPairService.get_key_pair_by_id(db, request.key_pair_id)
    if not key_pair:
        raise HTTPException(status_code=404, detail=f"密钥对 ID {request.key_pair_id} 不存在")
    
    result = RSAService.decrypt_message(
        cipher_numbers=request.cipher_numbers,
        d=int(key_pair.d),
        n=int(key_pair.n),
        db=db,
        key_pair_id=request.key_pair_id
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.post("/test-encryption-decryption", summary="测试加解密正确性")
async def test_encryption_decryption(
    message: str = "Hello RSA!",
    bit_length: int = 512,
    db: Session = Depends(get_db)
):
    key_result = RSAService.generate_rsa_keys_step_by_step(
        bit_length=bit_length,
        db=db
    )
    
    if not key_result["success"]:
        raise HTTPException(status_code=500, detail=key_result["message"])
    
    key_pair = key_result["key_pair"]
    
    encrypt_result = RSAService.encrypt_message(
        message=message,
        e=int(key_pair["e"]),
        n=int(key_pair["n"]),
        db=db,
        key_pair_id=key_pair.get("id")
    )
    
    if not encrypt_result["success"]:
        raise HTTPException(status_code=500, detail=encrypt_result["message"])
    
    decrypt_result = RSAService.decrypt_message(
        cipher_numbers=encrypt_result["cipher_numbers"],
        d=int(key_pair["d"]),
        n=int(key_pair["n"]),
        db=db,
        key_pair_id=key_pair.get("id")
    )
    
    if not decrypt_result["success"]:
        raise HTTPException(status_code=500, detail=decrypt_result["message"])
    
    is_correct = message == decrypt_result["plain_text"]
    
    return {
        "success": True,
        "is_correct": is_correct,
        "original_message": message,
        "encrypted": encrypt_result["cipher_text"],
        "decrypted": decrypt_result["plain_text"],
        "key_pair": key_pair,
        "message": "加密解密测试" + ("成功！" if is_correct else "失败！")
    }

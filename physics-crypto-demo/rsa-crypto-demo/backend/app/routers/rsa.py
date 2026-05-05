from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.utils.rsa_utils import (
    generate_key_pair,
    encrypt,
    decrypt,
    encrypt_text,
    decrypt_text,
    verify_rsa,
    mod_exp,
    is_prime
)
from app.models.database import DatabaseManager

router = APIRouter(prefix="/api/rsa", tags=["RSA"])

db_manager = DatabaseManager()


class GenerateKeyRequest(BaseModel):
    p: Optional[int] = None
    q: Optional[int] = None
    e: int = 65537
    bit_length: int = 1024
    name: Optional[str] = None


class EncryptRequest(BaseModel):
    message: str
    e: int
    n: int
    key_pair_id: Optional[int] = None


class DecryptRequest(BaseModel):
    encrypted_data: List[int]
    d: int
    n: int
    key_pair_id: Optional[int] = None


class ModExpRequest(BaseModel):
    base: int
    exponent: int
    modulus: int


class VerifyRequest(BaseModel):
    message: int
    e: int
    d: int
    n: int


class IsPrimeRequest(BaseModel):
    number: int


@router.post("/generate-key")
async def generate_keys(request: GenerateKeyRequest):
    try:
        result = generate_key_pair(
            p=request.p,
            q=request.q,
            e=request.e,
            bit_length=request.bit_length
        )
        
        key_data = {
            'p': result['p'],
            'q': result['q'],
            'n': result['n'],
            'phi_n': result['phi_n'],
            'e': result['e'],
            'd': result['d'],
            'key_size': request.bit_length
        }
        
        key_pair_id = db_manager.save_key_pair(key_data, request.name)
        
        return {
            "success": True,
            "key_pair_id": key_pair_id,
            "public_key": {
                "e": result['e'],
                "n": result['n']
            },
            "private_key": {
                "d": result['d'],
                "n": result['n']
            },
            "details": {
                "p": result['p'],
                "q": result['q'],
                "n": result['n'],
                "phi_n": result['phi_n'],
                "e": result['e'],
                "d": result['d']
            },
            "steps": result['steps']
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/encrypt")
async def encrypt_message(request: EncryptRequest):
    try:
        result = encrypt_text(request.message, request.e, request.n)
        
        if request.key_pair_id:
            db_manager.save_crypto_record({
                'key_pair_id': request.key_pair_id,
                'operation_type': 'encrypt',
                'plain_text': request.message,
                'cipher_text': result['encrypted_text'],
                'encrypted_data': result['encrypted']
            })
        
        return {
            "success": True,
            "original": request.message,
            "encrypted": result['encrypted'],
            "encrypted_text": result['encrypted_text'],
            "details": result['details']
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/decrypt")
async def decrypt_message(request: DecryptRequest):
    try:
        result = decrypt_text(request.encrypted_data, request.d, request.n)
        
        if request.key_pair_id:
            db_manager.save_crypto_record({
                'key_pair_id': request.key_pair_id,
                'operation_type': 'decrypt',
                'plain_text': result['decrypted'],
                'encrypted_data': request.encrypted_data
            })
        
        return {
            "success": True,
            "encrypted": request.encrypted_data,
            "decrypted": result['decrypted'],
            "details": result['details']
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mod-exp")
async def modular_exponentiation(request: ModExpRequest):
    try:
        result, steps = mod_exp(request.base, request.exponent, request.modulus)
        
        return {
            "success": True,
            "base": request.base,
            "exponent": request.exponent,
            "modulus": request.modulus,
            "result": result,
            "formula": f"{request.base}^{request.exponent} mod {request.modulus} = {result}",
            "steps": steps
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/verify")
async def verify_rsa_operation(request: VerifyRequest):
    try:
        result = verify_rsa(request.message, request.e, request.d, request.n)
        
        return {
            "success": True,
            "original": result['original'],
            "encrypted": result['encrypted'],
            "decrypted": result['decrypted'],
            "valid": result['valid'],
            "encrypt_steps": result['encrypt_steps'],
            "decrypt_steps": result['decrypt_steps']
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/is-prime")
async def check_prime(request: IsPrimeRequest):
    try:
        result = is_prime(request.number)
        
        return {
            "success": True,
            "number": request.number,
            "is_prime": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/key-pairs")
async def get_key_pairs():
    try:
        key_pairs = db_manager.get_all_key_pairs()
        return {
            "success": True,
            "key_pairs": key_pairs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/key-pairs/{key_pair_id}")
async def get_key_pair(key_pair_id: int):
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


@router.delete("/key-pairs/{key_pair_id}")
async def delete_key_pair(key_pair_id: int):
    try:
        success = db_manager.delete_key_pair(key_pair_id)
        if not success:
            raise HTTPException(status_code=404, detail="Key pair not found")
        
        return {
            "success": True,
            "message": "Key pair deleted"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

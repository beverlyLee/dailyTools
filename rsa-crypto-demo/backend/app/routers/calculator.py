from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.rsa_service import RSAService

router = APIRouter(prefix="/api/v1/calculator", tags=["大整数计算器"])


class GCDRequest(BaseModel):
    a: int
    b: int


class ModInverseRequest(BaseModel):
    e: int
    phi: int


class ModExpRequest(BaseModel):
    base: int
    exponent: int
    modulus: int


@router.post("/gcd", summary="计算最大公约数")
async def calculate_gcd(request: GCDRequest):
    result = RSAService.calculate_gcd(request.a, request.b)
    return result


@router.post("/mod-inverse", summary="计算模逆")
async def calculate_mod_inverse(request: ModInverseRequest):
    if request.phi <= 0:
        raise HTTPException(status_code=400, detail="phi 必须大于 0")
    if request.e <= 0 or request.e >= request.phi:
        raise HTTPException(status_code=400, detail="e 必须在 1 到 phi-1 之间")
    
    result = RSAService.calculate_mod_inverse(request.e, request.phi)
    return result


@router.post("/mod-exp", summary="计算模幂运算（展示详细步骤）")
async def calculate_mod_exp(request: ModExpRequest):
    if request.modulus <= 0:
        raise HTTPException(status_code=400, detail="modulus 必须大于 0")
    if request.exponent < 0:
        raise HTTPException(status_code=400, detail="exponent 必须是非负数")
    
    result = RSAService.calculate_mod_exp(request.base, request.exponent, request.modulus)
    return result


@router.get("/mod-exp", summary="计算模幂运算（GET 方式）")
async def calculate_mod_exp_get(
    base: int = Query(..., description="底数"),
    exponent: int = Query(..., description="指数"),
    modulus: int = Query(..., description="模数")
):
    if modulus <= 0:
        raise HTTPException(status_code=400, detail="modulus 必须大于 0")
    if exponent < 0:
        raise HTTPException(status_code=400, detail="exponent 必须是非负数")
    
    result = RSAService.calculate_mod_exp(base, exponent, modulus)
    return result

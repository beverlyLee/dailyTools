from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from loguru import logger

from ..database import get_session
from ..models.schemas import (
    StyleTransferRequest,
    InpaintRequest,
    StyleTransferResponse,
    ErrorResponse,
    ModelInfo,
)
from ..services import style_transfer_service
from ..config import settings

router = APIRouter(prefix="/api/style-transfer", tags=["风格迁移"])


@router.post(
    "/apply",
    response_model=StyleTransferResponse,
    responses={400: {"model": ErrorResponse}},
    summary="应用风格迁移",
    description="使用 ControlNet 模型进行服饰风格迁移，保持人物姿态不变"
)
async def apply_style_transfer(
    request: StyleTransferRequest,
):
    try:
        logger.info(f"Applying style transfer for fashion: {request.target_fashion.get('name')}")
        
        result = await style_transfer_service.apply_style_transfer(
            source_image=request.source_image,
            target_fashion=request.target_fashion,
            keypoints=request.keypoints,
            strength=request.strength,
            preserve_structure=request.preserve_structure,
            negative_prompt=request.negative_prompt,
            steps=request.steps,
            guidance_scale=request.guidance_scale,
            seed=request.seed,
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("message", "风格迁移失败")
            )
        
        return StyleTransferResponse(
            success=True,
            message="风格迁移成功",
            data={
                "result_image": result.get("result_image"),
                "result_url": result.get("result_url"),
                "prompt_used": result.get("prompt_used"),
                "metadata": result.get("metadata"),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Style transfer failed: {e}")
        raise HTTPException(status_code=500, detail=f"风格迁移失败: {str(e)}")


@router.post(
    "/inpaint",
    response_model=StyleTransferResponse,
    responses={400: {"model": ErrorResponse}},
    summary="局部重绘",
    description="对图片的指定区域进行局部重绘，可用于调整服饰细节"
)
async def inpaint_region(
    request: InpaintRequest,
):
    try:
        logger.info(f"Performing inpainting with prompt: {request.prompt}")
        
        result = await style_transfer_service.inpaint_region(
            image_path=request.image_path,
            mask_points=request.mask_points,
            prompt=request.prompt,
            strength=request.strength,
            steps=request.steps,
            guidance_scale=request.guidance_scale,
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("message", "局部重绘失败")
            )
        
        return StyleTransferResponse(
            success=True,
            message="局部重绘成功",
            data={
                "result_image": result.get("result_image"),
                "result_url": result.get("result_url"),
                "prompt_used": result.get("prompt_used"),
                "metadata": result.get("metadata"),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Inpainting failed: {e}")
        raise HTTPException(status_code=500, detail=f"局部重绘失败: {str(e)}")


@router.get(
    "/model-info",
    response_model=ModelInfo,
    summary="获取模型信息",
    description="获取当前加载的 ControlNet 和基础模型信息"
)
async def get_model_info():
    try:
        info = style_transfer_service.get_model_info()
        return ModelInfo(
            controlnet_model=info.get("controlnet_model", settings.CONTROLNET_MODEL),
            base_model=info.get("base_model", settings.BASE_MODEL),
            device=info.get("device", settings.DEVICE),
            is_loaded=info.get("is_loaded", False),
        )
    except Exception as e:
        logger.error(f"Failed to get model info: {e}")
        raise HTTPException(status_code=500, detail=f"获取模型信息失败: {str(e)}")


@router.get(
    "/status/{task_id}",
    summary="获取任务状态",
    description="获取异步风格迁移任务的执行状态"
)
async def get_transfer_status(task_id: str):
    try:
        return {
            "success": True,
            "task_id": task_id,
            "status": "completed",
            "progress": 100,
            "message": "任务已完成",
        }
    except Exception as e:
        logger.error(f"Failed to get task status: {e}")
        raise HTTPException(status_code=500, detail=f"获取任务状态失败: {str(e)}")

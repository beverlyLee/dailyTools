from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from pathlib import Path
from loguru import logger

from ..database import get_session
from ..models.schemas import (
    UploadResponse,
    KeypointsResponse,
    FashionStyle,
    FashionCategory,
    ErrorResponse,
)
from ..services import keypoint_detector, image_service
from ..config import settings

router = APIRouter(prefix="/api/images", tags=["图片管理"])


@router.post(
    "/upload",
    response_model=UploadResponse,
    responses={400: {"model": ErrorResponse}},
    summary="上传图片",
    description="上传用户照片或模特图片，支持JPG、PNG、WEBP格式"
)
async def upload_image(
    file: UploadFile = File(..., description="要上传的图片文件")
):
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="无效的文件名")

        allowed_extensions = settings.ALLOWED_EXTENSIONS
        file_ext = Path(file.filename).suffix.lower().lstrip('.')
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件格式。允许的格式: {', '.join(allowed_extensions)}"
            )

        content = await file.read()
        
        if len(content) > settings.MAX_UPLOAD_SIZE:
            max_size_mb = settings.MAX_UPLOAD_SIZE / 1024 / 1024
            raise HTTPException(
                status_code=400,
                detail=f"文件过大。最大允许大小: {max_size_mb:.1f}MB"
            )

        result = await image_service.save_uploaded_file(content, file.filename)
        
        logger.info(f"Image uploaded: {result['filename']}")
        
        return UploadResponse(
            success=True,
            message="图片上传成功",
            data=result,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")


@router.post(
    "/detect-keypoints",
    response_model=KeypointsResponse,
    responses={400: {"model": ErrorResponse}},
    summary="检测人体关键点",
    description="使用姿态估计模型检测图片中的人体关键点和骨骼轮廓"
)
async def detect_keypoints(
    image_path: Dict[str, Any],
):
    try:
        img_path = image_path.get("image_path")
        if not img_path:
            raise HTTPException(status_code=400, detail="缺少 image_path 参数")

        keypoints, metadata = keypoint_detector.detect_from_path(img_path)
        
        if keypoints is None:
            raise HTTPException(status_code=500, detail="关键点检测失败")

        return KeypointsResponse(
            success=True,
            message="关键点检测成功",
            data={
                "keypoints": keypoints.model_dump(),
                "metadata": metadata,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Keypoint detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"检测失败: {str(e)}")


@router.get(
    "/models",
    summary="获取预设模特列表",
    description="获取系统预设的模特图片列表"
)
async def get_models():
    try:
        models = [
            {
                "id": 1,
                "name": "古典模特1",
                "url": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20hanfu%20model%20elegant%20pose%20studio%20light&image_size=portrait_4_3",
            },
            {
                "id": 2,
                "name": "古典模特2",
                "url": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20qipao%20model%20elegant%20pose%20studio%20light&image_size=portrait_4_3",
            },
            {
                "id": 3,
                "name": "现代模特",
                "url": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20fashion%20model%20elegant%20pose%20studio%20light%20portrait&image_size=portrait_4_3",
            },
            {
                "id": 4,
                "name": "古风场景",
                "url": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20garden%20elegant%20woman%20hanfu%20ancient%20style&image_size=portrait_4_3",
            },
        ]

        return {
            "success": True,
            "data": models,
        }

    except Exception as e:
        logger.error(f"Failed to get models: {e}")
        raise HTTPException(status_code=500, detail=f"获取模特列表失败: {str(e)}")


@router.get(
    "/fashions",
    summary="获取服饰风格列表",
    description="获取支持的传统服饰风格列表，包括汉服、旗袍等"
)
async def get_fashions():
    try:
        fashions = [
            {
                "id": "hanfu_ming",
                "name": "明制汉服",
                "description": "端庄典雅的明代传统服饰",
                "category": "汉服",
                "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20ming%20dynasty%20hanfu%20red%20gold%20embroidery%20elegant&image_size=square_hd",
                "prompt": "wearing traditional Chinese Ming Dynasty hanfu, red and gold color scheme, elegant dragon embroidery, silk fabric",
            },
            {
                "id": "hanfu_tang",
                "name": "唐制汉服",
                "description": "华丽飘逸的唐代传统服饰",
                "category": "汉服",
                "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20tang%20dynasty%20hanfu%20flowing%20silk%20peony%20patterns&image_size=square_hd",
                "prompt": "wearing traditional Chinese Tang Dynasty hanfu, flowing silk dress with peony embroidery, vibrant colors",
            },
            {
                "id": "qipao_modern",
                "name": "现代旗袍",
                "description": "优雅时尚的改良旗袍",
                "category": "旗袍",
                "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20chinese%20qipao%20cheongsam%20elegant%20silk%20floral%20pattern&image_size=square_hd",
                "prompt": "wearing elegant modern Chinese qipao (cheongsam), silk fabric with floral patterns, body-hugging silhouette",
            },
            {
                "id": "qipao_classic",
                "name": "经典旗袍",
                "description": "传统经典的老上海旗袍",
                "category": "旗袍",
                "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20shanghai%20qipao%20cheongsam%20vintage%20style%20red%20velvet&image_size=square_hd",
                "prompt": "wearing classic vintage Shanghai qipao, red velvet fabric with traditional Chinese knot buttons, elegant 1930s style",
            },
            {
                "id": "hanfu_song",
                "name": "宋制汉服",
                "description": "素雅清新的宋代传统服饰",
                "category": "汉服",
                "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20song%20dynasty%20hanfu%20light%20blue%20elegant%20simple&image_size=square_hd",
                "prompt": "wearing traditional Chinese Song Dynasty hanfu, light blue elegant dress with simple embroidery, refined and graceful",
            },
            {
                "id": "wedding_hanfu",
                "name": "婚礼汉服",
                "description": "华丽隆重的中式婚礼服饰",
                "category": "汉服",
                "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20wedding%20hanfu%20red%20gold%20phoenix%20crown%20ceremonial&image_size=square_hd",
                "prompt": "wearing traditional Chinese wedding hanfu, red and gold ceremonial dress with phoenix embroidery, phoenix crown, luxurious and grand",
            },
        ]

        return {
            "success": True,
            "data": fashions,
        }

    except Exception as e:
        logger.error(f"Failed to get fashions: {e}")
        raise HTTPException(status_code=500, detail=f"获取服饰列表失败: {str(e)}")


@router.get(
    "/uploads/{filename}",
    summary="获取上传的图片",
    description="通过文件名获取已上传的图片"
)
async def get_uploaded_image(filename: str):
    try:
        file_path = settings.UPLOAD_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="图片不存在")
        
        return FileResponse(
            path=str(file_path),
            media_type="image/*",
            filename=filename,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get uploaded image: {e}")
        raise HTTPException(status_code=500, detail=f"获取图片失败: {str(e)}")


@router.get(
    "/outputs/{filename}",
    summary="获取生成的结果图片",
    description="通过文件名获取风格迁移生成的结果图片"
)
async def get_output_image(filename: str):
    try:
        file_path = settings.OUTPUT_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="图片不存在")
        
        return FileResponse(
            path=str(file_path),
            media_type="image/*",
            filename=filename,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get output image: {e}")
        raise HTTPException(status_code=500, detail=f"获取图片失败: {str(e)}")

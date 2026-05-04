from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pathlib import Path
from typing import Dict, Any
from loguru import logger
from PIL import Image
import io

from ..config import settings
from ..models.schemas import DownloadRequest, ErrorResponse

router = APIRouter(prefix="/api/download", tags=["下载管理"])


@router.get(
    "/{filename:path}",
    summary="下载图片",
    description="通过文件名下载生成的结果图片"
)
async def download_image(filename: str):
    try:
        possible_paths = [
            settings.OUTPUT_DIR / filename,
            settings.UPLOAD_DIR / filename,
        ]

        file_path = None
        for path in possible_paths:
            if path.exists() and path.is_file():
                file_path = path
                break

        if file_path is None:
            raise HTTPException(status_code=404, detail="文件不存在")

        return FileResponse(
            path=str(file_path),
            media_type="image/*",
            filename=filename,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download image: {e}")
        raise HTTPException(status_code=500, detail=f"下载失败: {str(e)}")


@router.post(
    "/high-quality",
    summary="下载高清图片",
    description="下载指定质量和格式的高清图片"
)
async def download_high_quality(request: DownloadRequest):
    try:
        image_path = Path(request.image_path)
        
        if not image_path.exists():
            possible_paths = [
                settings.OUTPUT_DIR / request.image_path,
                settings.UPLOAD_DIR / request.image_path,
            ]
            
            for path in possible_paths:
                if path.exists() and path.is_file():
                    image_path = path
                    break
            
            if not image_path.exists():
                raise HTTPException(status_code=404, detail="图片不存在")

        target_format = request.format.lower()
        quality = request.quality

        try:
            with Image.open(image_path) as img:
                if img.mode == 'RGBA' and target_format in ['jpeg', 'jpg']:
                    img = img.convert('RGB')

                buffer = io.BytesIO()
                
                if target_format in ['jpeg', 'jpg']:
                    img.save(
                        buffer,
                        format='JPEG',
                        quality=quality,
                        optimize=True,
                        progressive=True,
                    )
                elif target_format == 'webp':
                    img.save(
                        buffer,
                        format='WEBP',
                        quality=quality,
                        method=6,
                    )
                else:
                    img.save(
                        buffer,
                        format='PNG',
                        optimize=True,
                    )

                buffer.seek(0)

                output_filename = f"{image_path.stem}.{target_format}"
                
                return StreamingResponse(
                    buffer,
                    media_type=f"image/{target_format}",
                    headers={
                        "Content-Disposition": f"attachment; filename={output_filename}",
                        "Content-Type": f"image/{target_format}",
                    },
                )

        except Exception as e:
            logger.error(f"Failed to process image for download: {e}")
            return FileResponse(
                path=str(image_path),
                media_type="image/*",
                filename=image_path.name,
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download high quality image: {e}")
        raise HTTPException(status_code=500, detail=f"下载失败: {str(e)}")


@router.get(
    "/formats/supported",
    summary="获取支持的下载格式",
    description="获取系统支持的图片下载格式列表"
)
async def get_supported_formats():
    try:
        return {
            "success": True,
            "data": {
                "formats": [
                    {
                        "format": "png",
                        "description": "无损压缩，支持透明背景",
                        "supports_transparency": True,
                        "supports_quality": False,
                    },
                    {
                        "format": "jpeg",
                        "description": "有损压缩，适合照片",
                        "supports_transparency": False,
                        "supports_quality": True,
                    },
                    {
                        "format": "jpg",
                        "description": "JPEG的别名",
                        "supports_transparency": False,
                        "supports_quality": True,
                    },
                    {
                        "format": "webp",
                        "description": "Google开发的现代格式，压缩率高",
                        "supports_transparency": True,
                        "supports_quality": True,
                    },
                ],
                "default_format": "png",
                "default_quality": 100,
            },
        }
    except Exception as e:
        logger.error(f"Failed to get supported formats: {e}")
        raise HTTPException(status_code=500, detail=f"获取格式列表失败: {str(e)}")

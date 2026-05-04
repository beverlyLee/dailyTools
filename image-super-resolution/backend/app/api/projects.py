import os
import base64
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db, PhotoProject
from ..config import settings
from ..services import project_service, image_processor


router = APIRouter(prefix="/api/projects", tags=["Projects"])


class ProcessOptions(BaseModel):
    upscale_factor: int = 2
    enable_inpainting: bool = False
    enable_colorization: bool = False
    annotations: Optional[list] = None


class ProjectResponse(BaseModel):
    id: int
    original_filename: str
    status: str
    original_width: Optional[int]
    original_height: Optional[int]
    upscale_factor: int
    enable_inpainting: bool
    enable_colorization: bool
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True


def project_to_response(project: PhotoProject) -> dict:
    return {
        "id": project.id,
        "original_filename": project.original_filename,
        "status": project.status,
        "original_width": project.original_width,
        "original_height": project.original_height,
        "upscale_factor": project.upscale_factor,
        "enable_inpainting": bool(project.enable_inpainting),
        "enable_colorization": bool(project.enable_colorization),
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
    }


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_path = await project_service.save_upload_file(file)
    
    image, (width, height) = await image_processor.load_image(file_path)
    image_base64 = await image_processor.image_to_base64(image)
    
    project = await project_service.create_project(
        db=db,
        original_filename=file.filename or "unknown.jpg",
        original_path=file_path,
        original_width=width,
        original_height=height
    )
    
    return {
        "project": project_to_response(project),
        "original_image": f"data:image/png;base64,{image_base64}",
        "dimensions": {"width": width, "height": height}
    }


@router.post("/{project_id}/process")
async def process_project(
    project_id: int,
    options: ProcessOptions,
    db: AsyncSession = Depends(get_db)
):
    if options.upscale_factor not in [2, 4, 8]:
        raise HTTPException(status_code=400, detail="Upscale factor must be 2, 4, or 8")
    
    project = await project_service.process_project(
        db=db,
        project_id=project_id,
        upscale_factor=options.upscale_factor,
        enable_inpainting=options.enable_inpainting,
        enable_colorization=options.enable_colorization,
        annotations=options.annotations
    )
    
    return {
        "project": project_to_response(project),
        "message": "Processing completed successfully"
    }


@router.get("/{project_id}/result")
async def get_project_result(
    project_id: int,
    db: AsyncSession = Depends(get_db)
):
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.status != "completed":
        return {
            "project": project_to_response(project),
            "message": "Project is not yet completed"
        }
    
    original_image_base64 = None
    processed_image_base64 = None
    
    if project.original_path and os.path.exists(project.original_path):
        orig_img, _ = await image_processor.load_image(project.original_path)
        original_image_base64 = await image_processor.image_to_base64(orig_img)
    
    if project.processed_path and os.path.exists(project.processed_path):
        proc_img, _ = await image_processor.load_image(project.processed_path)
        processed_image_base64 = await image_processor.image_to_base64(proc_img)
    
    return {
        "project": project_to_response(project),
        "original_image": f"data:image/png;base64,{original_image_base64}" if original_image_base64 else None,
        "processed_image": f"data:image/png;base64,{processed_image_base64}" if processed_image_base64 else None,
        "metadata": project.metadata
    }


@router.get("/{project_id}/original")
async def get_original_image(
    project_id: int,
    db: AsyncSession = Depends(get_db)
):
    project = await project_service.get_project(db, project_id)
    if not project or not project.original_path or not os.path.exists(project.original_path):
        raise HTTPException(status_code=404, detail="Original image not found")
    
    return FileResponse(project.original_path)


@router.get("/{project_id}/processed")
async def get_processed_image(
    project_id: int,
    db: AsyncSession = Depends(get_db)
):
    project = await project_service.get_project(db, project_id)
    if not project or not project.processed_path or not os.path.exists(project.processed_path):
        raise HTTPException(status_code=404, detail="Processed image not found")
    
    return FileResponse(project.processed_path)


@router.get("")
async def list_projects(
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    projects = await project_service.get_all_projects(db, limit=limit)
    return {
        "projects": [project_to_response(p) for p in projects],
        "total": len(projects)
    }


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db)
):
    deleted = await project_service.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}

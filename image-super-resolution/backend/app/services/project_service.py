import os
import uuid
import aiofiles
from datetime import datetime
from typing import Optional, List
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from ..config import settings
from ..database import PhotoProject
from .image_service import image_processor


class ProjectService:
    def __init__(self):
        pass
    
    async def save_upload_file(self, file: UploadFile) -> str:
        file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
        
        return file_path
    
    async def create_project(
        self,
        db: AsyncSession,
        original_filename: str,
        original_path: str,
        original_width: Optional[int] = None,
        original_height: Optional[int] = None
    ) -> PhotoProject:
        project = PhotoProject(
            original_filename=original_filename,
            original_path=original_path,
            original_width=original_width,
            original_height=original_height,
            status="pending"
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project
    
    async def get_project(self, db: AsyncSession, project_id: int) -> Optional[PhotoProject]:
        result = await db.execute(select(PhotoProject).where(PhotoProject.id == project_id))
        return result.scalar_one_or_none()
    
    async def get_all_projects(self, db: AsyncSession, limit: int = 50) -> List[PhotoProject]:
        result = await db.execute(
            select(PhotoProject)
            .order_by(desc(PhotoProject.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def update_project_status(
        self,
        db: AsyncSession,
        project_id: int,
        status: str,
        error_message: Optional[str] = None
    ) -> Optional[PhotoProject]:
        project = await self.get_project(db, project_id)
        if not project:
            return None
        
        project.status = status
        if error_message:
            project.error_message = error_message
        project.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(project)
        return project
    
    async def process_project(
        self,
        db: AsyncSession,
        project_id: int,
        upscale_factor: int = 2,
        enable_inpainting: bool = False,
        enable_colorization: bool = False,
        annotations: Optional[list] = None
    ) -> PhotoProject:
        project = await self.get_project(db, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        await self.update_project_status(db, project_id, "processing")
        
        try:
            image, (width, height) = await image_processor.load_image(project.original_path)
            
            project.original_width = width
            project.original_height = height
            
            mask = None
            if enable_inpainting and annotations:
                mask = await image_processor.create_mask_from_annotation(
                    width, height, annotations
                )
            
            result = await image_processor.process_image(
                image=image,
                scale=upscale_factor,
                enable_inpainting=enable_inpainting,
                enable_colorization=enable_colorization,
                mask=mask
            )
            
            processed_image = result["processed_image"]
            
            output_filename = f"processed_{project_id}_{uuid.uuid4()}.png"
            output_path = os.path.join(settings.OUTPUT_DIR, output_filename)
            await image_processor.save_image(processed_image, output_path)
            
            project.processed_path = output_path
            project.upscale_factor = upscale_factor
            project.enable_inpainting = 1 if enable_inpainting else 0
            project.enable_colorization = 1 if enable_colorization else 0
            project.status = "completed"
            project.metadata = {
                "original_shape": result.get("original_shape"),
                "upscaled_shape": result.get("upscaled_shape"),
                "inpainting_applied": result.get("inpainting_applied", False),
                "colorization_applied": result.get("colorization_applied", False),
            }
            
            await db.commit()
            await db.refresh(project)
            
            return project
            
        except Exception as e:
            await self.update_project_status(db, project_id, "error", str(e))
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    
    async def delete_project(self, db: AsyncSession, project_id: int) -> bool:
        project = await self.get_project(db, project_id)
        if not project:
            return False
        
        if project.original_path and os.path.exists(project.original_path):
            os.remove(project.original_path)
        if project.processed_path and os.path.exists(project.processed_path):
            os.remove(project.processed_path)
        
        await db.delete(project)
        await db.commit()
        return True


project_service = ProjectService()

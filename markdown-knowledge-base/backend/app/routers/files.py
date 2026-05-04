from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
import hashlib

from ..core.database import get_db
from ..models.models import Note
from ..services.file_service import file_service
from ..services.link_service import link_service
from ..services.search_service import search_service

router = APIRouter(prefix="/files", tags=["files"])


class FileCreateRequest(BaseModel):
    path: str
    content: str = ""


class FileWriteRequest(BaseModel):
    content: str


class FileRenameRequest(BaseModel):
    new_path: str


class DirectoryCreateRequest(BaseModel):
    path: str


@router.get("/list")
async def list_files(directory: str = Query(default="", description="目录路径，为空表示根目录")):
    """列出目录下的所有文件和文件夹"""
    try:
        files = file_service.list_files(directory)
        return {"success": True, "data": files, "directory": directory}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/read")
async def read_file(path: str = Query(..., description="文件路径")):
    """读取文件内容"""
    try:
        content = file_service.read_file(path)
        file_info = file_service.get_file_info(path)
        return {
            "success": True,
            "data": {
                "path": path,
                "content": content,
                "content_hash": hashlib.sha256(content.encode('utf-8')).hexdigest(),
                "info": file_info
            }
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_file(
    request: FileCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """创建新文件"""
    try:
        result = file_service.create_file(request.path, request.content)
        
        # 如果是 Markdown 文件，创建或更新笔记记录和索引
        if request.path.endswith('.md'):
            from sqlalchemy import select
            
            # 检查是否已存在笔记记录
            existing_note = await db.execute(
                select(Note).where(Note.file_path == request.path)
            )
            note = existing_note.scalar_one_or_none()
            
            if not note:
                # 创建新笔记记录
                title = Path(request.path).stem
                note = Note(
                    title=title,
                    file_path=request.path,
                    content_hash=result["content_hash"]
                )
                db.add(note)
                await db.commit()
                await db.refresh(note)
            
            # 更新链接关系
            if request.content:
                await link_service.update_note_links(db, note, request.content, request.path)
            
            # 更新搜索索引
            await search_service.index_note(request.path, request.content)
        
        return {"success": True, "data": result}
    except FileExistsError:
        raise HTTPException(status_code=400, detail=f"File already exists: {request.path}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/write")
async def write_file(
    path: str,
    request: FileWriteRequest,
    db: AsyncSession = Depends(get_db)
):
    """写入文件内容（覆盖）"""
    try:
        result = file_service.write_file(path, request.content)
        
        # 如果是 Markdown 文件，更新笔记记录和索引
        if path.endswith('.md'):
            from sqlalchemy import select
            
            # 检查是否已存在笔记记录
            existing_note = await db.execute(
                select(Note).where(Note.file_path == path)
            )
            note = existing_note.scalar_one_or_none()
            
            if not note:
                # 创建新笔记记录
                title = Path(path).stem
                note = Note(
                    title=title,
                    file_path=path,
                    content_hash=result["content_hash"]
                )
                db.add(note)
                await db.commit()
                await db.refresh(note)
            else:
                # 更新现有笔记记录
                note.content_hash = result["content_hash"]
                await db.commit()
            
            # 更新链接关系
            await link_service.update_note_links(db, note, request.content, path)
            
            # 更新搜索索引
            await search_service.index_note(path, request.content)
        
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete")
async def delete_file(
    path: str,
    db: AsyncSession = Depends(get_db)
):
    """删除文件或目录"""
    try:
        # 如果是 Markdown 文件，删除笔记记录和索引
        if path.endswith('.md'):
            from sqlalchemy import select, delete
            from ..models.models import note_links
            
            # 查找笔记记录
            existing_note = await db.execute(
                select(Note).where(Note.file_path == path)
            )
            note = existing_note.scalar_one_or_none()
            
            if note:
                # 删除链接关系
                await db.execute(
                    delete(note_links).where(
                        (note_links.c.from_note_id == note.id) |
                        (note_links.c.to_note_id == note.id)
                    )
                )
                
                # 删除笔记记录
                await db.delete(note)
                await db.commit()
            
            # 从搜索索引中删除
            await search_service.delete_from_index(path)
        
        # 删除文件
        result = file_service.delete_file(path)
        
        return {"success": True, "data": {"path": path, "deleted": result}}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/directory/create")
async def create_directory(request: DirectoryCreateRequest):
    """创建目录"""
    try:
        result = file_service.create_directory(request.path)
        return {"success": True, "data": {"path": request.path, "created": result}}
    except FileExistsError:
        raise HTTPException(status_code=400, detail=f"Directory already exists: {request.path}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rename")
async def rename_file(
    path: str,
    request: FileRenameRequest,
    db: AsyncSession = Depends(get_db)
):
    """重命名或移动文件"""
    try:
        # 重命名文件
        result = file_service.rename_file(path, request.new_path)
        
        # 如果是 Markdown 文件，更新笔记记录和索引
        if path.endswith('.md') and request.new_path.endswith('.md'):
            from sqlalchemy import select
            
            # 查找旧的笔记记录
            existing_note = await db.execute(
                select(Note).where(Note.file_path == path)
            )
            note = existing_note.scalar_one_or_none()
            
            if note:
                # 更新笔记记录的路径和标题
                note.file_path = request.new_path
                note.title = Path(request.new_path).stem
                await db.commit()
            
            # 更新搜索索引
            await search_service.update_index_for_rename(path, request.new_path)
        
        return {"success": True, "data": result}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    except FileExistsError:
        raise HTTPException(status_code=400, detail=f"File already exists: {request.new_path}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/info")
async def get_file_info(path: str = Query(..., description="文件路径")):
    """获取文件信息"""
    try:
        info = file_service.get_file_info(path)
        return {"success": True, "data": info}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_files(
    query: str = Query(..., description="搜索关键词"),
    search_type: str = Query(default="name", description="搜索类型：name(文件名), content(内容)")
):
    """搜索文件"""
    try:
        if search_type == "name":
            results = file_service.search_files_by_name(query)
            return {"success": True, "data": results, "search_type": "name"}
        else:
            # 全文搜索
            results = await search_service.search(query)
            return {"success": True, "data": results, "search_type": "content"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

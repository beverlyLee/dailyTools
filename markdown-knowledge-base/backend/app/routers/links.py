from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..core.database import get_db
from ..models.models import Note, note_links
from ..services.link_service import link_service
from ..services.search_service import search_service

router = APIRouter(prefix="/links", tags=["links"])


@router.get("/outgoing")
async def get_outgoing_links(
    path: str = Query(..., description="笔记文件路径"),
    db: AsyncSession = Depends(get_db)
):
    """获取笔记的 outgoing 链接（当前笔记引用的其他笔记）"""
    try:
        # 查找笔记
        result = await db.execute(
            select(Note).where(Note.file_path == path)
        )
        note = result.scalar_one_or_none()
        
        if not note:
            raise HTTPException(status_code=404, detail=f"Note not found: {path}")
        
        links = await link_service.get_outgoing_links(db, note.id)
        
        return {
            "success": True,
            "data": {
                "note_path": path,
                "note_id": note.id,
                "outgoing_links": links
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/incoming")
async def get_incoming_links(
    path: str = Query(..., description="笔记文件路径"),
    db: AsyncSession = Depends(get_db)
):
    """获取笔记的 incoming 链接（引用当前笔记的其他笔记）"""
    try:
        # 查找笔记
        result = await db.execute(
            select(Note).where(Note.file_path == path)
        )
        note = result.scalar_one_or_none()
        
        if not note:
            raise HTTPException(status_code=404, detail=f"Note not found: {path}")
        
        links = await link_service.get_incoming_links(db, note.id)
        
        return {
            "success": True,
            "data": {
                "note_path": path,
                "note_id": note.id,
                "incoming_links": links
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/both")
async def get_both_links(
    path: str = Query(..., description="笔记文件路径"),
    db: AsyncSession = Depends(get_db)
):
    """同时获取笔记的 incoming 和 outgoing 链接"""
    try:
        # 查找笔记
        result = await db.execute(
            select(Note).where(Note.file_path == path)
        )
        note = result.scalar_one_or_none()
        
        if not note:
            raise HTTPException(status_code=404, detail=f"Note not found: {path}")
        
        outgoing = await link_service.get_outgoing_links(db, note.id)
        incoming = await link_service.get_incoming_links(db, note.id)
        
        return {
            "success": True,
            "data": {
                "note_path": path,
                "note_id": note.id,
                "outgoing_links": outgoing,
                "incoming_links": incoming
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph")
async def get_knowledge_graph(
    db: AsyncSession = Depends(get_db)
):
    """获取完整的知识图谱数据"""
    try:
        graph_data = await link_service.get_all_links(db)
        
        return {
            "success": True,
            "data": graph_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/subgraph")
async def get_subgraph(
    path: str = Query(..., description="中心笔记文件路径"),
    depth: int = Query(default=1, ge=1, le=3, description="遍历深度，默认1层"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取以某个笔记为中心的子图谱
    :param path: 中心笔记路径
    :param depth: 遍历深度 (1-3)
    """
    try:
        # 查找中心笔记
        result = await db.execute(
            select(Note).where(Note.file_path == path)
        )
        center_note = result.scalar_one_or_none()
        
        if not center_note:
            raise HTTPException(status_code=404, detail=f"Note not found: {path}")
        
        # 使用 BFS 获取子图
        visited_ids = set()
        nodes = []
        edges = []
        
        from collections import deque
        queue = deque([(center_note.id, 0)])
        visited_ids.add(center_note.id)
        
        # 先获取所有相关笔记
        note_map = {}
        all_notes_result = await db.execute(select(Note))
        for note in all_notes_result.scalars().all():
            note_map[note.id] = note
        
        # 获取所有链接
        all_links_result = await db.execute(select(note_links))
        all_edges = all_links_result.fetchall()
        
        # 构建邻接表
        adjacency = {}
        for from_id, to_id in all_edges:
            if from_id not in adjacency:
                adjacency[from_id] = []
            adjacency[from_id].append(to_id)
            
            # 也添加反向链接用于 incoming 遍历
            if to_id not in adjacency:
                adjacency[to_id] = []
        
        # BFS 遍历
        while queue:
            current_id, current_depth = queue.popleft()
            
            if current_id in note_map:
                note = note_map[current_id]
                nodes.append({
                    "id": note.id,
                    "title": note.title,
                    "file_path": note.file_path,
                    "created_at": note.created_at.isoformat() if note.created_at else None,
                    "updated_at": note.updated_at.isoformat() if note.updated_at else None,
                    "is_center": current_id == center_note.id,
                    "depth": current_depth
                })
            
            if current_depth < depth:
                # 查找 outgoing 链接
                if current_id in adjacency:
                    for neighbor_id in adjacency[current_id]:
                        if neighbor_id not in visited_ids:
                            visited_ids.add(neighbor_id)
                            queue.append((neighbor_id, current_depth + 1))
                
                # 查找 incoming 链接（通过反向遍历 all_edges）
                for from_id, to_id in all_edges:
                    if to_id == current_id and from_id not in visited_ids:
                        visited_ids.add(from_id)
                        queue.append((from_id, current_depth + 1))
        
        # 过滤只包含访问节点的边
        for from_id, to_id in all_edges:
            if from_id in visited_ids and to_id in visited_ids:
                if from_id in note_map and to_id in note_map:
                    edges.append({
                        "from": from_id,
                        "to": to_id,
                        "from_title": note_map[from_id].title,
                        "to_title": note_map[to_id].title
                    })
        
        return {
            "success": True,
            "data": {
                "center_note": {
                    "id": center_note.id,
                    "title": center_note.title,
                    "file_path": center_note.file_path
                },
                "depth": depth,
                "nodes": nodes,
                "edges": edges
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract")
async def extract_links_from_content(
    content: str,
    current_path: Optional[str] = Query(default=None, description="当前文件路径，用于解析相对路径")
):
    """从 Markdown 内容中提取 Wiki Links（不保存到数据库）"""
    try:
        # 提取链接文本
        link_texts = link_service.extract_wiki_links(content)
        
        # 解析为实际路径
        resolved_links = []
        unresolved_links = []
        
        for link_text in link_texts:
            resolved = link_service.resolve_link_to_path(link_text, current_path or "")
            if resolved:
                resolved_links.append({
                    "link_text": link_text,
                    "resolved_path": resolved
                })
            else:
                unresolved_links.append({
                    "link_text": link_text,
                    "reason": "File not found"
                })
        
        return {
            "success": True,
            "data": {
                "extracted_links": link_texts,
                "resolved_links": resolved_links,
                "unresolved_links": unresolved_links
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/render-wiki-links")
async def render_wiki_links(
    content: str,
    current_path: Optional[str] = Query(default=None, description="当前文件路径")
):
    """将 Wiki Links 渲染为 HTML 链接（用于预览）"""
    try:
        rendered = link_service.render_wiki_links_to_html(content, current_path or "")
        
        return {
            "success": True,
            "data": {
                "original_content": content,
                "rendered_content": rendered
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

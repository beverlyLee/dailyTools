import re
from typing import List, Dict, Set, Optional
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from ..models.models import Note, note_links
from ..core.config import settings
from .file_service import file_service


class LinkService:
    WIKI_LINK_PATTERN = re.compile(r'\[\[([^\]]+)\]\]')
    
    def __init__(self):
        self.notes_dir = settings.NOTES_DIR
    
    def extract_wiki_links(self, content: str) -> List[str]:
        """从 Markdown 内容中提取所有 Wiki Links [[链接]]"""
        matches = self.WIKI_LINK_PATTERN.findall(content)
        # 去除重复的链接
        unique_links = list(dict.fromkeys(matches))
        return unique_links
    
    def resolve_link_to_path(self, link_text: str, current_file_path: str) -> Optional[str]:
        """
        将 Wiki 链接文本解析为实际文件路径
        支持格式：
        - [[笔记名称]] - 查找同名文件
        - [[路径/笔记名称]] - 相对路径
        - [[笔记名称|显示文本]] - 带别名的链接
        """
        # 处理别名格式 [[链接|显示文本]]
        if '|' in link_text:
            link_text = link_text.split('|')[0].strip()
        
        # 处理锚点 [[链接#锚点]]
        if '#' in link_text:
            link_text = link_text.split('#')[0].strip()
        
        # 如果链接已经是相对路径格式
        if '/' in link_text or '\\' in link_text:
            # 规范化路径分隔符
            normalized = link_text.replace('\\', '/')
            # 检查是否存在
            possible_path = normalized if normalized.endswith('.md') else f"{normalized}.md"
            try:
                abs_path = file_service._get_absolute_path(possible_path)
                if abs_path.exists():
                    return possible_path
            except ValueError:
                pass
            
            # 尝试相对于当前文件目录
            current_dir = Path(current_file_path).parent if current_file_path else Path("")
            relative_to_current = str(current_dir / normalized)
            possible_path = relative_to_current if relative_to_current.endswith('.md') else f"{relative_to_current}.md"
            try:
                abs_path = file_service._get_absolute_path(possible_path)
                if abs_path.exists():
                    return possible_path
            except ValueError:
                pass
        
        # 简单名称，在整个笔记目录中搜索同名文件
        search_name = link_text if link_text.endswith('.md') else f"{link_text}.md"
        
        # 首先检查是否在当前目录
        current_dir = Path(current_file_path).parent if current_file_path else Path("")
        possible_in_current = str(current_dir / search_name)
        try:
            abs_path = file_service._get_absolute_path(possible_in_current)
            if abs_path.exists():
                return possible_in_current
        except ValueError:
            pass
        
        # 在整个笔记目录中搜索
        try:
            for root, dirs, files in file_service.notes_dir.walk():
                if search_name in files:
                    rel_path = str(root.relative_to(file_service.notes_dir) / search_name)
                    # 移除可能的前导 ./
                    if rel_path.startswith('./'):
                        rel_path = rel_path[2:]
                    return rel_path
        except Exception:
            pass
        
        # 也尝试不带 .md 后缀的目录（用于文件夹）
        search_dir = link_text
        try:
            for root, dirs, files in file_service.notes_dir.walk():
                if search_dir in dirs:
                    rel_path = str(root.relative_to(file_service.notes_dir) / search_dir)
                    if rel_path.startswith('./'):
                        rel_path = rel_path[2:]
                    return rel_path
        except Exception:
            pass
        
        return None
    
    async def update_note_links(
        self, 
        session: AsyncSession, 
        note: Note, 
        content: str,
        current_file_path: str
    ) -> Dict:
        """
        更新笔记的链接关系
        1. 提取内容中的 Wiki Links
        2. 解析为实际文件路径
        3. 更新数据库中的链接关系
        """
        # 提取链接
        link_texts = self.extract_wiki_links(content)
        
        # 解析为实际路径
        linked_paths = []
        for link_text in link_texts:
            resolved = self.resolve_link_to_path(link_text, current_file_path)
            if resolved:
                linked_paths.append(resolved)
        
        # 查找或创建目标笔记
        linked_notes = []
        for path in linked_paths:
            # 查找现有笔记
            result = await session.execute(
                select(Note).where(Note.file_path == path)
            )
            target_note = result.scalar_one_or_none()
            
            if not target_note:
                # 如果目标笔记不存在，创建一个占位符
                # 提取标题（文件名，不带 .md）
                title = Path(path).stem
                target_note = Note(
                    title=title,
                    file_path=path
                )
                session.add(target_note)
                await session.flush()
            
            linked_notes.append(target_note)
        
        # 更新链接关系
        # 先清除现有 outgoing 链接
        await session.execute(
            delete(note_links).where(note_links.c.from_note_id == note.id)
        )
        
        # 添加新链接
        for target_note in linked_notes:
            if target_note.id != note.id:  # 避免自引用
                await session.execute(
                    note_links.insert().values(
                        from_note_id=note.id,
                        to_note_id=target_note.id
                    )
                )
        
        await session.commit()
        
        return {
            "note_id": note.id,
            "extracted_links": link_texts,
            "resolved_links": [n.file_path for n in linked_notes],
            "unresolved_links": [lt for i, lt in enumerate(link_texts) 
                                if i >= len(linked_paths) or linked_paths[i] is None]
        }
    
    async def get_outgoing_links(self, session: AsyncSession, note_id: int) -> List[Dict]:
        """获取笔记的 outgoing 链接（当前笔记引用的其他笔记）"""
        result = await session.execute(
            select(Note)
            .options(selectinload(Note.outgoing_links))
            .where(Note.id == note_id)
        )
        note = result.scalar_one_or_none()
        
        if not note:
            return []
        
        return [
            {
                "id": linked.id,
                "title": linked.title,
                "file_path": linked.file_path
            }
            for linked in note.outgoing_links
        ]
    
    async def get_incoming_links(self, session: AsyncSession, note_id: int) -> List[Dict]:
        """获取笔记的 incoming 链接（引用当前笔记的其他笔记）"""
        result = await session.execute(
            select(Note)
            .options(selectinload(Note.incoming_links))
            .where(Note.id == note_id)
        )
        note = result.scalar_one_or_none()
        
        if not note:
            return []
        
        return [
            {
                "id": linked.id,
                "title": linked.title,
                "file_path": linked.file_path
            }
            for linked in note.incoming_links
        ]
    
    async def get_all_links(self, session: AsyncSession) -> List[Dict]:
        """获取所有笔记间的链接关系（用于知识图谱）"""
        # 获取所有笔记
        result = await session.execute(select(Note))
        notes = result.scalars().all()
        
        # 获取所有链接
        links_result = await session.execute(select(note_links))
        links = links_result.fetchall()
        
        # 构建图谱数据
        nodes = []
        edges = []
        
        note_map = {}
        for note in notes:
            note_map[note.id] = note
            nodes.append({
                "id": note.id,
                "title": note.title,
                "file_path": note.file_path,
                "created_at": note.created_at.isoformat() if note.created_at else None,
                "updated_at": note.updated_at.isoformat() if note.updated_at else None
            })
        
        for from_id, to_id in links:
            if from_id in note_map and to_id in note_map:
                edges.append({
                    "from": from_id,
                    "to": to_id,
                    "from_title": note_map[from_id].title,
                    "to_title": note_map[to_id].title
                })
        
        return {
            "nodes": nodes,
            "edges": edges
        }
    
    def render_wiki_links_to_html(self, content: str, current_file_path: str = "") -> str:
        """
        将 Wiki Links 渲染为 HTML 链接
        用于预览功能
        """
        def replace_link(match):
            link_text = match.group(1)
            display_text = link_text
            
            # 处理别名
            if '|' in link_text:
                link_text, display_text = link_text.split('|', 1)
                link_text = link_text.strip()
                display_text = display_text.strip()
            
            # 处理锚点
            anchor = ""
            if '#' in link_text:
                link_text, anchor = link_text.split('#', 1)
                link_text = link_text.strip()
                anchor = f"#{anchor}"
            
            # 解析路径
            resolved_path = self.resolve_link_to_path(link_text, current_file_path)
            
            if resolved_path:
                # 生成可点击的链接
                return f'<a href="note://{resolved_path}{anchor}" class="wiki-link" data-path="{resolved_path}">{display_text}</a>'
            else:
                # 未解析的链接，显示为待创建状态
                return f'<span class="wiki-link unresolved" data-link-text="{link_text}">{display_text}</span>'
        
        return self.WIKI_LINK_PATTERN.sub(replace_link, content)


link_service = LinkService()

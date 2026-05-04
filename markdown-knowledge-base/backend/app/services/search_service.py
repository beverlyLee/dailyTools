import os
from pathlib import Path
from typing import List, Dict, Optional
from whoosh import index
from whoosh.fields import Schema, TEXT, ID, DATETIME, KEYWORD
from whoosh.qparser import QueryParser, MultifieldParser
from whoosh.analysis import StemmingAnalyzer
from datetime import datetime
from ..core.config import settings
from .file_service import file_service


class SearchService:
    def __init__(self, index_dir: Path = None):
        self.index_dir = index_dir or settings.INDEX_DIR
        self.schema = Schema(
            path=ID(stored=True, unique=True),
            title=TEXT(stored=True, analyzer=StemmingAnalyzer()),
            content=TEXT(stored=True, analyzer=StemmingAnalyzer()),
            tags=KEYWORD(stored=True, commas=True, lowercase=True),
            created_at=DATETIME(stored=True),
            updated_at=DATETIME(stored=True)
        )
        self._ensure_index_exists()
    
    def _ensure_index_exists(self):
        """确保索引目录存在，如果不存在则创建"""
        if not os.path.exists(self.index_dir):
            os.makedirs(self.index_dir)
            self.index = index.create_in(self.index_dir, self.schema)
        else:
            if index.exists_in(self.index_dir):
                self.index = index.open_dir(self.index_dir)
            else:
                self.index = index.create_in(self.index_dir, self.schema)
    
    def _extract_title_from_content(self, content: str, file_name: str) -> str:
        """
        从内容或文件名中提取标题
        优先使用第一个 # 标题，其次使用文件名
        """
        lines = content.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('#'):
                # 移除 # 并去除前后空白
                title = line.lstrip('#').strip()
                if title:
                    return title
        
        # 如果没有找到标题，使用文件名（不带扩展名）
        return Path(file_name).stem
    
    def _extract_tags_from_content(self, content: str) -> List[str]:
        """
        从内容中提取标签
        支持格式：#标签 或 [[标签]]
        """
        import re
        tags = []
        
        # 匹配 #标签 格式
        hash_pattern = re.compile(r'#([a-zA-Z0-9_\u4e00-\u9fa5]+)')
        hash_matches = hash_pattern.findall(content)
        tags.extend(hash_matches)
        
        # 匹配 [[标签]] 格式（简单的标签链接）
        wiki_pattern = re.compile(r'\[\[([^\]#|]+)\]\]')
        wiki_matches = wiki_pattern.findall(content)
        # 只添加看起来像标签的（通常是单个词或短语）
        for match in wiki_matches:
            if '/' not in match and '\\' not in match:
                tags.append(match)
        
        # 去重并返回
        return list(dict.fromkeys(tags))
    
    async def index_note(self, file_path: str, content: Optional[str] = None) -> Dict:
        """
        为单个笔记建立或更新索引
        """
        try:
            # 如果没有提供内容，读取文件
            if content is None:
                content = file_service.read_file(file_path)
            
            # 提取元数据
            title = self._extract_title_from_content(content, file_path)
            tags = self._extract_tags_from_content(content)
            file_info = file_service.get_file_info(file_path)
            
            # 转换为索引需要的格式
            created_at = datetime.fromtimestamp(file_info['created'])
            updated_at = datetime.fromtimestamp(file_info['modified'])
            
            # 写入索引
            writer = self.index.writer()
            
            # 先删除旧的索引
            writer.delete_by_term('path', file_path)
            
            # 添加新的索引
            writer.add_document(
                path=file_path,
                title=title,
                content=content,
                tags=','.join(tags),
                created_at=created_at,
                updated_at=updated_at
            )
            
            writer.commit()
            
            return {
                "path": file_path,
                "title": title,
                "tags": tags,
                "indexed": True
            }
        except Exception as e:
            raise RuntimeError(f"Failed to index note: {str(e)}")
    
    async def index_all_notes(self) -> Dict:
        """
        为所有笔记建立索引
        """
        indexed_count = 0
        failed_count = 0
        failed_paths = []
        
        try:
            # 获取所有 md 文件
            for root, dirs, files in os.walk(settings.NOTES_DIR):
                for file_name in files:
                    if file_name.endswith('.md'):
                        try:
                            full_path = Path(root) / file_name
                            rel_path = str(full_path.relative_to(settings.NOTES_DIR))
                            
                            await self.index_note(rel_path)
                            indexed_count += 1
                        except Exception as e:
                            failed_count += 1
                            failed_paths.append(str(file_name))
            
            return {
                "success": True,
                "indexed_count": indexed_count,
                "failed_count": failed_count,
                "failed_paths": failed_paths
            }
        except Exception as e:
            raise RuntimeError(f"Failed to index all notes: {str(e)}")
    
    async def search(
        self,
        query: str,
        search_fields: List[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """
        执行搜索
        :param query: 搜索查询
        :param search_fields: 要搜索的字段，默认为 ['title', 'content', 'tags']
        :param limit: 最大返回结果数
        """
        if search_fields is None:
            search_fields = ['title', 'content', 'tags']
        
        results = []
        
        try:
            with self.index.searcher() as searcher:
                # 创建多字段查询解析器
                parser = MultifieldParser(search_fields, schema=self.schema)
                parsed_query = parser.parse(query)
                
                # 执行搜索
                hits = searcher.search(parsed_query, limit=limit)
                
                # 处理结果
                for hit in hits:
                    result_dict = {
                        "path": hit.get('path'),
                        "title": hit.get('title'),
                        "tags": hit.get('tags', '').split(',') if hit.get('tags') else [],
                        "created_at": hit.get('created_at').isoformat() if hit.get('created_at') else None,
                        "updated_at": hit.get('updated_at').isoformat() if hit.get('updated_at') else None,
                        "score": hit.score,
                        "highlights": {}
                    }
                    
                    # 获取高亮片段
                    for field in search_fields:
                        if field in hit:
                            try:
                                highlight = hit.highlights(field)
                                if highlight:
                                    result_dict["highlights"][field] = highlight
                            except Exception:
                                pass
                    
                    results.append(result_dict)
            
            return results
        except Exception as e:
            raise RuntimeError(f"Search failed: {str(e)}")
    
    async def delete_from_index(self, file_path: str) -> bool:
        """
        从索引中删除笔记
        """
        try:
            writer = self.index.writer()
            writer.delete_by_term('path', file_path)
            writer.commit()
            return True
        except Exception as e:
            raise RuntimeError(f"Failed to delete from index: {str(e)}")
    
    async def update_index_for_rename(self, old_path: str, new_path: str) -> bool:
        """
        文件重命名时更新索引
        """
        try:
            # 先读取旧内容
            try:
                content = file_service.read_file(new_path)
            except FileNotFoundError:
                # 如果新文件不存在，可能还没完成重命名，尝试旧路径
                content = file_service.read_file(old_path)
            
            # 删除旧索引
            await self.delete_from_index(old_path)
            
            # 添加新索引
            await self.index_note(new_path, content)
            
            return True
        except Exception as e:
            raise RuntimeError(f"Failed to update index for rename: {str(e)}")
    
    def get_index_stats(self) -> Dict:
        """
        获取索引统计信息
        """
        try:
            with self.index.searcher() as searcher:
                doc_count = searcher.doc_count()
                
                # 统计字段信息
                stats = {
                    "total_documents": doc_count,
                    "index_directory": str(self.index_dir),
                    "fields": list(self.schema.names())
                }
                
                return stats
        except Exception as e:
            raise RuntimeError(f"Failed to get index stats: {str(e)}")


search_service = SearchService()

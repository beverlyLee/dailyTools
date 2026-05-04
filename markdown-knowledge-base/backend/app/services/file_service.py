import os
import hashlib
from pathlib import Path
from typing import List, Optional
from ..core.config import settings


class FileService:
    def __init__(self, notes_dir: Path = None):
        self.notes_dir = notes_dir or settings.NOTES_DIR
    
    def _get_relative_path(self, file_path: str) -> str:
        """将绝对路径转换为相对于 notes_dir 的相对路径"""
        abs_path = Path(file_path).resolve()
        notes_abs = self.notes_dir.resolve()
        
        if not abs_path.is_relative_to(notes_abs):
            raise ValueError(f"Path {file_path} is outside notes directory")
        
        return str(abs_path.relative_to(notes_abs))
    
    def _get_absolute_path(self, relative_path: str) -> Path:
        """将相对路径转换为绝对路径"""
        # 确保路径不会跳出 notes_dir
        rel_path = Path(relative_path).resolve()
        if rel_path.is_absolute() or '..' in relative_path:
            raise ValueError(f"Invalid path: {relative_path}")
        
        abs_path = (self.notes_dir / relative_path).resolve()
        notes_abs = self.notes_dir.resolve()
        
        if not abs_path.is_relative_to(notes_abs):
            raise ValueError(f"Path {relative_path} is outside notes directory")
        
        return abs_path
    
    def list_files(self, directory: str = "") -> List[dict]:
        """列出目录下的所有文件和文件夹"""
        try:
            target_dir = self._get_absolute_path(directory) if directory else self.notes_dir
            result = []
            
            if not target_dir.exists():
                return result
            
            for item in sorted(target_dir.iterdir(), key=lambda x: (not x.is_dir(), x.name)):
                item_dict = {
                    "name": item.name,
                    "path": self._get_relative_path(str(item)),
                    "type": "directory" if item.is_dir() else "file",
                    "extension": item.suffix if item.is_file() else None
                }
                result.append(item_dict)
            
            return result
        except Exception as e:
            raise RuntimeError(f"Failed to list files: {str(e)}")
    
    def read_file(self, file_path: str) -> str:
        """读取文件内容"""
        try:
            abs_path = self._get_absolute_path(file_path)
            if not abs_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            with open(abs_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            raise
        except Exception as e:
            raise RuntimeError(f"Failed to read file: {str(e)}")
    
    def write_file(self, file_path: str, content: str) -> dict:
        """写入文件内容，如果文件不存在则创建"""
        try:
            abs_path = self._get_absolute_path(file_path)
            
            # 确保目录存在
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(abs_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # 计算内容哈希
            content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
            
            return {
                "path": self._get_relative_path(str(abs_path)),
                "content_hash": content_hash,
                "success": True
            }
        except Exception as e:
            raise RuntimeError(f"Failed to write file: {str(e)}")
    
    def create_file(self, file_path: str, content: str = "") -> dict:
        """创建新文件"""
        try:
            abs_path = self._get_absolute_path(file_path)
            
            if abs_path.exists():
                raise FileExistsError(f"File already exists: {file_path}")
            
            return self.write_file(file_path, content)
        except FileExistsError:
            raise
        except Exception as e:
            raise RuntimeError(f"Failed to create file: {str(e)}")
    
    def delete_file(self, file_path: str) -> bool:
        """删除文件"""
        try:
            abs_path = self._get_absolute_path(file_path)
            
            if not abs_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            if abs_path.is_dir():
                # 删除目录及其内容
                import shutil
                shutil.rmtree(abs_path)
            else:
                abs_path.unlink()
            
            return True
        except FileNotFoundError:
            raise
        except Exception as e:
            raise RuntimeError(f"Failed to delete file: {str(e)}")
    
    def create_directory(self, dir_path: str) -> bool:
        """创建目录"""
        try:
            abs_path = self._get_absolute_path(dir_path)
            
            if abs_path.exists():
                raise FileExistsError(f"Directory already exists: {dir_path}")
            
            abs_path.mkdir(parents=True, exist_ok=True)
            return True
        except FileExistsError:
            raise
        except Exception as e:
            raise RuntimeError(f"Failed to create directory: {str(e)}")
    
    def rename_file(self, old_path: str, new_path: str) -> dict:
        """重命名或移动文件"""
        try:
            old_abs = self._get_absolute_path(old_path)
            new_abs = self._get_absolute_path(new_path)
            
            if not old_abs.exists():
                raise FileNotFoundError(f"File not found: {old_path}")
            
            if new_abs.exists():
                raise FileExistsError(f"File already exists: {new_path}")
            
            # 确保新路径的目录存在
            new_abs.parent.mkdir(parents=True, exist_ok=True)
            
            old_abs.rename(new_abs)
            
            return {
                "old_path": old_path,
                "new_path": new_path,
                "success": True
            }
        except (FileNotFoundError, FileExistsError):
            raise
        except Exception as e:
            raise RuntimeError(f"Failed to rename file: {str(e)}")
    
    def get_file_info(self, file_path: str) -> dict:
        """获取文件信息"""
        try:
            abs_path = self._get_absolute_path(file_path)
            
            if not abs_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            stat = abs_path.stat()
            
            return {
                "path": self._get_relative_path(str(abs_path)),
                "name": abs_path.name,
                "size": stat.st_size,
                "created": stat.st_ctime,
                "modified": stat.st_mtime,
                "is_directory": abs_path.is_dir()
            }
        except FileNotFoundError:
            raise
        except Exception as e:
            raise RuntimeError(f"Failed to get file info: {str(e)}")
    
    def search_files_by_name(self, query: str) -> List[dict]:
        """按文件名搜索文件"""
        results = []
        query_lower = query.lower()
        
        try:
            for root, dirs, files in os.walk(self.notes_dir):
                for name in files + dirs:
                    if query_lower in name.lower():
                        full_path = Path(root) / name
                        rel_path = self._get_relative_path(str(full_path))
                        results.append({
                            "name": name,
                            "path": rel_path,
                            "type": "directory" if (Path(root) / name).is_dir() else "file"
                        })
            
            return results
        except Exception as e:
            raise RuntimeError(f"Failed to search files: {str(e)}")


file_service = FileService()

import pdfplumber
import re
from typing import List, Optional


class PDFParser:
    """PDF简历解析器"""
    
    def __init__(self):
        pass
    
    def parse(self, file_path: str) -> str:
        """
        解析PDF文件，提取文本内容
        
        Args:
            file_path: PDF文件路径
            
        Returns:
            提取的文本内容
        """
        text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return self._clean_text(text)
        except Exception as e:
            raise Exception(f"PDF解析失败: {str(e)}")
    
    def _clean_text(self, text: str) -> str:
        """
        清理文本内容
        
        Args:
            text: 原始文本
            
        Returns:
            清理后的文本
        """
        # 替换多个空格为单个空格
        text = re.sub(r' +', ' ', text)
        # 替换多个换行为单个换行
        text = re.sub(r'\n+', '\n', text)
        # 去除首尾空白
        text = text.strip()
        return text
    
    def extract_by_regex(self, text: str, pattern: str) -> Optional[str]:
        """
        使用正则表达式提取文本
        
        Args:
            text: 文本内容
            pattern: 正则表达式模式
            
        Returns:
            匹配的内容，未匹配返回None
        """
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return match.group(1).strip() if match.groups() else match.group().strip()
        return None

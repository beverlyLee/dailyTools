#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import requests
from dotenv import load_dotenv

load_dotenv()

APP_ID = os.getenv("FEISHU_APP_ID")
APP_SECRET = os.getenv("FEISHU_APP_SECRET")

if not APP_ID or not APP_SECRET:
    print("❌ 请在 .env 中配置 FEISHU_APP_ID / FEISHU_APP_SECRET")
    sys.exit(1)

BASE = "https://open.feishu.cn/open-apis"
DOCX = f"{BASE}/docx/v1"


class FeishuDoc:
    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret
        self.token = None
        self._token_expire_time = 0

    def _get_token(self) -> str:
        import time
        if self.token and time.time() < self._token_expire_time:
            return self.token
        
        url = f"{BASE}/auth/v3/tenant_access_token/internal"
        payload = {"app_id": self.app_id, "app_secret": self.app_secret}
        r = requests.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
        self.token = data["tenant_access_token"]
        self._token_expire_time = time.time() + data.get("expire", 7200) - 100
        return self.token

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self._get_token()}"}

    @staticmethod
    def resolve_doc_id(raw_input: str) -> str:
        match = re.search(r"/(docx|wiki)/([A-Za-z0-9]+)", raw_input)
        if match:
            return match.group(2)
        return raw_input

    def fetch_document(self, doc_id: str) -> Dict[str, Any]:
        url = f"{DOCX}/documents/{FeishuDoc.resolve_doc_id(doc_id)}"
        r = requests.get(url, headers=self._headers())
        r.raise_for_status()
        return r.json()

    def fetch_blocks(self, doc_id: str, page_token: str = "") -> List[Dict[str, Any]]:
        url = f"{DOCX}/documents/{FeishuDoc.resolve_doc_id(doc_id)}/blocks"
        params = {"page_token": page_token} if page_token else {}
        r = requests.get(url, headers=self._headers(), params=params)
        r.raise_for_status()
        data = r.json()["data"]
        blocks = data["items"]
        if data.get("has_more") and data.get("next_page_token"):
            blocks.extend(self.fetch_blocks(doc_id, data["next_page_token"]))
        return blocks

    def get_document_title(self, doc_id: str) -> str:
        data = self.fetch_document(doc_id)
        return data.get("data", {}).get("document", {}).get("title", "")

    def read_all_text(self, doc_id: str) -> str:
        blocks = self.fetch_blocks(doc_id)
        return self._blocks_to_text(blocks)

    def read_block_by_num(self, doc_id: str, num: str) -> Optional[str]:
        blocks = self.fetch_blocks(doc_id)
        secs = self._parse_blocks_hierarchical(blocks)
        if num not in secs:
            return None
        b = secs[num]
        return self._block_to_text(b)

    def read_section_content(self, doc_id: str, num: str) -> Optional[str]:
        blocks = self.fetch_blocks(doc_id)
        blocks_by_id = {b["block_id"]: b for b in blocks}
        
        root_blocks = [b for b in blocks if b.get("parent_id") == ""]
        if not root_blocks:
            return None
        
        children_ids = root_blocks[0].get("children", [])
        child_blocks = [blocks_by_id.get(child_id) for child_id in children_ids if blocks_by_id.get(child_id)]
        child_blocks = [cb for cb in child_blocks if cb]
        
        level_counters = [0, 0, 0]
        sections = []
        section_block_map = {}
        
        for b in child_blocks:
            text = self._block_to_text(b, blocks_by_id)
            block_type = b.get("block_type")
            
            if block_type == 3:
                level_counters[0] += 1
                level_counters[1] = 0
                level_counters[2] = 0
                current_num = str(level_counters[0])
                sections.append((current_num, b, "heading"))
                section_block_map[current_num] = b
            elif block_type == 4:
                level_counters[1] += 1
                level_counters[2] = 0
                current_num = f"{level_counters[0]}.{level_counters[1]}"
                sections.append((current_num, b, "heading"))
                section_block_map[current_num] = b
            elif block_type == 5:
                level_counters[2] += 1
                current_num = f"{level_counters[0]}.{level_counters[1]}.{level_counters[2]}"
                sections.append((current_num, b, "heading"))
                section_block_map[current_num] = b
            else:
                sections.append((None, b, "content"))
        
        if num not in section_block_map:
            return None
        
        num_parts = list(map(int, num.split(".")))
        target_level = len(num_parts)
        
        result = []
        found = False
        
        for section_num, block, block_type in sections:
            if section_num == num:
                found = True
                result.append(f"{num} {self._block_to_text(block, blocks_by_id)}")
            elif found:
                if section_num is None:
                    text = self._block_to_text(block, blocks_by_id)
                    if text:
                        result.append(text)
                else:
                    section_parts = list(map(int, section_num.split(".")))
                    section_level = len(section_parts)
                    if section_level <= target_level:
                        break
        
        return "\n\n".join(result)

    def get_all_sections(self, doc_id: str) -> List[str]:
        blocks = self.fetch_blocks(doc_id)
        secs = self._parse_blocks_hierarchical(blocks)
        return sorted(secs.keys())

    def _blocks_to_text(self, blocks: List[Dict[str, Any]]) -> str:
        blocks_by_id = {b["block_id"]: b for b in blocks}
        
        def build_text(block, level=0, index=0, siblings=0):
            texts = []
            text = self._block_to_text(block, blocks_by_id)
            if text:
                texts.append(text)
            
            children = block.get("children", [])
            if children:
                child_blocks = [blocks_by_id.get(child_id) for child_id in children if blocks_by_id.get(child_id)]
                child_blocks = [cb for cb in child_blocks if cb]
                for i, child in enumerate(child_blocks):
                    child_text = build_text(child, level + 1, i + 1, len(child_blocks))
                    if child_text:
                        texts.append(child_text)
            return "\n\n".join(texts)
        
        root_blocks = [b for b in blocks if b.get("parent_id") == ""]
        return build_text(root_blocks[0]) if root_blocks else ""

    def _block_to_text(self, block: Dict[str, Any], blocks_by_id: Dict[str, Any] = None) -> str:
        block_type = block.get("block_type")
        text = ""
        
        if block_type == 1:
            elements = block.get("page", {}).get("elements", [])
            text = "".join(e.get("text_run", {}).get("content", "") for e in elements)
        elif block_type == 2:
            elements = block.get("text", {}).get("elements", []) or block.get("paragraph", {}).get("elements", [])
            text = "".join(e.get("text_run", {}).get("content", "") for e in elements)
        elif block_type == 3:
            elements = block.get("heading1", {}).get("elements", [])
            text = "".join(e.get("text_run", {}).get("content", "") for e in elements)
        elif block_type == 4:
            elements = block.get("heading2", {}).get("elements", [])
            text = "".join(e.get("text_run", {}).get("content", "") for e in elements)
        elif block_type == 5:
            elements = block.get("heading3", {}).get("elements", [])
            text = "".join(e.get("text_run", {}).get("content", "") for e in elements)
        elif block_type == 6:
            elements = block.get("list", {}).get("elements", [])
            text = "".join(e.get("text_run", {}).get("content", "") for e in elements)
        elif block_type == 14:
            elements = block.get("code", {}).get("elements", [])
            text = "".join(e.get("text_run", {}).get("content", "") for e in elements)
        elif block_type == 31:
            if blocks_by_id:
                text = self._parse_table(block, blocks_by_id)
            else:
                text = "[表格内容]"
        
        return text.strip()

    def _parse_table(self, table_block: Dict[str, Any], blocks_by_id: Dict[str, Any]) -> str:
        table_info = table_block.get("table", {})
        cells = table_info.get("cells", [])
        property_info = table_info.get("property", {})
        rows = property_info.get("row_size", 0)
        cols = property_info.get("column_size", 0)
        
        if rows == 0 or cols == 0 or len(cells) != rows * cols:
            return "[表格解析失败]"
        
        result = []
        for row_idx in range(rows):
            row_cells = []
            for col_idx in range(cols):
                cell_idx = row_idx * cols + col_idx
                if cell_idx < len(cells):
                    cell_id = cells[cell_idx]
                    cell_block = blocks_by_id.get(cell_id)
                    if cell_block:
                        cell_text = self._get_cell_text(cell_block, blocks_by_id)
                        row_cells.append(cell_text)
                    else:
                        row_cells.append("")
                else:
                    row_cells.append("")
            result.append("| " + " | ".join(row_cells) + " |")
        
        return "\n".join(result)

    def _get_cell_text(self, cell_block: Dict[str, Any], blocks_by_id: Dict[str, Any]) -> str:
        children = cell_block.get("children", [])
        texts = []
        for child_id in children:
            child_block = blocks_by_id.get(child_id)
            if child_block:
                text = self._block_to_text(child_block, blocks_by_id)
                if text:
                    texts.append(text.strip())
        return " ".join(texts).strip()

    def _parse_blocks_hierarchical(self, blocks: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        result = {}
        blocks_by_id = {b["block_id"]: b for b in blocks}
        
        root_blocks = [b for b in blocks if b.get("parent_id") == ""]
        if not root_blocks:
            return result
        
        children_ids = root_blocks[0].get("children", [])
        child_blocks = [blocks_by_id.get(child_id) for child_id in children_ids if blocks_by_id.get(child_id)]
        child_blocks = [cb for cb in child_blocks if cb]
        
        level_counters = [0, 0, 0]
        
        for b in child_blocks:
            text = self._block_to_text(b)
            if not text:
                continue
            
            block_type = b.get("block_type")
            if block_type == 3:
                level_counters[0] += 1
                level_counters[1] = 0
                level_counters[2] = 0
                current_num = str(level_counters[0])
                result[current_num] = b
            elif block_type == 4:
                level_counters[1] += 1
                level_counters[2] = 0
                current_num = f"{level_counters[0]}.{level_counters[1]}"
                result[current_num] = b
            elif block_type == 5:
                level_counters[2] += 1
                current_num = f"{level_counters[0]}.{level_counters[1]}.{level_counters[2]}"
                result[current_num] = b
        
        return result

    def update_block(self, doc_id: str, block_id: str, content: str) -> bool:
        url = f"{DOCX}/documents/{FeishuDoc.resolve_doc_id(doc_id)}/blocks/{block_id}"
        payload = {
            "update_text_elements": {
                "elements": [{
                    "text_run": {"content": content}
                }]
            }
        }
        r = requests.patch(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        return True

    def insert_block(self, doc_id: str, content: str, insert_after: str = "", block_type: str = "paragraph") -> str:
        resolved_doc_id = FeishuDoc.resolve_doc_id(doc_id)
        parent_block_id = resolved_doc_id
        
        url = f"{DOCX}/documents/{resolved_doc_id}/blocks/{parent_block_id}/children"
        
        element = {
            "text_run": {"content": content}
        }
        
        if block_type == "heading1":
            block_data = {
                "block_type": 3,
                "heading1": {"elements": [element]}
            }
        elif block_type == "heading2":
            block_data = {
                "block_type": 4,
                "heading2": {"elements": [element]}
            }
        elif block_type == "heading3":
            block_data = {
                "block_type": 5,
                "heading3": {"elements": [element]}
            }
        else:
            block_data = {
                "block_type": 2,
                "text": {"elements": [element]}
            }
        
        payload = {
            "children": [block_data],
            "index": -1
        }
        
        r = requests.post(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        return r.json()["data"]["children"][0]["block_id"]

    def copy_document(self, doc_id: str, folder_token: str = "", name: str = "") -> str:
        drive_base = f"{BASE}/drive/v1"
        url = f"{drive_base}/files/{FeishuDoc.resolve_doc_id(doc_id)}/copy"
        
        if not folder_token:
            raise ValueError("复制文档需要提供 folder_token 参数")
        
        payload = {
            "name": name if name else "复制的文档",
            "folder_token": folder_token
        }
        
        r = requests.post(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        return r.json()["data"]["file_token"]

    def get_all_tables(self, doc_id: str) -> List[Dict[str, Any]]:
        blocks = self.fetch_blocks(doc_id)
        blocks_by_id = {b["block_id"]: b for b in blocks}
        
        tables = []
        for idx, block in enumerate(blocks):
            if block.get("block_type") == 31:
                table_info = block.get("table", {})
                cells = table_info.get("cells", [])
                property_info = table_info.get("property", {})
                rows = property_info.get("row_size", 0)
                cols = property_info.get("column_size", 0)
                
                headers = []
                if rows > 0 and cols > 0:
                    for col_idx in range(cols):
                        cell_idx = col_idx
                        if cell_idx < len(cells):
                            cell_id = cells[cell_idx]
                            cell_block = blocks_by_id.get(cell_id)
                            if cell_block:
                                headers.append(self._get_cell_text(cell_block, blocks_by_id))
                
                tables.append({
                    "index": idx,
                    "block_id": block["block_id"],
                    "rows": rows,
                    "cols": cols,
                    "headers": headers,
                    "cells": cells
                })
        
        return tables

    def get_table_headers(self, doc_id: str, table_index: int = 0) -> List[str]:
        tables = self.get_all_tables(doc_id)
        if not tables or table_index >= len(tables):
            raise ValueError(f"未找到第 {table_index} 个表格")
        return tables[table_index]["headers"]

    def _get_cell_block_id(self, doc_id: str, table_index: int, row: int, col: int) -> str:
        tables = self.get_all_tables(doc_id)
        if not tables or table_index >= len(tables):
            raise ValueError(f"未找到第 {table_index} 个表格")
        
        table = tables[table_index]
        if row < 0 or row >= table["rows"]:
            raise ValueError(f"行号 {row} 超出范围 (0-{table['rows']-1})")
        if col < 0 or col >= table["cols"]:
            raise ValueError(f"列号 {col} 超出范围 (0-{table['cols']-1})")
        
        cell_idx = row * table["cols"] + col
        if cell_idx >= len(table["cells"]):
            raise ValueError(f"单元格索引超出范围")
        
        return table["cells"][cell_idx]

    def _get_column_index_by_header(self, doc_id: str, table_index: int, field_name: str) -> int:
        headers = self.get_table_headers(doc_id, table_index)
        if field_name in headers:
            return headers.index(field_name)
        
        for idx, header in enumerate(headers):
            if header.strip() == field_name.strip():
                return idx
            if field_name.strip() in header.strip():
                return idx
        
        raise ValueError(f"未找到字段 '{field_name}'，可用字段: {headers}")

    def update_table_cell(self, doc_id: str, table_index: int, row: int, col: int, content: str) -> bool:
        cell_block_id = self._get_cell_block_id(doc_id, table_index, row, col)
        
        blocks = self.fetch_blocks(doc_id)
        blocks_by_id = {b["block_id"]: b for b in blocks}
        cell_block = blocks_by_id.get(cell_block_id)
        
        if not cell_block:
            raise ValueError(f"未找到单元格 Block: {cell_block_id}")
        
        children = cell_block.get("children", [])
        if children:
            text_block_id = children[0]
            return self.update_block(doc_id, text_block_id, content)
        else:
            return self._add_text_to_cell(doc_id, cell_block_id, content)

    def _add_text_to_cell(self, doc_id: str, cell_block_id: str, content: str) -> bool:
        resolved_doc_id = FeishuDoc.resolve_doc_id(doc_id)
        url = f"{DOCX}/documents/{resolved_doc_id}/blocks/{cell_block_id}/children"
        
        payload = {
            "children": [{
                "block_type": 2,
                "text": {
                    "elements": [{
                        "text_run": {"content": content}
                    }]
                }
            }],
            "index": 0
        }
        
        r = requests.post(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        return True

    def update_table_cell_by_field(self, doc_id: str, table_index: int, row: int, field_name: str, content: str) -> bool:
        col = self._get_column_index_by_header(doc_id, table_index, field_name)
        return self.update_table_cell(doc_id, table_index, row, col, content)

    def update_table_row(self, doc_id: str, table_index: int, row: int, row_data: Dict[str, str]) -> bool:
        tables = self.get_all_tables(doc_id)
        if not tables or table_index >= len(tables):
            raise ValueError(f"未找到第 {table_index} 个表格")
        
        table = tables[table_index]
        headers = table["headers"]
        
        for field_name, content in row_data.items():
            if field_name in headers:
                col = headers.index(field_name)
                self.update_table_cell(doc_id, table_index, row, col, content)
        
        return True

    def update_table_row_by_list(self, doc_id: str, table_index: int, row: int, values: List[str]) -> bool:
        tables = self.get_all_tables(doc_id)
        if not tables or table_index >= len(tables):
            raise ValueError(f"未找到第 {table_index} 个表格")
        
        table = tables[table_index]
        
        for col, content in enumerate(values):
            if col < table["cols"]:
                self.update_table_cell(doc_id, table_index, row, col, content)
        
        return True

    def create_image_block_at_end(self, doc_id: str) -> str:
        """在文档末尾创建一个空的图片块，返回 block_id"""
        resolved_doc_id = FeishuDoc.resolve_doc_id(doc_id)
        # 注意：文档的根块 ID 就是 document_id 本身，使用 children 接口
        url = f"{DOCX}/documents/{resolved_doc_id}/blocks/{resolved_doc_id}/children"
        payload = {
            "children": [
                {
                    "block_type": 27,  # image
                    "image": {}
                }
            ],
            "index": -1
        }
        r = requests.post(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        data = r.json()
        if data.get("code") != 0:
            raise Exception(f"创建图片块失败: {data.get('msg')}")
        return data["data"]["children"][0]["block_id"]

    def upload_image_to_block(self, doc_id: str, block_id: str, image_path: str) -> str:
        """上传图片到指定的图片块，返回 file_token"""
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"图片文件不存在: {image_path}")
        
        url = f"{BASE}/drive/v1/medias/upload_all"
        
        with open(path, "rb") as f:
            files = {
                "file_name": (None, path.name),
                "parent_type": (None, "docx_image"),
                "parent_node": (None, block_id),
                "size": (None, str(path.stat().st_size)),
                "file": (path.name, f, "image/png")
            }
            r = requests.post(url, headers=self._headers(), files=files)
            r.raise_for_status()
            data = r.json()
            if data.get("code") != 0:
                raise Exception(f"上传图片失败: {data.get('msg')}")
            return data["data"]["file_token"]

    def insert_image_at_end(self, doc_id: str, image_path: str, width: int = 600, height: int = 400) -> tuple[str, str]:
        """在文档末尾插入图片（两步法：创建块 + 上传图片）
        返回: (block_id, file_token)
        """
        # 1. 创建空图片块
        block_id = self.create_image_block_at_end(doc_id)
        # 2. 上传图片到这个块
        file_token = self.upload_image_to_block(doc_id, block_id, image_path)
        return block_id, file_token

    def insert_image_in_cell(self, doc_id: str, table_index: int, row: int, col: int, image_path: str, index: int = -1) -> tuple[str, str]:
        """在表格单元格中插入图片
        index: 插入位置，-1 表示追加到末尾，0 表示插入到开头
        返回: (block_id, file_token)
        """
        resolved_doc_id = FeishuDoc.resolve_doc_id(doc_id)
        cell_block_id = self._get_cell_block_id(resolved_doc_id, table_index, row, col)
        
        # 1. 在单元格中创建空图片块
        url = f"{DOCX}/documents/{resolved_doc_id}/blocks/{cell_block_id}/children"
        payload = {
            "children": [
                {
                    "block_type": 27,  # image
                    "image": {}
                }
            ],
            "index": index
        }
        r = requests.post(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        data = r.json()
        if data.get("code") != 0:
            raise Exception(f"在单元格中创建图片块失败: {data.get('msg')}")
        image_block_id = data["data"]["children"][0]["block_id"]
        
        # 2. 上传图片到这个块
        file_token = self.upload_image_to_block(doc_id, image_block_id, image_path)
        return image_block_id, file_token

    def insert_heading_at_end(self, doc_id: str, content: str, level: int = 1) -> str:
        resolved_doc_id = FeishuDoc.resolve_doc_id(doc_id)
        
        block_type_map = {1: "heading1", 2: "heading2", 3: "heading3"}
        block_type_key = block_type_map.get(level, "heading2")
        
        url = f"{DOCX}/documents/{resolved_doc_id}/blocks/{resolved_doc_id}/children"
        
        child = {
            "block_type": level + 2,
        }
        child[block_type_key] = {
            "elements": [{
                "text_run": {"content": content}
            }]
        }
        
        payload = {
            "children": [child],
            "index": -1
        }
        
        r = requests.post(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        return r.json()["data"]["children"][0]["block_id"]

    def insert_paragraph_at_end(self, doc_id: str, content: str = "") -> str:
        resolved_doc_id = FeishuDoc.resolve_doc_id(doc_id)
        url = f"{DOCX}/documents/{resolved_doc_id}/blocks/{resolved_doc_id}/children"
        
        payload = {
            "children": [{
                "block_type": 2,
                "text": {
                    "elements": [{
                        "text_run": {"content": content}
                    }]
                }
            }],
            "index": -1
        }
        
        r = requests.post(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        return r.json()["data"]["children"][0]["block_id"]

    def create_table(self, doc_id: str, rows: int, cols: int, headers: List[str] = None) -> str:
        resolved_doc_id = FeishuDoc.resolve_doc_id(doc_id)
        url = f"{DOCX}/documents/{resolved_doc_id}/blocks/{resolved_doc_id}/children"
        
        cells = []
        for i in range(rows * cols):
            cells.append(f"cell_{i}")
        
        payload = {
            "children": [{
                "block_type": 31,
                "table": {
                    "property": {
                        "row_size": rows,
                        "column_size": cols
                    },
                    "cells": cells
                }
            }],
            "index": -1
        }
        
        r = requests.post(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        table_block_id = r.json()["data"]["children"][0]["block_id"]
        
        tables = self.get_all_tables(doc_id)
        new_table_index = len(tables) - 1
        
        if headers and len(headers) > 0:
            for col_idx, header in enumerate(headers[:cols]):
                self.update_table_cell(doc_id, new_table_index, 0, col_idx, header)
        
        return table_block_id

    def find_heading2_block(self, doc_id: str, project_name: str) -> Optional[str]:
        """查找指定工程名的 H2 标题块，返回 block_id"""
        blocks = self.fetch_blocks(doc_id)
        for block in blocks:
            if block.get("block_type") == 4:  # heading2
                text = self._block_to_text(block)
                if text.strip() == project_name.strip():
                    return block.get("block_id")
        return None

    def create_heading2(self, doc_id: str, project_name: str) -> str:
        """创建工程的 H2 标题"""
        return self.insert_heading_at_end(doc_id, project_name, level=2)

    def find_project_section_blocks(self, doc_id: str, project_name: str) -> List[str]:
        """查找指定工程 H2 标题下的所有内容块（直到下一个 H2 或文档结束）
        返回这些块的 block_id 列表
        """
        blocks = self.fetch_blocks(doc_id)
        project_block_ids = []
        in_project = False
        
        for block in blocks:
            block_type = block.get("block_type")
            
            # 如果遇到 H2 标题
            if block_type == 4:
                text = self._block_to_text(block)
                if text.strip() == project_name.strip():
                    in_project = True
                    project_block_ids = [block.get("block_id")]  # 包含 H2 标题本身
                elif in_project:
                    # 遇到了下一个 H2，结束
                    break
            elif in_project:
                project_block_ids.append(block.get("block_id"))
        
        return project_block_ids

    def find_last_round_number(self, doc_id: str, project_name: str = None) -> int:
        """查找文档中最后一轮的编号
        如果指定了 project_name，则只查找该工程 H2 下的轮次
        """
        blocks = self.fetch_blocks(doc_id)
        max_round = 0
        
        if project_name:
            # 只在指定工程范围内查找
            in_project = False
            for block in blocks:
                block_type = block.get("block_type")
                
                if block_type == 4:  # H2
                    text = self._block_to_text(block)
                    in_project = (text.strip() == project_name.strip())
                
                if in_project and block_type == 5:  # H3
                    text = self._block_to_text(block)
                    match = re.search(r"第\s*(\d+)\s*轮", text)
                    if match:
                        round_num = int(match.group(1))
                        if round_num > max_round:
                            max_round = round_num
        else:
            # 查找整个文档
            for block in blocks:
                block_type = block.get("block_type")
                if block_type in [3, 4, 5]:
                    text = self._block_to_text(block)
                    match = re.search(r"第\s*(\d+)\s*轮", text)
                    if match:
                        round_num = int(match.group(1))
                        if round_num > max_round:
                            max_round = round_num
        
        return max_round

    def create_table_at_index(self, doc_id: str, index: int, rows: int, cols: int, headers: List[str] = None) -> str:
        """在指定 index 位置创建表格"""
        resolved_doc_id = FeishuDoc.resolve_doc_id(doc_id)
        url = f"{DOCX}/documents/{resolved_doc_id}/blocks/{resolved_doc_id}/children"
        
        table_block_id = "tbl_" + ''.join(random.choices("0123456789abcdefghijklmnopqrstuvwxyz", k=10))
        
        cells = []
        for row in range(rows):
            cells.append([])
            for col in range(cols):
                cell_id = "cl_" + ''.join(random.choices("0123456789abcdef", k=6))
                cell = {
                    "block_id": cell_id,
                    "block_type": 1,
                    "table_cell": {
                        "row_span": 1,
                        "col_span": 1,
                        "content": "text"
                    },
                    "children": [{
                        "block_id": "p_" + ''.join(random.choices("0123456789abcdef", k=6)),
                        "block_type": 2,
                        "text": {"elements": []}
                    }]
                }
                cells[row].append(cell)
        
        payload = {
            "children": [{
                "block_id": table_block_id,
                "block_type": 18,
                "table": {
                    "width": cols,
                    "height": rows,
                    "table_property": {
                        "column_size": [1000] * cols,
                        "row_size": [360] * rows,
                    }
                },
                "children": [cell for row_cells in cells for cell in row_cells]
            }],
            "index": index
        }
        
        r = requests.post(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        
        # 更新表头
        if headers and len(headers) > 0:
            tables = self.get_all_tables(doc_id)
            new_table_index = len(tables)
            for col_idx, header in enumerate(headers[:cols]):
                self.update_table_cell(doc_id, new_table_index, 0, col_idx, header)
        
        return table_block_id

    def insert_heading_at_index(self, doc_id: str, index: int, content: str, level: int = 3) -> str:
        """在指定 index 位置插入标题"""
        resolved_doc_id = FeishuDoc.resolve_doc_id(doc_id)
        
        block_type_map = {1: "heading1", 2: "heading2", 3: "heading3"}
        block_type_key = block_type_map.get(level, "heading3")
        
        url = f"{DOCX}/documents/{resolved_doc_id}/blocks/{resolved_doc_id}/children"
        
        child = {
            "block_type": level + 2,
        }
        child[block_type_key] = {
            "elements": [{
                "text_run": {"content": content}
            }]
        }
        
        payload = {
            "children": [child],
            "index": index
        }
        
        r = requests.post(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        return r.json()["data"]["children"][0]["block_id"]

    def insert_paragraph_at_index(self, doc_id: str, index: int, content: str = "") -> str:
        """在指定 index 位置插入空行"""
        resolved_doc_id = FeishuDoc.resolve_doc_id(doc_id)
        url = f"{DOCX}/documents/{resolved_doc_id}/blocks/{resolved_doc_id}/children"
        
        payload = {
            "children": [{
                "block_type": 2,
                "text": {
                    "elements": [{
                        "text_run": {"content": content}
                    }]
                }
            }],
            "index": index
        }
        
        r = requests.post(url, headers=self._headers(), json=payload)
        r.raise_for_status()
        return r.json()["data"]["children"][0]["block_id"]

    def get_block_index(self, doc_id: str, block_id: str) -> Optional[int]:
        """获取 block 在根级别的 index
        返回该 block 的 index，下一个插入位置就是 index + 1
        """
        blocks = self.fetch_blocks(doc_id)
        for i, block in enumerate(blocks):
            if block.get("block_id") == block_id:
                return i
        return None

    def get_project_end_index(self, doc_id: str, project_name: str) -> int:
        """获取工程 H2 标题下所有内容的末尾 index
        用于在该工程的最后面插入新内容
        """
        blocks = self.fetch_blocks(doc_id)
        in_project = False
        project_end_index = -1
        
        for i, block in enumerate(blocks):
            block_type = block.get("block_type")
            
            if block_type == 4:  # H2
                text = self._block_to_text(block)
                if text.strip() == project_name.strip():
                    in_project = True
                    project_end_index = i + 1  # 至少在 H2 后面插入
                elif in_project:
                    # 遇到了下一个 H2，返回当前 index（在这个 H2 前面插入）
                    return i
            elif in_project:
                project_end_index = i + 1  # 更新为下一个位置
        
        # 如果是最后一个工程，返回 -1（插入到末尾）
        return -1 if project_end_index == -1 else project_end_index

    def append_new_round(self, doc_id: str) -> int:
        last_round = self.find_last_round_number(doc_id)
        new_round = last_round + 1
        
        self.insert_heading_at_end(doc_id, f"第{new_round}轮", level=2)
        self.insert_paragraph_at_end(doc_id, "")
        
        headers = ["本轮id", "prompt", "不满意原因（满意了就不写）", "git地址", "分支", "截图（产物/运行结果/对话）", "日志轨迹"]
        self.create_table(doc_id, rows=2, cols=7, headers=headers)
        
        return new_round

    def get_all_sections(self, doc_id: str) -> List[str]:
        blocks = self.fetch_blocks(doc_id)
        secs = self._parse_blocks_hierarchical(blocks)
        return sorted(secs.keys())


def cmd_read(args, client: FeishuDoc):
    doc_id = args.file
    if args.num:
        content = client.read_section_content(doc_id, args.num)
        if content:
            print(f"✅ 找到编号 '{args.num}' 的内容：")
            print("-" * 40)
            print(content)
        else:
            print(f"❌ 未找到编号 '{args.num}'")
            sections = client.get_all_sections(doc_id)
            if sections:
                print(f"可用的编号列表：{', '.join(sections)}")
            sys.exit(1)
    else:
        title = client.get_document_title(doc_id)
        print(f"📑 文档标题: {title}")
        print("=" * 50)
        text = client.read_all_text(doc_id)
        print(text)


def cmd_write(args, client: FeishuDoc):
    doc_id = args.file
    
    if args.insert:
        block_type = args.type if args.type else "paragraph"
        block_id = client.insert_block(doc_id, args.content, "", block_type)
        print(f"✅ 已插入新块，Block ID: {block_id}")
    
    elif args.update:
        success = client.update_block(doc_id, args.update, args.content)
        if success:
            print(f"✅ 已更新块 {args.update}")


def cmd_copy(args, client: FeishuDoc):
    doc_id = args.file
    folder_token = args.folder if args.folder else ""
    
    new_doc_id = client.copy_document(doc_id, folder_token)
    new_url = f"https://www.feishu.cn/docx/{new_doc_id}"
    
    print(f"✅ 文档复制成功！")
    print(f"原始文档: {doc_id}")
    print(f"新文档ID: {new_doc_id}")
    print(f"新文档URL: {new_url}")


def cmd_list(args, client: FeishuDoc):
    doc_id = args.file
    sections = client.get_all_sections(doc_id)
    
    if sections:
        print(f"📋 文档 '{doc_id}' 中所有可识别的编号：")
        for sec in sections:
            print(f"  - {sec}")
    else:
        print(f"⚠️ 文档 '{doc_id}' 中未找到任何编号章节")


def cmd_info(args, client: FeishuDoc):
    doc_id = args.file
    title = client.get_document_title(doc_id)
    sections = client.get_all_sections(doc_id)
    
    print(f"📊 文档信息：")
    print(f"  ID: {FeishuDoc.resolve_doc_id(doc_id)}")
    print(f"  标题: {title}")
    print(f"  章节数: {len(sections)}")
    if sections:
        print(f"  章节列表: {', '.join(sections)}")


def cmd_table_list(args, client: FeishuDoc):
    doc_id = args.file
    tables = client.get_all_tables(doc_id)
    
    if not tables:
        print(f"⚠️ 文档 '{doc_id}' 中未找到任何表格")
        return
    
    print(f"📋 文档中找到 {len(tables)} 个表格：")
    for idx, table in enumerate(tables):
        print(f"\n  表格 {idx}:")
        print(f"    Block ID: {table['block_id']}")
        print(f"    行数: {table['rows']}")
        print(f"    列数: {table['cols']}")
        if table["headers"]:
            print(f"    表头: {', '.join(table['headers'])}")


def cmd_table_cell(args, client: FeishuDoc):
    doc_id = args.file
    table_index = args.table if args.table else 0
    row = args.row
    content = args.content
    
    if args.field:
        result = client.update_table_cell_by_field(doc_id, table_index, row, args.field, content)
        print(f"✅ 已更新表格 {table_index} 第 {row} 行字段 '{args.field}' 的内容")
    elif args.col is not None:
        result = client.update_table_cell(doc_id, table_index, row, args.col, content)
        print(f"✅ 已更新表格 {table_index} 第 {row} 行第 {args.col} 列的内容")
    else:
        print("❌ 请指定 --field 或 --col 参数")
        return


def cmd_table_row(args, client: FeishuDoc):
    doc_id = args.file
    table_index = args.table if args.table else 0
    row = args.row
    
    if args.fields and args.values:
        fields = args.fields.split(",")
        values = args.values.split(",")
        if len(fields) != len(values):
            print(f"❌ 字段数 ({len(fields)}) 和值数 ({len(values)}) 不匹配")
            return
        
        row_data = dict(zip(fields, values))
        result = client.update_table_row(doc_id, table_index, row, row_data)
        print(f"✅ 已更新表格 {table_index} 第 {row} 行的 {len(fields)} 个字段")
    elif args.values:
        values = args.values.split(",")
        result = client.update_table_row_by_list(doc_id, table_index, row, values)
        print(f"✅ 已更新表格 {table_index} 第 {row} 行的 {len(values)} 个单元格")
    else:
        print("❌ 请指定 --fields 和 --values 参数")


def parse_verification_result(result_text: str) -> dict:
    """解析验收结果文本，提取产物A和产物C"""
    result = {
        "conclusion": "",  # 产物A：【验收结论】
        "next_prompt": ""  # 产物C：【下一轮 Prompt】
    }
    
    conclusion_match = re.search(r'【验收结论】\n?(.*?)(?=\n【归因诊断】|\n【下一轮 Prompt】|$)', result_text, re.DOTALL)
    if conclusion_match:
        result["conclusion"] = conclusion_match.group(1).strip()
    
    next_prompt_match = re.search(r'【下一轮 Prompt】\n?(.*?)$', result_text, re.DOTALL)
    if next_prompt_match:
        result["next_prompt"] = next_prompt_match.group(1).strip()
    
    return result


def read_result_from_file(file_path: str) -> dict:
    """从验收结果文件中读取最新一轮的验收结果"""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"验收结果文件不存在: {file_path}")
    
    content = path.read_text(encoding='utf-8')
    
    rounds = re.split(r'## 第 (\d+) 轮验收结果', content)
    
    if len(rounds) >= 2:
        latest_round_num = rounds[-2]
        latest_round_content = rounds[-1]
    else:
        latest_round_num = "1"
        latest_round_content = content
    
    result_text = ""
    stage_text = ""
    
    stage_match = re.search(r'\*\*阶段\*\*: (.*?)\n', latest_round_content)
    if stage_match:
        stage_text = stage_match.group(1).strip()
    
    result_match = re.search(r'### 验收结果\n(.*?)(?=\n### |$)', latest_round_content, re.DOTALL)
    if result_match:
        result_text = result_match.group(1).strip()
    
    parsed = parse_verification_result(result_text)
    parsed["round_num"] = latest_round_num
    parsed["stage"] = stage_text
    
    return parsed


def cmd_append_round(args, client: FeishuDoc):
    doc_id = args.file if args.file else "https://vigyevcxms.feishu.cn/docx/FFRcdEpHPoLbsxx9ZXUcL1xEnrd"
    
    HEADERS = ["本轮id", "prompt", "不满意原因（满意了就不写）", "git地址", "分支", "截图（产物/运行结果/对话）", "日志轨迹"]
    
    round_data = {}
    product_c = ""  # 产物C：下一轮Prompt
    
    if args.result_file:
        print(f"📂 从验收结果文件读取: {args.result_file}")
        try:
            parsed = read_result_from_file(args.result_file)
            print(f"   轮次: {parsed['round_num']}")
            print(f"   阶段: {parsed['stage']}")
            print(f"   验收结论: {parsed['conclusion'][:50]}...")
            print(f"   下一轮Prompt长度: {len(parsed['next_prompt'])} 字符")
            print()
            
            round_data["prompt"] = parsed["stage"]
            
            conclusion = parsed["conclusion"]
            is_fully_satisfied = "✅" in conclusion and "达标" in conclusion
            if not is_fully_satisfied:
                round_data["不满意原因（满意了就不写）"] = conclusion
            
            product_c = parsed["next_prompt"]
            
            if args.id or args.round_num:
                round_data["本轮id"] = args.id or args.round_num
            else:
                round_data["本轮id"] = parsed["round_num"]
                
        except Exception as e:
            print(f"❌ 读取验收结果文件失败: {e}")
            import traceback
            traceback.print_exc()
            return
    
    if args.values:
        if len(args.values) > len(HEADERS):
            print(f"⚠️  最多支持 {len(HEADERS)} 个参数，多余的将被忽略")
            args.values = args.values[:len(HEADERS)]
        
        print(f"📋 位置参数模式: 传入了 {len(args.values)} 个值")
        for idx, value in enumerate(args.values):
            round_data[HEADERS[idx]] = value
            print(f"   列{idx+1} [{HEADERS[idx]}]: {value if value else '(空)'}")
        print()
    
    named_params = {}
    if args.id:
        named_params["本轮id"] = args.id
    if args.prompt:
        named_params["prompt"] = args.prompt
    if args.reason:
        named_params["不满意原因（满意了就不写）"] = args.reason
    if args.git:
        named_params["git地址"] = args.git
    if args.branch:
        named_params["分支"] = args.branch
    if args.screenshot:
        named_params["截图（产物/运行结果/对话）"] = args.screenshot
    if args.log:
        named_params["日志轨迹"] = args.log
    
    if named_params:
        print("📋 命名参数模式（覆盖模式）:")
        for k, v in named_params.items():
            round_data[k] = v
            print(f"   {k}: {v}")
        print()
    
    if round_data:
        print("📝 最终填充的数据:")
        for k, v in round_data.items():
            print(f"   {k}: {v if v else '(空)'}")
        print()
    
    project_name = args.project_name
    
    # 如果没有指定工程名，使用默认值
    if not project_name:
        project_name = "未命名工程"
        print(f"⚠️  未指定工程名称，使用默认: {project_name}")
    
    # 1. 查找或创建工程的 H2 标题
    project_block_id = client.find_heading2_block(doc_id, project_name)
    is_new_project = False
    if project_block_id:
        print(f"📁 找到工程 H2 标题: {project_name}")
    else:
        print(f"📁 未找到工程 H2 标题，创建新工程: {project_name}")
        project_block_id = client.create_heading2(doc_id, project_name)
        client.insert_paragraph_at_end(doc_id, "")  # 空行
        is_new_project = True
    
    # 2. 获取该工程下的最后一轮编号
    last_round = client.find_last_round_number(doc_id, project_name)
    new_round = last_round + 1
    
    print(f"📊 工程 [{project_name}] 当前最后一轮: 第{last_round}轮")
    print(f"🔄 即将追加: 第{new_round}轮")
    
    # 简化逻辑：直接在文档末尾追加（最可靠的方式）
    
    # 4. 插入 H3 标题（第N轮）- 只有在新工程时才需要，因为新工程的 H2 在文档开头
    if not is_new_project:
        # 不是新工程，直接在文档末尾追加
        client.insert_heading_at_end(doc_id, f"第{new_round}轮", level=3)
        client.insert_paragraph_at_end(doc_id, "")
    
    # 5. 创建表格 - 使用文档末尾位置
    headers = ["本轮id", "prompt", "不满意原因（满意了就不写）", "git地址", "分支", "截图（产物/运行结果/对话）", "日志轨迹"]
    
    # 先获取当前表格数量
    tables_before = client.get_all_tables(doc_id)
    print(f"📋 创建表格前有 {len(tables_before)} 个表格")
    
    client.create_table(doc_id, rows=2, cols=7, headers=headers)
    
    # 重新获取表格，找到新创建的表格（应该是最后一个）
    tables_after = client.get_all_tables(doc_id)
    print(f"📋 创建表格后有 {len(tables_after)} 个表格")
    
    # 使用新创建的表格（最后一个表格）
    new_table_index = len(tables_after) - 1
    print(f"📋 新表格索引: {new_table_index}")
    
    screenshot_col_idx = headers.index("截图（产物/运行结果/对话）")
    
    if round_data:
        row_values = []
        for header in headers:
            if header == "截图（产物/运行结果/对话）":
                row_values.append("")  # 清空这个字段，因为我们要插入图片
            else:
                row_values.append(round_data.get(header, ""))
        try:
            client.update_table_row_by_list(doc_id, new_table_index, 1, row_values)
            print(f"✅ 已填充表格数据")
        except Exception as e:
            print(f"❌ 填充表格数据失败: {e}")
            import traceback
            traceback.print_exc()
    
    # 6. 插入截图到表格单元格
    if args.screenshot_file:
        print(f"\n🖼️  上传并插入截图到表格单元格 ({len(args.screenshot_file)} 张)...")
        for i, img_path in enumerate(args.screenshot_file):
            if Path(img_path).exists():
                try:
                    block_id, file_token = client.insert_image_in_cell(
                        doc_id, new_table_index, 1, screenshot_col_idx, img_path
                    )
                    print(f"   [图片{i+1}] 成功插入到截图单元格: {Path(img_path).name} (block_id={block_id[:12]}...)")
                except Exception as e:
                    print(f"   [图片{i+1}] ❌ 处理失败: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print(f"   [图片{i+1}] ⚠️  文件不存在: {img_path}")
        print(f"✅ 截图已插入到表格单元格")
    
    # 7. 插入产物C
    if product_c:
        client.insert_paragraph_at_end(doc_id, "")
        client.insert_heading_at_end(doc_id, "产物C：下一轮 Prompt", level=3)
        client.insert_paragraph_at_end(doc_id, product_c)
        print(f"✅ 已在表格下方添加产物C（下一轮Prompt）")
    
    print(f"\n✅ 成功向工程 [{project_name}] 追加第{new_round}轮！")
    extra = ""
    if args.screenshot_file:
        extra += f" + {len(args.screenshot_file)} 张截图"
    if product_c:
        extra += " + 产物C"
    print(f"   包含H3标题（第{new_round}轮）、{len(headers)}列表格{extra}")
    if is_new_project:
        print(f"   ⚠️  注意：新创建的工程 H2 标题会在文档最前面，轮次在文档末尾")
        print(f"   建议手动将工程 H2 标题移动到轮次前面")


def main():
    parser = argparse.ArgumentParser(description="飞书文档操作工具", formatter_class=argparse.RawDescriptionHelpFormatter,
                                     epilog="""
示例用法：
  # 读取整个文档
  python feishu_doc.py read --file https://vigyevcxms.feishu.cn/wiki/Ul8gwNsJ1iUYA9kRGm2cHdGGnWf
  
  # 列出文档中所有表格
  python feishu_doc.py table-list --file https://vigyevcxms.feishu.cn/wiki/Ul8gwNsJ1iUYA9kRGm2cHdGGnWf
  
  # 更新指定单元格（按行列号）
  python feishu_doc.py table-cell --file https://... --row 1 --col 0 --content "新内容"
  
  # 更新指定单元格（按字段名）
  python feishu_doc.py table-cell --file https://... --row 1 --field "姓名" --content "张三"
  
  # 整行写入（按字段名）
  python feishu_doc.py table-row --file https://... --row 2 --fields "姓名,年龄,职业" --values "李四,25,工程师"
  
  # 整行写入（按顺序）
  python feishu_doc.py table-row --file https://... --row 2 --values "王五,30,设计师"
  
  # 插入新段落
  python feishu_doc.py write --file https://vigyevcxms.feishu.cn/wiki/Ul8gwNsJ1iUYA9kRGm2cHdGGnWf --insert --content "新段落内容"
  
  # 查看文档信息
  python feishu_doc.py info --file https://vigyevcxms.feishu.cn/wiki/Ul8gwNsJ1iUYA9kRGm2cHdGGnWf
                                     """)
    
    subparsers = parser.add_subparsers(dest="cmd", required=True)

    read_parser = subparsers.add_parser("read", help="读取文档内容")
    read_parser.add_argument("--file", required=True, help="文档URL或ID")
    read_parser.add_argument("--num", help="章节编号（如 1.1）")

    write_parser = subparsers.add_parser("write", help="写入/更新文档")
    write_parser.add_argument("--file", required=True, help="文档URL或ID")
    write_parser.add_argument("--insert", action="store_true", help="插入新内容")
    write_parser.add_argument("--update", help="要更新的块ID")
    write_parser.add_argument("--content", required=True, help="内容")
    write_parser.add_argument("--type", choices=["paragraph", "heading1", "heading2", "heading3"], 
                              default="paragraph", help="内容类型")
    write_parser.add_argument("--after", help="插入到指定块之后")

    copy_parser = subparsers.add_parser("copy", help="复制文档")
    copy_parser.add_argument("--file", required=True, help="源文档URL或ID")
    copy_parser.add_argument("--folder", required=True, help="目标文件夹token")

    list_parser = subparsers.add_parser("list", help="列出文档中的章节编号")
    list_parser.add_argument("--file", required=True, help="文档URL或ID")

    info_parser = subparsers.add_parser("info", help="查看文档信息")
    info_parser.add_argument("--file", required=True, help="文档URL或ID")

    table_list_parser = subparsers.add_parser("table-list", help="列出文档中的所有表格")
    table_list_parser.add_argument("--file", required=True, help="文档URL或ID")

    table_cell_parser = subparsers.add_parser("table-cell", help="更新表格指定单元格")
    table_cell_parser.add_argument("--file", required=True, help="文档URL或ID")
    table_cell_parser.add_argument("--table", type=int, default=0, help="表格序号（默认0）")
    table_cell_parser.add_argument("--row", type=int, required=True, help="行号（从0开始）")
    table_cell_parser.add_argument("--col", type=int, help="列号（从0开始）")
    table_cell_parser.add_argument("--field", help="字段名（表头名称）")
    table_cell_parser.add_argument("--content", required=True, help="要写入的内容")

    table_row_parser = subparsers.add_parser("table-row", help="更新表格整行数据")
    table_row_parser.add_argument("--file", required=True, help="文档URL或ID")
    table_row_parser.add_argument("--table", type=int, default=0, help="表格序号（默认0）")
    table_row_parser.add_argument("--row", type=int, required=True, help="行号（从0开始）")
    table_row_parser.add_argument("--fields", help="字段名列表，用逗号分隔（如：姓名,年龄）")
    table_row_parser.add_argument("--values", required=True, help="值列表，用逗号分隔")

    append_round_parser = subparsers.add_parser("append-round", help="向文档末尾追加新轮次（标题+表格）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
功能说明：
  - 自动从验收结果文件中提取数据并同步到飞书文档
  - 产物A：【验收结论】 -> 不满意原因（满意了就不写）字段
  - 阶段描述 -> prompt字段
  - 截图 -> 截图（产物/运行结果/对话）字段
  - 产物C：【下一轮 Prompt】-> 单独写在表格下方，不在表格里

表格列顺序：
  1. 本轮id
  2. prompt
  3. 不满意原因（满意了就不写）
  4. git地址
  5. 分支
  6. 截图（产物/运行结果/对话）
  7. 日志轨迹

示例：
  # 从验收结果文件读取并同步
  python feishu_doc.py append-round --result-file ../braille-ocr/data/braille-ocr.md

  # 从验收结果文件读取并指定本轮id
  python feishu_doc.py append-round --result-file ../braille-ocr/data/braille-ocr.md --round-num "001"

  # 手动按列传值（最多7个）
  python feishu_doc.py append-round "001" "需求描述" "" "https://github.com/xxx"

  # 手动指定各个字段
  python feishu_doc.py append-round --id "001" --prompt "物理碰撞检测" --reason "界面卡顿"
        """)
    append_round_parser.add_argument("values", nargs="*", help="按列顺序传值（最多7个），空值用空字符串")
    append_round_parser.add_argument("--file", default="https://vigyevcxms.feishu.cn/docx/FFRcdEpHPoLbsxx9ZXUcL1xEnrd", help="文档URL或ID（默认固定文档）")
    append_round_parser.add_argument("--result-file", help="验收结果文件路径（如：../project/data/project.md）")
    append_round_parser.add_argument("--round-num", help="指定本轮id（覆盖从文件读取的值）")
    append_round_parser.add_argument("--id", help="本轮id（同--round-num）")
    append_round_parser.add_argument("--prompt", help="prompt内容")
    append_round_parser.add_argument("--reason", help="不满意原因（满意了就不写）")
    append_round_parser.add_argument("--git", help="git地址")
    append_round_parser.add_argument("--branch", help="分支")
    append_round_parser.add_argument("--screenshot", help="截图（产物/运行结果/对话）")
    append_round_parser.add_argument("--screenshot-file", action="append", help="截图文件路径（可多次使用）")
    append_round_parser.add_argument("--log", help="日志轨迹")
    append_round_parser.add_argument("--project-name", help="工程名称（H2标题，用于按工程分组）")

    args = parser.parse_args()

    try:
        client = FeishuDoc(APP_ID, APP_SECRET)
        
        cmd_map = {
            "read": cmd_read,
            "write": cmd_write,
            "copy": cmd_copy,
            "list": cmd_list,
            "info": cmd_info,
            "table-list": cmd_table_list,
            "table-cell": cmd_table_cell,
            "table-row": cmd_table_row,
            "append-round": cmd_append_round
        }
        
        cmd_map[args.cmd](args, client)
        
    except requests.exceptions.HTTPError as e:
        print(f"❌ HTTP 请求错误: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ 执行出错: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
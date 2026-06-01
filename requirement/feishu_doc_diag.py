#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys

import requests
from dotenv import load_dotenv

# -------------------------
# 环境加载
# -------------------------
load_dotenv()

APP_ID = os.getenv("FEISHU_APP_ID")
APP_SECRET = os.getenv("FEISHU_APP_SECRET")

if not APP_ID or not APP_SECRET:
    print("❌ 请在 .env 中配置 FEISHU_APP_ID / FEISHU_APP_SECRET")
    sys.exit(1)

# -------------------------
# 常量定义
# -------------------------
BASE = "https://open.feishu.cn/open-apis"
DOCX = f"{BASE}/docx/v1"

HEADERS = lambda t: {"Authorization": f"Bearer {t}"}


# -------------------------
# 认证
# -------------------------
def get_token():
    """获取 tenant_access_token"""
    url = f"{BASE}/auth/v3/tenant_access_token/internal"
    payload = json.dumps({"app_id": APP_ID, "app_secret": APP_SECRET})
    headers = {'Content-Type': 'application/json'}
    r = requests.post(url, headers=headers, data=payload)
    r.raise_for_status()
    return r.json().get("tenant_access_token")


# -------------------------
# ✅ 关键修复：Document ID 解析
# -------------------------
def resolve_doc_id(raw_input: str) -> str:
    """
    支持多种输入格式：
    1. https://.../docx/FFRcdEpHPoLbsxx9ZXUcL1xEnrd
    2. FFRcdEpHPoLbsxx9ZXUcL1xEnrd
    """
    # 从 URL 中提取 docx ID
    match = re.search(r'/docx/([A-Za-z0-9]+)', raw_input)
    if match:
        return match.group(1)
    
    # 如果输入的就是纯 ID
    return raw_input


# -------------------------
# API 请求封装
# -------------------------
def fetch_json(url: str, token: str) -> dict:
    """通用的 GET 请求函数"""
    headers = HEADERS(token)
    r = requests.get(url, headers=headers)
    r.raise_for_status()
    return r.json()


# -------------------------
# 诊断逻辑
# -------------------------
def cmd_diag(args, token: str):
    # 1. 解析 ID
    doc_id = resolve_doc_id(args.file)
    print(f"✅ 解析后的文档 ID: {doc_id}")

    # 2. 尝试获取文档内容 (Blocks)
    blocks_url = f"{DOCX}/documents/{doc_id}/blocks"
    print(f"🔍 正在请求 Blocks API: {blocks_url}")

    blocks = []
    try:
        data = fetch_json(blocks_url, token)
        blocks = data.get("data", {}).get("items", [])
        print(f"✅ 成功获取到 {len(blocks)} 个 Block")
    except requests.exceptions.HTTPError as e:
        print(f"⚠️ 获取 Blocks 失败 (可能是 Wiki 页面或无权限): {e}")
        # 回退：尝试获取 Metadata
        meta_url = f"{DOCX}/documents/{doc_id}"
        print(f"🔍 正在请求 Metadata API: {meta_url}")
        try:
            meta_data = fetch_json(meta_url, token)
            title = meta_data.get("data", {}).get("document", {}).get("title", "无标题")
            print(f"✅ 成功获取文档元数据，标题: '{title}'")
        except requests.exceptions.HTTPError as e_meta:
            print(f"❌ 获取 Metadata 也失败了: {e_meta}")
            sys.exit(1)

    # 3. 如果有 Blocks，打印文本内容
    if blocks:
        print("\n📑 文档中所有文本块（前 30 条）：")
        texts = []
        for b in blocks[:30]:
            # 尝试从不同 block 类型中提取文本
            text = ""
            if b.get("block_type") == 1: # paragraph
                text = "".join(e.get("text_run", {}).get("content", "") for e in b.get("paragraph", {}).get("elements", []))
            elif b.get("block_type") in [2, 3, 4]: # headings
                text = "".join(e.get("text_run", {}).get("content", "") for e in b.get("heading", {}).get("elements", []))
            
            if text.strip():
                texts.append(text.strip())
        
        if texts:
            for i, t in enumerate(texts):
                print(f"  {i+1:02d}. {t}")
        else:
            print("  ⚠️ 未从 Blocks 中提取到任何文本内容。")
    else:
        print("\n⚠️ 该文档没有可显示的 Blocks 内容。")


# -------------------------
# CLI 入口
# -------------------------
def main():
    parser = argparse.ArgumentParser(description="飞书文档诊断工具")
    subparsers = parser.add_subparsers(dest="cmd", required=True)

    diag_parser = subparsers.add_parser("diag", help="诊断文档结构")
    diag_parser.add_argument("--file", required=True, help="文档 URL 或 ID")

    args = parser.parse_args()

    try:
        token = get_token()
        if not token:
            print("❌ 获取 Token 失败")
            sys.exit(1)
        
        {"diag": cmd_diag}[args.cmd](args, token)

    except Exception as e:
        print(f"❌ 执行出错: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
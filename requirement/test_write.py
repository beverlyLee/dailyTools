#!/usr/bin/env python3
import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()

APP_ID = os.getenv("FEISHU_APP_ID")
APP_SECRET = os.getenv("FEISHU_APP_SECRET")

if not APP_ID or not APP_SECRET:
    print("❌ 请在 .env 中配置 FEISHU_APP_ID / FEISHU_APP_SECRET")
    exit(1)

BASE = "https://open.feishu.cn/open-apis"
DOCX = f"{BASE}/docx/v1"

def get_token():
    url = f"{BASE}/auth/v3/tenant_access_token/internal"
    payload = {"app_id": APP_ID, "app_secret": APP_SECRET}
    r = requests.post(url, json=payload)
    r.raise_for_status()
    return r.json()["tenant_access_token"]

def resolve_doc_id(raw_input):
    import re
    match = re.search(r"/docx/([A-Za-z0-9]+)", raw_input)
    if match:
        return match.group(1)
    return raw_input

def test_write():
    print("=" * 60)
    print("飞书文档写入测试工具")
    print("=" * 60)
    
    doc_url = input("请输入文档 URL 或 ID: ").strip()
    doc_id = resolve_doc_id(doc_url)
    print(f"✅ 解析后的文档 ID: {doc_id}")
    
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. 先获取文档的 blocks
    print("\n🔍 步骤 1: 获取文档 blocks...")
    url = f"{DOCX}/documents/{doc_id}/blocks"
    r = requests.get(url, headers=headers)
    print(f"   状态码: {r.status_code}")
    
    if r.status_code != 200:
        print(f"   ❌ 失败: {r.text}")
        return
    
    data = r.json()
    blocks = data["data"]["items"]
    print(f"   ✅ 成功，共 {len(blocks)} 个 blocks")
    
    # 2. 找到一个可更新的 block (paragraph 类型)
    print("\n🔍 步骤 2: 查找可更新的段落...")
    paragraph_blocks = []
    for b in blocks:
        if b.get("block_type") == 2:  # paragraph
            text = "".join(e.get("text_run", {}).get("content", "") 
                          for e in b.get("paragraph", {}).get("elements", []))
            if text.strip():
                paragraph_blocks.append((b["block_id"], text[:50]))
    
    if not paragraph_blocks:
        print("   ❌ 未找到任何段落 block")
        return
    
    print(f"   ✅ 找到 {len(paragraph_blocks)} 个段落:")
    for i, (block_id, text) in enumerate(paragraph_blocks[:5]):
        print(f"      {i+1}. {block_id}: '{text}...'")
    
    block_id_to_update = paragraph_blocks[0][0]
    print(f"\n   将使用第一个 block 测试: {block_id_to_update}")
    
    # 3. 测试更新 - 尝试不同的 payload 格式
    print("\n🔍 步骤 3: 测试更新操作...")
    
    # 格式 1: 当前代码的格式
    payload1 = {
        "blocks": [{
            "block_id": block_id_to_update,
            "paragraph": {
                "elements": [{
                    "text_run": {"content": "测试更新内容 1"}
                }]
            }
        }]
    }
    
    print("\n   尝试格式 1 (当前代码格式):")
    print(f"   Payload: {json.dumps(payload1, ensure_ascii=False)}")
    
    url = f"{DOCX}/documents/{doc_id}/blocks/{block_id_to_update}"
    r = requests.patch(url, headers=headers, json=payload1)
    print(f"   状态码: {r.status_code}")
    print(f"   响应: {r.text}")
    
    # 格式 2: 尝试其他可能的格式
    payload2 = {
        "block_id": block_id_to_update,
        "paragraph": {
            "elements": [{
                "text_run": {"content": "测试更新内容 2"}
            }]
        }
    }
    
    print("\n   尝试格式 2 (去掉外层 blocks):")
    print(f"   Payload: {json.dumps(payload2, ensure_ascii=False)}")
    
    r = requests.patch(url, headers=headers, json=payload2)
    print(f"   状态码: {r.status_code}")
    print(f"   响应: {r.text}")
    
    # 4. 测试插入
    print("\n" + "=" * 60)
    print("🔍 步骤 4: 测试插入操作...")
    
    insert_url = f"{DOCX}/documents/{doc_id}/blocks"
    
    # 格式 1: 当前代码的格式
    insert_payload1 = {
        "blocks": [{
            "paragraph": {
                "elements": [{
                    "text_run": {"content": "测试插入内容 1"}
                }]
            }
        }],
        "insert_after": block_id_to_update
    }
    
    print("\n   尝试格式 1 (当前代码格式):")
    print(f"   Payload: {json.dumps(insert_payload1, ensure_ascii=False)}")
    
    r = requests.post(insert_url, headers=headers, json=insert_payload1)
    print(f"   状态码: {r.status_code}")
    print(f"   响应: {r.text}")

if __name__ == "__main__":
    test_write()

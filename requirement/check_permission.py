#!/usr/bin/env python3
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

def main():
    print("=" * 60)
    print("飞书文档权限诊断工具")
    print("=" * 60)
    
    doc_url = input("请输入文档 URL 或 ID: ").strip()
    doc_id = resolve_doc_id(doc_url)
    print(f"📄 文档 ID: {doc_id}")
    
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n🔍 步骤 1: 尝试读取文档元数据...")
    url = f"{DOCX}/documents/{doc_id}"
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        print("   ✅ 读取权限正常")
        data = r.json()
        title = data.get("data", {}).get("document", {}).get("title", "")
        print(f"   📑 文档标题: {title}")
    else:
        print(f"   ❌ 读取失败: {r.status_code}")
        print(f"   响应: {r.text}")
        print("\n💡 解决方案:")
        print("   1. 打开文档 → 分享 → 添加协作者")
        print("   2. 搜索你的飞书应用名称并添加 '可编辑' 权限")
        return
    
    print("\n🔍 步骤 2: 尝试读取文档块...")
    url = f"{DOCX}/documents/{doc_id}/blocks?page_size=10"
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        print("   ✅ 读取块权限正常")
        data = r.json()
        blocks = data.get("data", {}).get("items", [])
        print(f"   📊 获取到 {len(blocks)} 个块")
    else:
        print(f"   ❌ 读取块失败: {r.status_code}")
        print(f"   响应: {r.text}")
        return
    
    print("\n🔍 步骤 3: 尝试创建简单块...")
    url = f"{DOCX}/documents/{doc_id}/blocks/{doc_id}/children"
    payload = {
        "children": [{
            "block_type": 2,
            "text": {
                "elements": [{
                    "text_run": {"content": "权限测试内容"}
                }]
            }
        }],
        "index": -1
    }
    r = requests.post(url, headers=headers, json=payload)
    if r.status_code == 200:
        print("   ✅ 写入权限正常！")
        print("   🎉 你的应用已经可以正常写入文档了！")
        data = r.json()
        block_id = data.get("data", {}).get("children", [{}])[0].get("block_id", "")
        print(f"   新建块 ID: {block_id}")
    else:
        print(f"   ❌ 写入失败: {r.status_code}")
        print(f"   响应: {r.text}")
        print("\n💡 详细解决方案：")
        print("   1. 打开文档：https://vigyevcxms.feishu.cn/docx/FFRcdEpHPoLbsxx9ZXUcL1xEnrd")
        print("   2. 点击右上角「分享」按钮")
        print("   3. 点击「添加协作者」")
        print("   4. 搜索你的应用名称（在飞书开放平台查看）")
        print("   5. 选择「可编辑」权限，确认添加")
        print("\n   ⚠️ 如果找不到应用名称，请检查：")
        print("      - 应用是否已发布（不是测试状态）")
        print("      - 应用是否已开通「文档」相关权限")

if __name__ == "__main__":
    main()

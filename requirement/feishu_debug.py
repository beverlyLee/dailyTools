#!/usr/bin/env python3
import argparse
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

HEADERS = lambda t: {"Authorization": f"Bearer {t}"}

def get_token():
    """获取飞书 tenant_access_token"""
    url = f"{BASE}/auth/v3/tenant_access_token/internal"
    payload = json.dumps({"app_id": APP_ID, "app_secret": APP_SECRET})
    headers = {'Content-Type': 'application/json'}
    response = requests.request("POST", url, headers=headers, data=payload)
    return response.json().get("tenant_access_token")

def fetch_raw_doc(token, doc_url):
    """
    直接从飞书 API 获取文档的原始 JSON 数据
    """
    # 从 URL 中提取 document_id
    # 示例: https://vigyevcxms.feishu.cn/docx/FFRcdEpHPoLbsxx9ZXUcL1xEnrd
    # 提取 FFRcdEpHPoLbsxx9ZXUcL1xEnrd
    try:
        doc_id = doc_url.split("/")[-1]
    except:
        print(f"❌ 无法从 URL 中提取 document_id: {doc_url}")
        return None

    url = f"{DOCX}/documents/{doc_id}"
    headers = HEADERS(token)
    
    print(f"🔍 正在请求文档: {url}")
    response = requests.request("GET", url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ API 请求失败: {response.status_code} - {response.text}")
        return None
        
    return response.json()

def main():
    parser = argparse.ArgumentParser(description="飞书文档诊断工具 (打印原始JSON)")
    parser.add_argument("cmd", choices=["raw"], help="raw: 打印文档原始JSON数据")
    parser.add_argument("--file", required=True, help="飞书文档URL")
    
    args = parser.parse_args()
    
    token = get_token()
    if not token:
        print("❌ 获取 token 失败")
        exit(1)
        
    raw_data = fetch_raw_doc(token, args.file)
    
    if raw_data:
        print("\n✅ 成功获取文档原始数据！")
        print("="*50)
        # 美化输出，方便阅读
        print(json.dumps(raw_data, indent=2, ensure_ascii=False))
        print("="*50)
        print("\n💡 提示: 请在输出的 JSON 中搜索 'heading' 或 '1.1'，看看数据是否存在。")
    else:
        print("❌ 获取文档数据失败")

if __name__ == "__main__":
    main()
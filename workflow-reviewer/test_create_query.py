#!/usr/bin/env python3
"""测试 WPS v2 API 创建和查询记录的完整流程"""

import sys
import json
import hashlib
import hmac
from datetime import datetime, timezone
import requests
from pathlib import Path
from dotenv import load_dotenv
import os

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH)

APP_ID = os.getenv('WPS_APP_ID', '')
APP_KEY = os.getenv('WPS_APP_KEY', '')
API_BASE = os.getenv('WPS_API_BASE_URL', 'https://openapi.wps.cn')
FILE_ID = 'ct9Ka3fktD75'
SHEET_ID = 8  # 20260601(2)


def get_access_token():
    url = f'{API_BASE}/oauth2/token'
    payload = {
        'grant_type': 'client_credentials',
        'client_id': APP_ID,
        'client_secret': APP_KEY,
        'scope': 'kso.dbsheet.readwrite',
    }
    resp = requests.post(url, data=payload, timeout=15)
    data = resp.json()
    if 'access_token' in data:
        return data['access_token']
    raise RuntimeError(f'获取 token 失败: {json.dumps(data, ensure_ascii=False)}')


def get_rfc1123_date():
    return datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')


def sha256_hex(data):
    return hashlib.sha256(data).hexdigest().lower()


def kso1_sign(secret_key, method, uri, content_type, date, body=None):
    body_sha = ''
    body_bytes = b''
    if body is not None:
        body_bytes = json.dumps(body, ensure_ascii=False).encode('utf-8')
        body_sha = sha256_hex(body_bytes)
    sign_str = f'KSO-1{method}{uri}{content_type}{date}{body_sha}'
    signature = hmac.new(
        secret_key.encode('utf-8'),
        sign_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest().lower()
    return signature, body_bytes


def call_api(access_token, path, method='POST', body=None, description=''):
    print(f"\n{'='*60}")
    print(f"测试: {description}")
    print(f"  方法: {method}")
    print(f"  路径: {path}")
    if body:
        print(f"  请求体: {json.dumps(body, ensure_ascii=False)[:200]}")
    print(f"{'='*60}")

    sign_uri = path

    content_type = 'application/json'
    date = get_rfc1123_date()

    signature, body_bytes = kso1_sign(APP_KEY, method.upper(), sign_uri, content_type, date, body)
    auth_header = f'KSO-1 {APP_ID}:{signature}'

    headers = {
        'X-Kso-Date': date,
        'X-Kso-Authorization': auth_header,
        'Authorization': f'Bearer {access_token}',
        'Content-Type': content_type,
    }

    url = f'{API_BASE}{path}'

    try:
        if method.upper() == 'GET':
            resp = requests.get(url, headers=headers, timeout=15)
        elif method.upper() == 'PATCH':
            resp = requests.patch(url, data=body_bytes, headers=headers, timeout=15)
        else:
            resp = requests.post(url, data=body_bytes, headers=headers, timeout=15)

        print(f"  状态码: {resp.status_code}")
        data = resp.json()
        print(f"  响应: {json.dumps(data, ensure_ascii=False, indent=2)[:800]}")
        return data
    except Exception as e:
        print(f"  错误: {e}")
        return None


def main():
    print("获取 access_token...")
    token = get_access_token()
    print(f"Token: {token[:30]}...")

    base_path = f'/v7/coop/dbsheet/{FILE_ID}/sheets/{SHEET_ID}'

    # 1. 先查询当前记录数
    records_path = f'{base_path}/records'
    result = call_api(token, records_path, method='POST', body={}, description='查询记录(空body)')
    if result and result.get('code') == 0:
        records = result.get('data', {}).get('records', [])
        print(f"\n当前记录数: {len(records)}")

    # 2. 测试创建记录 - 不同的 body 格式
    test_bodies = [
        # 格式1: 直接 records 数组
        {
            'records': [
                {'fields': {'Trae Session ID': 'test-create-001', 'UID': 'UID-CREATE-001'}}
            ]
        },
        # 格式2: 带 prefer_id
        {
            'prefer_id': False,
            'records': [
                {'fields': {'Trae Session ID': 'test-create-002', 'UID': 'UID-CREATE-002'}}
            ]
        },
        # 格式3: 带 fields_schema (旧版风格)
        {
            'fields_schema': [
                {'name': 'Trae Session ID', 'type': 'MultiLineText'},
                {'name': 'UID', 'type': 'MultiLineText'}
            ],
            'records': [
                {'fields': {'Trae Session ID': 'test-create-003', 'UID': 'UID-CREATE-003'}}
            ]
        },
    ]

    for i, body in enumerate(test_bodies):
        result = call_api(token, records_path, method='POST', body=body, description=f'创建记录 - 格式{i+1}')
        if result and result.get('code') == 0:
            data = result.get('data', {})
            records = data.get('records', [])
            print(f"  ✅ 创建成功? 返回记录数: {len(records)}")
            if records:
                print(f"    record_id: {records[0].get('record_id', records[0].get('id'))}")
                print(f"    fields: {records[0].get('fields', {})}")
        else:
            print(f"  ❌ 创建失败")

    # 3. 再次查询，看看有多少条记录
    print("\n" + "=" * 60)
    print("3. 再次查询记录总数")
    print("=" * 60)
    result = call_api(token, records_path, method='POST', body={}, description='再次查询记录')
    if result and result.get('code') == 0:
        records = result.get('data', {}).get('records', [])
        print(f"\n最终记录数: {len(records)}")
        for i, r in enumerate(records[:5]):
            print(f"  记录{i+1}: {r.get('fields', {}).get('Trae Session ID', 'N/A')}")

    # 4. 测试更新记录 - 如果有记录的话
    if result and result.get('code') == 0:
        records = result.get('data', {}).get('records', [])
        if records:
            record_id = records[0].get('record_id') or records[0].get('id')
            print(f"\n测试更新记录 record_id={record_id}")

            update_path = f'{base_path}/records/{record_id}'
            update_body = {
                'fields': {'UID': 'UID-UPDATED-001'}
            }

            # 测试 PATCH 方法
            call_api(token, update_path, method='PATCH', body=update_body, description='更新记录(PATCH)')

            # 测试 POST 方法
            call_api(token, update_path, method='POST', body=update_body, description='更新记录(POST)')


if __name__ == '__main__':
    main()

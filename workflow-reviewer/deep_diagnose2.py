#!/usr/bin/env python3
"""深入排查 WPS v2 API 问题 - 查看有数据的工作表"""

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


def call_api(access_token, path, method='POST', body=None):
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
        elif method.upper() == 'PUT':
            resp = requests.put(url, data=body_bytes, headers=headers, timeout=15)
        else:
            resp = requests.post(url, data=body_bytes, headers=headers, timeout=15)

        try:
            data = resp.json()
            return resp.status_code, data
        except:
            return resp.status_code, {'raw_text': resp.text[:500]}
    except Exception as e:
        return None, {'error': str(e)}


def main():
    print("=" * 60)
    print("WPS v2 API - 查看有数据的工作表")
    print("=" * 60)

    token = get_access_token()

    # 1. 查看 20260508 工作表的数据（有 100 条记录）
    print("\n1. 查看 20260508 工作表的前3条记录")
    print("-" * 60)
    records_path = f'/v7/coop/dbsheet/{FILE_ID}/sheets/3/records'
    status, data = call_api(token, records_path, method='POST', body={})
    if data and data.get('code') == 0:
        records = data.get('data', {}).get('records', [])
        print(f"总记录数: {len(records)}")
        print(f"page_token: {data.get('data', {}).get('page_token')}")
        print(f"fields_schema: {data.get('data', {}).get('fields_schema', [])[:3]}...")

        for i in range(min(3, len(records))):
            r = records[i]
            print(f"\n  记录 {i+1}:")
            print(f"    record_id: {r.get('record_id') or r.get('id')}")
            fields = r.get('fields', {})
            print(f"    fields 类型: {type(fields)}")
            if isinstance(fields, dict):
                print(f"    fields 键: {list(fields.keys())[:8]}...")
                # 打印几个字段的值
                for k in list(fields.keys())[:3]:
                    v = fields[k]
                    print(f"      {k}: {type(v).__name__} = {str(v)[:60]}")
            else:
                print(f"    fields 内容: {str(fields)[:200]}")

    # 2. 查看 20260601(2) 工作表的数据
    print("\n\n2. 查看 20260601(2) 工作表的记录")
    print("-" * 60)
    records_path = f'/v7/coop/dbsheet/{FILE_ID}/sheets/8/records'
    status, data = call_api(token, records_path, method='POST', body={})
    if data and data.get('code') == 0:
        records = data.get('data', {}).get('records', [])
        print(f"总记录数: {len(records)}")
        if records:
            for i in range(min(3, len(records))):
                r = records[i]
                print(f"\n  记录 {i+1}:")
                print(f"    record_id: {r.get('record_id') or r.get('id')}")
                fields = r.get('fields', {})
                if isinstance(fields, dict):
                    for k in list(fields.keys())[:5]:
                        print(f"      {k}: {str(fields[k])[:60]}")
        else:
            print("  暂无记录")

    # 3. 尝试在 20260508 工作表中创建一条记录（因为有数据，能验证）
    print("\n\n3. 在 20260508 工作表中创建测试记录")
    print("-" * 60)
    records_path = f'/v7/coop/dbsheet/{FILE_ID}/sheets/3/records'

    test_fields = {
        'Trae Session ID': 'test-create-debug-001',
        'UID': 'UID-DEBUG-001',
    }
    test_body = {
        'records': [{'fields': test_fields}]
    }

    status, data = call_api(token, records_path, method='POST', body=test_body)
    print(f"状态: {status}")
    print(f"code: {data.get('code')}")
    print(f"msg: {data.get('msg')}")

    if data.get('code') == 0:
        records = data.get('data', {}).get('records', [])
        print(f"返回记录数: {len(records)}")
        if records:
            r = records[0]
            print(f"  record_id: {r.get('record_id') or r.get('id')}")
            fields = r.get('fields', {})
            print(f"  fields: {json.dumps(fields, ensure_ascii=False)[:200]}")

        # 再次查询，看看有没有新记录
        print("\n  再次查询验证...")
        status, data2 = call_api(token, records_path, method='POST', body={})
        if data2.get('code') == 0:
            records2 = data2.get('data', {}).get('records', [])
            print(f"  总记录数: {len(records2)}")

            # 查找我们的测试记录
            found = False
            for r in records2:
                fields = r.get('fields', {})
                if isinstance(fields, dict):
                    sid = fields.get('Trae Session ID', '')
                    if 'test-create-debug-001' in str(sid):
                        found = True
                        print(f"  ✅ 找到测试记录!")
                        print(f"     record_id: {r.get('record_id') or r.get('id')}")
                        print(f"     Trae Session ID: {sid}")
                        break

            if not found:
                print(f"  ❌ 未找到测试记录，可能没写入成功")
    else:
        print(f"创建失败: {data}")

    # 4. 测试带 view_id 的查询
    print("\n\n4. 测试带 view_id 的查询")
    print("-" * 60)
    # 20260508 的表格视图 id 是 'C'
    view_ids_to_test = ['C', 'J']
    for view_id in view_ids_to_test:
        records_path = f'/v7/coop/dbsheet/{FILE_ID}/sheets/3/records'
        body = {'view_id': view_id}
        status, data = call_api(token, records_path, method='POST', body=body)
        if data.get('code') == 0:
            records = data.get('data', {}).get('records', [])
            print(f"  view_id={view_id}: {len(records)} 条记录")
        else:
            print(f"  view_id={view_id}: 失败 {data.get('msg')}")


if __name__ == '__main__':
    main()

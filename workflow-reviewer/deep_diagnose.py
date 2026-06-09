#!/usr/bin/env python3
"""深入排查 WPS v2 API 问题"""

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


def call_api(access_token, path, method='POST', body=None, description=''):
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
    print("WPS v2 API 深度排查")
    print("=" * 60)

    token = get_access_token()
    print(f"Token 获取成功: {token[:30]}...\n")

    # 1. 获取 schema 详细信息
    print("1. 获取 Schema 详情")
    print("-" * 60)
    schema_path = f'/v7/coop/dbsheet/{FILE_ID}/schema'
    status, data = call_api(token, schema_path, method='GET', description='schema')
    print(f"  状态: {status}")
    if data and data.get('code') == 0:
        sheets = data.get('data', {}).get('sheets', [])
        for s in sheets:
            print(f"\n  工作表: {s.get('name')} (id: {s.get('id')})")
            views = s.get('views', [])
            print(f"    视图数: {len(views)}")
            for v in views:
                print(f"      - {v.get('name')} (id: {v.get('id')}, type: {v.get('viewType')})")
            fields = s.get('fields', [])
            print(f"    字段数: {len(fields)}")
            for f in fields[:5]:
                print(f"      - {f.get('name')} (id: {f.get('id')}, type: {f.get('type')})")
            if len(fields) > 5:
                print(f"      ... 共 {len(fields)} 个字段")
    else:
        print(f"  失败: {data}")

    # 2. 测试不同 sheet 的记录查询
    print("\n\n2. 测试不同 sheet 的记录查询")
    print("-" * 60)
    if data and data.get('code') == 0:
        sheets = data.get('data', {}).get('sheets', [])
        for s in sheets:
            sheet_id = s.get('id')
            sheet_name = s.get('name')
            records_path = f'/v7/coop/dbsheet/{FILE_ID}/sheets/{sheet_id}/records'
            status, rdata = call_api(token, records_path, method='POST', body={}, description=f'sheet {sheet_name}')
            if rdata and rdata.get('code') == 0:
                records = rdata.get('data', {}).get('records', [])
                print(f"  {sheet_name} (id={sheet_id}): {len(records)} 条记录")
                if records:
                    print(f"    第一条记录 fields 键: {list(records[0].get('fields', {}).keys())[:5]}")
            else:
                print(f"  {sheet_name} (id={sheet_id}): 查询失败 {rdata}")

    # 3. 尝试用字段 ID 写入数据
    print("\n\n3. 测试用字段 ID 写入数据")
    print("-" * 60)
    if data and data.get('code') == 0:
        sheets = data.get('data', {}).get('sheets', [])
        # 找 20260601(2) 工作表
        target_sheet = None
        for s in sheets:
            if '20260601(2)' in s.get('name', ''):
                target_sheet = s
                break

        if target_sheet:
            sheet_id = target_sheet.get('id')
            fields = target_sheet.get('fields', [])

            # 找到字段 ID
            field_map = {}
            for f in fields:
                field_map[f.get('name')] = f.get('id')

            print(f"  目标工作表: {target_sheet.get('name')} (id={sheet_id})")
            print(f"  字段映射: { {k: v for k, v in list(field_map.items())[:5]} }...")

            # 用字段名写入
            session_id_name = 'Trae Session ID'
            uid_name = 'UID'

            records_path = f'/v7/coop/dbsheet/{FILE_ID}/sheets/{sheet_id}/records'

            # 测试 1: 用字段名
            test_body_1 = {
                'records': [
                    {'fields': {session_id_name: 'test-by-name-001', uid_name: 'UID-NAME-001'}}
                ]
            }
            status, rdata = call_api(token, records_path, method='POST', body=test_body_1, description='用字段名写入')
            print(f"\n  测试1 (字段名): 状态={status}, code={rdata.get('code') if rdata else 'N/A'}")
            if rdata and rdata.get('data'):
                records = rdata['data'].get('records', [])
                print(f"    返回记录数: {len(records)}")

            # 测试 2: 用字段 ID
            session_id_id = field_map.get(session_id_name)
            uid_id = field_map.get(uid_name)
            if session_id_id and uid_id:
                test_body_2 = {
                    'records': [
                        {'fields': {session_id_id: 'test-by-id-001', uid_id: 'UID-ID-001'}}
                    ]
                }
                status, rdata = call_api(token, records_path, method='POST', body=test_body_2, description='用字段ID写入')
                print(f"\n  测试2 (字段ID): 状态={status}, code={rdata.get('code') if rdata else 'N/A'}")
                if rdata and rdata.get('data'):
                    records = rdata['data'].get('records', [])
                    print(f"    返回记录数: {len(records)}")

            # 再次查询
            status, rdata = call_api(token, records_path, method='POST', body={}, description='再次查询')
            if rdata and rdata.get('code') == 0:
                records = rdata.get('data', {}).get('records', [])
                print(f"\n  再次查询: {len(records)} 条记录")
                for i, r in enumerate(records[:3]):
                    print(f"    记录{i+1} fields keys: {list(r.get('fields', {}).keys())}")

    # 4. 测试不同的 API 路径
    print("\n\n4. 测试其他可能的创建记录路径")
    print("-" * 60)
    test_paths = [
        (f'/v7/coop/dbsheet/{FILE_ID}/records', 'POST', '无sheet路径'),
        (f'/v7/coop/dbsheet/{FILE_ID}/sheets/8/records/batch', 'POST', '批量路径'),
        (f'/v7/coop/dbsheet/{FILE_ID}/sheets/8/record', 'POST', '单数record'),
    ]

    test_body = {
        'records': [
            {'fields': {'Trae Session ID': 'test-path-001', 'UID': 'UID-PATH-001'}}
        ]
    }

    for path, method, desc in test_paths:
        status, rdata = call_api(token, path, method=method, body=test_body, description=desc)
        print(f"  {desc}: 状态={status}, code={rdata.get('code') if isinstance(rdata, dict) else 'N/A'}")
        if isinstance(rdata, dict) and rdata.get('code') == 0:
            records = rdata.get('data', {}).get('records', []) if rdata.get('data') else []
            print(f"    ✅ 成功! 返回记录数: {len(records)}")


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""测试 /records/create 接口的正确格式"""

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
    print(f"\n--- {description} ---")
    print(f"  方法: {method}")
    print(f"  路径: {path}")
    if body:
        body_str = json.dumps(body, ensure_ascii=False)
        print(f"  Body: {body_str[:200]}")

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

        print(f"  状态码: {resp.status_code}")
        try:
            data = resp.json()
            print(f"  code: {data.get('code')}")
            print(f"  msg: {data.get('msg')}")
            if data.get('data'):
                print(f"  data: {json.dumps(data['data'], ensure_ascii=False)[:200]}")
            return resp.status_code, data
        except:
            print(f"  响应文本: {resp.text[:300]}")
            return resp.status_code, {'raw': resp.text[:300]}
    except Exception as e:
        print(f"  错误: {e}")
        return None, {'error': str(e)}


def main():
    print("=" * 60)
    print("测试 /records/create 接口的正确格式")
    print("=" * 60)

    token = get_access_token()
    print(f"Token: {token[:30]}...\n")

    create_path = f'/v7/coop/dbsheet/{FILE_ID}/sheets/{SHEET_ID}/records/create'
    records_path = f'/v7/coop/dbsheet/{FILE_ID}/sheets/{SHEET_ID}/records'

    # 测试不同的 body 格式
    test_cases = [
        # 1. 顶层是 fieldsValue (根据错误提示)
        ('fieldsValue 顶层 - dict', {
            'fieldsValue': {'Trae Session ID': 'test-fv-1', 'UID': 'UID-FV1'}
        }),

        # 2. fieldsValue 是数组
        ('fieldsValue 顶层 - 数组', {
            'fieldsValue': [{'Trae Session ID': 'test-fv-2', 'UID': 'UID-FV2'}]
        }),

        # 3. records 数组，每个元素有 fieldsValue
        ('records + fieldsValue', {
            'records': [
                {'fieldsValue': {'Trae Session ID': 'test-fv-3', 'UID': 'UID-FV3'}}
            ]
        }),

        # 4. records 数组，每个元素有 fieldsValue (字符串)
        ('records + fieldsValue字符串', {
            'records': [
                {'fieldsValue': '{"Trae Session ID":"test-fv-4","UID":"UID-FV4"}'}
            ]
        }),

        # 5. records + fieldsValue 数组
        ('records + fieldsValue数组', {
            'records': [
                {'fieldsValue': ['test-fv-5', 'UID-FV5']}
            ]
        }),

        # 6. data 包装
        ('data 包装', {
            'data': {
                'records': [
                    {'fields': {'Trae Session ID': 'test-fv-6', 'UID': 'UID-FV6'}}
                ]
            }
        }),

        # 7. 只有 fields
        ('只有 fields', {
            'fields': {'Trae Session ID': 'test-fv-7', 'UID': 'UID-FV7'}
        }),

        # 8. fieldsValue + fields_schema
        ('fieldsValue + fields_schema', {
            'fields_schema': [
                {'name': 'Trae Session ID', 'type': 'MultiLineText'},
                {'name': 'UID', 'type': 'MultiLineText'}
            ],
            'fieldsValue': {'Trae Session ID': 'test-fv-8', 'UID': 'UID-FV8'}
        }),
    ]

    for desc, body in test_cases:
        call_api(token, create_path, method='POST', body=body, description=desc)

    # 最后查询一下，看看有没有创建成功
    print("\n" + "=" * 60)
    print("最终查询验证")
    print("=" * 60)
    status, data = call_api(token, records_path, method='POST', body={}, description='查询记录')
    if data and data.get('code') == 0:
        records = data.get('data', {}).get('records', [])
        print(f"\n总记录数: {len(records)}")
        for i, r in enumerate(records):
            fields_str = r.get('fields', '{}')
            try:
                fields = json.loads(fields_str) if isinstance(fields_str, str) else fields_str
            except:
                fields = {}
            sid = fields.get('Trae Session ID', 'N/A')
            uid = fields.get('UID', 'N/A')
            print(f"  {i+1}. {sid[:50]} | {uid}")


if __name__ == '__main__':
    main()

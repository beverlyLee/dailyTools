#!/usr/bin/env python3
"""测试 WPS v2 API 正确的创建记录方式"""

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
SHEET_ID = 8  # 20260601(2) - 空表，适合测试


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
        print(f"  Body: {body_str[:150]}..." if len(body_str) > 150 else f"  Body: {body_str}")

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
        elif method.upper() == 'DELETE':
            resp = requests.delete(url, headers=headers, timeout=15)
        else:
            resp = requests.post(url, data=body_bytes, headers=headers, timeout=15)

        print(f"  状态码: {resp.status_code}")
        try:
            data = resp.json()
            print(f"  code: {data.get('code')}")
            print(f"  msg: {data.get('msg')}")
            if data.get('data'):
                records = data['data'].get('records', [])
                print(f"  records 数量: {len(records)}")
                if records:
                    r = records[0]
                    print(f"  第一条 record_id: {r.get('record_id') or r.get('id')}")
            return resp.status_code, data
        except:
            print(f"  响应文本: {resp.text[:200]}")
            return resp.status_code, {'raw': resp.text[:200]}
    except Exception as e:
        print(f"  错误: {e}")
        return None, {'error': str(e)}


def main():
    print("=" * 60)
    print("测试 WPS v2 API 创建记录的正确方式")
    print("=" * 60)

    token = get_access_token()
    print(f"Token: {token[:30]}...\n")

    base_path = f'/v7/coop/dbsheet/{FILE_ID}/sheets/{SHEET_ID}'

    # 先查询当前记录数
    records_path = f'{base_path}/records'
    status, data = call_api(token, records_path, method='POST', body={}, description='初始查询')
    initial_count = 0
    if data and data.get('code') == 0:
        initial_count = len(data.get('data', {}).get('records', []))
        print(f"初始记录数: {initial_count}")

    # 测试不同的创建方式
    test_cases = [
        # 1. 直接 records 路径 + POST (我们之前的方式，应该是查询)
        ('records POST - 带 records body', 'POST', f'{base_path}/records', {
            'records': [{'fields': {'Trae Session ID': 'test-method-1', 'UID': 'UID-M1'}}]
        }),

        # 2. records 路径 + PUT
        ('records PUT', 'PUT', f'{base_path}/records', {
            'records': [{'fields': {'Trae Session ID': 'test-method-2', 'UID': 'UID-M2'}}]
        }),

        # 3. record 单数路径 + POST
        ('record POST', 'POST', f'{base_path}/record', {
            'fields': {'Trae Session ID': 'test-method-3', 'UID': 'UID-M3'}
        }),

        # 4. records/create 路径
        ('records/create POST', 'POST', f'{base_path}/records/create', {
            'records': [{'fields': {'Trae Session ID': 'test-method-4', 'UID': 'UID-M4'}}]
        }),

        # 5. 带 action 参数
        ('records POST - action=create', 'POST', f'{base_path}/records?action=create', {
            'records': [{'fields': {'Trae Session ID': 'test-method-5', 'UID': 'UID-M5'}}]
        }),

        # 6. fields 用字符串格式 (因为返回的是字符串)
        ('records POST - fields字符串', 'POST', f'{base_path}/records', {
            'records': [{'fields': '{"Trae Session ID":"test-method-6","UID":"UID-M6"}'}]
        }),

        # 7. 带 operation 参数
        ('records POST - 有operation', 'POST', f'{base_path}/records', {
            'operation': 'create',
            'records': [{'fields': {'Trae Session ID': 'test-method-7', 'UID': 'UID-M7'}}]
        }),

        # 8. 测试 batch create
        ('records/batch POST', 'POST', f'{base_path}/records/batch', {
            'records': [{'fields': {'Trae Session ID': 'test-method-8', 'UID': 'UID-M8'}}]
        }),
    ]

    for desc, method, path, body in test_cases:
        status, data = call_api(token, path, method=method, body=body, description=desc)

        # 每次测试后查询一下记录数
        status2, data2 = call_api(token, records_path, method='POST', body={}, description='  验证查询')
        if data2 and data2.get('code') == 0:
            count = len(data2.get('data', {}).get('records', []))
            print(f"  -> 当前记录数: {count}")

    # 最终查询
    print("\n" + "=" * 60)
    print("最终查询")
    print("=" * 60)
    status, data = call_api(token, records_path, method='POST', body={}, description='最终记录')
    if data and data.get('code') == 0:
        records = data.get('data', {}).get('records', [])
        print(f"\n最终记录数: {len(records)}")
        for i, r in enumerate(records):
            fields_str = r.get('fields', '{}')
            try:
                fields = json.loads(fields_str) if isinstance(fields_str, str) else fields_str
            except:
                fields = {}
            sid = fields.get('Trae Session ID', 'N/A')
            uid = fields.get('UID', 'N/A')
            print(f"  {i+1}. {sid[:40]} | {uid}")


if __name__ == '__main__':
    main()

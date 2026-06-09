#!/usr/bin/env python3
"""测试 WPS v2 API 记录查询的正确格式"""

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
    if body and len(body) > 0:
        body_sha = sha256_hex(body)
    sign_str = f'KSO-1{method}{uri}{content_type}{date}{body_sha}'
    signature = hmac.new(
        secret_key.encode('utf-8'),
        sign_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest().lower()
    return signature


def test_api(access_token, path, method='GET', body=None, description=''):
    print(f"\n{'='*60}")
    print(f"测试: {description}")
    print(f"  方法: {method}")
    print(f"  路径: {path}")
    print(f"{'='*60}")

    sign_uri = path.replace('/openapi', '', 1)

    body_bytes = b''
    if body is not None:
        body_bytes = json.dumps(body, ensure_ascii=False).encode('utf-8')

    content_type = 'application/json'
    date = get_rfc1123_date()

    signature = kso1_sign(APP_KEY, method.upper(), sign_uri, content_type, date, body_bytes)
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
        else:
            resp = requests.post(url, data=body_bytes, headers=headers, timeout=15)

        print(f"  状态码: {resp.status_code}")
        try:
            data = resp.json()
            print(f"  响应: {json.dumps(data, ensure_ascii=False, indent=2)[:600]}")
        except:
            print(f"  响应(文本): {resp.text[:300]}")

        return resp.status_code, data
    except Exception as e:
        print(f"  错误: {e}")
        return None, None


def main():
    print("获取 access_token...")
    token = get_access_token()
    print(f"Token: {token[:30]}...")

    # 测试不同的查询路径和方法
    test_cases = [
        # GET 方法
        (f'/openapi/v7/coop/dbsheet/{FILE_ID}/sheets/{SHEET_ID}/records', 'GET', 'GET + /openapi + coop'),
        (f'/v7/coop/dbsheet/{FILE_ID}/sheets/{SHEET_ID}/records', 'GET', 'GET + 无前缀 + coop'),
        (f'/openapi/v7/dbsheet/{FILE_ID}/sheets/{SHEET_ID}/records', 'GET', 'GET + /openapi + dbsheet'),
        (f'/v7/dbsheet/{FILE_ID}/sheets/{SHEET_ID}/records', 'GET', 'GET + 无前缀 + dbsheet'),
        
        # POST 方法
        (f'/openapi/v7/coop/dbsheet/{FILE_ID}/sheets/{SHEET_ID}/records', 'POST', 'POST + /openapi + coop'),
        (f'/v7/coop/dbsheet/{FILE_ID}/sheets/{SHEET_ID}/records', 'POST', 'POST + 无前缀 + coop'),
        (f'/openapi/v7/dbsheet/{FILE_ID}/sheets/{SHEET_ID}/records', 'POST', 'POST + /openapi + dbsheet'),
        (f'/v7/dbsheet/{FILE_ID}/sheets/{SHEET_ID}/records', 'POST', 'POST + 无前缀 + dbsheet'),
    ]

    for path, method, desc in test_cases:
        test_api(token, path, method=method, description=desc)


if __name__ == '__main__':
    main()

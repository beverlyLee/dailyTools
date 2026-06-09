#!/usr/bin/env python3
"""测试 KSO-1 签名和 WPS 365 新版 API"""

import sys
import json
import hashlib
import hmac
import time
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


def get_access_token(scope=''):
    url = f'{API_BASE}/oauth2/token'
    payload = {
        'grant_type': 'client_credentials',
        'client_id': APP_ID,
        'client_secret': APP_KEY,
    }
    if scope:
        payload['scope'] = scope
    resp = requests.post(url, data=payload, timeout=15)
    data = resp.json()
    if 'access_token' in data:
        return data['access_token']
    raise RuntimeError(f'获取 token 失败: {json.dumps(data, ensure_ascii=False)}')


def get_rfc1123_date() -> str:
    return datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().lower()


def kso1_sign(secret_key: str, method: str, uri: str, content_type: str, date: str, body: bytes = None) -> str:
    """KSO-1 签名算法

    signature = HMAC-SHA256(secretKey, "KSO-1" + Method + RequestURI + ContentType + KsoDate + sha256(RequestBody))
    返回十六进制字符串
    """
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


def test_kso1_api(access_token, path, method='GET', body=None, remove_openapi_prefix=True):
    """测试 KSO-1 签名的 API

    Args:
        access_token: access token
        path: 请求路径（包含 /openapi 前缀，如 /openapi/v7/coop/dbsheet/xxx）
        method: HTTP 方法
        body: 请求体 dict
        remove_openapi_prefix: 签名时是否移除 /openapi 前缀
    """
    if remove_openapi_prefix:
        sign_uri = path.replace('/openapi', '', 1)
    else:
        sign_uri = path

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

    print(f"URL: {url}")
    print(f"签名 URI: {sign_uri}")
    print(f"Method: {method}")
    print(f"Headers: {json.dumps(headers, ensure_ascii=False, indent=2)}")
    if body:
        print(f"Body: {json.dumps(body, ensure_ascii=False)}")
    print()

    try:
        if method.upper() == 'GET':
            resp = requests.get(url, headers=headers, timeout=15)
        else:
            resp = requests.post(url, data=body_bytes, headers=headers, timeout=15)
        print(f"Status: {resp.status_code}")
        try:
            data = resp.json()
            print(f"Response: {json.dumps(data, ensure_ascii=False, indent=2)[:800]}")
        except:
            print(f"Response (text): {resp.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")

    print()


def main():
    print("正在获取 access_token (无 scope)...")
    token = get_access_token()
    print(f"Token 获取成功: {token[:30]}...")
    print()

    # 测试不同的 API 路径
    test_paths = [
        # 带 /openapi 前缀的路径
        ('/openapi/v7/coop/dbsheet/{file_id}/schema', 'GET', True),
        ('/openapi/v7/dbsheet/{file_id}/schema', 'GET', True),
        # 不带 /openapi 前缀的路径
        ('/v7/coop/dbsheet/{file_id}/schema', 'GET', False),
        ('/v7/dbsheet/{file_id}/schema', 'GET', False),
        # 工作表列表
        ('/openapi/v7/coop/dbsheet/{file_id}/sheets', 'GET', True),
        ('/openapi/v7/dbsheet/{file_id}/sheets', 'GET', True),
        # 记录列表
        ('/openapi/v7/coop/dbsheet/{file_id}/sheets/1/records', 'POST', True),
    ]

    for i, (path_template, method, remove_prefix) in enumerate(test_paths, 1):
        path = path_template.format(file_id=FILE_ID)
        print("=" * 60)
        print(f"测试 {i}: {method} {path}")
        print("=" * 60)
        test_kso1_api(token, path, method=method, remove_openapi_prefix=remove_prefix)

    # 试试带 kso.dbsheet.readwrite scope
    print("\n" + "=" * 60)
    print("尝试获取带 kso.dbsheet.readwrite scope 的 token...")
    print("=" * 60)
    try:
        token2 = get_access_token('kso.dbsheet.readwrite')
        print(f"Token 获取成功: {token2[:30]}...")
        print("\n用这个 token 再试一次:")
        test_kso1_api(token2, f'/v7/coop/dbsheet/{FILE_ID}/schema', method='GET', remove_openapi_prefix=False)
    except Exception as e:
        print(f"获取失败: {e}")


if __name__ == '__main__':
    main()

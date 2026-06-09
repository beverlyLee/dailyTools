#!/usr/bin/env python3
"""测试 WPS 多维表格 API - 看哪套能用"""

import sys
import json
import hashlib
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
    """获取 access_token"""
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


def md5_hex(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


def get_rfc1123_date() -> str:
    now = datetime.now(timezone.utc)
    return now.strftime('%a, %d %b %Y %H:%M:%S GMT')


def wps3_sign(appkey: str, content_md5: str, uri: str, content_type: str, date: str) -> str:
    sign_str = appkey + content_md5 + uri + content_type + date
    return hashlib.sha1(sign_str.encode('utf-8')).hexdigest()


def test_old_api(access_token):
    """测试旧版 API: /kopen/office/file/... + WPS-3 签名"""
    print("=" * 60)
    print("测试 1: 旧版 API (WPS-3签名 + /kopen/office/file/...)")
    print("=" * 60)

    path = f'/kopen/office/file/{FILE_ID}/core/execute/schema/query'
    query = f'access_token={access_token}'
    full_uri = f'{path}?{query}'
    url = f'{API_BASE}{full_uri}'

    body = {}
    body_str = json.dumps(body, separators=(',', ':'))
    body_bytes = body_str.encode('utf-8')

    content_md5 = md5_hex(body_bytes)
    content_type = 'application/json'
    date = get_rfc1123_date()

    # 注意：签名的 URL 必须包含 query 参数！
    signature = wps3_sign(APP_KEY, content_md5, full_uri, content_type, date)
    x_auth = f'WPS-3:{APP_ID}:{signature}'

    headers = {
        'Content-Md5': content_md5,
        'Content-Type': content_type,
        'Date': date,
        'X-Auth': x_auth,
    }

    print(f"URL: {url}")
    print(f"签名 URI: {full_uri}")
    print(f"Headers: {json.dumps(headers, ensure_ascii=False, indent=2)}")
    print(f"Body: {body_str}")
    print()

    try:
        resp = requests.post(url, data=body_bytes, headers=headers, timeout=15)
        print(f"Status: {resp.status_code}")
        print(f"Response: {json.dumps(resp.json(), ensure_ascii=False, indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

    print()


def test_old_api_bearer(access_token):
    """测试旧版路径 + Bearer token"""
    print("=" * 60)
    print("测试 2: 旧版路径 + Bearer token (Authorization header)")
    print("=" * 60)

    path = f'/kopen/office/file/{FILE_ID}/core/execute/schema/query'
    url = f'{API_BASE}{path}'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
    }

    body = {}

    print(f"URL: {url}")
    print()

    try:
        resp = requests.post(url, json=body, headers=headers, timeout=15)
        print(f"Status: {resp.status_code}")
        try:
            print(f"Response: {json.dumps(resp.json(), ensure_ascii=False, indent=2)}")
        except:
            print(f"Response (text): {resp.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")

    print()


def test_v7_coop(access_token):
    """测试 WPS 365 /v7/coop/dbsheet/..."""
    print("=" * 60)
    print("测试 3: WPS 365 API (/v7/coop/dbsheet/...)")
    print("=" * 60)

    # 试试获取 schema
    paths = [
        f'/openapi/v7/coop/dbsheet/{FILE_ID}/schema',
        f'/v7/coop/dbsheet/{FILE_ID}/schema',
    ]

    for path in paths:
        url = f'{API_BASE}{path}'
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        }

        print(f"URL: {url}")

        try:
            resp = requests.get(url, headers=headers, timeout=15)
            print(f"Status: {resp.status_code}")
            try:
                data = resp.json()
                print(f"Response: {json.dumps(data, ensure_ascii=False, indent=2)[:500]}")
            except:
                print(f"Response (text): {resp.text[:300]}")
        except Exception as e:
            print(f"Error: {e}")

        print()


def test_v7_coop_single(access_token):
    """用指定 token 测试 WPS 365 API"""
    path = f'/v7/coop/dbsheet/{FILE_ID}/schema'
    url = f'{API_BASE}{path}'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
    }

    print(f"URL: {url}")

    try:
        resp = requests.get(url, headers=headers, timeout=15)
        print(f"Status: {resp.status_code}")
        try:
            data = resp.json()
            print(f"Response: {json.dumps(data, ensure_ascii=False, indent=2)}")
        except:
            print(f"Response (text): {resp.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")


def test_developer_dmc(access_token):
    """测试 /kopen/api/v3/developer/dmc/... 路径"""
    print("=" * 60)
    print("测试 4: 开发者 DMC API (/kopen/api/v3/developer/dmc/...)")
    print("=" * 60)

    path = f'/kopen/api/v3/developer/dmc/office/file/{FILE_ID}/core/execute/schema/query'
    url = f'{API_BASE}{path}'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
    }

    body = {}

    print(f"URL: {url}")
    print()

    try:
        resp = requests.post(url, json=body, headers=headers, timeout=15)
        print(f"Status: {resp.status_code}")
        try:
            print(f"Response: {json.dumps(resp.json(), ensure_ascii=False, indent=2)[:500]}")
        except:
            print(f"Response (text): {resp.text[:300]}")
    except Exception as e:
        print(f"Error: {e}")

    print()


def test_kdocs(access_token):
    """测试金山文档 developer.kdocs.cn API"""
    print("=" * 60)
    print("测试 5: 金山文档 API (developer.kdocs.cn)")
    print("=" * 60)

    api_base = 'https://developer.kdocs.cn'
    paths = [
        f'/api/v1/openapi/dbt/{FILE_ID}/sheets',
        f'/api/v1/dbt/{FILE_ID}/sheets',
    ]

    for path in paths:
        url = f'{api_base}{path}'
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        }

        print(f"URL: {url}")

        try:
            resp = requests.get(url, headers=headers, timeout=15)
            print(f"Status: {resp.status_code}")
            try:
                data = resp.json()
                print(f"Response: {json.dumps(data, ensure_ascii=False, indent=2)[:500]}")
            except:
                print(f"Response (text): {resp.text[:300]}")
        except Exception as e:
            print(f"Error: {e}")

        print()


def test_graph_api(access_token):
    """测试 /graph/v7/wo/api/v3/... 路径"""
    print("=" * 60)
    print("测试 6: Graph API (/graph/v7/wo/api/v3/...)")
    print("=" * 60)

    paths = [
        f'/graph/v7/wo/api/v3/openapi/office/file/{FILE_ID}/core/dbt/sheets',
        f'/graph/v7/wo/api/v3/openapi/office/file/{FILE_ID}/core/execute/schema/query',
    ]

    for path in paths:
        url = f'{API_BASE}{path}'
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        }

        print(f"URL: {url}")

        try:
            if 'schema/query' in path:
                resp = requests.post(url, json={}, headers=headers, timeout=15)
            else:
                resp = requests.get(url, headers=headers, timeout=15)
            print(f"Status: {resp.status_code}")
            try:
                data = resp.json()
                print(f"Response: {json.dumps(data, ensure_ascii=False, indent=2)[:500]}")
            except:
                print(f"Response (text): {resp.text[:300]}")
        except Exception as e:
            print(f"Error: {e}")

        print()


def main():
    print("正在获取 access_token (无 scope)...")
    token = get_access_token()
    print(f"Token 获取成功: {token[:30]}...")
    print()

    # 测试不同的 API 路径
    test_old_api(token)           # 1. 旧版 WPS-3 签名 + query 参数
    test_old_api_bearer(token)    # 2. 旧版路径 + Bearer token
    test_v7_coop(token)           # 3. WPS 365 /v7/coop/dbsheet/
    test_developer_dmc(token)     # 4. /kopen/api/v3/developer/dmc/
    test_kdocs(token)             # 5. 金山文档 developer.kdocs.cn
    test_graph_api(token)         # 6. /graph/v7/wo/api/v3/...

    # 试试带 kso.dbsheet.readwrite scope
    print("\n" + "=" * 60)
    print("尝试获取带 kso.dbsheet.readwrite scope 的 token...")
    print("=" * 60)
    try:
        token2 = get_access_token('kso.dbsheet.readwrite')
        print(f"Token 获取成功: {token2[:30]}...")
        print("\n用这个 token 再试一次 WPS 365 API:")
        test_v7_coop_single(token2)
    except Exception as e:
        print(f"获取失败: {e}")


if __name__ == '__main__':
    main()

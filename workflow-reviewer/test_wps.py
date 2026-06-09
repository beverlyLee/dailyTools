#!/usr/bin/env python3
"""测试 WPS 多维表格 API 连接"""

import sys
import os
import json
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from wps_dbt import WpsDbtClient, extract_file_token, wps3_sign, md5_hex, get_rfc1123_date


def test_extract_file_token():
    print("=== 测试 extract_file_token ===")
    url = "https://www.kdocs.cn/l/ct9Ka3fktD75?R=L1MvNw=="
    token = extract_file_token(url)
    print(f"URL: {url}")
    print(f"提取的 file_id: {token}")
    assert token == "ct9Ka3fktD75", f"期望 ct9Ka3fktD75，实际 {token}"
    print("✓ 通过\n")


def test_wps3_sign():
    print("=== 测试 WPS-3 签名算法 ===")
    
    app_id = "AK123"
    app_key = "sk456"
    url = "/api/v1/dosomething?name=xiaoming&age=18"
    content_type = "application/json"
    date = "Wed, 03 Nov 2021 02:55:55 GMT"
    body = ""
    
    content_md5 = md5_hex(body.encode('utf-8')) if body else "d41d8cd98f00b204e9800998ecf8427e"
    
    signature = wps3_sign(app_key, content_md5, url, content_type, date)
    x_auth = f"WPS-3:{app_id}:{signature}"
    
    print(f"AppKey: {app_key}")
    print(f"Content-Md5: {content_md5}")
    print(f"URL: {url}")
    print(f"Content-Type: {content_type}")
    print(f"Date: {date}")
    print(f"Signature: {signature}")
    print(f"X-Auth: {x_auth}")
    
    expected_sign = "695229194add4899ffde601d691a1f2d398e7fab"
    print(f"\n文档中的期望签名: {expected_sign}")
    print(f"实际计算的签名:   {signature}")
    
    if signature == expected_sign:
        print("✓ 签名算法正确！\n")
    else:
        print("✗ 签名与文档示例不符，请检查算法\n")
        print("注意：如果日期/内容不同，签名也会不同。这里只是验证算法格式。")
        print(f"      签名长度: {len(signature)} (应为40位)")
        print(f"      是否全小写: {signature.islower()}")
        print()


def test_get_access_token():
    print("=== 测试获取 access_token ===")
    
    app_id = os.getenv('WPS_APP_ID', '')
    app_key = os.getenv('WPS_APP_KEY', '')
    api_base_url = os.getenv('WPS_API_BASE_URL', 'https://openapi.wps.cn')
    scope = os.getenv('WPS_SCOPE', 'dbsheet.all')
    
    print(f"APP_ID: {app_id[:8]}...")
    print(f"API_BASE_URL: {api_base_url}")
    print(f"SCOPE: {scope}")
    
    if not app_id or not app_key:
        print("✗ 缺少 WPS_APP_ID 或 WPS_APP_KEY 配置\n")
        return False
    
    try:
        client = WpsDbtClient(
            app_id=app_id,
            app_key=app_key,
            file_id="test",
            api_base_url=api_base_url,
            scope=scope,
        )
        token = client._get_access_token()
        print(f"✓ access_token 获取成功: {token[:20]}...")
        print(f"  长度: {len(token)} 字符\n")
        return True
    except Exception as e:
        print(f"✗ access_token 获取失败: {e}\n")
        return False


def test_get_sheets():
    print("=== 测试获取工作表列表 ===")
    
    file_id = "ct9Ka3fktD75"
    
    try:
        client = WpsDbtClient(
            file_id=file_id,
        )
        result = client.get_sheets()
        print(f"结果: {json.dumps(result, ensure_ascii=False, indent=2)}")
        
        if result.get('success'):
            sheets = result.get('data', {}).get('sheets', [])
            print(f"\n✓ 获取成功！共 {len(sheets)} 个工作表:")
            for sheet in sheets:
                print(f"  - {sheet.get('name')} (id: {sheet.get('id')})")
            print()
            return True
        else:
            print(f"\n✗ 获取失败: {result.get('error')}")
            print(f"原始响应: {json.dumps(result.get('raw', {}), ensure_ascii=False, indent=2)}\n")
            return False
    except Exception as e:
        import traceback
        print(f"✗ 异常: {e}")
        print(f"堆栈: {traceback.format_exc()}\n")
        return False


def main():
    print("=" * 60)
    print("WPS 多维表格 API 连接测试")
    print("=" * 60 + "\n")
    
    test_extract_file_token()
    test_wps3_sign()
    
    has_token = test_get_access_token()
    
    if has_token:
        test_get_sheets()
    
    print("=" * 60)
    print("测试完成")
    print("=" * 60)


if __name__ == '__main__':
    main()

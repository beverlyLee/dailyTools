#!/usr/bin/env python3
"""诊断 WPS 多维表格写入问题"""

import sys
import json
import os
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from wps_dbt import WpsDbtClient, extract_file_token

FILE_ID = 'ct9Ka3fktD75'
SHEET_NAME = '20260601(2)'


def main():
    print("=" * 60)
    print("WPS 多维表格诊断工具")
    print("=" * 60)

    app_id = os.getenv('WPS_APP_ID', '')
    app_key = os.getenv('WPS_APP_KEY', '')
    api_base_url = os.getenv('WPS_API_BASE_URL', 'https://openapi.wps.cn')
    scope = os.getenv('WPS_SCOPE', 'kso.dbsheet.readwrite')
    api_version = os.getenv('WPS_API_VERSION', 'v2')

    print(f"\n配置信息:")
    print(f"  APP_ID: {app_id[:10]}...")
    print(f"  API 版本: {api_version}")
    print(f"  scope: {scope}")
    print(f"  file_id: {FILE_ID}")
    print(f"  sheet_name: {SHEET_NAME}")

    try:
        client = WpsDbtClient(
            app_id=app_id,
            app_key=app_key,
            file_id=FILE_ID,
            api_base_url=api_base_url,
            scope=scope,
            api_version=api_version,
        )

        # 1. 获取工作表列表
        print(f"\n{'='*60}")
        print("1. 获取工作表列表")
        print("=" * 60)
        sheets_result = client.get_sheets()
        if sheets_result.get('success'):
            sheets = sheets_result.get('data', {}).get('sheets', [])
            for s in sheets:
                print(f"  - {s.get('name')} (id: {s.get('id')})")
        else:
            print(f"  ❌ 失败: {sheets_result.get('error')}")
            return

        # 2. 获取指定工作表的字段
        print(f"\n{'='*60}")
        print(f"2. 获取工作表「{SHEET_NAME}」的字段")
        print("=" * 60)
        sheet_fields = client.get_sheet_fields(SHEET_NAME)
        print(f"  共 {len(sheet_fields)} 个字段:")
        for f in sheet_fields:
            print(f"    - {f.get('name')} (id: {f.get('id')}, type: {f.get('type')})")

        # 3. 查询现有记录
        print(f"\n{'='*60}")
        print(f"3. 查询现有记录")
        print("=" * 60)
        sheet_id = client.get_sheet_id_by_name(SHEET_NAME)
        if sheet_id is not None:
            records = client.list_all_records(sheet_id)
            print(f"  共 {len(records)} 条记录")
            for i, r in enumerate(records[:3]):
                print(f"\n  记录 {i+1}:")
                print(f"    record_id: {r.get('record_id') or r.get('id')}")
                fields = r.get('fields', {})
                for k, v in fields.items():
                    print(f"    {k}: {str(v)[:50]}")

        # 4. 尝试创建一条测试记录
        print(f"\n{'='*60}")
        print(f"4. 尝试创建测试记录")
        print("=" * 60)
        test_fields = {
            'Trae Session ID': 'test-session-id-123',
            'UID': 'UID-TEST-001',
        }
        print(f"  写入字段: {json.dumps(test_fields, ensure_ascii=False)}")

        create_result = client.append_record_by_sheet_name(SHEET_NAME, test_fields)
        print(f"\n  结果: {'成功' if create_result.get('success') else '失败'}")
        print(f"  success: {create_result.get('success')}")
        print(f"  error: {create_result.get('error')}")

        raw = create_result.get('raw', {})
        print(f"  raw code: {raw.get('code')}")
        print(f"  raw msg: {raw.get('msg')}")
        if raw.get('data'):
            records_data = raw['data'].get('records', [])
            print(f"  raw records: {len(records_data)} 条")
            for r in records_data:
                print(f"    - record_id: {r.get('record_id') or r.get('id')}")
                print(f"      fields: {r.get('fields', {})}")

        # 5. 再次查询记录，确认是否写入
        print(f"\n{'='*60}")
        print(f"5. 再次查询记录，验证是否写入成功")
        print("=" * 60)
        if sheet_id is not None:
            records_after = client.list_all_records(sheet_id)
            print(f"  写入后共 {len(records_after)} 条记录")

            # 查找测试记录
            test_found = False
            for r in records_after:
                fields = r.get('fields', {})
                sid = fields.get('Trae Session ID', '')
                if isinstance(sid, list):
                    sid = str(sid[0]) if sid else ''
                if sid == 'test-session-id-123':
                    test_found = True
                    print(f"  ✅ 找到测试记录!")
                    print(f"     record_id: {r.get('record_id') or r.get('id')}")
                    break

            if not test_found:
                print(f"  ❌ 未找到测试记录，写入可能失败")

    except Exception as e:
        import traceback
        print(f"\n❌ 异常: {e}")
        print(f"堆栈:\n{traceback.format_exc()}")


if __name__ == '__main__':
    main()

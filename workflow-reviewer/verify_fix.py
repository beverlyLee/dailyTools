#!/usr/bin/env python3
"""验证 wps_dbt.py 修复后的功能"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from wps_dbt import WpsDbtClient

FILE_ID = 'ct9Ka3fktD75'
SHEET_NAME = '20260601(2)'


def main():
    client = WpsDbtClient(
        app_id=os.getenv('WPS_APP_ID', ''),
        app_key=os.getenv('WPS_APP_KEY', ''),
        file_id=FILE_ID,
        api_version='v2',
        scope='kso.dbsheet.readwrite',
    )

    print("=" * 60)
    print("1. 测试创建记录")
    print("=" * 60)
    result = client.append_record_by_sheet_name(
        SHEET_NAME,
        {'Trae Session ID': 'test-fix-001', 'UID': 'UID-FIX-001'}
    )
    print(f'创建结果: success={result.get("success")}')

    print("\n" + "=" * 60)
    print("2. 测试查询记录")
    print("=" * 60)
    sheet_id = client.get_sheet_id_by_name(SHEET_NAME)
    records = client.list_all_records(sheet_id)
    print(f'记录总数: {len(records)}')
    if records:
        r = records[-1]
        fields = client._parse_fields(r)
        print(f'最新记录: id={r.get("id")}')
        print(f'  Trae Session ID: {fields.get("Trae Session ID")}')
        print(f'  UID: {fields.get("UID")}')

    print("\n" + "=" * 60)
    print("3. 测试更新记录")
    print("=" * 60)
    if records:
        record_id = records[-1].get('id')
        result = client.update_record(sheet_id, record_id, {'UID': 'UID-FIX-UPDATED'})
        print(f'更新结果: success={result.get("success")}')

        # 验证更新
        records2 = client.list_all_records(sheet_id)
        for r in records2:
            if r.get('id') == record_id:
                fields = client._parse_fields(r)
                print(f'更新后 UID: {fields.get("UID")}')
                break

    print("\n" + "=" * 60)
    print("4. 测试 Upsert (已存在的记录)")
    print("=" * 60)
    result = client.upsert_record_by_field(
        SHEET_NAME,
        'Trae Session ID',
        'test-fix-001',
        {'UID': 'UID-UPSERT-UPDATED'}
    )
    print(f'Upsert 结果: success={result.get("success")}, is_new={result.get("is_new")}')

    print("\n" + "=" * 60)
    print("5. 测试 Upsert (新记录)")
    print("=" * 60)
    result = client.upsert_record_by_field(
        SHEET_NAME,
        'Trae Session ID',
        'test-upsert-new-001',
        {'UID': 'UID-UPSERT-NEW'}
    )
    print(f'Upsert 结果: success={result.get("success")}, is_new={result.get("is_new")}')

    print("\n" + "=" * 60)
    print("6. 最终验证")
    print("=" * 60)
    records_final = client.list_all_records(sheet_id)
    print(f'最终记录总数: {len(records_final)}')
    for i, r in enumerate(records_final[-5:]):
        fields = client._parse_fields(r)
        print(f'  记录{i+1}: {fields.get("Trae Session ID", "N/A")[:40]} | {fields.get("UID", "N/A")}')


if __name__ == '__main__':
    main()

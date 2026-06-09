#!/usr/bin/env python3
"""端到端测试：模拟前端写入 sessionid 和其他字段"""

import sys
import os
import json
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
    print("端到端测试：模拟前端写入流程")
    print("=" * 60)

    # 模拟前端写入 sessionid 的场景
    session_id = 'test-e2e-session-001'
    print(f'\n1. 模拟写入 sessionid: {session_id}')
    print("-" * 60)

    result = client.upsert_record_by_field(
        SHEET_NAME,
        'Trae Session ID',
        session_id,
        {'Trae Session ID': session_id, 'UID': 'UID-E2E-001'}
    )

    print(f'   success: {result.get("success")}')
    print(f'   is_new: {result.get("is_new")}')
    print(f'   record_id: {result.get("record_id")}')

    # 验证
    sheet_id = client.get_sheet_id_by_name(SHEET_NAME)
    records = client.find_records_by_field(sheet_id, 'Trae Session ID', session_id)
    if records:
        fields = client._parse_fields(records[0])
        print(f'   ✅ 验证成功!')
        print(f'   Trae Session ID: {fields.get("Trae Session ID")}')
        print(f'   UID: {fields.get("UID")}')
    else:
        print(f'   ❌ 验证失败，未找到记录')
        return

    # 测试更新（模拟写入不满意原因）
    print(f'\n2. 模拟写入「不满意原因」')
    print("-" * 60)
    result2 = client.upsert_record_by_field(
        SHEET_NAME,
        'Trae Session ID',
        session_id,
        {'不满意原因': '功能不符合预期'}
    )
    print(f'   success: {result2.get("success")}')
    print(f'   is_new: {result2.get("is_new")}')

    # 验证更新
    records2 = client.find_records_by_field(sheet_id, 'Trae Session ID', session_id)
    if records2:
        fields2 = client._parse_fields(records2[0])
        print(f'   ✅ 验证成功!')
        print(f'   不满意原因: {fields2.get("不满意原因")}')
    else:
        print(f'   ❌ 验证失败')

    # 测试写入 AI 审核意见
    print(f'\n3. 模拟写入「AI审核意见」')
    print("-" * 60)
    result3 = client.upsert_record_by_field(
        SHEET_NAME,
        'Trae Session ID',
        session_id,
        {'AI审核意见': '建议优化代码结构'}
    )
    print(f'   success: {result3.get("success")}')
    print(f'   is_new: {result3.get("is_new")}')

    # 最终验证
    print(f'\n4. 最终验证：查看完整记录')
    print("-" * 60)
    records_final = client.find_records_by_field(sheet_id, 'Trae Session ID', session_id)
    if records_final:
        fields_final = client._parse_fields(records_final[0])
        print(f'   Trae Session ID: {fields_final.get("Trae Session ID")}')
        print(f'   UID: {fields_final.get("UID")}')
        print(f'   不满意原因: {fields_final.get("不满意原因")}')
        print(f'   AI审核意见: {fields_final.get("AI审核意见")}')
        print(f'\n   ✅ 所有测试通过!')
    else:
        print(f'   ❌ 最终验证失败')


if __name__ == '__main__':
    main()

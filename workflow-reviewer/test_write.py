#!/usr/bin/env python3
"""测试 WPS 多维表格写入"""

import json
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path('.env'))

from wps_dbt import WpsDbtClient

def main():
    client = WpsDbtClient(
        url='https://www.kdocs.cn/l/ct9Ka3fktD75?R=L1MvOA=='
    )

    print("正在测试写入 20260601(2) 工作表...")
    print()

    result = client.append_record_by_sheet_name(
        sheet_name='20260601(2)',
        fields={
            'UID': 'UID-20260608-TEST01',
            'User Prompt': '测试阶段描述内容',
            '不满意原因': '测试不满意原因内容',
            'AI审核意见': '测试下一轮prompt内容',
            'Trae Session ID': 'test-session-12345',
            'commit id': 'abc123def456',
        }
    )

    print('写入结果:')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print()

    if result.get('success'):
        print('✅ 写入成功！')
    else:
        print('❌ 写入失败:', result.get('error'))

if __name__ == '__main__':
    main()

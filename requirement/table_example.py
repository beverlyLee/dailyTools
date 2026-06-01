#!/usr/bin/env python3
"""
飞书文档表格操作示例
"""
import os
from dotenv import load_dotenv
from feishu_doc import FeishuDoc

load_dotenv()

APP_ID = os.getenv("FEISHU_APP_ID")
APP_SECRET = os.getenv("FEISHU_APP_SECRET")


def main():
    doc_url = "https://vigyevcxms.feishu.cn/docx/FFRcdEpHPoLbsxx9ZXUcL1xEnrd"
    
    client = FeishuDoc(APP_ID, APP_SECRET)
    
    print("=" * 60)
    print("1. 查看文档中所有表格")
    print("=" * 60)
    tables = client.get_all_tables(doc_url)
    print(f"找到 {len(tables)} 个表格")
    for idx, table in enumerate(tables):
        print(f"\n表格 {idx}: {table['rows']}行 x {table['cols']}列")
        print(f"  表头: {table['headers']}")
    
    if not tables:
        print("\n❌ 文档中没有表格，请先在文档中创建表格")
        return
    
    print("\n" + "=" * 60)
    print("2. 获取表格表头")
    print("=" * 60)
    headers = client.get_table_headers(doc_url, table_index=0)
    print(f"表头字段: {headers}")
    
    print("\n" + "=" * 60)
    print("3. 更新指定单元格（按行列号）")
    print("=" * 60)
    try:
        client.update_table_cell(doc_url, table_index=0, row=1, col=0, content="测试内容A")
        print("✅ 更新成功：第1行第0列")
    except Exception as e:
        print(f"❌ 更新失败: {e}")
    
    print("\n" + "=" * 60)
    print("4. 更新指定单元格（按字段名）")
    print("=" * 60)
    try:
        field_name = headers[0] if headers else ""
        if field_name:
            client.update_table_cell_by_field(doc_url, table_index=0, row=2, 
                                              field_name=field_name, content="测试内容B")
            print(f"✅ 更新成功：第2行字段 '{field_name}'")
    except Exception as e:
        print(f"❌ 更新失败: {e}")
    
    print("\n" + "=" * 60)
    print("5. 整行写入数据（按字段名）")
    print("=" * 60)
    try:
        row_data = {}
        for idx, header in enumerate(headers[:3]):
            row_data[header] = f"字段{idx + 1}的值"
        
        client.update_table_row(doc_url, table_index=0, row=3, row_data=row_data)
        print(f"✅ 整行更新成功：第3行")
        print(f"   写入数据: {row_data}")
    except Exception as e:
        print(f"❌ 更新失败: {e}")
    
    print("\n" + "=" * 60)
    print("6. 整行写入数据（按顺序）")
    print("=" * 60)
    try:
        values = ["顺序值1", "顺序值2", "顺序值3"]
        client.update_table_row_by_list(doc_url, table_index=0, row=4, values=values)
        print(f"✅ 整行更新成功：第4行")
        print(f"   写入数据: {values}")
    except Exception as e:
        print(f"❌ 更新失败: {e}")
    
    print("\n" + "=" * 60)
    print("✅ 所有示例操作完成！")
    print("=" * 60)


if __name__ == "__main__":
    main()

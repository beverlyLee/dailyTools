#!/usr/bin/env python3
"""
飞书文档追加轮次脚本
向文档末尾追加新的轮次（小标题+固定结构表格）
"""
import os
import sys
import argparse
from dotenv import load_dotenv
from feishu_doc import FeishuDoc

load_dotenv()

APP_ID = os.getenv("FEISHU_APP_ID")
APP_SECRET = os.getenv("FEISHU_APP_SECRET")

DOC_URL = "https://vigyevcxms.feishu.cn/docx/FFRcdEpHPoLbsxx9ZXUcL1xEnrd"

HEADERS = ["本轮id", "prompt", "不满意原因（满意了就不写）", "git地址", "分支", "截图（产物/运行结果/对话）", "日志轨迹"]


def append_new_round_with_data(doc_id: str, round_data: dict = None) -> int:
    """
    追加新轮次，并可填充数据
    """
    client = FeishuDoc(APP_ID, APP_SECRET)
    
    last_round = client.find_last_round_number(doc_id)
    new_round = last_round + 1
    
    print(f"📊 当前最后一轮: 第{last_round}轮")
    print(f"🔄 即将追加: 第{new_round}轮")
    
    client.insert_heading_at_end(doc_id, f"第{new_round}轮", level=2)
    client.insert_paragraph_at_end(doc_id, "")
    
    tables_before = client.get_all_tables(doc_id)
    table_count_before = len(tables_before)
    
    client.create_table(doc_id, rows=2, cols=7, headers=HEADERS)
    
    if round_data:
        tables = client.get_all_tables(doc_id)
        new_table_index = len(tables) - 1
        
        row_values = []
        for header in HEADERS:
            row_values.append(round_data.get(header, ""))
        
        client.update_table_row_by_list(doc_id, new_table_index, 1, row_values)
        print(f"✅ 已填充表格数据")
    
    print(f"\n✅ 成功追加第{new_round}轮！")
    print(f"   包含标题和{len(HEADERS)}列表格")
    
    return new_round


def main():
    parser = argparse.ArgumentParser(
        description="飞书文档追加轮次脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
表格列顺序：
  1. 本轮id
  2. prompt
  3. 不满意原因（满意了就不写）
  4. git地址
  5. 分支
  6. 截图（产物/运行结果/对话）
  7. 日志轨迹

示例用法：
  # 仅追加空的轮次（标题+空表格）
  python append_round.py
  
  # 按列顺序传参（推荐方式）
  python append_round.py "001" "需求描述" "" "https://github.com/xxx" "main"
  
  # 命名参数方式（精确控制）
  python append_round.py --id "001" --prompt "需求描述" --git "https://github.com/xxx" --branch "main"
        """
    )
    
    parser.add_argument("values", nargs="*", help="按列顺序传值（最多7个），空值用空字符串")
    parser.add_argument("--id", help="本轮id")
    parser.add_argument("--prompt", help="prompt内容")
    parser.add_argument("--reason", help="不满意原因（满意了就不写）")
    parser.add_argument("--git", help="git地址")
    parser.add_argument("--branch", help="分支")
    parser.add_argument("--screenshot", help="截图（产物/运行结果/对话）")
    parser.add_argument("--log", help="日志轨迹")
    
    args = parser.parse_args()
    
    if args.values and len(args.values) > len(HEADERS):
        print(f"⚠️  最多支持 {len(HEADERS)} 个参数，多余的将被忽略")
        args.values = args.values[:len(HEADERS)]
    
    if not APP_ID or not APP_SECRET:
        print("❌ 请在 .env 中配置 FEISHU_APP_ID / FEISHU_APP_SECRET")
        sys.exit(1)
    
    print("=" * 60)
    print("飞书文档追加轮次脚本")
    print("=" * 60)
    print(f"📄 文档地址: {DOC_URL}")
    print()
    
    round_data = {}
    
    if args.values:
        print(f"📋 位置参数模式: 传入了 {len(args.values)} 个值")
        for idx, value in enumerate(args.values):
            if idx < len(HEADERS):
                round_data[HEADERS[idx]] = value
                print(f"   列{idx+1} [{HEADERS[idx]}]: {value if value else '(空)'}")
        print()
    
    named_params = {}
    if args.id:
        named_params["本轮id"] = args.id
    if args.prompt:
        named_params["prompt"] = args.prompt
    if args.reason:
        named_params["不满意原因（满意了就不写）"] = args.reason
    if args.git:
        named_params["git地址"] = args.git
    if args.branch:
        named_params["分支"] = args.branch
    if args.screenshot:
        named_params["截图（产物/运行结果/对话）"] = args.screenshot
    if args.log:
        named_params["日志轨迹"] = args.log
    
    if named_params:
        print("📋 命名参数模式（覆盖模式）:")
        for k, v in named_params.items():
            round_data[k] = v
            print(f"   {k}: {v}")
        print()
    
    if round_data:
        print("📝 最终填充的数据:")
        for k, v in round_data.items():
            print(f"   {k}: {v if v else '(空)'}")
        print()
    else:
        print("📝 仅追加空表格，不填充数据")
        print()
    
    try:
        new_round = append_new_round_with_data(DOC_URL, round_data if round_data else None)
        
        print()
        print("=" * 60)
        print(f"🎉 完成！已追加第{new_round}轮到文档末尾")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ 执行出错: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""飞书文档读写工具 - 支持全文档和分区级别的读写操作"""

import argparse
import json
import subprocess
import sys
import re
import tempfile
import os


def strip_ansi(text: str) -> str:
    """去除 ANSI 颜色/转义码"""
    return re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', text)


def extract_json(text: str) -> dict:
    """从可能包含日志行的输出中提取 JSON 对象"""
    text = strip_ansi(text)
    # 找到最后一个顶层 JSON 对象
    idx = text.rfind('{')
    if idx == -1:
        return {"raw": text}
    # 用括号平衡找到完整 JSON
    depth = 0
    for i in range(idx, len(text)):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[idx:i + 1])
                except json.JSONDecodeError:
                    continue
    # 如果括号平衡失败，尝试从最后一个 { 到末尾
    try:
        return json.loads(text[idx:])
    except json.JSONDecodeError:
        return {"raw": text}


def run_feishu_cmd(args: list[str]) -> dict:
    """执行 feishu CLI 命令并返回 JSON 结果"""
    cmd = ["feishu"] + args
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    output = result.stdout
    if result.returncode != 0:
        parsed = extract_json(output)
        if "error" in parsed:
            print(f"错误: {parsed['error']}", file=sys.stderr)
        else:
            print(f"命令执行失败: {result.stderr or output}", file=sys.stderr)
        sys.exit(1)
    return extract_json(output)


def fetch_doc(doc_id: str, offset: int = 0, limit: int = 5000) -> dict:
    """获取飞书文档内容"""
    return run_feishu_cmd(["doc", "fetch", doc_id, "--offset", str(offset), "--limit", str(limit)])


def resolve_wiki_token(token: str) -> dict:
    """解析 wiki token，获取实际文档类型和 token"""
    return run_feishu_cmd(["wiki", "node", "get", token])


def extract_sections(markdown: str) -> dict[str, str]:
    """从 Markdown 中按标题提取分区内容，支持 # 标题和文档首行作为分区"""
    sections = {}
    lines = markdown.split("\n")
    current_title = None
    current_lines: list[str] = []

    # 首行如果非空且不是标题，也作为一个分区（以首行内容为标题）
    first_nonempty = None
    for line in lines:
        if line.strip():
            first_nonempty = line.strip()
            break

    for line in lines:
        heading = re.match(r'^(#{1,6})\s+(.+)$', line)
        if heading:
            if current_title is not None:
                sections[current_title] = "\n".join(current_lines).strip()
            current_title = heading.group(2).strip()
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_title is not None:
        sections[current_title] = "\n".join(current_lines).strip()

    # 如果文档没有 # 标题但有内容，把首行作为分区名
    if not sections and first_nonempty:
        sections[first_nonempty] = markdown.strip()

    return sections


def normalize_doc_id(doc_id: str) -> str:
    """从 URL 中提取文档 token，或直接返回 token"""
    patterns = [
        r'feishu\.cn/docx/([A-Za-z0-9]+)',
        r'feishu\.cn/wiki/([A-Za-z0-9]+)',
        r'feishu\.cn/sheets/([A-Za-z0-9]+)',
    ]
    for p in patterns:
        m = re.search(p, doc_id)
        if m:
            return m.group(1)
    return doc_id


def cmd_read(args):
    """读取文档内容"""
    doc_id = normalize_doc_id(args.doc_id)

    # 如果是 wiki 链接，先解析实际类型
    if args.doc_id != doc_id and "wiki" in args.doc_id:
        info = resolve_wiki_token(doc_id)
        # wiki node 返回嵌套在 "node" 下
        node = info.get("node", info)
        obj_type = node.get("obj_type", "")
        obj_token = node.get("obj_token", "")
        if obj_type != "docx":
            print(f"该 wiki 节点类型为 {obj_type}，暂仅支持 docx 类型文档", file=sys.stderr)
            sys.exit(1)
        doc_id = obj_token

    result = fetch_doc(doc_id)
    content = result.get("content", result.get("markdown", ""))

    if args.section:
        sections = extract_sections(content)
        matched = None
        for title, body in sections.items():
            if args.section in title:
                matched = body
                break
        if matched is None:
            print(f"未找到包含 '{args.section}' 的分区", file=sys.stderr)
            available = list(sections.keys())
            if available:
                print(f"可用分区: {', '.join(available)}", file=sys.stderr)
            sys.exit(1)
        if args.json_output:
            print(json.dumps({"section": args.section, "content": matched}, ensure_ascii=False, indent=2))
        else:
            print(matched)
    else:
        if args.json_output:
            print(json.dumps({"doc_id": doc_id, "content": content}, ensure_ascii=False, indent=2))
        else:
            print(content)


def cmd_sections(args):
    """列出文档的所有分区（标题）"""
    doc_id = normalize_doc_id(args.doc_id)

    if args.doc_id != doc_id and "wiki" in args.doc_id:
        info = resolve_wiki_token(doc_id)
        node = info.get("node", info)
        obj_type = node.get("obj_type", "")
        obj_token = node.get("obj_token", "")
        if obj_type != "docx":
            print(f"该 wiki 节点类型为 {obj_type}，暂仅支持 docx 类型文档", file=sys.stderr)
            sys.exit(1)
        doc_id = obj_token

    result = fetch_doc(doc_id)
    content = result.get("content", result.get("markdown", ""))
    sections = extract_sections(content)

    if not sections:
        print("文档中没有找到标题分区")
        return

    if args.json_output:
        print(json.dumps({"sections": list(sections.keys())}, ensure_ascii=False, indent=2))
    else:
        for i, title in enumerate(sections.keys(), 1):
            print(f"  {i}. {title}")


def cmd_create(args):
    """创建新文档"""
    content = args.content
    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            content = f.read()

    if not content:
        print("错误: 必须提供 --content 或 --file", file=sys.stderr)
        sys.exit(1)

    cmd_args = ["doc", "create", "--title", args.title, "--content", content]
    if args.folder_token:
        cmd_args += ["--folder_token", args.folder_token]
    if args.wiki_space:
        cmd_args += ["--wiki_space", args.wiki_space]

    result = run_feishu_cmd(cmd_args)
    if args.json_output:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        doc_id = result.get("doc_id", "")
        doc_url = result.get("doc_url", "")
        print(f"文档创建成功!")
        if doc_url:
            print(f"  链接: {doc_url}")
        elif doc_id:
            print(f"  ID: {doc_id}")


def cmd_write(args):
    """写入/更新文档内容"""
    doc_id = normalize_doc_id(args.doc_id)
    content = args.content
    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            content = f.read()

    if not content and args.mode != "delete_range":
        print("错误: 必须提供 --content 或 --file", file=sys.stderr)
        sys.exit(1)

    mode_map = {
        "overwrite": "overwrite",
        "append": "append",
        "replace": "replace_range",
        "replace_all": "replace_all",
        "insert_before": "insert_before",
        "insert_after": "insert_after",
        "delete": "delete_range",
    }
    mode = mode_map.get(args.mode)
    if not mode:
        print(f"错误: 不支持的模式 '{args.mode}'", file=sys.stderr)
        sys.exit(1)

    cmd_args = ["doc", "update", "--token", doc_id, "--mode", mode]

    if content:
        cmd_args += ["--content", content]

    # 定位方式
    if args.section:
        cmd_args += ["--selection_by_title", args.section]
    elif args.selection:
        cmd_args += ["--selection", args.selection]

    if args.new_title:
        cmd_args += ["--new_title", args.new_title]

    result = run_feishu_cmd(cmd_args)
    if args.json_output:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        if result.get("success"):
            print(f"文档更新成功! 模式: {args.mode}")
        elif result.get("task_id"):
            print(f"更新已提交异步处理, task_id: {result['task_id']}")
        else:
            msg = result.get("message", "")
            if msg:
                print(msg)
            else:
                print(json.dumps(result, ensure_ascii=False, indent=2))


def cmd_batch_write(args):
    """批量分区写入：通过 JSON 配置文件对多个分区进行更新"""
    with open(args.config, "r", encoding="utf-8") as f:
        ops = json.load(f)

    doc_id = normalize_doc_id(args.doc_id)
    results = []

    for i, op in enumerate(ops):
        mode = op.get("mode", "replace")
        section = op.get("section")
        content = op.get("content", "")
        selection = op.get("selection")

        mode_map = {
            "overwrite": "overwrite",
            "append": "append",
            "replace": "replace_range",
            "replace_all": "replace_all",
            "insert_before": "insert_before",
            "insert_after": "insert_after",
            "delete": "delete_range",
        }
        api_mode = mode_map.get(mode)
        if not api_mode:
            results.append({"index": i, "error": f"不支持的模式 '{mode}'"})
            continue

        cmd_args = ["doc", "update", "--token", doc_id, "--mode", api_mode]
        if content:
            cmd_args += ["--content", content]
        if section:
            cmd_args += ["--selection_by_title", section]
        elif selection:
            cmd_args += ["--selection", selection]

        result = run_feishu_cmd(cmd_args)
        result["_index"] = i
        result["_mode"] = mode
        result["_section"] = section
        results.append(result)

    if args.json_output:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        for r in results:
            idx = r.get("_index", "?")
            mode = r.get("_mode", "?")
            section = r.get("_section", "")
            ok = r.get("success", False)
            status = "✓" if ok else "✗"
            label = f"分区 '{section}'" if section else f"操作 {idx}"
            print(f"  {status} [{mode}] {label}")


def main():
    parser = argparse.ArgumentParser(
        description="飞书文档读写工具 - 支持全文档和分区级别的读写操作",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  # 读取整个文档
  python feishu_doc.py read https://feishu.cn/docx/XXXXX

  # 读取指定分区
  python feishu_doc.py read https://feishu.cn/docx/XXXXX --section "功能说明"

  # 列出文档所有分区
  python feishu_doc.py sections https://feishu.cn/docx/XXXXX

  # 创建新文档
  python feishu_doc.py create --title "我的文档" --content "# Hello\\n\\n世界"
  python feishu_doc.py create --title "我的文档" --file ./content.md

  # 追加内容到文档末尾
  python feishu_doc.py write https://feishu.cn/docx/XXXXX --mode append --content "## 新章节\\n\\n追加内容"

  # 替换指定分区（按标题定位）
  python feishu_doc.py write https://feishu.cn/docx/XXXXX --mode replace --section "功能说明" --content "## 功能说明\\n\\n更新后的内容"

  # 在指定分区前/后插入内容
  python feishu_doc.py write https://feishu.cn/docx/XXXXX --mode insert_before --section "附录" --content "> 注意事项"
  python feishu_doc.py write https://feishu.cn/docx/XXXXX --mode insert_after --section "第一章" --content "## 补充说明"

  # 删除指定分区
  python feishu_doc.py write https://feishu.cn/docx/XXXXX --mode delete --section "废弃章节"

  # 全文替换
  python feishu_doc.py write https://feishu.cn/docx/XXXXX --mode replace_all --selection "旧词" --content "新词"

  # 用配置文件批量更新多个分区
  python feishu_doc.py batch-write https://feishu.cn/docx/XXXXX --config updates.json

  # updates.json 格式:
  [
    {"mode": "replace", "section": "第一章", "content": "## 第一章\\n\\n新内容"},
    {"mode": "insert_after", "section": "附录", "content": "## 新增"},
    {"mode": "delete", "section": "旧章节"}
  ]
        """,
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # --- read ---
    p_read = subparsers.add_parser("read", help="读取文档内容")
    p_read.add_argument("doc_id", help="文档 ID 或 URL")
    p_read.add_argument("--section", "-s", help="只读取指定分区（标题模糊匹配）")
    p_read.add_argument("--json", dest="json_output", action="store_true", help="以 JSON 格式输出")

    # --- sections ---
    p_sections = subparsers.add_parser("sections", help="列出文档的所有分区标题")
    p_sections.add_argument("doc_id", help="文档 ID 或 URL")
    p_sections.add_argument("--json", dest="json_output", action="store_true", help="以 JSON 格式输出")

    # --- create ---
    p_create = subparsers.add_parser("create", help="创建新文档")
    p_create.add_argument("--title", "-t", required=True, help="文档标题")
    p_create.add_argument("--content", "-c", help="文档内容 (Markdown)")
    p_create.add_argument("--file", "-f", help="从文件读取 Markdown 内容")
    p_create.add_argument("--folder_token", help="父文件夹 token")
    p_create.add_argument("--wiki_space", help="知识空间 ID")
    p_create.add_argument("--json", dest="json_output", action="store_true", help="以 JSON 格式输出")

    # --- write ---
    p_write = subparsers.add_parser("write", help="写入/更新文档")
    p_write.add_argument("doc_id", help="文档 ID 或 URL")
    p_write.add_argument("--mode", "-m", default="append",
                         choices=["overwrite", "append", "replace", "replace_all", "insert_before", "insert_after", "delete"],
                         help="更新模式 (默认: append)")
    p_write.add_argument("--content", "-c", help="写入内容 (Markdown)")
    p_write.add_argument("--file", "-f", help="从文件读取 Markdown 内容")
    p_write.add_argument("--section", "-s", help="目标分区标题（用于 replace/insert/delete 模式）")
    p_write.add_argument("--selection", help="内容定位范围 (格式: '开头...结尾')")
    p_write.add_argument("--new_title", help="同时更新文档标题")
    p_write.add_argument("--json", dest="json_output", action="store_true", help="以 JSON 格式输出")

    # --- batch-write ---
    p_batch = subparsers.add_parser("batch-write", help="批量分区写入")
    p_batch.add_argument("doc_id", help="文档 ID 或 URL")
    p_batch.add_argument("--config", required=True, help="批量操作 JSON 配置文件")
    p_batch.add_argument("--json", dest="json_output", action="store_true", help="以 JSON 格式输出")

    args = parser.parse_args()

    cmd_map = {
        "read": cmd_read,
        "sections": cmd_sections,
        "create": cmd_create,
        "write": cmd_write,
        "batch-write": cmd_batch_write,
    }
    cmd_map[args.command](args)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
下一轮 Prompt 提取精简脚本

从包含"下一轮 Prompt"和"任务N"格式的文本中，
提取每个任务的"修正"部分内容，压缩成一段话。

用法:
  python extract_next_prompt.py -i input.txt
  python extract_next_prompt.py -t "原始文本..."
  python extract_next_prompt.py -i input.txt -o out.txt
  echo "文本..." | python extract_next_prompt.py
"""

import argparse
import re
import sys


def extract_prompt_section(text):
    """提取下一轮 Prompt 部分的内容"""
    patterns = [
        r'[#\s]*【下一轮\s*Prompt】',
        r'[#\s]*下一轮\s*Prompt',
        r'[#\s]*下一轮\s*prompt',
    ]

    start_idx = None
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            start_idx = match.end()
            break

    if start_idx is None:
        return text

    return text[start_idx:].strip()


def extract_tasks(text):
    """从文本中提取所有任务

    返回: [(任务标题, 修正内容), ...]
    """
    tasks = []

    task_pattern = r'(?:^|\n)\s*任务\s*(\d+)\s*[：:]\s*(.+?)(?=\n\s*任务\s*\d+\s*[：:]|\Z)'
    matches = re.findall(task_pattern, text, re.DOTALL)

    for task_num, task_content in matches:
        title = ''
        fix_content = ''

        lines = task_content.strip().split('\n')
        title = lines[0].strip() if lines else ''

        fix_match = re.search(r'(?:^|\n)\s*[-*]\s*修正\s*[：:]\s*(.+?)(?=\n\s*[-*]\s*[\u4e00-\u9fa5]+\s*[：:]|\Z)', task_content, re.DOTALL)
        if fix_match:
            fix_content = fix_match.group(1).strip()

        if title and fix_content:
            tasks.append((title, fix_content))

    return tasks


def clean_text(text):
    """清理文本：去掉括号补充、特殊符号、口语化内容"""
    result = text

    result = re.sub(r'（[^）]*）', '', result)
    result = re.sub(r'\([^)]*\)', '', result)

    result = re.sub(r'[「」【】《》]', '', result)

    result = re.sub(r'\s+', ' ', result)

    result = re.sub(r'，+', '，', result)
    result = re.sub(r'。+', '。', result)
    result = re.sub(r'，。', '。', result)
    result = re.sub(r'，\s*，+', '，', result)

    remove_phrases = [
        '别漏项',
        '别遗漏',
        '白做',
        '等于没做',
        '等于白做',
    ]
    for phrase in remove_phrases:
        result = result.replace(phrase, '')

    result = result.strip('，、。 ')

    return result.strip()


def compress_prompt(raw_text):
    """提取并精简下一轮 Prompt

    Args:
        raw_text: 原始文本，包含下一轮 Prompt 和多个任务

    Returns:
        精简后的 prompt 文本
    """
    prompt_text = extract_prompt_section(raw_text)
    tasks = extract_tasks(prompt_text)

    if not tasks:
        return ''

    parts = []
    for i, (title, fix_content) in enumerate(tasks, 1):
        clean_title = clean_text(title)
        clean_fix = clean_text(fix_content)

        if clean_title and clean_fix:
            if not clean_fix.endswith('。'):
                clean_fix += '。'
            parts.append(f'{i}.{clean_title}：{clean_fix}')

    if not parts:
        return ''

    result = '优化系统实现：' + ''.join(parts)

    result = re.sub(r'。+', '。', result)

    return result


def main():
    parser = argparse.ArgumentParser(
        description='下一轮 Prompt 提取精简工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python extract_next_prompt.py -i input.txt
  python extract_next_prompt.py -t "下一轮 Prompt...任务1：..."
  python extract_next_prompt.py -i input.txt -o output.txt
  cat input.txt | python extract_next_prompt.py
        """
    )
    parser.add_argument('-i', '--input', help='输入文件路径')
    parser.add_argument('-t', '--text', help='直接输入原始文本')
    parser.add_argument('-o', '--output', help='输出文件路径（默认输出到控制台）')

    args = parser.parse_args()

    if args.text:
        raw_text = args.text
    elif args.input:
        try:
            with open(args.input, 'r', encoding='utf-8') as f:
                raw_text = f.read()
        except FileNotFoundError:
            print(f'错误：找不到文件 {args.input}', file=sys.stderr)
            sys.exit(1)
    elif not sys.stdin.isatty():
        raw_text = sys.stdin.read()
    else:
        parser.print_help()
        sys.exit(1)

    result = compress_prompt(raw_text)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(result)
        print(f'✅ 已保存到 {args.output}')
    else:
        print(result)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
不满意原因提取精简脚本

从包含"产物不满意"和"过程不满意"的原始文本中，
提取并精简内容，去掉"期望"、"原因分析"等无关句子，
输出压缩后的两段话。

用法:
  python extract_dissatisfy.py -i input.txt          # 从文件读取
  python extract_dissatisfy.py -t "原始文本..."       # 直接传文本
  python extract_dissatisfy.py -i input.txt -o out.txt # 输出到文件
  echo "文本..." | python extract_dissatisfy.py       # 管道输入
"""

import argparse
import re
import sys


def extract_section(text, markers):
    """根据标记提取对应段落的内容"""
    section = []
    found = False

    all_markers = ['产物不满意', '产品不满意', '产出不满意', '过程不满意']

    for line in text.split('\n'):
        stripped = line.strip()

        is_marker = False
        for marker in markers:
            if stripped.startswith(marker):
                is_marker = True
                found = True
                rest = stripped[len(marker):]
                rest = re.sub(r'^[：: \u3000]+', '', rest)
                if rest:
                    section.append(rest)
                break

        if not is_marker and found:
            is_other_section = False
            for m in all_markers:
                if stripped.startswith(m):
                    is_other_section = True
                    break
            if is_other_section:
                break
            section.append(line)

    return '\n'.join(section).strip()


def process_section(text):
    """处理单个段落：过滤无关句子、压缩成一段话"""
    if not text:
        return ''

    lines = [l.strip() for l in text.split('\n') if l.strip()]
    text = ' '.join(lines)
    text = re.sub(r'\s+', ' ', text)

    filter_prefixes = [
        '期望',
        '原因分析',
        '分析',
        '预期',
        '希望',
        '建议',
        '改进建议',
        '产物不满意',
        '产品不满意',
        '产出不满意',
        '过程不满意',
    ]

    for prefix in filter_prefixes:
        pattern = prefix + r'[：:][^。]*。'
        text = re.sub(pattern, '', text)

    sentences = re.split(r'(?<=。)', text)
    filtered = []
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        skip = False
        for prefix in filter_prefixes:
            if sentence.startswith(prefix):
                skip = True
                break
        if not skip:
            filtered.append(sentence)

    result = ''.join(filtered)

    result = re.sub(r'([1-9]\d*)[.、．]\s*', r'\1. ', result)
    result = re.sub(r'。\s*([1-9]\d*)[.、．]', r'。\1.', result)

    return result.strip()


def extract_dissatisfy(raw_text):
    """提取并精简不满意原因

    Args:
        raw_text: 原始文本，包含"产物不满意"和"过程不满意"段落

    Returns:
        处理后的文本，两行：产物不满意、过程不满意
    """
    product_text = extract_section(raw_text, ['产物不满意', '产品不满意', '产出不满意'])
    process_text = extract_section(raw_text, ['过程不满意'])

    product_result = process_section(product_text)
    process_result = process_section(process_text)

    lines = []
    if product_result:
        lines.append('产物不满意：' + product_result)
    if process_result:
        lines.append('过程不满意：' + process_result)

    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(
        description='不满意原因提取精简工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python extract_dissatisfy.py -i input.txt
  python extract_dissatisfy.py -t "产物不满意：...过程不满意：..."
  python extract_dissatisfy.py -i input.txt -o output.txt
  cat input.txt | python extract_dissatisfy.py
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

    result = extract_dissatisfy(raw_text)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(result)
        print(f'✅ 已保存到 {args.output}')
    else:
        print(result)


if __name__ == '__main__':
    main()

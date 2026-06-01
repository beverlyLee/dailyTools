#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import sys
import os
import re
from datetime import datetime


def extract_project_by_num(file_path, num):
    """从需求文档中提取第num个项目的信息"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = rf'## {num}\.\s+([^\n]+)\n(.*?)(?=\n## |$)'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        raise ValueError(f"未找到第 {num} 个项目")
    
    project_name = match.group(1).strip()
    project_content = match.group(2).strip()
    
    name_match = re.search(r'\*\s+\*\*项目名称：\*\*\s+`([^`]+)`', project_content)
    folder_name = name_match.group(1) if name_match else project_name
    
    prompt_match = re.search(r'\*\s+\*\*Prompt：\*\*\s*(.*?)(?=\n\*|$)', project_content, re.DOTALL)
    prompt_content = prompt_match.group(1).strip() if prompt_match else project_content
    
    return {
        'num': num,
        'project_name': project_name,
        'folder_name': folder_name,
        'prompt_content': prompt_content
    }


def get_next_round_number(output_path, project_identifier):
    """获取下一个轮次编号"""
    if not os.path.exists(output_path):
        return 1
    
    with open(output_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 查找该项目已有的记录数
    pattern = re.escape(project_identifier) + r'.*第(\d+)轮'
    matches = re.findall(pattern, content)
    
    if matches:
        return max(int(m) for m in matches) + 1
    return 1


def generate_test_prompt(project_name, first_round_prompt, current_round_prompt, current_progress):
    """生成测试验收prompt"""
    process_content = current_progress if current_progress else '暂无过程记录'
    
    filtered_lines = []
    for line in process_content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('toolName'):
            continue
        if stripped.startswith('status'):
            continue
        if stripped.startswith('Todos updated'):
            continue
        if stripped.startswith('filePath'):
            continue
        if stripped.startswith('changes'):
            continue
        if stripped.startswith('/') and len(stripped) > 1 and not stripped.startswith('//'):
            continue
        if stripped:
            filtered_lines.append(line)
    
    process_content = '\n'.join(filtered_lines).strip()
    if not process_content:
        process_content = '暂无过程记录'
    prompt = f"""你是一位严格的人工测试员，你需要帮我用浏览器访问下指定工程文件夹下的工程，启动工程并替我点击浏览器；需要完成的工作是：
1.启动起来工程
2.然后按照功能顺序点击浏览器，可以用playwright的mcp。
3.如发现功能问题则记录下来，说明报错的位置(发现问题的时候截图有问题的地方，说明报错的位置，保存在：工程文件夹/img下面)。
4.如遇到前后端启动报错、控制台报错等情况也要反馈，而且要保留报错输出的报错堆栈和具体报错内容。启动错误则直接退出生成测试报告就行，不要改代码。
5.你只是一个测试人员，切记不要改动代码，不要改动代码。
6.最后统一给我一份测试报告。
7.负责验收的产出物。你必须仅通过视觉和逻辑判断结果是否符合需求，输出以下三个标准产物：

### 【验收结论】
- 格式是包括两个部分：
  -- 产物不满意：完成了XXX工作(上轮提示词中要求的)，但是XXX问题没有解决/新发现xxx问题，如果有任何的问题都是产物不满意，要是符合本轮和第一轮的需求且没有新问题产生，才能算满意。
  -- 过程不满意：看下我给你的过程里面是否有不完整的地方，对照过程和当前工程状态，判断是否有问题，是什么问题，如果过程核对后完全无问题才能说过程满意。
- 需要按照产物不满意的要求完成填写。必须要写上过程不满意的原因。
- 过程不满意中要针对本轮模型产物和交付结果不达标的情况进行反馈，不要存在元评价口吻，满足过程满意度判断要求。

### 【归因诊断】
- 形式：分点列举当前存在的逻辑/视觉问题
- 规则：
  - 由果溯因：基于截图现象反推可能的逻辑漏洞
  - 层层递进：比上一轮挖掘得更深
  - 去代码化：不讲具体API，讲逻辑（如：空间计算错误、状态同步延迟、抗锯齿失效）

### 【下一轮 Prompt (~220字)】
- 形式：给 AI 编程助手的整改指令
- Vibe Coding 风格：强调 Why（目的）和 What（效果），弱化 How（具体代码）
- 结构清晰：
需要完成的任有：：
任务1...
任务2...
任务3...
...
（每个任务可以包含以下内容，prompt里面不能有本轮、第一轮、上一轮等模型相关和任务相关关键词，并且尽量模仿人的vibe coding风格：
  1. 否定：明确指出要废弃或规避的错误路径
  2. 修正：给出具体的逻辑调整方向或算法建议，如果需要改正报错，则保留报错具体内容，如：需要修复XXX报错，具体是：<具体报错内容>，如果验收结论中有报错，则本轮提示词必须有修复...报错：<具体报错内容>
  3. 锚定：描述期望达到的视觉效果或性能指标。）

产物不满意填写逻辑-不满意理由填写要求：
不满意理由不能只写"无法运行、页面打不开、问题没修复、接口失败"等笼统结论，必须说明具体问题点。
每一轮必须对本轮的结果进行评价，说明完成了哪些，再说没完成的，以第一轮为基准，本轮完成了但对于之前的轮次提出的功能没有完成的，可算做产物不满意。

合格的不满意理由应至少包含以下要素中的 两项及以上：
- 范围/对象
    问题发生在哪里：页面/路由、接口、功能模块、文件、命令、构建目标、运行环境、平台等。
- 现象/证据
    实际发生了什么：页面表现、报错信息、日志、编译错误、HTTP 状态码、操作步骤、复现结果等。
- 与需求的偏差
    相比第一轮主需求及有效迭代要求，缺了什么、错在哪里、期望是什么、实际是什么。
- 影响范围
    问题影响了哪些核心流程或功能：登录、下单、提交、跳转、数据展示、游戏流程、服务启动等。
- 复现条件
    在什么条件下出现：使用的账号、输入数据、浏览器/设备、运行命令、环境版本、特定操作路径等。
- 严重程度
    问题是阻塞主流程、部分功能异常、体验问题，还是边界场景问题。
- 不合格写法
以下写法过于简单，不能作为合格的不满意理由：
 产物不满意：无法启动
 产物不满意：系统登录不了
 产物不满意：网页无法打开
 产物不满意：项目编译出错
 产物不满意：服务不可用
 产物不满意：问题没有修复
 产物不满意：接口访问失败
 产物不满意：长时间无输出
 产物不满意：按 Z 依旧会闪退

问题在于：只写了结论，没有说明哪里出问题、有什么证据、与需求差在哪里。

-如果用户建议里面有写入报错具体内容则保留报错具体内容，则不满意理由中必须说明是前端/后端/页面报错具体内容，如果截图中有报错具体内容，则提取关键的几条报错写入，而下一轮prompt中也要保留并有修复这个报错的内容(比如：报错代码、报错行等关键信息)。

过程满意判定维度：
1. 需求理解与对齐
- 是否正确理解 user_prompt 意图
- 是否有明显跑题、误解、无关展开

2. 过程规划与推进效率
- 是否有清晰推进步骤
- 是否出现无效循环、重复尝试、明显拖沓
- 轮内行动是否与目标相关

3. 工具使用与故障处理
- 工具调用是否必要且顺序合理
- 失败后是否有有效回退/替代方案
- 对环境故障是否做了合理说明（不可把纯环境故障直接算模型过程差）

4. 沟通体验
- 是否及时反馈关键进展
- 是否在关键不确定点进行必要澄清
- 语气是否自然、不过度模板化

过程不满意判定建议：
出现以下任一情况可判“不满意”：
- 明显误解需求且未自我纠正
- 多次无效重复操作，缺少收敛
- 工具使用混乱导致过程冗长
- 关键失败无解释、无替代路径
- 沟通缺失导致用户无法判断进展

指定工程名是：{project_name}

第一轮的prompt是：
{first_round_prompt}

本轮的prompt是：
{current_round_prompt}

本轮的过程内容是：
{process_content}
"""
    lines = prompt.split('\n')
    non_empty_lines = [line for line in lines if line.strip()]
    return '\n'.join(non_empty_lines)


def main():
    default_output = os.path.join(os.path.dirname(__file__), 'requirement', '需求文档', '验收提示词.md')
    default_requirement_file = os.path.join(os.path.dirname(__file__), 'requirement', '需求文档', '20个全栈应用.md')
    
    parser = argparse.ArgumentParser(description='生成测试提示脚本')
    
    # 方式1：从需求文档读取
    parser.add_argument('--num', type=int, help='项目编号（从需求文档中读取，使用此参数则不需要-n和-f）')
    
    # 方式2：手动输入
    parser.add_argument('-n', '--name', help='工程名称')
    parser.add_argument('-f', '--first', help='第一轮提示词')
    
    parser.add_argument('-c', '--current', required=True, help='本轮提示词')
    parser.add_argument('-pr', '--progress', default='', help='本轮过程内容')
    parser.add_argument('--file', default=default_requirement_file, help=f'需求文档路径（默认：{default_requirement_file}）')
    parser.add_argument('-o', '--output', default=default_output, help=f'输出文件路径（默认：{default_output}）')
    parser.add_argument('-p', '--print', action='store_true', help='同时打印到控制台')

    args = parser.parse_args()
    
    # 参数校验
    if args.num is None and (args.name is None or args.first is None):
        print("错误：必须指定 --num，或者同时指定 -n/--name 和 -f/--first")
        print("\n示例1（从文档读取）：")
        print("  python3 generate_test_prompt.py --num 20 -c \"修复bug\" -pr \"修复了登录功能\"")
        print("\n示例2（手动输入）：")
        print("  python3 generate_test_prompt.py -n \"二手房监控系统\" -f \"创建Web应用\" -c \"修复bug\" -pr \"实现了用户登录功能\"")
        sys.exit(1)
    
    # 获取项目信息
    if args.num is not None:
        try:
            project_info = extract_project_by_num(args.file, args.num)
            project_name = project_info['folder_name']
            first_round_prompt = project_info['prompt_content']
            project_identifier = f"项目{args.num}-{project_info['folder_name']}"
            round_number = get_next_round_number(args.output, project_identifier)
            project_label = f"项目{args.num}-{project_info['folder_name']} - 第{round_number}轮"
        except Exception as e:
            print(f"错误：{e}")
            sys.exit(1)
    else:
        project_name = args.name
        first_round_prompt = args.first
        project_identifier = project_name
        round_number = get_next_round_number(args.output, project_identifier)
        project_label = f"{project_name} - 第{round_number}轮"

    result = generate_test_prompt(project_name, first_round_prompt, args.current, args.progress)
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    separator = '\n' + '='*80 + '\n'
    content_with_header = f"\n{separator}【生成时间】{timestamp} | 【项目】{project_label}\n{separator}\n{result}\n"
    
    output_path = args.output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'a', encoding='utf-8') as f:
        f.write(content_with_header)
    
    print(f"测试提示已追加到: {output_path}")
    print(f"项目: {project_label}")
    
    if args.print:
        print(f"\n{content_with_header}")


if __name__ == '__main__':
    main()

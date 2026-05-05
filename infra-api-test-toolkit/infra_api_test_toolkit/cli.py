"""
基础设施与 API 测试工具集主命令行入口
"""

import click
import json
import os
import sys
from typing import Optional
from dataclasses import asdict

from . import __version__
from .iac_audit.scanner import IaCScanner, Severity, Violation, ScanResult
from .iac_audit.llm_helper import LLMHelper
from .iac_audit.cost_estimator import CostEstimator, CostUnit
from .api_contract.spec_parser import OpenAPIParser, APISpec
from .api_contract.test_generator import TestGenerator
from .api_contract.validator import ResponseValidator
from .api_contract.contract_drift import ContractDriftDetector
from .api_contract.mock_server import MockAPIServer, MockResponse


CONTEXT_SETTINGS = dict(help_option_names=['-h', '--help'])


@click.group(context_settings=CONTEXT_SETTINGS)
@click.version_option(__version__, '-v', '--version')
def main():
    """
    基础设施与 API 测试工具集 (Infra & API Test Toolkit)
    
    提供以下核心功能：
    \b
    1. 智能基础设施即代码 (IaC) 审计
       - 扫描 IaC 文件中的安全合规性问题
       - 检查资源配额和成本估算
       - 利用 LLM 解释违规原因并提供修复代码
       - 支持自定义审计策略
    \b
    2. 智能 API 契约测试
       - 根据 OpenAPI 规范自动生成测试用例
       - 验证 API 实际响应是否符合契约定义
       - 检测契约漂移（Contract Drift）
       - 支持模拟（Mock）API 响应以进行前端并行开发
    """
    pass


@main.group('iac', short_help='基础设施即代码 (IaC) 审计工具')
def iac_group():
    """
    基础设施即代码 (IaC) 审计工具
    
    支持扫描 Terraform、CloudFormation、Kubernetes YAML 等格式的 IaC 文件，
    检测安全合规性问题，估算资源成本，并提供修复建议。
    """
    pass


@iac_group.command('scan', short_help='扫描 IaC 文件')
@click.argument('path', type=click.Path(exists=True))
@click.option('--output', '-o', type=click.Path(), help='输出文件路径')
@click.option('--format', '-f', type=click.Choice(['text', 'json', 'markdown']), default='text', help='输出格式')
@click.option('--severity', '-s', type=click.Choice(['critical', 'high', 'medium', 'low', 'all']), default='all', help='过滤严重程度')
@click.option('--custom-policy', '-p', type=click.Path(exists=True), help='自定义策略文件路径')
@click.option('--recursive/--no-recursive', default=True, help='是否递归扫描子目录')
def iac_scan(path, output, format, severity, custom_policy, recursive):
    """
    扫描 IaC 文件中的安全合规性问题
    
    PATH: 要扫描的文件或目录路径
    
    支持的文件格式：
    - Terraform (.tf, .tf.json)
    - CloudFormation (.cf.json, .cf.yaml, .cf.yml)
    - Kubernetes YAML (.yaml, .yml)
    - JSON 文件 (.json)
    """
    scanner = IaCScanner(custom_policies=custom_policy)
    
    if os.path.isfile(path):
        results = [scanner.scan_file(path)]
    else:
        results = scanner.scan_directory(path, recursive=recursive)
    
    all_violations = []
    for result in results:
        all_violations.extend(result.violations)
    
    if severity != 'all':
        severity_levels = {
            'critical': [Severity.CRITICAL],
            'high': [Severity.CRITICAL, Severity.HIGH],
            'medium': [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM],
            'low': [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW],
        }
        allowed_severities = severity_levels.get(severity, [])
        all_violations = [v for v in all_violations if v.severity in allowed_severities]
    
    output_content = _format_iac_scan_results(results, all_violations, format)
    
    if output:
        with open(output, 'w', encoding='utf-8') as f:
            f.write(output_content)
        click.echo(f"结果已保存到: {output}")
    else:
        click.echo(output_content)


@iac_group.command('explain', short_help='使用 LLM 解释违规原因')
@click.argument('path', type=click.Path(exists=True))
@click.option('--rule-id', '-r', help='指定规则 ID')
@click.option('--api-key', help='OpenAI API 密钥 (也可通过 OPENAI_API_KEY 环境变量设置)')
@click.option('--model', default='gpt-4', help='使用的模型名称')
@click.option('--output', '-o', type=click.Path(), help='输出文件路径')
def iac_explain(path, rule_id, api_key, model, output):
    """
    使用 LLM 解释违规原因并提供修复代码片段
    
    PATH: 包含违规的 IaC 文件路径
    """
    scanner = IaCScanner()
    
    if os.path.isfile(path):
        results = [scanner.scan_file(path)]
    else:
        results = scanner.scan_directory(path)
    
    all_violations = []
    all_resources = {}
    
    for result in results:
        all_violations.extend(result.violations)
        for resource in result.resources:
            all_resources[resource.get('name', 'unknown')] = resource
    
    if rule_id:
        all_violations = [v for v in all_violations if v.rule_id == rule_id]
    
    if not all_violations:
        click.echo("未发现违规。")
        return
    
    llm_helper = LLMHelper(api_key=api_key, model=model)
    
    outputs = []
    
    for violation in all_violations:
        resource_name = violation.resource_name
        resource_config = all_resources.get(resource_name, {}).get('config', {})
        
        violation_dict = {
            'rule_id': violation.rule_id,
            'severity': violation.severity.value,
            'message': violation.message,
            'resource_type': violation.resource_type,
            'resource_name': violation.resource_name,
        }
        
        file_type = 'terraform' if 'tf' in violation.file_path else 'yaml'
        
        response = llm_helper.explain_violation(violation_dict, resource_config, file_type)
        
        output = f"""
{'='*80}
规则 ID: {violation.rule_id}
严重程度: {violation.severity.value.upper()}
资源: {violation.resource_type} - {violation.resource_name}
文件: {violation.file_path}
{'='*80}

**违规消息:**
{violation.message}

**LLM 解释:**
{response.explanation}

"""
        if response.remediation_code:
            output += f"""**修复代码:**
```
{response.remediation_code}
```

"""
        
        if response.severity_assessment:
            output += f"""**严重程度评估:**
{response.severity_assessment}

"""
        
        if response.additional_context:
            output += f"""**额外建议:**
{response.additional_context}
"""
        
        outputs.append(output)
    
    final_output = '\n'.join(outputs)
    
    if output:
        with open(output, 'w', encoding='utf-8') as f:
            f.write(final_output)
        click.echo(f"结果已保存到: {output}")
    else:
        click.echo(final_output)


@iac_group.command('cost', short_help='估算 IaC 资源成本')
@click.argument('path', type=click.Path(exists=True))
@click.option('--unit', '-u', type=click.Choice(['hourly', 'daily', 'monthly', 'yearly']), default='monthly', help='成本单位')
@click.option('--output', '-o', type=click.Path(), help='输出文件路径')
@click.option('--format', '-f', type=click.Choice(['text', 'json']), default='text', help='输出格式')
@click.option('--show-savings/--no-savings', default=True, help='显示成本节省建议')
def iac_cost(path, unit, output, format, show_savings):
    """
    估算 IaC 文件中定义的资源成本
    
    PATH: IaC 文件或目录路径
    
    支持估算以下资源类型的成本：
    - EC2 实例
    - S3 存储桶
    - EBS 卷
    - RDS 实例/集群
    - Lambda 函数
    - DynamoDB 表
    - Kubernetes 资源
    """
    scanner = IaCScanner()
    
    if os.path.isfile(path):
        results = [scanner.scan_file(path)]
    else:
        results = scanner.scan_directory(path)
    
    all_resources = []
    for result in results:
        all_resources.extend(result.resources)
    
    if not all_resources:
        click.echo("未发现可估算成本的资源。")
        return
    
    cost_unit = CostUnit[unit.upper()]
    estimator = CostEstimator()
    
    result = estimator.estimate(all_resources, unit=cost_unit)
    
    if format == 'json':
        output_content = json.dumps({
            'total_estimated_cost': result.total_estimated_cost,
            'currency': result.currency,
            'unit': result.unit.value,
            'resource_costs': [
                {
                    'resource_type': rc.resource_type,
                    'resource_name': rc.resource_name,
                    'estimated_cost': rc.estimated_cost,
                    'breakdown': rc.breakdown,
                    'assumptions': rc.assumptions
                }
                for rc in result.resource_costs
            ],
            'savings_opportunities': result.savings_opportunities,
            'assumptions': result.assumptions
        }, indent=2, ensure_ascii=False)
    else:
        lines = [
            "=" * 80,
            "成本估算报告",
            "=" * 80,
            "",
            f"总计估算成本: ${result.total_estimated_cost:.2f} {result.currency}/{result.unit.value}",
            "",
            f"资源明细 ({len(result.resource_costs)} 个资源):",
            "-" * 40,
            ""
        ]
        
        for rc in result.resource_costs:
            lines.append(f"资源: {rc.resource_type} - {rc.resource_name}")
            lines.append(f"  成本: ${rc.estimated_cost:.2f} {result.currency}/{result.unit.value}")
            
            if rc.breakdown:
                lines.append("  明细:")
                for key, value in rc.breakdown.items():
                    lines.append(f"    - {key}: ${value:.4f}")
            
            if rc.assumptions:
                lines.append("  假设:")
                for assumption in rc.assumptions:
                    lines.append(f"    - {assumption}")
            
            lines.append("")
        
        if show_savings and result.savings_opportunities:
            lines.append("成本节省机会:")
            lines.append("-" * 40)
            lines.append("")
            
            for opportunity in result.savings_opportunities:
                lines.append(f"资源: {opportunity.get('resource', 'N/A')}")
                lines.append(f"类型: {opportunity.get('type', 'N/A')}")
                lines.append(f"标题: {opportunity.get('title', 'N/A')}")
                lines.append(f"描述: {opportunity.get('description', 'N/A')}")
                lines.append(f"潜在节省: {opportunity.get('potential_savings', 'N/A')}")
                lines.append("")
        
        lines.append("=" * 80)
        lines.append("假设条件:")
        for assumption in result.assumptions:
            lines.append(f"- {assumption}")
        
        output_content = '\n'.join(lines)
    
    if output:
        with open(output, 'w', encoding='utf-8') as f:
            f.write(output_content)
        click.echo(f"结果已保存到: {output}")
    else:
        click.echo(output_content)


@main.group('api', short_help='API 契约测试工具')
def api_group():
    """
    API 契约测试工具
    
    支持解析 OpenAPI 3.0+ 规范，自动生成测试用例，
    验证 API 响应，检测契约漂移，并提供 Mock 服务器功能。
    """
    pass


@api_group.command('parse', short_help='解析 OpenAPI 规范')
@click.argument('spec_path', type=click.Path(exists=True))
@click.option('--output', '-o', type=click.Path(), help='输出文件路径')
@click.option('--endpoints/--no-endpoints', default=True, help='显示端点列表')
@click.option('--schemas/--no-schemas', default=False, help='显示 Schema 定义')
def api_parse(spec_path, output, endpoints, schemas):
    """
    解析 OpenAPI 规范文件
    
    SPEC_PATH: OpenAPI 规范文件路径 (.json, .yaml, .yml)
    """
    parser = OpenAPIParser()
    spec = parser.parse_file(spec_path)
    
    lines = [
        "=" * 80,
        "OpenAPI 规范解析结果",
        "=" * 80,
        "",
        f"标题: {spec.title}",
        f"版本: {spec.version}",
        f"OpenAPI 版本: {spec.openapi_version}",
    ]
    
    if spec.description:
        lines.append(f"描述: {spec.description}")
    
    lines.append("")
    
    if spec.servers:
        lines.append("服务器:")
        for server in spec.servers:
            url = server.get('url', 'N/A')
            description = server.get('description', '')
            if description:
                lines.append(f"  - {url} ({description})")
            else:
                lines.append(f"  - {url}")
        lines.append("")
    
    if endpoints:
        lines.append(f"端点列表 ({len(spec.endpoints)} 个端点):")
        lines.append("-" * 40)
        lines.append("")
        
        for endpoint in spec.endpoints:
            tags_str = ', '.join(endpoint.tags) if endpoint.tags else 'N/A'
            summary = endpoint.summary or 'N/A'
            
            lines.append(f"{endpoint.method:8} {endpoint.path}")
            lines.append(f"  摘要: {summary}")
            lines.append(f"  标签: {tags_str}")
            
            if endpoint.parameters:
                lines.append(f"  参数: {len(endpoint.parameters)} 个")
            
            if endpoint.responses:
                status_codes = ', '.join(endpoint.responses.keys())
                lines.append(f"  响应状态码: {status_codes}")
            
            lines.append("")
    
    if schemas and spec.schemas:
        lines.append(f"Schema 定义 ({len(spec.schemas)} 个):")
        lines.append("-" * 40)
        lines.append("")
        
        for name, schema in spec.schemas.items():
            schema_type = schema.get('type', 'object')
            lines.append(f"{name} ({schema_type})")
            
            if 'properties' in schema:
                props = list(schema['properties'].keys())
                lines.append(f"  属性: {', '.join(props[:5])}{'...' if len(props) > 5 else ''}")
            
            if 'required' in schema:
                lines.append(f"  必需: {', '.join(schema['required'])}")
            
            lines.append("")
    
    lines.append("=" * 80)
    
    output_content = '\n'.join(lines)
    
    if output:
        with open(output, 'w', encoding='utf-8') as f:
            f.write(output_content)
        click.echo(f"结果已保存到: {output}")
    else:
        click.echo(output_content)


@api_group.command('generate-tests', short_help='生成测试用例')
@click.argument('spec_path', type=click.Path(exists=True))
@click.option('--output', '-o', type=click.Path(), required=True, help='输出文件路径')
@click.option('--format', '-f', type=click.Choice(['json', 'python']), default='python', help='输出格式')
@click.option('--base-url', help='测试用例中的基础 URL')
@click.option('--test-types', '-t', type=click.Choice(['all', 'success', 'error', 'edge']), default='all', help='测试类型')
def api_generate_tests(spec_path, output, format, base_url, test_types):
    """
    根据 OpenAPI 规范自动生成测试用例
    
    SPEC_PATH: OpenAPI 规范文件路径
    """
    parser = OpenAPIParser()
    spec = parser.parse_file(spec_path)
    
    generator = TestGenerator(spec)
    tests = generator.generate_all_tests()
    
    if test_types != 'all':
        type_mapping = {
            'success': ['success'],
            'error': ['error'],
            'edge': ['edge_case']
        }
        allowed_types = type_mapping.get(test_types, [])
        tests = [t for t in tests if t.test_type.value in allowed_types]
    
    if format == 'json':
        output_content = generator.export_tests_as_json(tests)
    else:
        output_content = generator.export_tests_as_python(tests, base_url=base_url)
    
    with open(output, 'w', encoding='utf-8') as f:
        f.write(output_content)
    
    click.echo(f"已生成 {len(tests)} 个测试用例到: {output}")


@api_group.command('validate', short_help='验证 API 响应')
@click.argument('spec_path', type=click.Path(exists=True))
@click.option('--response-file', '-r', type=click.Path(exists=True), required=True, help='响应数据文件路径 (JSON)')
@click.option('--endpoint', '-e', help='端点路径 (如 /users/{id})')
@click.option('--method', '-m', type=click.Choice(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']), default='GET', help='HTTP 方法')
@click.option('--status-code', '-s', type=int, default=200, help='实际响应状态码')
def api_validate(spec_path, response_file, endpoint, method, status_code):
    """
    验证 API 实际响应是否符合契约定义
    
    SPEC_PATH: OpenAPI 规范文件路径
    
    响应数据文件应为 JSON 格式，包含响应体数据。
    """
    parser = OpenAPIParser()
    spec = parser.parse_file(spec_path)
    
    with open(response_file, 'r', encoding='utf-8') as f:
        response_body = json.load(f)
    
    validator = ResponseValidator(spec)
    
    if endpoint:
        endpoints_to_test = [(endpoint, method)]
    else:
        endpoints_to_test = [(e.path, e.method) for e in spec.endpoints]
    
    all_results = []
    
    for ep, mth in endpoints_to_test:
        result = validator.validate_response(
            endpoint_path=ep,
            method=mth,
            actual_response=response_body,
            actual_status_code=status_code
        )
        all_results.append(result)
    
    for result in all_results:
        click.echo("=" * 80)
        click.echo(f"验证结果: {result.method} {result.endpoint}")
        click.echo("=" * 80)
        click.echo("")
        
        if result.is_valid:
            click.echo(f"✅ 验证通过! 状态码: {result.status_code}")
        else:
            click.echo(f"❌ 验证失败! 状态码: {result.status_code}")
            click.echo("")
            click.echo("错误详情:")
            click.echo("-" * 40)
            
            for error in result.errors:
                click.echo(f"  类型: {error.error_type.value}")
                click.echo(f"  消息: {error.message}")
                
                if error.path:
                    click.echo(f"  位置: {error.path}")
                
                if error.expected is not None:
                    click.echo(f"  期望: {error.expected}")
                
                if error.actual is not None:
                    click.echo(f"  实际: {error.actual}")
                
                click.echo("")
        
        if result.warnings:
            click.echo("警告:")
            for warning in result.warnings:
                click.echo(f"  ⚠️  {warning}")
        
        click.echo("")


@api_group.command('detect-drift', short_help='检测契约漂移')
@click.argument('spec_path', type=click.Path(exists=True))
@click.option('--responses-file', '-r', type=click.Path(exists=True), help='实际响应数据文件 (JSON 数组)')
@click.option('--other-spec', '-o', type=click.Path(exists=True), help='另一个版本的规范文件路径')
@click.option('--output', '-o', type=click.Path(), help='输出报告文件路径')
def api_detect_drift(spec_path, responses_file, other_spec, output):
    """
    检测契约漂移（Contract Drift）
    
    SPEC_PATH: 当前 OpenAPI 规范文件路径
    
    契约漂移是指 API 实现与文档不一致的情况。
    可以通过比较实际响应与规范，或比较两个版本的规范来检测。
    """
    parser = OpenAPIParser()
    spec = parser.parse_file(spec_path)
    
    detector = ContractDriftDetector(spec)
    
    if responses_file:
        with open(responses_file, 'r', encoding='utf-8') as f:
            actual_responses = json.load(f)
        
        result = detector.detect_from_actual_responses(actual_responses)
    
    elif other_spec:
        other_parser = OpenAPIParser()
        other_spec_obj = other_parser.parse_file(other_spec)
        
        result = detector.detect_from_spec_comparison(other_spec_obj)
    
    else:
        click.echo("错误: 必须提供 --responses-file 或 --other-spec 参数")
        sys.exit(1)
    
    report = detector.generate_drift_report(result)
    
    if output:
        with open(output, 'w', encoding='utf-8') as f:
            f.write(report)
        click.echo(f"报告已保存到: {output}")
    else:
        click.echo(report)


@api_group.command('mock', short_help='启动 Mock API 服务器')
@click.argument('spec_path', type=click.Path(exists=True))
@click.option('--host', '-H', default='localhost', help='绑定的主机地址')
@click.option('--port', '-p', type=int, default=8080, help='监听端口')
@click.option('--delay', '-d', type=int, default=0, help='默认响应延迟（毫秒）')
@click.option('--daemon/--no-daemon', default=False, help='是否作为守护进程运行')
def api_mock(spec_path, host, port, delay, daemon):
    """
    启动 Mock API 服务器以进行前端并行开发
    
    SPEC_PATH: OpenAPI 规范文件路径
    
    Mock 服务器会根据 OpenAPI 规范自动生成示例响应，
    支持自定义响应、延迟等配置。
    """
    parser = OpenAPIParser()
    spec = parser.parse_file(spec_path)
    
    server = MockAPIServer(spec, host=host, port=port)
    
    if delay > 0:
        server.set_default_delay(delay)
    
    click.echo(f"启动 Mock 服务器: http://{host}:{port}")
    click.echo(f"服务 API: {spec.title} v{spec.version}")
    click.echo("")
    click.echo("可用端点:")
    
    endpoints = server.get_endpoints()
    for ep in endpoints:
        responses = ', '.join(ep.get('responses', []))
        click.echo(f"  {ep['method']:8} {ep['path']} -> [{responses}]")
    
    click.echo("")
    click.echo("按 Ctrl+C 停止服务器...")
    
    try:
        server.start(daemon=daemon)
        
        if not daemon:
            import time
            try:
                while server.is_running():
                    time.sleep(1)
            except KeyboardInterrupt:
                click.echo("")
                click.echo("正在停止服务器...")
                server.stop()
    
    except Exception as e:
        click.echo(f"启动服务器失败: {e}")
        sys.exit(1)


def _format_iac_scan_results(
    results: list[ScanResult], 
    violations: list[Violation],
    format_type: str
) -> str:
    """
    格式化 IaC 扫描结果
    
    Args:
        results: 扫描结果列表
        violations: 违规列表
        format_type: 输出格式
        
    Returns:
        格式化的字符串
    """
    if format_type == 'json':
        output = {
            'total_files_scanned': len(results),
            'total_violations': len(violations),
            'violations': [],
            'files': []
        }
        
        for result in results:
            file_info = {
                'path': result.file_path,
                'file_type': result.file_type,
                'resource_count': len(result.resources),
                'violation_count': len(result.violations)
            }
            output['files'].append(file_info)
        
        for v in violations:
            output['violations'].append({
                'rule_id': v.rule_id,
                'severity': v.severity.value,
                'message': v.message,
                'resource_type': v.resource_type,
                'resource_name': v.resource_name,
                'file_path': v.file_path,
                'line_number': v.line_number,
                'remediation': v.remediation
            })
        
        return json.dumps(output, indent=2, ensure_ascii=False)
    
    elif format_type == 'markdown':
        lines = [
            "# IaC 安全审计报告",
            "",
            f"**扫描日期:** {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**扫描文件数:** {len(results)}",
            f"**发现违规数:** {len(violations)}",
            ""
        ]
        
        if violations:
            severity_counts = {}
            for v in violations:
                sev = v.severity.value.upper()
                severity_counts[sev] = severity_counts.get(sev, 0) + 1
            
            lines.append("## 违规摘要")
            lines.append("")
            lines.append("| 严重程度 | 数量 |")
            lines.append("|---------|------|")
            for sev in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                count = severity_counts.get(sev, 0)
                lines.append(f"| {sev} | {count} |")
            lines.append("")
            
            lines.append("## 违规详情")
            lines.append("")
            
            for v in violations:
                severity_emoji = {
                    'critical': '🔴',
                    'high': '🟠',
                    'medium': '🟡',
                    'low': '🟢'
                }.get(v.severity.value, '⚪')
                
                lines.append(f"### {severity_emoji} {v.rule_id} - {v.severity.value.upper()}")
                lines.append("")
                lines.append(f"**消息:** {v.message}")
                lines.append("")
                lines.append(f"**资源:** {v.resource_type} - {v.resource_name}")
                lines.append(f"**文件:** {v.file_path}")
                if v.line_number:
                    lines.append(f"**行号:** {v.line_number}")
                
                if v.remediation:
                    lines.append("")
                    lines.append("**修复建议:**")
                    lines.append("```")
                    lines.append(v.remediation)
                    lines.append("```")
                
                lines.append("")
        
        return '\n'.join(lines)
    
    else:
        lines = [
            "=" * 80,
            "IaC 安全审计报告",
            "=" * 80,
            "",
            f"扫描日期: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"扫描文件数: {len(results)}",
            f"发现违规数: {len(violations)}",
            ""
        ]
        
        if violations:
            severity_counts = {}
            for v in violations:
                sev = v.severity.value.upper()
                severity_counts[sev] = severity_counts.get(sev, 0) + 1
            
            lines.append("违规摘要:")
            lines.append("-" * 40)
            for sev in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                count = severity_counts.get(sev, 0)
                lines.append(f"  {sev:10}: {count}")
            lines.append("")
            
            lines.append("违规详情:")
            lines.append("-" * 40)
            lines.append("")
            
            for v in violations:
                severity_color = {
                    'critical': '\033[1;31m',
                    'high': '\033[1;33m',
                    'medium': '\033[1;33m',
                    'low': '\033[1;32m'
                }.get(v.severity.value, '\033[0m')
                
                reset_color = '\033[0m'
                
                lines.append(f"{severity_color}[{v.severity.value.upper()}] {v.rule_id}{reset_color}")
                lines.append(f"  消息: {v.message}")
                lines.append(f"  资源: {v.resource_type} - {v.resource_name}")
                lines.append(f"  文件: {v.file_path}")
                
                if v.line_number:
                    lines.append(f"  行号: {v.line_number}")
                
                if v.remediation:
                    lines.append(f"  修复: {v.remediation}")
                
                lines.append("")
        
        lines.append("=" * 80)
        
        return '\n'.join(lines)


if __name__ == "__main__":
    main()

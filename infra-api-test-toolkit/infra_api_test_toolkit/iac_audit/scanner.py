"""
IaC 文件扫描器
支持 Terraform、CloudFormation、Kubernetes YAML 等格式
"""

import os
import json
import yaml
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class Severity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class Violation:
    rule_id: str
    severity: Severity
    message: str
    resource_type: str
    resource_name: str
    file_path: str
    line_number: Optional[int] = None
    remediation: Optional[str] = None


@dataclass
class ScanResult:
    file_path: str
    file_type: str
    violations: List[Violation] = field(default_factory=list)
    resources: List[Dict[str, Any]] = field(default_factory=list)


class IaCScanner:
    """
    IaC 文件扫描器，支持多种格式的基础设施代码文件
    """
    
    SUPPORTED_EXTENSIONS = {
        ".tf": "terraform",
        ".tf.json": "terraform",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".json": "json",
        ".cf.json": "cloudformation",
        ".cf.yaml": "cloudformation",
        ".cf.yml": "cloudformation",
    }
    
    def __init__(self, rules=None, custom_policies=None):
        """
        初始化扫描器
        
        Args:
            rules: 自定义规则列表
            custom_policies: 自定义策略文件路径
        """
        self.rules = rules or self._get_default_rules()
        self.custom_policies = custom_policies
        
    def scan_file(self, file_path: str) -> ScanResult:
        """
        扫描单个 IaC 文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            扫描结果
        """
        file_type = self._detect_file_type(file_path)
        
        if file_type is None:
            raise ValueError(f"不支持的文件类型: {file_path}")
        
        content = self._read_file(file_path)
        resources = self._parse_resources(content, file_type)
        
        result = ScanResult(
            file_path=file_path,
            file_type=file_type,
            resources=resources
        )
        
        for rule in self.rules:
            violations = rule.check(resources, file_path)
            result.violations.extend(violations)
        
        if self.custom_policies:
            custom_violations = self._apply_custom_policies(resources, file_path)
            result.violations.extend(custom_violations)
        
        return result
    
    def scan_directory(self, directory_path: str, recursive: bool = True) -> List[ScanResult]:
        """
        扫描目录中的所有 IaC 文件
        
        Args:
            directory_path: 目录路径
            recursive: 是否递归扫描子目录
            
        Returns:
            扫描结果列表
        """
        results = []
        
        if recursive:
            for root, _, files in os.walk(directory_path):
                for file_name in files:
                    file_path = os.path.join(root, file_name)
                    if self._is_supported_file(file_name):
                        try:
                            result = self.scan_file(file_path)
                            results.append(result)
                        except Exception as e:
                            print(f"扫描文件 {file_path} 时出错: {e}")
        else:
            for file_name in os.listdir(directory_path):
                file_path = os.path.join(directory_path, file_name)
                if os.path.isfile(file_path) and self._is_supported_file(file_name):
                    try:
                        result = self.scan_file(file_path)
                        results.append(result)
                    except Exception as e:
                        print(f"扫描文件 {file_path} 时出错: {e}")
        
        return results
    
    def _detect_file_type(self, file_path: str) -> Optional[str]:
        """
        检测文件类型
        
        Args:
            file_path: 文件路径
            
        Returns:
            文件类型或 None
        """
        file_name = os.path.basename(file_path).lower()
        
        for ext, file_type in self.SUPPORTED_EXTENSIONS.items():
            if file_name.endswith(ext):
                return file_type
        
        return None
    
    def _is_supported_file(self, file_name: str) -> bool:
        """
        检查文件是否是支持的 IaC 文件
        
        Args:
            file_name: 文件名
            
        Returns:
            是否支持
        """
        file_name_lower = file_name.lower()
        for ext in self.SUPPORTED_EXTENSIONS.keys():
            if file_name_lower.endswith(ext):
                return True
        return False
    
    def _read_file(self, file_path: str) -> str:
        """
        读取文件内容
        
        Args:
            file_path: 文件路径
            
        Returns:
            文件内容
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def _parse_resources(self, content: str, file_type: str) -> List[Dict[str, Any]]:
        """
        解析文件内容，提取资源列表
        
        Args:
            content: 文件内容
            file_type: 文件类型
            
        Returns:
            资源列表
        """
        resources = []
        
        if file_type == "json":
            try:
                data = json.loads(content)
                resources = self._extract_resources_from_json(data)
            except json.JSONDecodeError:
                pass
        
        elif file_type == "yaml":
            try:
                data = yaml.safe_load(content)
                if data:
                    resources = self._extract_resources_from_yaml(data)
            except yaml.YAMLError:
                pass
        
        elif file_type == "terraform":
            resources = self._extract_resources_from_terraform(content)
        
        elif file_type == "cloudformation":
            try:
                if content.strip().startswith('{'):
                    data = json.loads(content)
                else:
                    data = yaml.safe_load(content)
                resources = self._extract_resources_from_cloudformation(data)
            except Exception:
                pass
        
        return resources
    
    def _extract_resources_from_json(self, data: Any) -> List[Dict[str, Any]]:
        """
        从 JSON 数据中提取资源
        
        Args:
            data: JSON 数据
            
        Returns:
            资源列表
        """
        resources = []
        
        if isinstance(data, dict):
            if 'Resources' in data:
                return self._extract_resources_from_cloudformation(data)
            
            if 'resource' in data:
                for resource_type, resource_configs in data.get('resource', {}).items():
                    for resource_name, resource_config in resource_configs.items():
                        resources.append({
                            'type': resource_type,
                            'name': resource_name,
                            'config': resource_config
                        })
        
        return resources
    
    def _extract_resources_from_yaml(self, data: Any) -> List[Dict[str, Any]]:
        """
        从 YAML 数据中提取资源
        
        Args:
            data: YAML 数据
            
        Returns:
            资源列表
        """
        resources = []
        
        if isinstance(data, dict):
            if 'Resources' in data:
                return self._extract_resources_from_cloudformation(data)
            
            if 'apiVersion' in data and 'kind' in data:
                resources.append({
                    'type': f"kubernetes.{data['kind']}",
                    'name': data.get('metadata', {}).get('name', 'unknown'),
                    'config': data
                })
            
            if 'resource' in data:
                for resource_type, resource_configs in data.get('resource', {}).items():
                    for resource_name, resource_config in resource_configs.items():
                        resources.append({
                            'type': resource_type,
                            'name': resource_name,
                            'config': resource_config
                        })
        
        elif isinstance(data, list):
            for item in data:
                resources.extend(self._extract_resources_from_yaml(item))
        
        return resources
    
    def _extract_resources_from_terraform(self, content: str) -> List[Dict[str, Any]]:
        """
        从 Terraform 内容中提取资源
        
        Args:
            content: Terraform 文件内容
            
        Returns:
            资源列表
        """
        resources = []
        lines = content.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            if line.startswith('resource "'):
                parts = line.split('"')
                if len(parts) >= 4:
                    resource_type = parts[1]
                    resource_name = parts[3]
                    
                    resource_config = self._extract_resource_config(lines, i)
                    
                    resources.append({
                        'type': resource_type,
                        'name': resource_name,
                        'config': resource_config,
                        'line': i + 1
                    })
            
            i += 1
        
        return resources
    
    def _extract_resource_config(self, lines: List[str], start_index: int) -> Dict[str, Any]:
        """
        从 Terraform 文件中提取资源配置
        
        Args:
            lines: 文件行列表
            start_index: 开始行索引
            
        Returns:
            资源配置字典
        """
        config = {}
        brace_count = 0
        in_string = False
        current_key = None
        current_value = []
        
        i = start_index
        while i < len(lines):
            line = lines[i]
            
            for char in line:
                if char == '"' and (i == 0 or line[i-1] != '\\'):
                    in_string = not in_string
                elif char == '{' and not in_string:
                    brace_count += 1
                elif char == '}' and not in_string:
                    brace_count -= 1
                    if brace_count == 0:
                        return config
            
            if '=' in line and not in_string:
                key_part, value_part = line.split('=', 1)
                current_key = key_part.strip().strip('"')
                current_value = [value_part.strip()]
                
                if current_key and not current_value[0].startswith('{'):
                    value_str = current_value[0].strip('"').strip("'")
                    config[current_key] = self._parse_value(value_str)
            
            i += 1
        
        return config
    
    def _parse_value(self, value_str: str) -> Any:
        """
        解析字符串值
        
        Args:
            value_str: 字符串值
            
        Returns:
            解析后的值
        """
        value_str = value_str.strip()
        
        if value_str.lower() == 'true':
            return True
        elif value_str.lower() == 'false':
            return False
        elif value_str.lower() == 'null':
            return None
        elif value_str.isdigit():
            return int(value_str)
        else:
            try:
                return float(value_str)
            except ValueError:
                return value_str.strip('"').strip("'")
    
    def _extract_resources_from_cloudformation(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        从 CloudFormation 模板中提取资源
        
        Args:
            data: CloudFormation 模板数据
            
        Returns:
            资源列表
        """
        resources = []
        
        for resource_name, resource_config in data.get('Resources', {}).items():
            resources.append({
                'type': resource_config.get('Type', 'unknown'),
                'name': resource_name,
                'config': resource_config.get('Properties', {})
            })
        
        return resources
    
    def _apply_custom_policies(self, resources: List[Dict[str, Any]], file_path: str) -> List[Violation]:
        """
        应用自定义策略
        
        Args:
            resources: 资源列表
            file_path: 文件路径
            
        Returns:
            违规列表
        """
        violations = []
        
        if self.custom_policies:
            try:
                with open(self.custom_policies, 'r', encoding='utf-8') as f:
                    policies = yaml.safe_load(f)
                
                for policy in policies.get('policies', []):
                    rule = self._create_rule_from_policy(policy)
                    policy_violations = rule.check(resources, file_path)
                    violations.extend(policy_violations)
            except Exception as e:
                print(f"加载自定义策略时出错: {e}")
        
        return violations
    
    def _create_rule_from_policy(self, policy: Dict[str, Any]) -> 'BaseRule':
        """
        从策略定义创建规则
        
        Args:
            policy: 策略定义
            
        Returns:
            规则对象
        """
        class CustomRule(BaseRule):
            def __init__(self, policy_def):
                super().__init__(
                    rule_id=policy_def.get('id', 'CUSTOM-001'),
                    severity=Severity[policy_def.get('severity', 'MEDIUM').upper()],
                    message=policy_def.get('message', '自定义策略违规')
                )
                self.policy_def = policy_def
            
            def check(self, resources, file_path):
                violations = []
                resource_filters = self.policy_def.get('resource_filters', {})
                
                for resource in resources:
                    resource_type = resource.get('type', '')
                    resource_name = resource.get('name', '')
                    config = resource.get('config', {})
                    
                    if resource_filters.get('type') and resource_type not in resource_filters['type']:
                        continue
                    
                    conditions = self.policy_def.get('conditions', {})
                    if self._check_conditions(config, conditions):
                        violations.append(Violation(
                            rule_id=self.rule_id,
                            severity=self.severity,
                            message=f"{resource_name}: {self.message}",
                            resource_type=resource_type,
                            resource_name=resource_name,
                            file_path=file_path,
                            remediation=self.policy_def.get('remediation')
                        ))
                
                return violations
            
            def _check_conditions(self, config, conditions):
                for key, expected_value in conditions.items():
                    actual_value = config.get(key)
                    
                    if isinstance(expected_value, dict):
                        if 'contains' in expected_value:
                            if expected_value['contains'] not in str(actual_value):
                                return False
                        elif 'not_contains' in expected_value:
                            if expected_value['not_contains'] in str(actual_value):
                                return False
                        elif 'equals' in expected_value:
                            if actual_value != expected_value['equals']:
                                return False
                        elif 'not_equals' in expected_value:
                            if actual_value == expected_value['not_equals']:
                                return False
                    elif actual_value != expected_value:
                        return False
                
                return True
        
        return CustomRule(policy)
    
    def _get_default_rules(self) -> List['BaseRule']:
        """
        获取默认规则列表
        
        Returns:
            规则列表
        """
        return [
            PublicS3BucketRule(),
            OpenSecurityGroupRule(),
            NoEncryptionRule(),
            ExposedCredentialsRule(),
        ]


class BaseRule:
    """
    规则基类
    """
    
    def __init__(self, rule_id: str, severity: Severity, message: str):
        """
        初始化规则
        
        Args:
            rule_id: 规则 ID
            severity: 严重程度
            message: 违规消息
        """
        self.rule_id = rule_id
        self.severity = severity
        self.message = message
    
    def check(self, resources: List[Dict[str, Any]], file_path: str) -> List[Violation]:
        """
        检查资源是否违反规则
        
        Args:
            resources: 资源列表
            file_path: 文件路径
            
        Returns:
            违规列表
        """
        raise NotImplementedError("子类必须实现 check 方法")


class PublicS3BucketRule(BaseRule):
    """
    检查公开 S3 桶的规则
    """
    
    def __init__(self):
        super().__init__(
            rule_id="AWS-S3-001",
            severity=Severity.CRITICAL,
            message="S3 桶配置为公开访问"
        )
    
    def check(self, resources: List[Dict[str, Any]], file_path: str) -> List[Violation]:
        """
        检查 S3 桶是否配置为公开访问
        
        Args:
            resources: 资源列表
            file_path: 文件路径
            
        Returns:
            违规列表
        """
        violations = []
        
        for resource in resources:
            resource_type = resource.get('type', '')
            resource_name = resource.get('name', '')
            config = resource.get('config', {})
            
            if 'aws_s3_bucket' in resource_type or 'AWS::S3::Bucket' in resource_type:
                is_public = False
                
                acl = config.get('acl', '').lower()
                if acl in ['public-read', 'public-read-write', 'public']:
                    is_public = True
                
                public_access_block = config.get('public_access_block', {})
                if isinstance(public_access_block, dict):
                    block_public_acls = public_access_block.get('block_public_acls', False)
                    block_public_policy = public_access_block.get('block_public_policy', False)
                    if not block_public_acls or not block_public_policy:
                        is_public = True
                
                policy = config.get('policy', '')
                if isinstance(policy, str):
                    if '"Effect": "Allow"' in policy and '"Principal": "*"' in policy:
                        is_public = True
                
                if is_public:
                    violations.append(Violation(
                        rule_id=self.rule_id,
                        severity=self.severity,
                        message=f"S3 桶 {resource_name} 配置为公开访问",
                        resource_type=resource_type,
                        resource_name=resource_name,
                        file_path=file_path,
                        remediation="设置 public_access_block 为 true，使用更严格的 ACL，或修改存储桶策略"
                    ))
        
        return violations


class OpenSecurityGroupRule(BaseRule):
    """
    检查过于宽松的安全组规则
    """
    
    def __init__(self):
        super().__init__(
            rule_id="AWS-EC2-001",
            severity=Severity.HIGH,
            message="安全组规则过于宽松"
        )
    
    def check(self, resources: List[Dict[str, Any]], file_path: str) -> List[Violation]:
        """
        检查安全组规则是否过于宽松
        
        Args:
            resources: 资源列表
            file_path: 文件路径
            
        Returns:
            违规列表
        """
        violations = []
        
        for resource in resources:
            resource_type = resource.get('type', '')
            resource_name = resource.get('name', '')
            config = resource.get('config', {})
            
            if 'aws_security_group' in resource_type or 'AWS::EC2::SecurityGroup' in resource_type:
                ingress_rules = config.get('ingress', [])
                if not isinstance(ingress_rules, list):
                    ingress_rules = [ingress_rules]
                
                for rule in ingress_rules:
                    if not isinstance(rule, dict):
                        continue
                    
                    cidr_blocks = rule.get('cidr_blocks', [])
                    if not isinstance(cidr_blocks, list):
                        cidr_blocks = [cidr_blocks]
                    
                    for cidr in cidr_blocks:
                        if cidr == '0.0.0.0/0' or cidr == '::/0':
                            from_port = rule.get('from_port', 0)
                            to_port = rule.get('to_port', 0)
                            
                            if from_port == 0 and to_port == 0:
                                port_range = "所有端口"
                            elif from_port == to_port:
                                port_range = f"端口 {from_port}"
                            else:
                                port_range = f"端口 {from_port}-{to_port}"
                            
                            violations.append(Violation(
                                rule_id=self.rule_id,
                                severity=self.severity,
                                message=f"安全组 {resource_name} 允许来自互联网 ({cidr}) 的 {port_range} 访问",
                                resource_type=resource_type,
                                resource_name=resource_name,
                                file_path=file_path,
                                remediation=f"限制 {port_range} 的访问源 IP 范围，使用安全组引用而非 CIDR"
                            ))
        
        return violations


class NoEncryptionRule(BaseRule):
    """
    检查未启用加密的资源
    """
    
    def __init__(self):
        super().__init__(
            rule_id="GEN-SEC-001",
            severity=Severity.HIGH,
            message="资源未启用加密"
        )
    
    def check(self, resources: List[Dict[str, Any]], file_path: str) -> List[Violation]:
        """
        检查资源是否未启用加密
        
        Args:
            resources: 资源列表
            file_path: 文件路径
            
        Returns:
            违规列表
        """
        violations = []
        
        encrypted_resources = [
            ('aws_ebs_volume', 'encrypted', 'EBS 卷'),
            ('aws_s3_bucket', 'server_side_encryption_configuration', 'S3 桶'),
            ('aws_rds_cluster', 'storage_encrypted', 'RDS 集群'),
            ('aws_db_instance', 'storage_encrypted', 'RDS 实例'),
        ]
        
        for resource in resources:
            resource_type = resource.get('type', '')
            resource_name = resource.get('name', '')
            config = resource.get('config', {})
            
            for type_pattern, encryption_key, resource_label in encrypted_resources:
                if type_pattern in resource_type:
                    encryption_value = config.get(encryption_key)
                    
                    if encryption_value is None or encryption_value is False:
                        violations.append(Violation(
                            rule_id=self.rule_id,
                            severity=self.severity,
                            message=f"{resource_label} {resource_name} 未启用加密",
                            resource_type=resource_type,
                            resource_name=resource_name,
                            file_path=file_path,
                            remediation=f"为 {resource_label} 启用加密，设置 {encryption_key} = true"
                        ))
        
        return violations


class ExposedCredentialsRule(BaseRule):
    """
    检查暴露的凭证
    """
    
    def __init__(self):
        super().__init__(
            rule_id="GEN-SEC-002",
            severity=Severity.CRITICAL,
            message="资源配置中包含硬编码凭证"
        )
    
    def check(self, resources: List[Dict[str, Any]], file_path: str) -> List[Violation]:
        """
        检查资源配置中是否包含硬编码凭证
        
        Args:
            resources: 资源列表
            file_path: 文件路径
            
        Returns:
            违规列表
        """
        violations = []
        
        credential_patterns = [
            'password',
            'secret',
            'api_key',
            'api-key',
            'access_key',
            'access-key',
            'token',
            'credential',
        ]
        
        for resource in resources:
            resource_type = resource.get('type', '')
            resource_name = resource.get('name', '')
            config = resource.get('config', {})
            
            for key, value in config.items():
                key_lower = key.lower()
                
                for pattern in credential_patterns:
                    if pattern in key_lower:
                        if isinstance(value, str) and value:
                            if len(value) > 4 and not value.startswith('${'):
                                violations.append(Violation(
                                    rule_id=self.rule_id,
                                    severity=self.severity,
                                    message=f"资源 {resource_name} 中发现潜在的硬编码凭证: {key}",
                                    resource_type=resource_type,
                                    resource_name=resource_name,
                                    file_path=file_path,
                                    remediation="使用环境变量、密钥管理服务（如 AWS Secrets Manager、HashiCorp Vault）或配置管理工具"
                                ))
        
        return violations

"""
IaC 审计工具单元测试
"""

import os
import sys
import pytest
import tempfile
import json
import yaml

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infra_api_test_toolkit.iac_audit.scanner import (
    IaCScanner,
    Severity,
    Violation,
    ScanResult,
    BaseRule,
    PublicS3BucketRule,
    OpenSecurityGroupRule,
    NoEncryptionRule,
    ExposedCredentialsRule
)


class TestSeverity:
    """测试严重程度枚举"""
    
    def test_severity_values(self):
        assert Severity.CRITICAL.value == "critical"
        assert Severity.HIGH.value == "high"
        assert Severity.MEDIUM.value == "medium"
        assert Severity.LOW.value == "low"


class TestViolation:
    """测试违规数据类"""
    
    def test_violation_creation(self):
        violation = Violation(
            rule_id="TEST-001",
            severity=Severity.HIGH,
            message="测试违规消息",
            resource_type="aws_s3_bucket",
            resource_name="test_bucket",
            file_path="/test/path.tf"
        )
        
        assert violation.rule_id == "TEST-001"
        assert violation.severity == Severity.HIGH
        assert violation.message == "测试违规消息"
        assert violation.resource_type == "aws_s3_bucket"
        assert violation.resource_name == "test_bucket"
        assert violation.file_path == "/test/path.tf"
        assert violation.line_number is None
        assert violation.remediation is None
    
    def test_violation_with_optional_fields(self):
        violation = Violation(
            rule_id="TEST-002",
            severity=Severity.CRITICAL,
            message="测试违规",
            resource_type="aws_ec2_instance",
            resource_name="test_instance",
            file_path="/test/main.tf",
            line_number=10,
            remediation="启用加密"
        )
        
        assert violation.line_number == 10
        assert violation.remediation == "启用加密"


class TestScanResult:
    """测试扫描结果数据类"""
    
    def test_scan_result_creation(self):
        result = ScanResult(
            file_path="/test/main.tf",
            file_type="terraform"
        )
        
        assert result.file_path == "/test/main.tf"
        assert result.file_type == "terraform"
        assert result.violations == []
        assert result.resources == []
    
    def test_scan_result_with_violations(self):
        violation = Violation(
            rule_id="TEST-001",
            severity=Severity.HIGH,
            message="测试",
            resource_type="test",
            resource_name="test",
            file_path="/test.tf"
        )
        
        result = ScanResult(
            file_path="/test/main.tf",
            file_type="terraform",
            violations=[violation],
            resources=[{"type": "aws_s3_bucket", "name": "test"}]
        )
        
        assert len(result.violations) == 1
        assert len(result.resources) == 1


class TestIaCScanner:
    """测试 IaC 扫描器"""
    
    def setup_method(self):
        self.scanner = IaCScanner()
    
    def test_detect_file_type(self):
        """测试文件类型检测"""
        assert self.scanner._detect_file_type("test.tf") == "terraform"
        assert self.scanner._detect_file_type("test.tf.json") == "terraform"
        assert self.scanner._detect_file_type("test.yaml") == "yaml"
        assert self.scanner._detect_file_type("test.yml") == "yaml"
        assert self.scanner._detect_file_type("test.json") == "json"
        assert self.scanner._detect_file_type("test.cf.json") == "cloudformation"
        assert self.scanner._detect_file_type("test.cf.yaml") == "cloudformation"
        assert self.scanner._detect_file_type("test.cf.yml") == "cloudformation"
        assert self.scanner._detect_file_type("test.unknown") is None
    
    def test_is_supported_file(self):
        """测试支持的文件检查"""
        assert self.scanner._is_supported_file("main.tf") is True
        assert self.scanner._is_supported_file("config.yaml") is True
        assert self.scanner._is_supported_file("data.json") is True
        assert self.scanner._is_supported_file("README.md") is False
    
    def test_parse_value(self):
        """测试值解析"""
        assert self.scanner._parse_value("true") is True
        assert self.scanner._parse_value("false") is False
        assert self.scanner._parse_value("null") is None
        assert self.scanner._parse_value("123") == 123
        assert self.scanner._parse_value("3.14") == 3.14
        assert self.scanner._parse_value("hello") == "hello"
        assert self.scanner._parse_value('"quoted"') == "quoted"


class TestPublicS3BucketRule:
    """测试公开 S3 桶规则"""
    
    def setup_method(self):
        self.rule = PublicS3BucketRule()
    
    def test_rule_properties(self):
        assert self.rule.rule_id == "AWS-S3-001"
        assert self.rule.severity == Severity.CRITICAL
    
    def test_check_public_acl(self):
        """测试检测公开 ACL"""
        resources = [{
            "type": "aws_s3_bucket",
            "name": "public_bucket",
            "config": {
                "acl": "public-read"
            }
        }]
        
        violations = self.rule.check(resources, "/test.tf")
        assert len(violations) == 1
        assert violations[0].rule_id == "AWS-S3-001"
    
    def test_check_public_access_block_disabled(self):
        """测试检测禁用的公共访问阻止"""
        resources = [{
            "type": "aws_s3_bucket",
            "name": "public_bucket",
            "config": {
                "public_access_block": {
                    "block_public_acls": False,
                    "block_public_policy": False
                }
            }
        }]
        
        violations = self.rule.check(resources, "/test.tf")
        assert len(violations) == 1
    
    def test_check_non_s3_resource(self):
        """测试非 S3 资源不触发规则"""
        resources = [{
            "type": "aws_ec2_instance",
            "name": "web_server",
            "config": {}
        }]
        
        violations = self.rule.check(resources, "/test.tf")
        assert len(violations) == 0


class TestOpenSecurityGroupRule:
    """测试开放安全组规则"""
    
    def setup_method(self):
        self.rule = OpenSecurityGroupRule()
    
    def test_rule_properties(self):
        assert self.rule.rule_id == "AWS-EC2-001"
        assert self.rule.severity == Severity.HIGH
    
    def test_check_open_security_group(self):
        """测试检测开放的安全组"""
        resources = [{
            "type": "aws_security_group",
            "name": "open_sg",
            "config": {
                "ingress": [{
                    "from_port": 0,
                    "to_port": 0,
                    "protocol": "-1",
                    "cidr_blocks": ["0.0.0.0/0"]
                }]
            }
        }]
        
        violations = self.rule.check(resources, "/test.tf")
        assert len(violations) == 1
    
    def test_check_ssh_open_to_internet(self):
        """测试检测开放到互联网的 SSH"""
        resources = [{
            "type": "aws_security_group",
            "name": "ssh_sg",
            "config": {
                "ingress": [{
                    "from_port": 22,
                    "to_port": 22,
                    "protocol": "tcp",
                    "cidr_blocks": ["0.0.0.0/0"]
                }]
            }
        }]
        
        violations = self.rule.check(resources, "/test.tf")
        assert len(violations) == 1


class TestNoEncryptionRule:
    """测试未加密规则"""
    
    def setup_method(self):
        self.rule = NoEncryptionRule()
    
    def test_rule_properties(self):
        assert self.rule.rule_id == "GEN-SEC-001"
        assert self.rule.severity == Severity.HIGH
    
    def test_check_unencrypted_ebs(self):
        """测试检测未加密的 EBS 卷"""
        resources = [{
            "type": "aws_ebs_volume",
            "name": "unencrypted_volume",
            "config": {
                "encrypted": False
            }
        }]
        
        violations = self.rule.check(resources, "/test.tf")
        assert len(violations) == 1
    
    def test_check_unencrypted_rds(self):
        """测试检测未加密的 RDS"""
        resources = [{
            "type": "aws_db_instance",
            "name": "unencrypted_db",
            "config": {
                "storage_encrypted": False
            }
        }]
        
        violations = self.rule.check(resources, "/test.tf")
        assert len(violations) == 1


class TestExposedCredentialsRule:
    """测试暴露凭证规则"""
    
    def setup_method(self):
        self.rule = ExposedCredentialsRule()
    
    def test_rule_properties(self):
        assert self.rule.rule_id == "GEN-SEC-002"
        assert self.rule.severity == Severity.CRITICAL
    
    def test_check_hardcoded_password(self):
        """测试检测硬编码密码"""
        resources = [{
            "type": "aws_db_instance",
            "name": "db_with_password",
            "config": {
                "password": "secret123"
            }
        }]
        
        violations = self.rule.check(resources, "/test.tf")
        assert len(violations) == 1
    
    def test_check_hardcoded_api_key(self):
        """测试检测硬编码 API 密钥"""
        resources = [{
            "type": "aws_lambda_function",
            "name": "lambda_with_key",
            "config": {
                "environment": {
                    "variables": {
                        "API_KEY": "sk_live_123456789"
                    }
                }
            }
        }]
        
        violations = self.rule.check(resources, "/test.tf")
        
        for v in violations:
            print(f"Violation: {v.message}")


class TestFileScanning:
    """测试文件扫描功能"""
    
    def test_scan_yaml_file(self):
        """测试扫描 YAML 文件"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump({
                "apiVersion": "v1",
                "kind": "ConfigMap",
                "metadata": {
                    "name": "test-config"
                },
                "data": {
                    "password": "secret123"
                }
            }, f)
            temp_path = f.name
        
        try:
            scanner = IaCScanner()
            result = scanner.scan_file(temp_path)
            
            assert result.file_type == "yaml"
        finally:
            os.unlink(temp_path)
    
    def test_scan_json_file(self):
        """测试扫描 JSON 文件"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({
                "Resources": {
                    "MyBucket": {
                        "Type": "AWS::S3::Bucket",
                        "Properties": {
                            "AccessControl": "PublicRead"
                        }
                    }
                }
            }, f)
            temp_path = f.name
        
        try:
            scanner = IaCScanner()
            result = scanner.scan_file(temp_path)
            
            assert result.file_type == "json"
        finally:
            os.unlink(temp_path)

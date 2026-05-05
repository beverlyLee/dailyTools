"""
LLM 助手单元测试
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infra_api_test_toolkit.iac_audit.llm_helper import (
    LLMHelper,
    LLMResponse
)


class TestLLMResponse:
    """测试 LLM 响应数据类"""
    
    def test_llm_response_creation(self):
        response = LLMResponse(
            explanation="这是一个测试解释",
            remediation_code="resource \"aws_s3_bucket\" \"test\" {}",
            severity_assessment="严重程度: CRITICAL",
            additional_context="额外建议"
        )
        
        assert response.explanation == "这是一个测试解释"
        assert response.remediation_code == "resource \"aws_s3_bucket\" \"test\" {}"
        assert response.severity_assessment == "严重程度: CRITICAL"
        assert response.additional_context == "额外建议"
    
    def test_llm_response_with_none_fields(self):
        response = LLMResponse(
            explanation="简单解释",
            remediation_code=None,
            severity_assessment=None,
            additional_context=None
        )
        
        assert response.explanation == "简单解释"
        assert response.remediation_code is None
        assert response.severity_assessment is None
        assert response.additional_context is None


class TestLLMHelper:
    """测试 LLM 助手类"""
    
    def setup_method(self):
        self.helper = LLMHelper(api_key="test_key", model="gpt-4")
    
    def test_initialization(self):
        """测试初始化"""
        helper = LLMHelper(api_key="my_key", model="gpt-3.5-turbo")
        
        assert helper.api_key == "my_key"
        assert helper.model == "gpt-3.5-turbo"
    
    def test_initialization_with_env_var(self):
        """测试使用环境变量初始化"""
        with patch.dict(os.environ, {"OPENAI_API_KEY": "env_key"}):
            helper = LLMHelper()
            
            assert helper.api_key == "env_key"
    
    def test_generate_fallback_explanation_s3_rule(self):
        """测试 S3 公开桶规则的备用解释"""
        violation = {
            "rule_id": "AWS-S3-001",
            "severity": "critical",
            "message": "S3 桶配置为公开访问",
            "resource_type": "aws_s3_bucket",
            "resource_name": "public_bucket"
        }
        
        resource_config = {
            "acl": "public-read",
            "bucket": "my-public-bucket"
        }
        
        response = self.helper._generate_fallback_explanation(
            violation, resource_config, "terraform"
        )
        
        assert "公开访问" in response.explanation
        assert "S3" in response.explanation
        assert response.remediation_code is not None
        assert "aws_s3_bucket" in response.remediation_code
    
    def test_generate_fallback_explanation_security_group_rule(self):
        """测试安全组规则的备用解释"""
        violation = {
            "rule_id": "AWS-EC2-001",
            "severity": "high",
            "message": "安全组规则过于宽松",
            "resource_type": "aws_security_group",
            "resource_name": "open_sg"
        }
        
        resource_config = {
            "ingress": [{"cidr_blocks": ["0.0.0.0/0"]}]
        }
        
        response = self.helper._generate_fallback_explanation(
            violation, resource_config, "terraform"
        )
        
        assert "安全组" in response.explanation
        assert response.remediation_code is not None
        assert "aws_security_group" in response.remediation_code
    
    def test_generate_fallback_explanation_encryption_rule(self):
        """测试加密规则的备用解释"""
        violation = {
            "rule_id": "GEN-SEC-001",
            "severity": "high",
            "message": "资源未启用加密",
            "resource_type": "aws_ebs_volume",
            "resource_name": "unencrypted_volume"
        }
        
        resource_config = {
            "encrypted": False,
            "size": 100
        }
        
        response = self.helper._generate_fallback_explanation(
            violation, resource_config, "terraform"
        )
        
        assert "加密" in response.explanation
        assert response.remediation_code is not None
    
    def test_generate_fallback_explanation_credentials_rule(self):
        """测试凭证规则的备用解释"""
        violation = {
            "rule_id": "GEN-SEC-002",
            "severity": "critical",
            "message": "发现硬编码凭证",
            "resource_type": "aws_db_instance",
            "resource_name": "db_with_password"
        }
        
        resource_config = {
            "password": "secret123"
        }
        
        response = self.helper._generate_fallback_explanation(
            violation, resource_config, "terraform"
        )
        
        assert "硬编码" in response.explanation
        assert "凭证" in response.explanation
    
    def test_generate_fallback_explanation_unknown_rule(self):
        """测试未知规则的备用解释"""
        violation = {
            "rule_id": "UNKNOWN-001",
            "severity": "medium",
            "message": "未知违规消息",
            "resource_type": "test_resource",
            "resource_name": "test_name"
        }
        
        resource_config = {}
        
        response = self.helper._generate_fallback_explanation(
            violation, resource_config, "terraform"
        )
        
        assert "未知违规消息" in response.explanation
    
    def test_extract_valid_json_simple(self):
        """测试提取简单的 JSON"""
        json_str = '{"key": "value"}'
        
        result = self.helper._extract_valid_json(json_str)
        
        assert result == json_str
    
    def test_extract_valid_json_with_prefix(self):
        """测试提取带有前缀的 JSON"""
        text = '这里是一些文本 {"explanation": "test", "code": "test"} 这里是更多文本'
        
        result = self.helper._extract_valid_json(text)
        
        assert "explanation" in result
        assert "code" in result
    
    def test_extract_valid_json_nested(self):
        """测试提取嵌套的 JSON"""
        json_str = '''
        {
            "explanation": "这是解释",
            "remediation_code": "resource \"test\" {}",
            "nested": {
                "key": "value"
            }
        }
        '''
        
        result = self.helper._extract_valid_json(json_str)
        
        assert "explanation" in result
        assert "nested" in result
    
    def test_parse_llm_response_valid_json(self):
        """测试解析有效的 JSON 响应"""
        content = '''
        {
            "explanation": "这是一个测试解释",
            "remediation_code": "resource \"aws_s3_bucket\" \"test\" {}",
            "severity_assessment": "严重程度: CRITICAL",
            "additional_context": "额外建议"
        }
        '''
        
        response = self.helper._parse_llm_response(content)
        
        assert response.explanation == "这是一个测试解释"
        assert "aws_s3_bucket" in response.remediation_code
        assert response.severity_assessment == "严重程度: CRITICAL"
        assert response.additional_context == "额外建议"
    
    def test_parse_llm_response_invalid_json(self):
        """测试解析无效的 JSON 响应"""
        content = "这不是 JSON 格式的响应"
        
        response = self.helper._parse_llm_response(content)
        
        assert response.explanation == content
        assert response.remediation_code is None
    
    def test_explain_violation_without_api_key(self):
        """测试没有 API 密钥时的违规解释"""
        helper = LLMHelper(api_key=None)
        
        violation = {
            "rule_id": "AWS-S3-001",
            "severity": "critical",
            "message": "S3 桶配置为公开访问",
            "resource_type": "aws_s3_bucket",
            "resource_name": "public_bucket"
        }
        
        resource_config = {"acl": "public-read"}
        
        with patch.dict(os.environ, {}, clear=True):
            response = helper.explain_violation(violation, resource_config, "terraform")
        
        assert isinstance(response, LLMResponse)
        assert "公开访问" in response.explanation
    
    def test_build_violation_explanation_prompt(self):
        """测试构建违规解释提示词"""
        violation = {
            "rule_id": "TEST-001",
            "severity": "high",
            "message": "测试违规消息",
            "resource_type": "aws_ec2_instance",
            "resource_name": "test_instance"
        }
        
        resource_config = {
            "instance_type": "t2.micro",
            "tags": {"Name": "test"}
        }
        
        prompt = self.helper._build_violation_explanation_prompt(
            violation, resource_config, "terraform"
        )
        
        assert "TEST-001" in prompt
        assert "test_instance" in prompt
        assert "t2.micro" in prompt
        assert "terraform" in prompt
    
    def test_generate_fallback_remediation_terraform(self):
        """测试生成 Terraform 格式的备用修复代码"""
        rule_id = "AWS-S3-001"
        resource_config = {"acl": "public-read"}
        
        code = self.helper._generate_fallback_remediation(
            rule_id, resource_config, "terraform"
        )
        
        assert code is not None
        assert "aws_s3_bucket" in code
        assert "public_access_block" in code
    
    def test_generate_fallback_remediation_unknown_file_type(self):
        """测试生成未知文件类型的备用修复代码"""
        rule_id = "AWS-S3-001"
        resource_config = {}
        
        code = self.helper._generate_fallback_remediation(
            rule_id, resource_config, "unknown"
        )
        
        assert code is None

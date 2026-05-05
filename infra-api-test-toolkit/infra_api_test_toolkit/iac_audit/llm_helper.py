"""
LLM 助手模块
用于解释违规原因和提供修复代码片段
"""

import os
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


@dataclass
class LLMResponse:
    """
    LLM 响应数据类
    """
    explanation: str
    remediation_code: Optional[str]
    severity_assessment: Optional[str]
    additional_context: Optional[str]


class LLMHelper:
    """
    LLM 助手类
    用于解释违规原因和提供修复代码片段
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4"):
        """
        初始化 LLM 助手
        
        Args:
            api_key: OpenAI API 密钥
            model: 使用的模型名称
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        self._client = None
    
    def _get_client(self):
        """
        获取 OpenAI 客户端
        
        Returns:
            OpenAI 客户端实例
        """
        if not HAS_OPENAI:
            raise ImportError("请安装 openai 库: pip install openai")
        
        if self._client is None:
            if self.api_key:
                self._client = openai.OpenAI(api_key=self.api_key)
            else:
                self._client = openai.OpenAI()
        
        return self._client
    
    def explain_violation(
        self, 
        violation: Dict[str, Any], 
        resource_config: Dict[str, Any],
        file_type: str = "terraform"
    ) -> LLMResponse:
        """
        解释违规原因并提供修复代码片段
        
        Args:
            violation: 违规信息
            resource_config: 资源配置
            file_type: 文件类型
            
        Returns:
            LLM 响应
        """
        if not self.api_key and not os.environ.get("OPENAI_API_KEY"):
            return self._generate_fallback_explanation(violation, resource_config, file_type)
        
        try:
            client = self._get_client()
            
            prompt = self._build_violation_explanation_prompt(
                violation, resource_config, file_type
            )
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个基础设施即代码 (IaC) 安全专家，专门帮助开发者识别和修复安全合规问题。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content
            return self._parse_llm_response(content)
            
        except Exception as e:
            print(f"LLM 调用失败: {e}")
            return self._generate_fallback_explanation(violation, resource_config, file_type)
    
    def _build_violation_explanation_prompt(
        self, 
        violation: Dict[str, Any], 
        resource_config: Dict[str, Any],
        file_type: str
    ) -> str:
        """
        构建违规解释提示词
        
        Args:
            violation: 违规信息
            resource_config: 资源配置
            file_type: 文件类型
            
        Returns:
            提示词字符串
        """
        prompt = f"""请分析以下基础设施即代码 (IaC) 安全违规问题：

**违规信息：**
- 规则 ID: {violation.get('rule_id', 'N/A')}
- 严重程度: {violation.get('severity', 'N/A')}
- 消息: {violation.get('message', 'N/A')}
- 资源类型: {violation.get('resource_type', 'N/A')}
- 资源名称: {violation.get('resource_name', 'N/A')}

**资源配置：**
```json
{json.dumps(resource_config, indent=2, default=str)}
```

**文件类型：** {file_type}

请提供以下信息（请使用 JSON 格式返回）：
1. explanation: 详细解释为什么这是一个安全问题，包括潜在的风险和影响
2. remediation_code: 修复后的代码片段（针对 {file_type} 格式）
3. severity_assessment: 对严重程度的评估和说明
4. additional_context: 任何额外的安全建议或最佳实践

请确保返回的是有效的 JSON 格式，不要包含任何其他文本。
"""
        
        return prompt
    
    def _parse_llm_response(self, content: str) -> LLMResponse:
        """
        解析 LLM 响应
        
        Args:
            content: LLM 返回的内容
            
        Returns:
            解析后的响应
        """
        try:
            json_match = content.find('{')
            if json_match != -1:
                json_str = content[json_match:]
                
                json_str = self._extract_valid_json(json_str)
                
                data = json.loads(json_str)
                
                return LLMResponse(
                    explanation=data.get('explanation', ''),
                    remediation_code=data.get('remediation_code'),
                    severity_assessment=data.get('severity_assessment'),
                    additional_context=data.get('additional_context')
                )
        except Exception as e:
            print(f"解析 LLM 响应失败: {e}")
        
        return LLMResponse(
            explanation=content,
            remediation_code=None,
            severity_assessment=None,
            additional_context=None
        )
    
    def _extract_valid_json(self, json_str: str) -> str:
        """
        从文本中提取有效的 JSON
        
        Args:
            json_str: 可能包含 JSON 的字符串
            
        Returns:
            提取的 JSON 字符串
        """
        brace_count = 0
        in_string = False
        start_index = -1
        
        for i, char in enumerate(json_str):
            if char == '"' and (i == 0 or json_str[i-1] != '\\'):
                in_string = not in_string
            elif char == '{' and not in_string:
                if start_index == -1:
                    start_index = i
                brace_count += 1
            elif char == '}' and not in_string:
                brace_count -= 1
                if brace_count == 0 and start_index != -1:
                    return json_str[start_index:i+1]
        
        return json_str
    
    def _generate_fallback_explanation(
        self, 
        violation: Dict[str, Any], 
        resource_config: Dict[str, Any],
        file_type: str
    ) -> LLMResponse:
        """
        生成备用解释（当 LLM 不可用时）
        
        Args:
            violation: 违规信息
            resource_config: 资源配置
            file_type: 文件类型
            
        Returns:
            备用响应
        """
        rule_id = violation.get('rule_id', '')
        message = violation.get('message', '')
        
        explanations = {
            'AWS-S3-001': """
**问题分析：**
该 S3 存储桶配置为公开访问，这是一个严重的安全风险。

**风险影响：**
- 任何人均可访问存储桶中的数据
- 可能导致敏感数据泄露
- 违反合规性要求（如 GDPR、HIPAA）
- 可能被恶意利用进行数据托管或分发

**最佳实践：**
1. 启用公共访问阻止（Public Access Block）
2. 使用最小权限原则配置存储桶策略
3. 考虑使用 VPC 端点或预签名 URL 进行访问
            """,
            
            'AWS-EC2-001': """
**问题分析：**
安全组规则过于宽松，允许来自互联网的广泛访问。

**风险影响：**
- 增加攻击面
- 可能导致未授权访问
- 违反最小权限原则

**最佳实践：**
1. 限制源 IP 范围到特定的 IP 或 CIDR 块
2. 使用安全组引用而非 CIDR 块
3. 只开放必要的端口
4. 考虑使用网络 ACL 作为额外的安全层
            """,
            
            'GEN-SEC-001': """
**问题分析：**
资源未启用加密，数据可能以明文形式存储。

**风险影响：**
- 数据泄露风险
- 违反合规性要求
- 数据完整性无法保证

**最佳实践：**
1. 启用静态数据加密
2. 使用适当的密钥管理服务
3. 定期轮换加密密钥
4. 启用传输中加密（TLS）
            """,
            
            'GEN-SEC-002': """
**问题分析：**
发现硬编码的凭证，这是一个严重的安全问题。

**风险影响：**
- 凭证泄露风险
- 代码仓库公开时凭证暴露
- 难以轮换和管理凭证

**最佳实践：**
1. 使用环境变量存储敏感信息
2. 使用密钥管理服务（如 AWS Secrets Manager、HashiCorp Vault）
3. 使用配置管理工具
4. 在 .gitignore 中排除包含凭证的文件
            """
        }
        
        explanation = explanations.get(rule_id, f"""
**问题：** {message}

**建议：**
请审查此配置并根据安全最佳实践进行修复。
        """)
        
        return LLMResponse(
            explanation=explanation.strip(),
            remediation_code=self._generate_fallback_remediation(rule_id, resource_config, file_type),
            severity_assessment=f"严重程度: {violation.get('severity', 'N/A')}",
            additional_context="请查看官方文档了解更多安全最佳实践。"
        )
    
    def _generate_fallback_remediation(
        self, 
        rule_id: str, 
        resource_config: Dict[str, Any],
        file_type: str
    ) -> Optional[str]:
        """
        生成备用修复代码
        
        Args:
            rule_id: 规则 ID
            resource_config: 资源配置
            file_type: 文件类型
            
        Returns:
            修复代码片段
        """
        if file_type == "terraform":
            if rule_id == "AWS-S3-001":
                return """
resource "aws_s3_bucket" "example" {
  bucket = "my-secure-bucket"
  
  # 启用公共访问阻止
  public_access_block {
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
  }
  
  # 启用服务器端加密
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}
"""
            elif rule_id == "AWS-EC2-001":
                return """
resource "aws_security_group" "example" {
  name        = "secure-security-group"
  description = "安全的安全组配置"
  
  # 限制 SSH 访问到特定 IP
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["192.168.1.0/24"]  # 替换为您的 IP 范围
  }
  
  # 或者使用安全组引用
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.load_balancer.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
"""
            elif rule_id == "GEN-SEC-001":
                return """
# EBS 卷加密示例
resource "aws_ebs_volume" "example" {
  availability_zone = "us-west-2a"
  size              = 40
  encrypted         = true  # 启用加密
  kms_key_id        = aws_kms_key.example.arn  # 可选：使用自定义 KMS 密钥
}

# RDS 实例加密示例
resource "aws_db_instance" "example" {
  engine               = "mysql"
  instance_class       = "db.t2.micro"
  storage_encrypted    = true  # 启用加密
  kms_key_id           = aws_kms_key.example.arn  # 可选
}
"""
        
        return None

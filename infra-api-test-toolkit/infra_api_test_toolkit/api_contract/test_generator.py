"""
API 测试用例生成器
根据 OpenAPI 规范自动生成测试用例
"""

import json
import re
import uuid
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

from .spec_parser import APISpec, APIEndpoint, Parameter, ParameterLocation


class TestType(Enum):
    SUCCESS = "success"
    ERROR = "error"
    EDGE_CASE = "edge_case"
    SECURITY = "security"


@dataclass
class TestCase:
    """
    测试用例数据类
    """
    test_id: str
    test_type: TestType
    endpoint: str
    method: str
    description: str
    request: Dict[str, Any] = field(default_factory=dict)
    expected_response: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)


class TestGenerator:
    """
    API 测试用例生成器
    """
    
    def __init__(self, spec: APISpec):
        """
        初始化测试生成器
        
        Args:
            spec: API 规范
        """
        self.spec = spec
        self.schemas = spec.schemas
        self._test_counter = 0
    
    def generate_all_tests(self) -> List[TestCase]:
        """
        为所有端点生成测试用例
        
        Returns:
            测试用例列表
        """
        tests = []
        
        for endpoint in self.spec.endpoints:
            endpoint_tests = self.generate_tests_for_endpoint(endpoint)
            tests.extend(endpoint_tests)
        
        return tests
    
    def generate_tests_for_endpoint(self, endpoint: APIEndpoint) -> List[TestCase]:
        """
        为单个端点生成测试用例
        
        Args:
            endpoint: API 端点定义
            
        Returns:
            测试用例列表
        """
        tests = []
        
        success_tests = self._generate_success_tests(endpoint)
        tests.extend(success_tests)
        
        error_tests = self._generate_error_tests(endpoint)
        tests.extend(error_tests)
        
        edge_case_tests = self._generate_edge_case_tests(endpoint)
        tests.extend(edge_case_tests)
        
        return tests
    
    def _generate_success_tests(self, endpoint: APIEndpoint) -> List[TestCase]:
        """
        生成成功测试用例
        
        Args:
            endpoint: API 端点定义
            
        Returns:
            测试用例列表
        """
        tests = []
        
        for status_code, response in endpoint.responses.items():
            if status_code.startswith('2') or status_code == 'default':
                test = self._create_test_case(
                    endpoint=endpoint,
                    test_type=TestType.SUCCESS,
                    description=f"成功测试 {endpoint.method} {endpoint.path} - 期望状态码 {status_code}",
                    expected_status=status_code,
                    response=response
                )
                tests.append(test)
        
        if not tests:
            test = self._create_test_case(
                endpoint=endpoint,
                test_type=TestType.SUCCESS,
                description=f"成功测试 {endpoint.method} {endpoint.path}",
                expected_status='200'
            )
            tests.append(test)
        
        return tests
    
    def _generate_error_tests(self, endpoint: APIEndpoint) -> List[TestCase]:
        """
        生成错误测试用例
        
        Args:
            endpoint: API 端点定义
            
        Returns:
            测试用例列表
        """
        tests = []
        
        for status_code, response in endpoint.responses.items():
            if status_code.startswith('4') or status_code.startswith('5'):
                test = self._create_test_case(
                    endpoint=endpoint,
                    test_type=TestType.ERROR,
                    description=f"错误测试 {endpoint.method} {endpoint.path} - 期望状态码 {status_code}",
                    expected_status=status_code,
                    response=response,
                    is_error=True
                )
                tests.append(test)
        
        if endpoint.parameters:
            missing_param_tests = self._generate_missing_parameter_tests(endpoint)
            tests.extend(missing_param_tests)
        
        return tests
    
    def _generate_missing_parameter_tests(self, endpoint: APIEndpoint) -> List[TestCase]:
        """
        生成缺失参数的测试用例
        
        Args:
            endpoint: API 端点定义
            
        Returns:
            测试用例列表
        """
        tests = []
        
        required_params = [p for p in endpoint.parameters if p.required]
        
        for param in required_params:
            test_id = self._generate_test_id()
            test = TestCase(
                test_id=test_id,
                test_type=TestType.ERROR,
                endpoint=endpoint.path,
                method=endpoint.method,
                description=f"错误测试 - 缺失必需参数: {param.name}",
                request={
                    "method": endpoint.method,
                    "path": endpoint.path,
                    "missing_parameters": [param.name]
                },
                expected_response={
                    "status_code": "400",
                    "description": f"缺失必需参数: {param.name}"
                },
                tags=["error", "missing_parameter"]
            )
            tests.append(test)
        
        return tests
    
    def _generate_edge_case_tests(self, endpoint: APIEndpoint) -> List[TestCase]:
        """
        生成边界情况测试用例
        
        Args:
            endpoint: API 端点定义
            
        Returns:
            测试用例列表
        """
        tests = []
        
        for param in endpoint.parameters:
            if param.schema:
                schema_type = param.schema.get('type', 'string')
                
                if schema_type == 'string':
                    min_length = param.schema.get('minLength', 0)
                    max_length = param.schema.get('maxLength')
                    pattern = param.schema.get('pattern')
                    
                    if max_length:
                        test = self._create_test_case(
                            endpoint=endpoint,
                            test_type=TestType.EDGE_CASE,
                            description=f"边界测试 - 参数 {param.name} 最大长度 {max_length}",
                            expected_status='200'
                        )
                        tests.append(test)
                    
                    if min_length > 0:
                        test = self._create_test_case(
                            endpoint=endpoint,
                            test_type=TestType.EDGE_CASE,
                            description=f"边界测试 - 参数 {param.name} 最小长度 {min_length}",
                            expected_status='200'
                        )
                        tests.append(test)
                
                elif schema_type in ['integer', 'number']:
                    minimum = param.schema.get('minimum')
                    maximum = param.schema.get('maximum')
                    
                    if minimum is not None:
                        test = self._create_test_case(
                            endpoint=endpoint,
                            test_type=TestType.EDGE_CASE,
                            description=f"边界测试 - 参数 {param.name} 最小值 {minimum}",
                            expected_status='200'
                        )
                        tests.append(test)
                    
                    if maximum is not None:
                        test = self._create_test_case(
                            endpoint=endpoint,
                            test_type=TestType.EDGE_CASE,
                            description=f"边界测试 - 参数 {param.name} 最大值 {maximum}",
                            expected_status='200'
                        )
                        tests.append(test)
        
        return tests
    
    def _create_test_case(
        self,
        endpoint: APIEndpoint,
        test_type: TestType,
        description: str,
        expected_status: str,
        response=None,
        is_error: bool = False
    ) -> TestCase:
        """
        创建测试用例
        
        Args:
            endpoint: API 端点定义
            test_type: 测试类型
            description: 描述
            expected_status: 期望状态码
            response: 响应定义
            is_error: 是否为错误测试
            
        Returns:
            测试用例
        """
        test_id = self._generate_test_id()
        
        request = self._build_request(endpoint, is_error)
        
        expected_response = {
            "status_code": expected_status,
        }
        
        if response:
            expected_response["description"] = response.description
            if response.content:
                expected_response["content_types"] = list(response.content.keys())
        
        tags = [test_type.value]
        if endpoint.tags:
            tags.extend(endpoint.tags)
        
        return TestCase(
            test_id=test_id,
            test_type=test_type,
            endpoint=endpoint.path,
            method=endpoint.method,
            description=description,
            request=request,
            expected_response=expected_response,
            tags=tags
        )
    
    def _build_request(self, endpoint: APIEndpoint, is_error: bool = False) -> Dict[str, Any]:
        """
        构建请求数据
        
        Args:
            endpoint: API 端点定义
            is_error: 是否为错误测试
            
        Returns:
            请求数据
        """
        request = {
            "method": endpoint.method,
            "path": endpoint.path,
            "headers": {},
            "query_params": {},
            "path_params": {},
        }
        
        for param in endpoint.parameters:
            example_value = self._generate_example_value(param.schema, param.example)
            
            if param.location == ParameterLocation.QUERY:
                request["query_params"][param.name] = example_value
            elif param.location == ParameterLocation.HEADER:
                request["headers"][param.name] = example_value
            elif param.location == ParameterLocation.PATH:
                path_value = self._generate_path_param_value(param.name)
                request["path_params"][param.name] = path_value
        
        if endpoint.request_body and endpoint.method in ['POST', 'PUT', 'PATCH']:
            request_body = endpoint.request_body
            content = request_body.get('content', {})
            
            for content_type, media_type in content.items():
                schema = media_type.get('schema', {})
                example = self._generate_example_from_schema(schema)
                
                request["body"] = example
                request["content_type"] = content_type
                break
        
        return request
    
    def _generate_example_value(self, schema: Dict[str, Any], example: Any = None) -> Any:
        """
        根据 Schema 生成示例值
        
        Args:
            schema: Schema 定义
            example: 可选的示例值
            
        Returns:
            示例值
        """
        if example is not None:
            return example
        
        if not schema:
            return "example_value"
        
        schema_type = schema.get('type', 'string')
        
        if 'enum' in schema:
            return schema['enum'][0]
        
        if 'default' in schema:
            return schema['default']
        
        if schema_type == 'string':
            format_type = schema.get('format')
            if format_type == 'uuid':
                return str(uuid.uuid4())
            elif format_type == 'date':
                return '2024-01-01'
            elif format_type == 'date-time':
                return '2024-01-01T00:00:00Z'
            elif format_type == 'email':
                return 'user@example.com'
            elif format_type == 'uri':
                return 'https://example.com'
            else:
                min_length = schema.get('minLength', 0)
                max_length = schema.get('maxLength', 20)
                length = min(max(min_length, 5), max_length)
                return 'a' * length
        
        elif schema_type == 'integer':
            minimum = schema.get('minimum', 1)
            maximum = schema.get('maximum', 100)
            return minimum
        
        elif schema_type == 'number':
            return 1.5
        
        elif schema_type == 'boolean':
            return True
        
        elif schema_type == 'array':
            items = schema.get('items', {})
            min_items = schema.get('minItems', 1)
            result = []
            for _ in range(min_items):
                result.append(self._generate_example_from_schema(items))
            return result
        
        elif schema_type == 'object':
            return self._generate_example_from_schema(schema)
        
        return None
    
    def _generate_example_from_schema(self, schema: Dict[str, Any]) -> Any:
        """
        从 Schema 生成示例
        
        Args:
            schema: Schema 定义
            
        Returns:
            示例数据
        """
        if not schema:
            return {}
        
        if '$ref' in schema:
            ref = schema['$ref']
            schema_name = ref.split('/')[-1]
            if schema_name in self.schemas:
                return self._generate_example_from_schema(self.schemas[schema_name])
        
        schema_type = schema.get('type', 'object')
        
        if 'example' in schema:
            return schema['example']
        
        if 'examples' in schema:
            examples = schema['examples']
            if examples:
                first_key = next(iter(examples.keys()))
                return examples[first_key].get('value', {})
        
        if schema_type == 'object':
            result = {}
            properties = schema.get('properties', {})
            required = schema.get('required', [])
            
            for prop_name, prop_schema in properties.items():
                if prop_name in required or len(result) < 3:
                    result[prop_name] = self._generate_example_value(prop_schema)
            
            return result
        
        elif schema_type == 'array':
            items = schema.get('items', {})
            return [self._generate_example_from_schema(items)]
        
        return self._generate_example_value(schema)
    
    def _generate_path_param_value(self, param_name: str) -> str:
        """
        生成路径参数值
        
        Args:
            param_name: 参数名
            
        Returns:
            参数值
        """
        param_lower = param_name.lower()
        
        if 'id' in param_lower:
            return str(uuid.uuid4())
        elif 'name' in param_lower:
            return 'example-name'
        elif 'version' in param_lower:
            return 'v1'
        else:
            return f"test-{param_lower}"
    
    def _generate_test_id(self) -> str:
        """
        生成测试 ID
        
        Returns:
            测试 ID
        """
        self._test_counter += 1
        return f"test-{self._test_counter:04d}"
    
    def export_tests_as_json(self, tests: List[TestCase]) -> str:
        """
        将测试用例导出为 JSON 格式
        
        Args:
            tests: 测试用例列表
            
        Returns:
            JSON 字符串
        """
        test_dicts = []
        
        for test in tests:
            test_dict = {
                "test_id": test.test_id,
                "test_type": test.test_type.value,
                "endpoint": test.endpoint,
                "method": test.method,
                "description": test.description,
                "request": test.request,
                "expected_response": test.expected_response,
                "tags": test.tags
            }
            test_dicts.append(test_dict)
        
        return json.dumps(test_dicts, indent=2, ensure_ascii=False)
    
    def export_tests_as_python(self, tests: List[TestCase], base_url: str = None) -> str:
        """
        将测试用例导出为 Python 代码
        
        Args:
            tests: 测试用例列表
            base_url: 基础 URL
            
        Returns:
            Python 代码字符串
        """
        if base_url is None and self.spec.servers:
            base_url = self.spec.servers[0].get('url', 'http://localhost:8080')
        
        lines = [
            '"""',
            '自动生成的 API 测试用例',
            f'基于 OpenAPI 规范: {self.spec.title} v{self.spec.version}',
            '"""',
            '',
            'import pytest',
            'import requests',
            'import json',
            '',
            f'BASE_URL = "{base_url}"',
            '',
            '',
            'class TestGeneratedAPI:',
            '    """自动生成的 API 测试类"""',
            '',
        ]
        
        for test in tests:
            test_name = f"test_{test.test_id}_{test.test_type.value}_{test.method.lower()}"
            test_name = re.sub(r'[^a-zA-Z0-9_]', '_', test_name)
            
            lines.append(f'    def {test_name}(self):')
            lines.append(f'        """{test.description}"""')
            lines.append('')
            
            lines.append(f'        method = "{test.method}"')
            lines.append(f'        path = "{test.endpoint}"')
            lines.append('')
            
            path_params = test.request.get('path_params', {})
            if path_params:
                lines.append('        # 路径参数')
                for key, value in path_params.items():
                    if isinstance(value, str):
                        lines.append(f'        path = path.replace("{{{key}}}", "{value}")')
                    else:
                        lines.append(f'        path = path.replace("{{{key}}}", str({value}))')
                lines.append('')
            
            lines.append(f'        url = f"{{BASE_URL}}{{path}}"')
            lines.append('')
            
            headers = test.request.get('headers', {})
            if headers:
                lines.append('        headers = {')
                for key, value in headers.items():
                    lines.append(f'            "{key}": "{value}",')
                lines.append('        }')
                lines.append('')
            else:
                lines.append('        headers = {}')
                lines.append('')
            
            query_params = test.request.get('query_params', {})
            if query_params:
                lines.append('        params = {')
                for key, value in query_params.items():
                    if isinstance(value, str):
                        lines.append(f'            "{key}": "{value}",')
                    else:
                        lines.append(f'            "{key}": {value},')
                lines.append('        }')
                lines.append('')
            else:
                lines.append('        params = {}')
                lines.append('')
            
            body = test.request.get('body')
            if body:
                lines.append('        json_body = {')
                lines.extend(self._format_dict_as_python(body, indent=12))
                lines.append('        }')
                lines.append('')
                lines.append('        response = requests.request(')
                lines.append('            method=method,')
                lines.append('            url=url,')
                lines.append('            headers=headers,')
                lines.append('            params=params,')
                lines.append('            json=json_body')
                lines.append('        )')
            else:
                lines.append('        response = requests.request(')
                lines.append('            method=method,')
                lines.append('            url=url,')
                lines.append('            headers=headers,')
                lines.append('            params=params')
                lines.append('        )')
            
            lines.append('')
            
            expected_status = test.expected_response.get('status_code', '200')
            if expected_status.isdigit():
                lines.append(f'        assert response.status_code == {expected_status}')
            else:
                lines.append(f'        # 期望状态码: {expected_status}')
                lines.append('        # assert response.status_code in [200, 201, 204]')
            
            lines.append('')
        
        return '\n'.join(lines)
    
    def _format_dict_as_python(self, data: Any, indent: int = 0) -> List[str]:
        """
        将字典格式化为 Python 代码
        
        Args:
            data: 数据
            indent: 缩进级别
            
        Returns:
            代码行列表
        """
        lines = []
        indent_str = ' ' * indent
        
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str):
                    lines.append(f'{indent_str}"{key}": "{value}",')
                elif isinstance(value, dict):
                    lines.append(f'{indent_str}"{key}": {{')
                    lines.extend(self._format_dict_as_python(value, indent + 4))
                    lines.append(f'{indent_str}}},')
                elif isinstance(value, list):
                    lines.append(f'{indent_str}"{key}": [')
                    for item in value:
                        if isinstance(item, str):
                            lines.append(f'{indent_str}    "{item}",')
                        else:
                            lines.append(f'{indent_str}    {item},')
                    lines.append(f'{indent_str}],')
                else:
                    lines.append(f'{indent_str}"{key}": {value},')
        
        return lines

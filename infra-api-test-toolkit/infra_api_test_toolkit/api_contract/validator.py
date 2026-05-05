"""
API 响应验证器
验证 API 实际响应是否符合契约定义
"""

import json
import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

try:
    import jsonschema
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

from .spec_parser import APISpec, APIEndpoint, APIResponse


class ValidationErrorType(Enum):
    STATUS_CODE_MISMATCH = "status_code_mismatch"
    SCHEMA_MISMATCH = "schema_mismatch"
    HEADER_MISSING = "header_missing"
    HEADER_VALUE_MISMATCH = "header_value_mismatch"
    CONTENT_TYPE_MISMATCH = "content_type_mismatch"
    BODY_MISMATCH = "body_mismatch"
    REQUIRED_FIELD_MISSING = "required_field_missing"
    TYPE_MISMATCH = "type_mismatch"


@dataclass
class ValidationError:
    """
    验证错误数据类
    """
    error_type: ValidationErrorType
    message: str
    path: str = ""
    expected: Optional[Any] = None
    actual: Optional[Any] = None


@dataclass
class ValidationResult:
    """
    验证结果数据类
    """
    is_valid: bool
    endpoint: str
    method: str
    status_code: int
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    response_time_ms: Optional[float] = None


class ResponseValidator:
    """
    API 响应验证器
    """
    
    def __init__(self, spec: APISpec):
        """
        初始化验证器
        
        Args:
            spec: API 规范
        """
        self.spec = spec
        self.schemas = spec.schemas
    
    def validate_response(
        self,
        endpoint_path: str,
        method: str,
        actual_response: Dict[str, Any],
        actual_status_code: int,
        actual_headers: Dict[str, str] = None,
        response_time_ms: float = None
    ) -> ValidationResult:
        """
        验证 API 响应
        
        Args:
            endpoint_path: 端点路径
            method: HTTP 方法
            actual_response: 实际响应体
            actual_status_code: 实际状态码
            actual_headers: 实际响应头
            response_time_ms: 响应时间（毫秒）
            
        Returns:
            验证结果
        """
        endpoint = self._find_endpoint(endpoint_path, method)
        
        if not endpoint:
            return ValidationResult(
                is_valid=False,
                endpoint=endpoint_path,
                method=method,
                status_code=actual_status_code,
                errors=[
                    ValidationError(
                        error_type=ValidationErrorType.SCHEMA_MISMATCH,
                        message=f"未找到端点定义: {method} {endpoint_path}"
                    )
                ],
                response_time_ms=response_time_ms
            )
        
        result = ValidationResult(
            is_valid=True,
            endpoint=endpoint_path,
            method=method,
            status_code=actual_status_code,
            response_time_ms=response_time_ms
        )
        
        status_errors = self._validate_status_code(endpoint, actual_status_code)
        result.errors.extend(status_errors)
        if status_errors:
            result.is_valid = False
        
        expected_response = self._get_expected_response(endpoint, actual_status_code)
        
        if expected_response:
            if actual_headers:
                header_errors = self._validate_headers(expected_response, actual_headers)
                result.errors.extend(header_errors)
                if header_errors:
                    result.is_valid = False
            
            if actual_response is not None:
                schema_errors = self._validate_response_body(
                    expected_response, 
                    actual_response,
                    actual_headers
                )
                result.errors.extend(schema_errors)
                if schema_errors:
                    result.is_valid = False
        
        return result
    
    def _find_endpoint(self, path: str, method: str) -> Optional[APIEndpoint]:
        """
        查找端点定义
        
        Args:
            path: 路径
            method: HTTP 方法
            
        Returns:
            端点定义或 None
        """
        method_upper = method.upper()
        
        for endpoint in self.spec.endpoints:
            if endpoint.method == method_upper:
                if self._paths_match(endpoint.path, path):
                    return endpoint
        
        return None
    
    def _paths_match(self, template_path: str, actual_path: str) -> bool:
        """
        检查路径是否匹配
        
        Args:
            template_path: 模板路径（如 /users/{id}）
            actual_path: 实际路径（如 /users/123）
            
        Returns:
            是否匹配
        """
        if template_path == actual_path:
            return True
        
        template_parts = template_path.split('/')
        actual_parts = actual_path.split('/')
        
        if len(template_parts) != len(actual_parts):
            return False
        
        for template_part, actual_part in zip(template_parts, actual_parts):
            if template_part.startswith('{') and template_part.endswith('}'):
                continue
            if template_part != actual_part:
                return False
        
        return True
    
    def _validate_status_code(
        self, 
        endpoint: APIEndpoint, 
        actual_status_code: int
    ) -> List[ValidationError]:
        """
        验证状态码
        
        Args:
            endpoint: 端点定义
            actual_status_code: 实际状态码
            
        Returns:
            错误列表
        """
        errors = []
        actual_str = str(actual_status_code)
        
        expected_statuses = list(endpoint.responses.keys())
        
        if actual_str in expected_statuses:
            return errors
        
        for expected in expected_statuses:
            if 'X' in expected or 'x' in expected:
                pattern = expected.replace('X', '\\d').replace('x', '\\d')
                if re.match(f'^{pattern}$', actual_str):
                    return errors
        
        if 'default' in expected_statuses:
            return errors
        
        errors.append(ValidationError(
            error_type=ValidationErrorType.STATUS_CODE_MISMATCH,
            message=f"状态码不匹配",
            expected=expected_statuses,
            actual=actual_status_code
        ))
        
        return errors
    
    def _get_expected_response(
        self, 
        endpoint: APIEndpoint, 
        status_code: int
    ) -> Optional[APIResponse]:
        """
        获取期望的响应定义
        
        Args:
            endpoint: 端点定义
            status_code: 状态码
            
        Returns:
            响应定义或 None
        """
        status_str = str(status_code)
        
        if status_str in endpoint.responses:
            return endpoint.responses[status_str]
        
        for expected, response in endpoint.responses.items():
            if 'X' in expected or 'x' in expected:
                pattern = expected.replace('X', '\\d').replace('x', '\\d')
                if re.match(f'^{pattern}$', status_str):
                    return response
        
        if 'default' in endpoint.responses:
            return endpoint.responses['default']
        
        return None
    
    def _validate_headers(
        self, 
        expected_response: APIResponse, 
        actual_headers: Dict[str, str]
    ) -> List[ValidationError]:
        """
        验证响应头
        
        Args:
            expected_response: 期望的响应定义
            actual_headers: 实际响应头
            
        Returns:
            错误列表
        """
        errors = []
        
        actual_headers_lower = {k.lower(): v for k, v in actual_headers.items()}
        
        for header_name, header_def in expected_response.headers.items():
            header_name_lower = header_name.lower()
            
            if header_def.get('required', False):
                if header_name_lower not in actual_headers_lower:
                    errors.append(ValidationError(
                        error_type=ValidationErrorType.HEADER_MISSING,
                        message=f"缺少必需的响应头: {header_name}",
                        path=f"headers.{header_name}"
                    ))
                    continue
            
            if header_name_lower in actual_headers_lower:
                actual_value = actual_headers_lower[header_name_lower]
                
                schema = header_def.get('schema', {})
                if schema:
                    expected_type = schema.get('type')
                    enum_values = schema.get('enum')
                    
                    if enum_values and actual_value not in enum_values:
                        errors.append(ValidationError(
                            error_type=ValidationErrorType.HEADER_VALUE_MISMATCH,
                            message=f"响应头 {header_name} 值不在允许的枚举中",
                            path=f"headers.{header_name}",
                            expected=enum_values,
                            actual=actual_value
                        ))
        
        return errors
    
    def _validate_response_body(
        self, 
        expected_response: APIResponse, 
        actual_response: Any,
        actual_headers: Dict[str, str] = None
    ) -> List[ValidationError]:
        """
        验证响应体
        
        Args:
            expected_response: 期望的响应定义
            actual_response: 实际响应
            actual_headers: 实际响应头
            
        Returns:
            错误列表
        """
        errors = []
        
        if not expected_response.content:
            return errors
        
        content_type = None
        if actual_headers:
            content_type_header = actual_headers.get('content-type', '')
            content_type = content_type_header.split(';')[0].strip()
        
        for expected_content_type, media_type in expected_response.content.items():
            if content_type and expected_content_type != content_type:
                continue
            
            schema = media_type.get('schema', {})
            
            if schema:
                schema_errors = self._validate_against_schema(actual_response, schema)
                errors.extend(schema_errors)
            
            break
        
        return errors
    
    def _validate_against_schema(
        self, 
        data: Any, 
        schema: Dict[str, Any]
    ) -> List[ValidationError]:
        """
        根据 Schema 验证数据
        
        Args:
            data: 数据
            schema: Schema 定义
            
        Returns:
            错误列表
        """
        errors = []
        
        if HAS_JSONSCHEMA:
            try:
                full_schema = self._resolve_schema_refs(schema)
                jsonschema.validate(instance=data, schema=full_schema)
                return []
            except jsonschema.ValidationError as e:
                errors.append(ValidationError(
                    error_type=ValidationErrorType.SCHEMA_MISMATCH,
                    message=f"Schema 验证失败: {e.message}",
                    path=e.json_path,
                    expected=e.schema,
                    actual=e.instance
                ))
                return errors
            except jsonschema.SchemaError as e:
                errors.append(ValidationError(
                    error_type=ValidationErrorType.SCHEMA_MISMATCH,
                    message=f"Schema 定义错误: {e.message}"
                ))
                return errors
        
        return self._simple_schema_validation(data, schema)
    
    def _simple_schema_validation(
        self, 
        data: Any, 
        schema: Dict[str, Any],
        path: str = ""
    ) -> List[ValidationError]:
        """
        简单的 Schema 验证（当 jsonschema 不可用时）
        
        Args:
            data: 数据
            schema: Schema 定义
            path: 当前路径
            
        Returns:
            错误列表
        """
        errors = []
        
        if not schema:
            return errors
        
        schema = self._resolve_schema_ref(schema)
        
        schema_type = schema.get('type')
        enum_values = schema.get('enum')
        
        if enum_values is not None:
            if data not in enum_values:
                errors.append(ValidationError(
                    error_type=ValidationErrorType.SCHEMA_MISMATCH,
                    message=f"值不在枚举范围内",
                    path=path,
                    expected=enum_values,
                    actual=data
                ))
                return errors
        
        if schema_type:
            type_errors = self._validate_type(data, schema_type, path)
            errors.extend(type_errors)
            if type_errors:
                return errors
        
        if schema_type == 'object' and isinstance(data, dict):
            required = schema.get('required', [])
            properties = schema.get('properties', {})
            
            for required_prop in required:
                if required_prop not in data:
                    prop_path = f"{path}.{required_prop}" if path else required_prop
                    errors.append(ValidationError(
                        error_type=ValidationErrorType.REQUIRED_FIELD_MISSING,
                        message=f"缺少必需字段: {required_prop}",
                        path=prop_path
                    ))
            
            for prop_name, prop_value in data.items():
                if prop_name in properties:
                    prop_path = f"{path}.{prop_name}" if path else prop_name
                    prop_errors = self._simple_schema_validation(
                        prop_value, 
                        properties[prop_name],
                        prop_path
                    )
                    errors.extend(prop_errors)
        
        elif schema_type == 'array' and isinstance(data, list):
            items = schema.get('items', {})
            
            min_items = schema.get('minItems')
            max_items = schema.get('maxItems')
            
            if min_items is not None and len(data) < min_items:
                errors.append(ValidationError(
                    error_type=ValidationErrorType.SCHEMA_MISMATCH,
                    message=f"数组长度小于最小值",
                    path=path,
                    expected=f">= {min_items}",
                    actual=len(data)
                ))
            
            if max_items is not None and len(data) > max_items:
                errors.append(ValidationError(
                    error_type=ValidationErrorType.SCHEMA_MISMATCH,
                    message=f"数组长度大于最大值",
                    path=path,
                    expected=f"<= {max_items}",
                    actual=len(data)
                ))
            
            for i, item in enumerate(data):
                item_path = f"{path}[{i}]" if path else f"[{i}]"
                item_errors = self._simple_schema_validation(item, items, item_path)
                errors.extend(item_errors)
        
        elif schema_type == 'string' and isinstance(data, str):
            min_length = schema.get('minLength')
            max_length = schema.get('maxLength')
            pattern = schema.get('pattern')
            format_type = schema.get('format')
            
            if min_length is not None and len(data) < min_length:
                errors.append(ValidationError(
                    error_type=ValidationErrorType.SCHEMA_MISMATCH,
                    message=f"字符串长度小于最小值",
                    path=path,
                    expected=f">= {min_length}",
                    actual=len(data)
                ))
            
            if max_length is not None and len(data) > max_length:
                errors.append(ValidationError(
                    error_type=ValidationErrorType.SCHEMA_MISMATCH,
                    message=f"字符串长度大于最大值",
                    path=path,
                    expected=f"<= {max_length}",
                    actual=len(data)
                ))
            
            if pattern:
                if not re.match(pattern, data):
                    errors.append(ValidationError(
                        error_type=ValidationErrorType.SCHEMA_MISMATCH,
                        message=f"字符串不匹配正则表达式",
                        path=path,
                        expected=pattern,
                        actual=data
                    ))
            
            if format_type:
                format_errors = self._validate_format(data, format_type, path)
                errors.extend(format_errors)
        
        elif schema_type in ['integer', 'number']:
            if isinstance(data, (int, float)):
                minimum = schema.get('minimum')
                maximum = schema.get('maximum')
                exclusive_minimum = schema.get('exclusiveMinimum')
                exclusive_maximum = schema.get('exclusiveMaximum')
                multiple_of = schema.get('multipleOf')
                
                if minimum is not None and data < minimum:
                    errors.append(ValidationError(
                        error_type=ValidationErrorType.SCHEMA_MISMATCH,
                        message=f"数值小于最小值",
                        path=path,
                        expected=f">= {minimum}",
                        actual=data
                    ))
                
                if maximum is not None and data > maximum:
                    errors.append(ValidationError(
                        error_type=ValidationErrorType.SCHEMA_MISMATCH,
                        message=f"数值大于最大值",
                        path=path,
                        expected=f"<= {maximum}",
                        actual=data
                    ))
                
                if exclusive_minimum is not None and data <= exclusive_minimum:
                    errors.append(ValidationError(
                        error_type=ValidationErrorType.SCHEMA_MISMATCH,
                        message=f"数值小于等于排他最小值",
                        path=path,
                        expected=f"> {exclusive_minimum}",
                        actual=data
                    ))
                
                if exclusive_maximum is not None and data >= exclusive_maximum:
                    errors.append(ValidationError(
                        error_type=ValidationErrorType.SCHEMA_MISMATCH,
                        message=f"数值大于等于排他最大值",
                        path=path,
                        expected=f"< {exclusive_maximum}",
                        actual=data
                    ))
                
                if multiple_of is not None:
                    if data % multiple_of != 0:
                        errors.append(ValidationError(
                            error_type=ValidationErrorType.SCHEMA_MISMATCH,
                            message=f"数值不是指定值的倍数",
                            path=path,
                            expected=f"multiple of {multiple_of}",
                            actual=data
                        ))
        
        return errors
    
    def _validate_type(
        self, 
        data: Any, 
        expected_type: str,
        path: str
    ) -> List[ValidationError]:
        """
        验证数据类型
        
        Args:
            data: 数据
            expected_type: 期望类型
            path: 路径
            
        Returns:
            错误列表
        """
        errors = []
        
        type_mapping = {
            'string': str,
            'integer': int,
            'number': (int, float),
            'boolean': bool,
            'array': list,
            'object': dict,
            'null': type(None)
        }
        
        if expected_type in type_mapping:
            expected_python_type = type_mapping[expected_type]
            
            if expected_type == 'integer' and isinstance(data, bool):
                pass
            elif expected_type == 'number' and isinstance(data, bool):
                pass
            elif not isinstance(data, expected_python_type):
                actual_type = type(data).__name__
                errors.append(ValidationError(
                    error_type=ValidationErrorType.TYPE_MISMATCH,
                    message=f"类型不匹配",
                    path=path,
                    expected=expected_type,
                    actual=actual_type
                ))
        
        return errors
    
    def _validate_format(
        self, 
        data: str, 
        format_type: str,
        path: str
    ) -> List[ValidationError]:
        """
        验证字符串格式
        
        Args:
            data: 字符串数据
            format_type: 格式类型
            path: 路径
            
        Returns:
            错误列表
        """
        errors = []
        
        format_patterns = {
            'date': r'^\d{4}-\d{2}-\d{2}$',
            'time': r'^\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z)?$',
            'date-time': r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z)?$',
            'email': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
            'uuid': r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
            'uri': r'^https?://.+$',
            'hostname': r'^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$',
            'ipv4': r'^(\d{1,3}\.){3}\d{1,3}$',
            'ipv6': r'^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$',
        }
        
        if format_type in format_patterns:
            pattern = format_patterns[format_type]
            if not re.match(pattern, data, re.IGNORECASE):
                errors.append(ValidationError(
                    error_type=ValidationErrorType.SCHEMA_MISMATCH,
                    message=f"字符串格式不匹配",
                    path=path,
                    expected=f"format: {format_type}",
                    actual=data
                ))
        
        return errors
    
    def _resolve_schema_refs(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        解析 Schema 中的 $ref 引用
        
        Args:
            schema: Schema 定义
            
        Returns:
            解析后的 Schema
        """
        if not isinstance(schema, dict):
            return schema
        
        if '$ref' in schema:
            return self._resolve_schema_ref(schema)
        
        result = {}
        for key, value in schema.items():
            if isinstance(value, dict):
                result[key] = self._resolve_schema_refs(value)
            elif isinstance(value, list):
                result[key] = [self._resolve_schema_refs(item) if isinstance(item, dict) else item for item in value]
            else:
                result[key] = value
        
        return result
    
    def _resolve_schema_ref(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        解析单个 $ref 引用
        
        Args:
            schema: 包含 $ref 的 Schema
            
        Returns:
            解析后的 Schema
        """
        if '$ref' not in schema:
            return schema
        
        ref = schema['$ref']
        
        if ref.startswith('#/components/schemas/'):
            schema_name = ref.split('/')[-1]
            if schema_name in self.schemas:
                resolved = self._resolve_schema_refs(self.schemas[schema_name])
                return {**schema, **resolved}
        
        return schema

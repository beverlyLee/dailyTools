"""
契约漂移检测器
检测 API 实现与文档不一致的情况
"""

import json
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from .spec_parser import APISpec, APIEndpoint
from .validator import ResponseValidator, ValidationError, ValidationResult


class DriftType(Enum):
    ENDPOINT_MISSING = "endpoint_missing"
    ENDPOINT_ADDED = "endpoint_added"
    METHOD_MISMATCH = "method_mismatch"
    RESPONSE_SCHEMA_CHANGED = "response_schema_changed"
    REQUEST_SCHEMA_CHANGED = "request_schema_changed"
    STATUS_CODE_MISMATCH = "status_code_mismatch"
    PARAMETER_MISSING = "parameter_missing"
    PARAMETER_ADDED = "parameter_added"
    PARAMETER_TYPE_CHANGED = "parameter_type_changed"


@dataclass
class ContractDrift:
    """
    契约漂移数据类
    """
    drift_type: DriftType
    endpoint: str
    method: str
    message: str
    expected: Optional[Any] = None
    actual: Optional[Any] = None
    severity: str = "medium"
    location: str = ""


@dataclass
class DriftDetectionResult:
    """
    漂移检测结果数据类
    """
    spec_title: str
    spec_version: str
    detection_time: str
    total_endpoints: int
    tested_endpoints: int
    drifts: List[ContractDrift] = field(default_factory=list)
    has_critical_drifts: bool = False
    has_high_drifts: bool = False


class ContractDriftDetector:
    """
    契约漂移检测器
    """
    
    def __init__(self, spec: APISpec):
        """
        初始化漂移检测器
        
        Args:
            spec: API 规范
        """
        self.spec = spec
        self.validator = ResponseValidator(spec)
        self._baseline: Optional[Dict[str, Any]] = None
    
    def set_baseline(self, baseline_data: Dict[str, Any]):
        """
        设置基线数据（用于检测变化）
        
        Args:
            baseline_data: 基线数据
        """
        self._baseline = baseline_data
    
    def detect_from_actual_responses(
        self, 
        actual_responses: List[Dict[str, Any]]
    ) -> DriftDetectionResult:
        """
        根据实际响应检测契约漂移
        
        Args:
            actual_responses: 实际响应列表，每个响应包含:
                - endpoint: 端点路径
                - method: HTTP 方法
                - status_code: 状态码
                - body: 响应体
                - headers: 响应头
                - request_body: 请求体（可选）
                - query_params: 查询参数（可选）
            
        Returns:
            漂移检测结果
        """
        result = DriftDetectionResult(
            spec_title=self.spec.title,
            spec_version=self.spec.version,
            detection_time=datetime.now().isoformat(),
            total_endpoints=len(self.spec.endpoints),
            tested_endpoints=len(actual_responses)
        )
        
        tested_endpoints = set()
        
        for response_data in actual_responses:
            endpoint = response_data.get('endpoint', '')
            method = response_data.get('method', 'GET')
            status_code = response_data.get('status_code', 200)
            body = response_data.get('body')
            headers = response_data.get('headers', {})
            
            tested_endpoints.add((endpoint, method.upper()))
            
            validation_result = self.validator.validate_response(
                endpoint_path=endpoint,
                method=method,
                actual_response=body,
                actual_status_code=status_code,
                actual_headers=headers
            )
            
            for error in validation_result.errors:
                drift = self._convert_error_to_drift(error, endpoint, method)
                if drift:
                    result.drifts.append(drift)
        
        for spec_endpoint in self.spec.endpoints:
            key = (spec_endpoint.path, spec_endpoint.method)
            if key not in tested_endpoints:
                result.drifts.append(ContractDrift(
                    drift_type=DriftType.ENDPOINT_MISSING,
                    endpoint=spec_endpoint.path,
                    method=spec_endpoint.method,
                    message=f"端点 {spec_endpoint.method} {spec_endpoint.path} 在规范中定义但未被测试",
                    severity="low"
                ))
        
        result.has_critical_drifts = any(
            d.severity == "critical" for d in result.drifts
        )
        result.has_high_drifts = any(
            d.severity in ["critical", "high"] for d in result.drifts
        )
        
        return result
    
    def detect_from_spec_comparison(
        self, 
        other_spec: APISpec
    ) -> DriftDetectionResult:
        """
        通过比较两个规范版本检测契约漂移
        
        Args:
            other_spec: 另一个版本的 API 规范
            
        Returns:
            漂移检测结果
        """
        result = DriftDetectionResult(
            spec_title=self.spec.title,
            spec_version=self.spec.version,
            detection_time=datetime.now().isoformat(),
            total_endpoints=len(self.spec.endpoints),
            tested_endpoints=len(self.spec.endpoints)
        )
        
        current_endpoints = {
            (e.path, e.method): e for e in self.spec.endpoints
        }
        other_endpoints = {
            (e.path, e.method): e for e in other_spec.endpoints
        }
        
        for key, endpoint in current_endpoints.items():
            if key not in other_endpoints:
                result.drifts.append(ContractDrift(
                    drift_type=DriftType.ENDPOINT_ADDED,
                    endpoint=endpoint.path,
                    method=endpoint.method,
                    message=f"端点 {endpoint.method} {endpoint.path} 在新版本中新增",
                    severity="low"
                ))
            else:
                other_endpoint = other_endpoints[key]
                endpoint_drifts = self._compare_endpoints(endpoint, other_endpoint)
                result.drifts.extend(endpoint_drifts)
        
        for key, endpoint in other_endpoints.items():
            if key not in current_endpoints:
                result.drifts.append(ContractDrift(
                    drift_type=DriftType.ENDPOINT_MISSING,
                    endpoint=endpoint.path,
                    method=endpoint.method,
                    message=f"端点 {endpoint.method} {endpoint.path} 在新版本中已移除",
                    severity="high"
                ))
        
        result.has_critical_drifts = any(
            d.severity == "critical" for d in result.drifts
        )
        result.has_high_drifts = any(
            d.severity in ["critical", "high"] for d in result.drifts
        )
        
        return result
    
    def _compare_endpoints(
        self, 
        current: APIEndpoint, 
        previous: APIEndpoint
    ) -> List[ContractDrift]:
        """
        比较两个端点定义
        
        Args:
            current: 当前端点
            previous: 之前的端点
            
        Returns:
            漂移列表
        """
        drifts = []
        
        current_params = {p.name: p for p in current.parameters}
        previous_params = {p.name: p for p in previous.parameters}
        
        for param_name, param in current_params.items():
            if param_name not in previous_params:
                drifts.append(ContractDrift(
                    drift_type=DriftType.PARAMETER_ADDED,
                    endpoint=current.path,
                    method=current.method,
                    message=f"参数 {param_name} 已新增",
                    location=f"parameters.{param_name}",
                    severity="low"
                ))
            else:
                previous_param = previous_params[param_name]
                current_schema = param.schema
                previous_schema = previous_param.schema
                
                if current_schema.get('type') != previous_schema.get('type'):
                    drifts.append(ContractDrift(
                        drift_type=DriftType.PARAMETER_TYPE_CHANGED,
                        endpoint=current.path,
                        method=current.method,
                        message=f"参数 {param_name} 类型已变更",
                        expected=previous_schema.get('type'),
                        actual=current_schema.get('type'),
                        location=f"parameters.{param_name}.type",
                        severity="high"
                    ))
                
                if param.required != previous_param.required:
                    if param.required and not previous_param.required:
                        drifts.append(ContractDrift(
                            drift_type=DriftType.PARAMETER_MISSING,
                            endpoint=current.path,
                            method=current.method,
                            message=f"参数 {param_name} 现在变为必需参数",
                            location=f"parameters.{param_name}.required",
                            severity="high"
                        ))
        
        for param_name in previous_params:
            if param_name not in current_params:
                drifts.append(ContractDrift(
                    drift_type=DriftType.PARAMETER_MISSING,
                    endpoint=current.path,
                    method=current.method,
                    message=f"参数 {param_name} 已移除",
                    location=f"parameters.{param_name}",
                    severity="high"
                ))
        
        current_responses = set(current.responses.keys())
        previous_responses = set(previous.responses.keys())
        
        for status_code in current_responses - previous_responses:
            drifts.append(ContractDrift(
                drift_type=DriftType.STATUS_CODE_MISMATCH,
                endpoint=current.path,
                method=current.method,
                message=f"新增响应状态码: {status_code}",
                actual=status_code,
                location=f"responses.{status_code}",
                severity="low"
            ))
        
        for status_code in previous_responses - current_responses:
            drifts.append(ContractDrift(
                drift_type=DriftType.STATUS_CODE_MISMATCH,
                endpoint=current.path,
                method=current.method,
                message=f"已移除响应状态码: {status_code}",
                expected=status_code,
                location=f"responses.{status_code}",
                severity="high"
            ))
        
        for status_code in current_responses & previous_responses:
            current_response = current.responses[status_code]
            previous_response = previous.responses[status_code]
            
            current_content_types = set(current_response.content.keys())
            previous_content_types = set(previous_response.content.keys())
            
            for content_type in current_content_types & previous_content_types:
                current_schema = current_response.content[content_type].get('schema', {})
                previous_schema = previous_response.content[content_type].get('schema', {})
                
                schema_drifts = self._compare_schemas(
                    current_schema, 
                    previous_schema,
                    current.path,
                    current.method,
                    f"responses.{status_code}.content.{content_type}.schema"
                )
                drifts.extend(schema_drifts)
        
        return drifts
    
    def _compare_schemas(
        self, 
        current_schema: Dict[str, Any], 
        previous_schema: Dict[str, Any],
        endpoint: str,
        method: str,
        location_prefix: str
    ) -> List[ContractDrift]:
        """
        比较两个 Schema 定义
        
        Args:
            current_schema: 当前 Schema
            previous_schema: 之前的 Schema
            endpoint: 端点路径
            method: HTTP 方法
            location_prefix: 位置前缀
            
        Returns:
            漂移列表
        """
        drifts = []
        
        if not current_schema or not previous_schema:
            return drifts
        
        current_type = current_schema.get('type')
        previous_type = previous_schema.get('type')
        
        if current_type != previous_type:
            drifts.append(ContractDrift(
                drift_type=DriftType.RESPONSE_SCHEMA_CHANGED,
                endpoint=endpoint,
                method=method,
                message=f"Schema 类型已变更",
                expected=previous_type,
                actual=current_type,
                location=f"{location_prefix}.type",
                severity="high"
            ))
        
        if current_type == 'object' and previous_type == 'object':
            current_props = current_schema.get('properties', {})
            previous_props = previous_schema.get('properties', {})
            current_required = set(current_schema.get('required', []))
            previous_required = set(previous_schema.get('required', []))
            
            for prop_name in current_props:
                if prop_name not in previous_props:
                    drifts.append(ContractDrift(
                        drift_type=DriftType.RESPONSE_SCHEMA_CHANGED,
                        endpoint=endpoint,
                        method=method,
                        message=f"新增属性: {prop_name}",
                        location=f"{location_prefix}.properties.{prop_name}",
                        severity="low"
                    ))
                else:
                    current_prop_type = current_props[prop_name].get('type')
                    previous_prop_type = previous_props[prop_name].get('type')
                    
                    if current_prop_type != previous_prop_type:
                        drifts.append(ContractDrift(
                            drift_type=DriftType.RESPONSE_SCHEMA_CHANGED,
                            endpoint=endpoint,
                            method=method,
                            message=f"属性 {prop_name} 类型已变更",
                            expected=previous_prop_type,
                            actual=current_prop_type,
                            location=f"{location_prefix}.properties.{prop_name}.type",
                            severity="high"
                        ))
            
            for prop_name in previous_props:
                if prop_name not in current_props:
                    drifts.append(ContractDrift(
                        drift_type=DriftType.RESPONSE_SCHEMA_CHANGED,
                        endpoint=endpoint,
                        method=method,
                        message=f"已移除属性: {prop_name}",
                        location=f"{location_prefix}.properties.{prop_name}",
                        severity="high"
                    ))
            
            for prop_name in current_required - previous_required:
                drifts.append(ContractDrift(
                    drift_type=DriftType.RESPONSE_SCHEMA_CHANGED,
                    endpoint=endpoint,
                    method=method,
                    message=f"属性 {prop_name} 现在变为必需属性",
                    location=f"{location_prefix}.required",
                    severity="high"
                ))
        
        return drifts
    
    def _convert_error_to_drift(
        self, 
        error: ValidationError, 
        endpoint: str, 
        method: str
    ) -> Optional[ContractDrift]:
        """
        将验证错误转换为契约漂移
        
        Args:
            error: 验证错误
            endpoint: 端点路径
            method: HTTP 方法
            
        Returns:
            契约漂移或 None
        """
        error_to_drift = {
            "status_code_mismatch": (DriftType.STATUS_CODE_MISMATCH, "high"),
            "schema_mismatch": (DriftType.RESPONSE_SCHEMA_CHANGED, "high"),
            "header_missing": (DriftType.PARAMETER_MISSING, "medium"),
            "header_value_mismatch": (DriftType.PARAMETER_TYPE_CHANGED, "medium"),
            "content_type_mismatch": (DriftType.RESPONSE_SCHEMA_CHANGED, "high"),
            "body_mismatch": (DriftType.RESPONSE_SCHEMA_CHANGED, "high"),
            "required_field_missing": (DriftType.RESPONSE_SCHEMA_CHANGED, "high"),
            "type_mismatch": (DriftType.RESPONSE_SCHEMA_CHANGED, "high"),
        }
        
        error_type_str = error.error_type.value
        if error_type_str in error_to_drift:
            drift_type, severity = error_to_drift[error_type_str]
            
            return ContractDrift(
                drift_type=drift_type,
                endpoint=endpoint,
                method=method,
                message=error.message,
                expected=error.expected,
                actual=error.actual,
                severity=severity,
                location=error.path
            )
        
        return None
    
    def generate_drift_report(self, result: DriftDetectionResult) -> str:
        """
        生成漂移检测报告
        
        Args:
            result: 漂移检测结果
            
        Returns:
            报告字符串
        """
        lines = [
            "=" * 80,
            "契约漂移检测报告",
            "=" * 80,
            "",
            f"API 规范: {result.spec_title}",
            f"规范版本: {result.spec_version}",
            f"检测时间: {result.detection_time}",
            "",
            f"总端点数: {result.total_endpoints}",
            f"已测试端点数: {result.tested_endpoints}",
            f"发现漂移数: {len(result.drifts)}",
            "",
        ]
        
        if result.has_critical_drifts:
            lines.append("⚠️  发现严重漂移!")
        elif result.has_high_drifts:
            lines.append("⚠️  发现高优先级漂移")
        elif result.drifts:
            lines.append("ℹ️  发现低优先级漂移")
        else:
            lines.append("✅  未发现契约漂移")
        
        lines.append("")
        
        if result.drifts:
            severity_groups = {
                "critical": [],
                "high": [],
                "medium": [],
                "low": []
            }
            
            for drift in result.drifts:
                severity_groups[drift.severity].append(drift)
            
            for severity in ["critical", "high", "medium", "low"]:
                drifts = severity_groups[severity]
                if not drifts:
                    continue
                
                lines.append(f"[{severity.upper()}] 级别漂移 ({len(drifts)} 个):")
                lines.append("-" * 40)
                
                for drift in drifts:
                    lines.append(f"  端点: {drift.method} {drift.endpoint}")
                    lines.append(f"  类型: {drift.drift_type.value}")
                    lines.append(f"  消息: {drift.message}")
                    
                    if drift.expected is not None:
                        lines.append(f"  期望: {drift.expected}")
                    if drift.actual is not None:
                        lines.append(f"  实际: {drift.actual}")
                    if drift.location:
                        lines.append(f"  位置: {drift.location}")
                    
                    lines.append("")
        
        lines.append("=" * 80)
        
        return '\n'.join(lines)

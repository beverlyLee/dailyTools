"""
OpenAPI 规范解析器
支持 OpenAPI 3.0.x 和 3.1.x 版本
"""

import json
import yaml
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class ParameterLocation(Enum):
    QUERY = "query"
    HEADER = "header"
    PATH = "path"
    COOKIE = "cookie"


@dataclass
class Parameter:
    """
    API 参数定义
    """
    name: str
    location: ParameterLocation
    required: bool = False
    schema: Dict[str, Any] = field(default_factory=dict)
    description: Optional[str] = None
    example: Optional[Any] = None


@dataclass
class APIResponse:
    """
    API 响应定义
    """
    status_code: str
    description: Optional[str] = None
    content: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    headers: Dict[str, Dict[str, Any]] = field(default_factory=dict)


@dataclass
class APIEndpoint:
    """
    API 端点定义
    """
    path: str
    method: str
    summary: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    parameters: List[Parameter] = field(default_factory=list)
    request_body: Optional[Dict[str, Any]] = None
    responses: Dict[str, APIResponse] = field(default_factory=dict)
    security: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class APISpec:
    """
    API 规范定义
    """
    openapi_version: str
    title: str
    version: str
    description: Optional[str] = None
    servers: List[Dict[str, Any]] = field(default_factory=list)
    endpoints: List[APIEndpoint] = field(default_factory=list)
    schemas: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    security_schemes: Dict[str, Dict[str, Any]] = field(default_factory=dict)


class OpenAPIParser:
    """
    OpenAPI 规范解析器
    """
    
    def __init__(self):
        """
        初始化解析器
        """
        self.spec = None
    
    def parse_file(self, file_path: str) -> APISpec:
        """
        从文件解析 OpenAPI 规范
        
        Args:
            file_path: 文件路径
            
        Returns:
            解析后的 API 规范
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return self.parse_string(content, file_path)
    
    def parse_string(self, content: str, file_path: str = None) -> APISpec:
        """
        从字符串解析 OpenAPI 规范
        
        Args:
            content: 规范内容
            file_path: 文件路径（用于错误信息）
            
        Returns:
            解析后的 API 规范
        """
        try:
            if content.strip().startswith('{'):
                data = json.loads(content)
            else:
                data = yaml.safe_load(content)
        except Exception as e:
            raise ValueError(f"解析 OpenAPI 规范失败: {e}")
        
        return self._parse_spec(data)
    
    def _parse_spec(self, data: Dict[str, Any]) -> APISpec:
        """
        解析 OpenAPI 规范数据
        
        Args:
            data: 规范数据
            
        Returns:
            解析后的 API 规范
        """
        openapi_version = data.get('openapi', '')
        if not openapi_version:
            swagger_version = data.get('swagger', '')
            if swagger_version:
                raise ValueError("Swagger 2.0 规范不支持，请使用 OpenAPI 3.0+")
            raise ValueError("无效的 OpenAPI 规范：缺少 openapi 版本")
        
        info = data.get('info', {})
        title = info.get('title', 'Untitled API')
        version = info.get('version', '1.0.0')
        description = info.get('description')
        
        servers = data.get('servers', [])
        
        schemas = {}
        components = data.get('components', {})
        if components:
            schemas = components.get('schemas', {})
        
        security_schemes = components.get('securitySchemes', {}) if components else {}
        
        endpoints = []
        paths = data.get('paths', {})
        
        for path, path_item in paths.items():
            if not isinstance(path_item, dict):
                continue
            
            parameters = self._parse_parameters(path_item.get('parameters', []))
            
            for method in ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']:
                operation = path_item.get(method)
                if not isinstance(operation, dict):
                    continue
                
                endpoint = self._parse_operation(
                    path, 
                    method.upper(), 
                    operation, 
                    parameters
                )
                endpoints.append(endpoint)
        
        return APISpec(
            openapi_version=openapi_version,
            title=title,
            version=version,
            description=description,
            servers=servers,
            endpoints=endpoints,
            schemas=schemas,
            security_schemes=security_schemes
        )
    
    def _parse_operation(
        self, 
        path: str, 
        method: str, 
        operation: Dict[str, Any],
        path_parameters: List[Parameter]
    ) -> APIEndpoint:
        """
        解析 API 操作
        
        Args:
            path: 路径
            method: HTTP 方法
            operation: 操作定义
            path_parameters: 路径级参数
            
        Returns:
            API 端点定义
        """
        summary = operation.get('summary')
        description = operation.get('description')
        tags = operation.get('tags', [])
        security = operation.get('security', [])
        
        parameters = path_parameters.copy()
        operation_parameters = self._parse_parameters(operation.get('parameters', []))
        parameters.extend(operation_parameters)
        
        request_body = operation.get('requestBody')
        
        responses = {}
        responses_data = operation.get('responses', {})
        for status_code, response_data in responses_data.items():
            if not isinstance(response_data, dict):
                continue
            
            responses[status_code] = APIResponse(
                status_code=status_code,
                description=response_data.get('description'),
                content=response_data.get('content', {}),
                headers=response_data.get('headers', {})
            )
        
        return APIEndpoint(
            path=path,
            method=method,
            summary=summary,
            description=description,
            tags=tags,
            parameters=parameters,
            request_body=request_body,
            responses=responses,
            security=security
        )
    
    def _parse_parameters(self, parameters_data: List[Dict[str, Any]]) -> List[Parameter]:
        """
        解析参数定义
        
        Args:
            parameters_data: 参数数据列表
            
        Returns:
            参数定义列表
        """
        parameters = []
        
        for param_data in parameters_data:
            if not isinstance(param_data, dict):
                continue
            
            if '$ref' in param_data:
                ref = param_data['$ref']
                pass
            
            name = param_data.get('name', 'unnamed')
            in_str = param_data.get('in', 'query')
            
            try:
                location = ParameterLocation(in_str)
            except ValueError:
                location = ParameterLocation.QUERY
            
            required = param_data.get('required', in_str == 'path')
            schema = param_data.get('schema', {})
            description = param_data.get('description')
            example = param_data.get('example')
            
            parameters.append(Parameter(
                name=name,
                location=location,
                required=required,
                schema=schema,
                description=description,
                example=example
            ))
        
        return parameters
    
    def get_all_endpoints(self) -> List[APIEndpoint]:
        """
        获取所有 API 端点
        
        Returns:
            端点列表
        """
        if not self.spec:
            return []
        return self.spec.endpoints
    
    def get_endpoint_by_path_and_method(self, path: str, method: str) -> Optional[APIEndpoint]:
        """
        根据路径和方法获取端点
        
        Args:
            path: 路径
            method: HTTP 方法
            
        Returns:
            端点定义或 None
        """
        if not self.spec:
            return None
        
        method_upper = method.upper()
        for endpoint in self.spec.endpoints:
            if endpoint.path == path and endpoint.method == method_upper:
                return endpoint
        
        return None
    
    def get_schemas(self) -> Dict[str, Dict[str, Any]]:
        """
        获取所有 schema 定义
        
        Returns:
            Schema 字典
        """
        if not self.spec:
            return {}
        return self.spec.schemas
    
    def get_server_urls(self) -> List[str]:
        """
        获取服务器 URL 列表
        
        Returns:
            URL 列表
        """
        if not self.spec:
            return []
        
        urls = []
        for server in self.spec.servers:
            url = server.get('url', '')
            if url:
                urls.append(url)
        
        return urls

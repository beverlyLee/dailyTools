"""
模拟 API 服务器
支持模拟 API 响应以进行前端并行开发
"""

import json
import re
import threading
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from .spec_parser import APISpec, APIEndpoint


@dataclass
class MockResponse:
    """
    模拟响应数据类
    """
    status_code: int = 200
    headers: Dict[str, str] = field(default_factory=dict)
    body: Any = None
    delay_ms: int = 0


class MockHandler(BaseHTTPRequestHandler):
    """
    模拟请求处理器
    """
    
    spec: APISpec = None
    custom_responses: Dict[str, MockResponse] = field(default_factory=dict)
    default_delay_ms: int = 0
    
    def log_message(self, format, *args):
        """重写日志方法"""
        print(f"[Mock Server] {args[0]}")
    
    def do_GET(self):
        self._handle_request('GET')
    
    def do_POST(self):
        self._handle_request('POST')
    
    def do_PUT(self):
        self._handle_request('PUT')
    
    def do_DELETE(self):
        self._handle_request('DELETE')
    
    def do_PATCH(self):
        self._handle_request('PATCH')
    
    def do_OPTIONS(self):
        self._handle_request('OPTIONS')
    
    def do_HEAD(self):
        self._handle_request('HEAD')
    
    def _handle_request(self, method: str):
        """
        处理请求
        
        Args:
            method: HTTP 方法
        """
        parsed = urlparse(self.path)
        path = parsed.path
        query_params = parse_qs(parsed.query)
        
        custom_key = f"{method}:{path}"
        if custom_key in self.custom_responses:
            response = self.custom_responses[custom_key]
            self._send_response(response)
            return
        
        endpoint = self._find_endpoint(path, method)
        
        if endpoint:
            response = self._generate_mock_response(endpoint, query_params)
            self._send_response(response)
        else:
            self._send_error_response(404, f"Endpoint not found: {method} {path}")
    
    def _find_endpoint(self, path: str, method: str) -> Optional[APIEndpoint]:
        """
        查找端点定义
        
        Args:
            path: 请求路径
            method: HTTP 方法
            
        Returns:
            端点定义或 None
        """
        if not self.spec:
            return None
        
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
            template_path: 模板路径
            actual_path: 实际路径
            
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
    
    def _generate_mock_response(
        self, 
        endpoint: APIEndpoint, 
        query_params: Dict[str, List[str]]
    ) -> MockResponse:
        """
        生成模拟响应
        
        Args:
            endpoint: 端点定义
            query_params: 查询参数
            
        Returns:
            模拟响应
        """
        status_codes = list(endpoint.responses.keys())
        
        preferred_codes = ['200', '201', '204', '2XX']
        selected_code = '200'
        
        for code in preferred_codes:
            if code in status_codes:
                selected_code = code
                break
        
        if not selected_code and status_codes:
            selected_code = status_codes[0]
        
        response_def = endpoint.responses.get(selected_code)
        
        mock_response = MockResponse(
            status_code=int(selected_code) if selected_code.isdigit() else 200,
            delay_ms=self.default_delay_ms
        )
        
        mock_response.headers['Content-Type'] = 'application/json'
        
        if response_def and response_def.content:
            for content_type, media_type in response_def.content.items():
                if 'json' in content_type:
                    schema = media_type.get('schema', {})
                    example = media_type.get('example')
                    
                    if example:
                        mock_response.body = example
                    elif schema:
                        mock_response.body = self._generate_example_from_schema(schema)
                    
                    mock_response.headers['Content-Type'] = content_type
                    break
        
        if mock_response.body is None:
            mock_response.body = {"message": "Mock response"}
        
        return mock_response
    
    def _generate_example_from_schema(self, schema: Dict[str, Any]) -> Any:
        """
        从 Schema 生成示例数据
        
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
            if self.spec and schema_name in self.spec.schemas:
                return self._generate_example_from_schema(self.spec.schemas[schema_name])
        
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
                if prop_name in required or len(result) < 5:
                    result[prop_name] = self._generate_example_from_schema(prop_schema)
            
            return result
        
        elif schema_type == 'array':
            items = schema.get('items', {})
            return [self._generate_example_from_schema(items)]
        
        elif schema_type == 'string':
            format_type = schema.get('format')
            enum_values = schema.get('enum')
            
            if enum_values:
                return enum_values[0]
            
            if format_type == 'uuid':
                return '550e8400-e29b-41d4-a716-446655440000'
            elif format_type == 'date':
                return '2024-01-01'
            elif format_type == 'date-time':
                return '2024-01-01T00:00:00Z'
            elif format_type == 'email':
                return 'user@example.com'
            elif format_type == 'uri':
                return 'https://example.com'
            else:
                return 'example_string'
        
        elif schema_type == 'integer':
            minimum = schema.get('minimum', 1)
            return minimum
        
        elif schema_type == 'number':
            return 1.5
        
        elif schema_type == 'boolean':
            return True
        
        elif schema_type == 'null':
            return None
        
        return None
    
    def _send_response(self, response: MockResponse):
        """
        发送响应
        
        Args:
            response: 模拟响应
        """
        if response.delay_ms > 0:
            import time
            time.sleep(response.delay_ms / 1000.0)
        
        self.send_response(response.status_code)
        
        for header_name, header_value in response.headers.items():
            self.send_header(header_name, header_value)
        
        self.end_headers()
        
        if response.body is not None:
            if isinstance(response.body, (dict, list)):
                body_bytes = json.dumps(response.body, indent=2).encode('utf-8')
            else:
                body_bytes = str(response.body).encode('utf-8')
            
            self.wfile.write(body_bytes)
    
    def _send_error_response(self, status_code: int, message: str):
        """
        发送错误响应
        
        Args:
            status_code: 状态码
            message: 错误消息
        """
        response = MockResponse(
            status_code=status_code,
            headers={'Content-Type': 'application/json'},
            body={'error': message}
        )
        self._send_response(response)


class MockAPIServer:
    """
    模拟 API 服务器
    """
    
    def __init__(self, spec: APISpec, host: str = 'localhost', port: int = 8080):
        """
        初始化模拟服务器
        
        Args:
            spec: API 规范
            host: 主机地址
            port: 端口号
        """
        self.spec = spec
        self.host = host
        self.port = port
        self._server: Optional[HTTPServer] = None
        self._thread: Optional[threading.Thread] = None
        self._custom_responses: Dict[str, MockResponse] = {}
        self._default_delay_ms: int = 0
    
    def start(self, daemon: bool = True):
        """
        启动服务器
        
        Args:
            daemon: 是否作为守护线程运行
        """
        if self._server:
            return
        
        MockHandler.spec = self.spec
        MockHandler.custom_responses = self._custom_responses
        MockHandler.default_delay_ms = self._default_delay_ms
        
        self._server = HTTPServer((self.host, self.port), MockHandler)
        
        self._thread = threading.Thread(target=self._run_server, daemon=daemon)
        self._thread.start()
        
        print(f"[Mock Server] Started on http://{self.host}:{self.port}")
        print(f"[Mock Server] Serving {len(self.spec.endpoints)} endpoints from {self.spec.title}")
    
    def _run_server(self):
        """
        运行服务器（在线程中）
        """
        if self._server:
            self._server.serve_forever()
    
    def stop(self):
        """
        停止服务器
        """
        if self._server:
            self._server.shutdown()
            self._server.server_close()
            self._server = None
            print("[Mock Server] Stopped")
    
    def is_running(self) -> bool:
        """
        检查服务器是否正在运行
        
        Returns:
            是否运行
        """
        return self._server is not None
    
    def set_custom_response(
        self, 
        method: str, 
        path: str, 
        response: MockResponse
    ):
        """
        设置自定义响应
        
        Args:
            method: HTTP 方法
            path: 路径
            response: 模拟响应
        """
        key = f"{method.upper()}:{path}"
        self._custom_responses[key] = response
        
        if self._server:
            MockHandler.custom_responses = self._custom_responses
    
    def clear_custom_response(self, method: str, path: str):
        """
        清除自定义响应
        
        Args:
            method: HTTP 方法
            path: 路径
        """
        key = f"{method.upper()}:{path}"
        if key in self._custom_responses:
            del self._custom_responses[key]
            
            if self._server:
                MockHandler.custom_responses = self._custom_responses
    
    def clear_all_custom_responses(self):
        """
        清除所有自定义响应
        """
        self._custom_responses.clear()
        
        if self._server:
            MockHandler.custom_responses = self._custom_responses
    
    def set_default_delay(self, delay_ms: int):
        """
        设置默认延迟
        
        Args:
            delay_ms: 延迟（毫秒）
        """
        self._default_delay_ms = delay_ms
        
        if self._server:
            MockHandler.default_delay_ms = delay_ms
    
    def get_endpoints(self) -> List[Dict[str, Any]]:
        """
        获取所有端点信息
        
        Returns:
            端点列表
        """
        endpoints = []
        
        for endpoint in self.spec.endpoints:
            endpoints.append({
                'method': endpoint.method,
                'path': endpoint.path,
                'summary': endpoint.summary,
                'tags': endpoint.tags,
                'responses': list(endpoint.responses.keys())
            })
        
        return endpoints
    
    def get_base_url(self) -> str:
        """
        获取基础 URL
        
        Returns:
            基础 URL
        """
        return f"http://{self.host}:{self.port}"

"""
OpenAPI 规范解析器单元测试
"""

import os
import sys
import pytest
import tempfile
import json
import yaml

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infra_api_test_toolkit.api_contract.spec_parser import (
    OpenAPIParser,
    APISpec,
    APIEndpoint,
    APIParameter,
    APIResponse
)


class TestAPIParameter:
    """测试 API 参数数据类"""
    
    def test_api_parameter_creation(self):
        param = APIParameter(
            name="userId",
            location="path",
            required=True,
            schema={"type": "string"}
        )
        
        assert param.name == "userId"
        assert param.location == "path"
        assert param.required is True
        assert param.schema == {"type": "string"}
        assert param.description is None


class TestAPIResponse:
    """测试 API 响应数据类"""
    
    def test_api_response_creation(self):
        response = APIResponse(
            status_code="200",
            description="成功返回用户列表",
            content_schema={"type": "array", "items": {"type": "object"}}
        )
        
        assert response.status_code == "200"
        assert response.description == "成功返回用户列表"
        assert response.content_schema is not None


class TestAPIEndpoint:
    """测试 API 端点数据类"""
    
    def test_api_endpoint_creation(self):
        endpoint = APIEndpoint(
            path="/users",
            method="GET",
            summary="获取用户列表",
            description="返回所有用户的列表",
            tags=["Users"]
        )
        
        assert endpoint.path == "/users"
        assert endpoint.method == "GET"
        assert endpoint.summary == "获取用户列表"
        assert endpoint.description == "返回所有用户的列表"
        assert endpoint.tags == ["Users"]
        assert endpoint.parameters == []
        assert endpoint.responses == {}


class TestAPISpec:
    """测试 API 规范数据类"""
    
    def test_api_spec_creation(self):
        spec = APISpec(
            title="用户管理 API",
            version="1.0.0",
            openapi_version="3.0.3"
        )
        
        assert spec.title == "用户管理 API"
        assert spec.version == "1.0.0"
        assert spec.openapi_version == "3.0.3"
        assert spec.endpoints == []
        assert spec.schemas == {}
        assert spec.servers == []


class TestOpenAPIParser:
    """测试 OpenAPI 规范解析器"""
    
    def setup_method(self):
        self.parser = OpenAPIParser()
    
    def test_parse_simple_openapi_json(self):
        """测试解析简单的 OpenAPI JSON"""
        spec_data = {
            "openapi": "3.0.3",
            "info": {
                "title": "测试 API",
                "version": "1.0.0",
                "description": "这是一个测试 API"
            },
            "servers": [
                {"url": "http://localhost:8080", "description": "开发服务器"}
            ],
            "paths": {
                "/users": {
                    "get": {
                        "summary": "获取用户列表",
                        "tags": ["Users"],
                        "responses": {
                            "200": {
                                "description": "成功",
                                "content": {
                                    "application/json": {
                                        "schema": {"type": "array"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(spec_data, f)
            temp_path = f.name
        
        try:
            spec = self.parser.parse_file(temp_path)
            
            assert spec.title == "测试 API"
            assert spec.version == "1.0.0"
            assert spec.openapi_version == "3.0.3"
            assert len(spec.servers) == 1
            assert len(spec.endpoints) == 1
            
            endpoint = spec.endpoints[0]
            assert endpoint.path == "/users"
            assert endpoint.method == "GET"
        finally:
            os.unlink(temp_path)
    
    def test_parse_simple_openapi_yaml(self):
        """测试解析简单的 OpenAPI YAML"""
        spec_data = {
            "openapi": "3.0.3",
            "info": {
                "title": "测试 API",
                "version": "1.0.0"
            },
            "paths": {
                "/health": {
                    "get": {
                        "summary": "健康检查",
                        "responses": {
                            "200": {"description": "服务正常"}
                        }
                    }
                }
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(spec_data, f)
            temp_path = f.name
        
        try:
            spec = self.parser.parse_file(temp_path)
            
            assert spec.title == "测试 API"
            assert len(spec.endpoints) == 1
            assert spec.endpoints[0].path == "/health"
        finally:
            os.unlink(temp_path)
    
    def test_parse_endpoint_with_parameters(self):
        """测试解析带参数的端点"""
        spec_data = {
            "openapi": "3.0.3",
            "info": {"title": "测试 API", "version": "1.0.0"},
            "paths": {
                "/users/{userId}": {
                    "get": {
                        "summary": "获取用户详情",
                        "parameters": [
                            {
                                "name": "userId",
                                "in": "path",
                                "required": True,
                                "description": "用户 ID",
                                "schema": {"type": "string"}
                            },
                            {
                                "name": "include",
                                "in": "query",
                                "required": False,
                                "schema": {"type": "string", "enum": ["profile", "roles"]}
                            }
                        ],
                        "responses": {
                            "200": {"description": "成功"},
                            "404": {"description": "用户不存在"}
                        }
                    }
                }
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(spec_data, f)
            temp_path = f.name
        
        try:
            spec = self.parser.parse_file(temp_path)
            
            assert len(spec.endpoints) == 1
            endpoint = spec.endpoints[0]
            
            assert len(endpoint.parameters) == 2
            
            path_param = [p for p in endpoint.parameters if p.location == "path"][0]
            assert path_param.name == "userId"
            assert path_param.required is True
            
            query_param = [p for p in endpoint.parameters if p.location == "query"][0]
            assert query_param.name == "include"
            assert query_param.required is False
            
            assert "200" in endpoint.responses
            assert "404" in endpoint.responses
        finally:
            os.unlink(temp_path)
    
    def test_parse_endpoint_with_request_body(self):
        """测试解析带请求体的端点"""
        spec_data = {
            "openapi": "3.0.3",
            "info": {"title": "测试 API", "version": "1.0.0"},
            "paths": {
                "/users": {
                    "post": {
                        "summary": "创建用户",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "name": {"type": "string"},
                                            "email": {"type": "string", "format": "email"}
                                        },
                                        "required": ["name", "email"]
                                    }
                                }
                            }
                        },
                        "responses": {
                            "201": {"description": "创建成功"},
                            "400": {"description": "请求参数错误"}
                        }
                    }
                }
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(spec_data, f)
            temp_path = f.name
        
        try:
            spec = self.parser.parse_file(temp_path)
            
            assert len(spec.endpoints) == 1
            endpoint = spec.endpoints[0]
            
            assert endpoint.method == "POST"
            assert endpoint.request_body is not None
            assert "name" in endpoint.request_body.get("schema", {}).get("properties", {})
        finally:
            os.unlink(temp_path)
    
    def test_parse_schemas(self):
        """测试解析 Schema 定义"""
        spec_data = {
            "openapi": "3.0.3",
            "info": {"title": "测试 API", "version": "1.0.0"},
            "components": {
                "schemas": {
                    "User": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"},
                            "email": {"type": "string", "format": "email"}
                        },
                        "required": ["id", "name", "email"]
                    },
                    "Error": {
                        "type": "object",
                        "properties": {
                            "code": {"type": "string"},
                            "message": {"type": "string"}
                        }
                    }
                }
            },
            "paths": {}
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(spec_data, f)
            temp_path = f.name
        
        try:
            spec = self.parser.parse_file(temp_path)
            
            assert len(spec.schemas) == 2
            assert "User" in spec.schemas
            assert "Error" in spec.schemas
            
            user_schema = spec.schemas["User"]
            assert user_schema["type"] == "object"
            assert "id" in user_schema["properties"]
            assert "email" in user_schema["properties"]
        finally:
            os.unlink(temp_path)
    
    def test_get_all_endpoints(self):
        """测试获取所有端点"""
        spec_data = {
            "openapi": "3.0.3",
            "info": {"title": "测试 API", "version": "1.0.0"},
            "paths": {
                "/users": {
                    "get": {"summary": "获取用户列表", "responses": {"200": {"description": "成功"}}},
                    "post": {"summary": "创建用户", "responses": {"201": {"description": "创建成功"}}}
                },
                "/users/{id}": {
                    "get": {"summary": "获取用户详情", "responses": {"200": {"description": "成功"}}},
                    "put": {"summary": "更新用户", "responses": {"200": {"description": "成功"}}},
                    "delete": {"summary": "删除用户", "responses": {"204": {"description": "删除成功"}}}
                }
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(spec_data, f)
            temp_path = f.name
        
        try:
            spec = self.parser.parse_file(temp_path)
            endpoints = self.parser.get_all_endpoints()
            
            assert len(endpoints) == 5
            
            methods = [e.method for e in endpoints]
            assert "GET" in methods
            assert "POST" in methods
            assert "PUT" in methods
            assert "DELETE" in methods
            
            paths = [e.path for e in endpoints]
            assert "/users" in paths
            assert "/users/{id}" in paths
        finally:
            os.unlink(temp_path)
    
    def test_parse_reference_schemas(self):
        """测试解析引用的 Schema"""
        spec_data = {
            "openapi": "3.0.3",
            "info": {"title": "测试 API", "version": "1.0.0"},
            "components": {
                "schemas": {
                    "User": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"}
                        }
                    }
                }
            },
            "paths": {
                "/users": {
                    "get": {
                        "summary": "获取用户列表",
                        "responses": {
                            "200": {
                                "description": "成功",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "array",
                                            "items": {"$ref": "#/components/schemas/User"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(spec_data, f)
            temp_path = f.name
        
        try:
            spec = self.parser.parse_file(temp_path)
            
            assert len(spec.endpoints) == 1
            endpoint = spec.endpoints[0]
            
            assert "200" in endpoint.responses
        finally:
            os.unlink(temp_path)

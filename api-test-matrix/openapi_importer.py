from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import re
import json
import httpx


@dataclass
class APITestCase:
    id: str
    name: str
    method: str
    path: str
    summary: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    headers: Dict[str, str] = field(default_factory=dict)
    query_params: Dict[str, Any] = field(default_factory=dict)
    path_params: Dict[str, Any] = field(default_factory=dict)
    request_body: Optional[Dict[str, Any]] = None
    request_content_type: str = "application/json"
    expected_status: int = 200
    expected_response: Optional[Dict[str, Any]] = None
    expected_schema: Optional[Dict[str, Any]] = None
    assertions: List[Dict[str, Any]] = field(default_factory=list)
    timeout: int = 30000
    tags: List[str] = field(default_factory=list)


class OpenAPIImporter:
    def __init__(self):
        self.test_cases: List[APITestCase] = []

    async def import_from_url(self, url: str, verify_ssl: bool = True) -> List[APITestCase]:
        async with httpx.AsyncClient(verify=verify_ssl) as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            spec = response.json()

        return self._parse_spec(spec)

    async def import_from_file(self, file_path: str) -> List[APITestCase]:
        with open(file_path, 'r', encoding='utf-8') as f:
            spec = json.load(f)

        return self._parse_spec(spec)

    def import_from_string(self, spec_string: str) -> List[APITestCase]:
        spec = json.loads(spec_string)
        return self._parse_spec(spec)

    def _parse_spec(self, spec: Dict[str, Any]) -> List[APITestCase]:
        self.test_cases = []

        openapi_version = spec.get("openapi", spec.get("swagger", ""))
        is_openapi_3 = openapi_version.startswith("3.")

        paths = spec.get("paths", {})
        servers = spec.get("servers", [])
        base_url = servers[0].get("url", "") if servers else ""

        for path, path_item in paths.items():
            for method, operation in path_item.items():
                if method.upper() not in ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]:
                    continue

                test_case = self._create_test_case(
                    path=path,
                    method=method.upper(),
                    operation=operation,
                    base_url=base_url,
                    is_openapi_3=is_openapi_3
                )

                if test_case:
                    self.test_cases.append(test_case)

        return self.test_cases

    def _create_test_case(
        self,
        path: str,
        method: str,
        operation: Dict[str, Any],
        base_url: str,
        is_openapi_3: bool
    ) -> Optional[APITestCase]:
        operation_id = operation.get("operationId", "")
        summary = operation.get("summary", "")
        description = operation.get("description", "")
        tags = operation.get("tags", [])

        name = summary or operation_id or f"{method} {path}"
        test_id = self._generate_test_id(name, method, path)

        expected_status = self._get_expected_status(operation, is_openapi_3)

        test_case = APITestCase(
            id=test_id,
            name=name,
            method=method,
            path=path,
            summary=summary,
            tags=tags,
            expected_status=expected_status
        )

        parameters = operation.get("parameters", [])
        for param in parameters:
            param_in = param.get("in", "")
            param_name = param.get("name", "")
            param_schema = param.get("schema", {})
            param_example = param.get("example", "")

            default_value = self._get_default_value(param_schema, param_example)

            if param_in == "path":
                test_case.path_params[param_name] = default_value
            elif param_in == "query":
                test_case.query_params[param_name] = default_value
            elif param_in == "header":
                test_case.headers[param_name] = str(default_value)

        request_body = operation.get("requestBody", {})
        if request_body:
            content = request_body.get("content", {})
            for content_type, content_spec in content.items():
                test_case.request_content_type = content_type
                schema = content_spec.get("schema", {})
                example = content_spec.get("example", {})
                test_case.request_body = self._generate_example_body(schema, example)
                break

        responses = operation.get("responses", {})
        expected_response = responses.get(str(expected_status), {})
        if expected_response:
            content = expected_response.get("content", {})
            for content_type, content_spec in content.items():
                schema = content_spec.get("schema", {})
                test_case.expected_schema = schema
                example = content_spec.get("example", {})
                test_case.expected_response = self._generate_example_body(schema, example)
                break

        test_case.assertions = self._generate_assertions(test_case, operation)

        return test_case

    def _get_expected_status(self, operation: Dict[str, Any], is_openapi_3: bool) -> int:
        responses = operation.get("responses", {})

        success_codes = ["200", "201", "204", "202", "206"]
        for code in success_codes:
            if code in responses:
                return int(code)

        for key in responses.keys():
            if key.isdigit() and 200 <= int(key) < 300:
                return int(key)

        return 200

    def _generate_test_id(self, name: str, method: str, path: str) -> str:
        sanitized_name = re.sub(r'[^a-zA-Z0-9_]', '_', name.lower())
        path_slug = re.sub(r'[{}]', '', path).replace('/', '_').strip('_')
        return f"{method.lower()}_{path_slug}_{sanitized_name[:30]}"

    def _get_default_value(self, schema: Dict[str, Any], example: Any = None) -> Any:
        if example is not None:
            return example

        param_type = schema.get("type", "string")
        param_format = schema.get("format", "")

        if param_type == "string":
            if param_format == "uuid":
                return "00000000-0000-0000-0000-000000000000"
            elif param_format == "date-time":
                return "2024-01-01T00:00:00Z"
            elif param_format == "email":
                return "test@example.com"
            else:
                enum_values = schema.get("enum", [])
                if enum_values:
                    return enum_values[0]
                return "string_value"

        elif param_type == "integer":
            return schema.get("default", 1)

        elif param_type == "number":
            return schema.get("default", 1.0)

        elif param_type == "boolean":
            return schema.get("default", True)

        elif param_type == "array":
            items = schema.get("items", {})
            item_type = items.get("type", "string")
            if item_type == "string":
                return ["item1", "item2"]
            elif item_type == "integer":
                return [1, 2, 3]
            return []

        elif param_type == "object":
            return schema.get("default", {})

        return None

    def _generate_example_body(self, schema: Dict[str, Any], example: Any = None) -> Any:
        if example is not None:
            return example

        if not schema:
            return None

        schema_type = schema.get("type", "object")
        properties = schema.get("properties", {})
        required = schema.get("required", [])

        if schema_type == "object":
            result = {}
            for prop_name, prop_schema in properties.items():
                if prop_name in required or len(required) == 0:
                    result[prop_name] = self._get_default_value(prop_schema)
            return result

        elif schema_type == "array":
            items = schema.get("items", {})
            return [self._generate_example_body(items)]

        else:
            return self._get_default_value(schema)

    def _generate_assertions(
        self,
        test_case: APITestCase,
        operation: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        assertions = []

        assertions.append({
            "type": "status_code",
            "expected": test_case.expected_status,
            "description": f"验证响应状态码为 {test_case.expected_status}"
        })

        assertions.append({
            "type": "response_time",
            "max_ms": 3000,
            "description": "验证响应时间不超过 3000ms"
        })

        if test_case.expected_schema:
            assertions.append({
                "type": "json_schema",
                "schema": test_case.expected_schema,
                "description": "验证响应 JSON 结构符合 Schema"
            })

        if test_case.method == "GET":
            assertions.append({
                "type": "content_type",
                "expected": "application/json",
                "description": "验证 Content-Type 为 application/json"
            })

        return assertions

    def get_summary(self) -> Dict[str, Any]:
        method_counts = {}
        for tc in self.test_cases:
            method = tc.method
            method_counts[method] = method_counts.get(method, 0) + 1

        return {
            "total_test_cases": len(self.test_cases),
            "method_distribution": method_counts,
            "test_cases": [
                {
                    "id": tc.id,
                    "name": tc.name,
                    "method": tc.method,
                    "path": tc.path,
                    "tags": tc.tags
                }
                for tc in self.test_cases
            ]
        }

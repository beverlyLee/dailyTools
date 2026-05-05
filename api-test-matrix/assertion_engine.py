from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import re
import jsonschema
import json


@dataclass
class AssertionResult:
    type: str
    passed: bool
    message: str
    expected: Any = None
    actual: Any = None


class AssertionEngine:
    def __init__(self):
        self.assertion_types = {
            "status_code": self._assert_status_code,
            "response_time": self._assert_response_time,
            "content_type": self._assert_content_type,
            "json_schema": self._assert_json_schema,
            "json_path": self._assert_json_path,
            "field_value": self._assert_field_value,
            "field_exists": self._assert_field_exists,
            "body_contains": self._assert_body_contains,
            "header_exists": self._assert_header_exists,
            "header_value": self._assert_header_value,
            "array_length": self._assert_array_length,
            "array_contains": self._assert_array_contains
        }

    def evaluate(
        self,
        assertion: Dict[str, Any],
        response=None,
        response_body: Optional[Dict[str, Any]] = None,
        response_time_ms: int = 0
    ) -> Dict[str, Any]:
        assertion_type = assertion.get("type", "")
        handler = self.assertion_types.get(assertion_type)

        if handler:
            result = handler(assertion, response, response_body, response_time_ms)
            return {
                "type": assertion_type,
                "passed": result.passed,
                "message": result.message,
                "expected": result.expected,
                "actual": result.actual,
                "description": assertion.get("description", "")
            }
        else:
            return {
                "type": assertion_type,
                "passed": False,
                "message": f"未知的断言类型: {assertion_type}",
                "expected": None,
                "actual": None
            }

    def _assert_status_code(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        expected = assertion.get("expected", 200)
        actual = response.status_code if response else 0

        passed = actual == expected
        message = f"状态码验证: 预期 {expected}, 实际 {actual}"

        return AssertionResult(
            type="status_code",
            passed=passed,
            message=message,
            expected=expected,
            actual=actual
        )

    def _assert_response_time(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        max_ms = assertion.get("max_ms", 3000)
        actual = response_time_ms

        passed = actual <= max_ms
        message = f"响应时间验证: 预期 <= {max_ms}ms, 实际 {actual}ms"

        return AssertionResult(
            type="response_time",
            passed=passed,
            message=message,
            expected=f"<= {max_ms}ms",
            actual=f"{actual}ms"
        )

    def _assert_content_type(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        expected = assertion.get("expected", "application/json")
        actual = response.headers.get("content-type", "") if response else ""

        passed = expected in actual
        message = f"Content-Type 验证: 预期包含 '{expected}', 实际 '{actual}'"

        return AssertionResult(
            type="content_type",
            passed=passed,
            message=message,
            expected=expected,
            actual=actual
        )

    def _assert_json_schema(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        schema = assertion.get("schema", {})

        if not response_body:
            return AssertionResult(
                type="json_schema",
                passed=False,
                message="响应体为空，无法验证 JSON Schema",
                expected=schema,
                actual=None
            )

        try:
            jsonschema.validate(instance=response_body, schema=schema)
            passed = True
            message = "JSON Schema 验证通过"
        except jsonschema.ValidationError as e:
            passed = False
            message = f"JSON Schema 验证失败: {e.message}"
        except Exception as e:
            passed = False
            message = f"验证过程出错: {str(e)}"

        return AssertionResult(
            type="json_schema",
            passed=passed,
            message=message,
            expected=schema,
            actual=response_body
        )

    def _assert_json_path(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        json_path = assertion.get("path", "")
        expected = assertion.get("expected")

        actual = self._get_value_by_json_path(response_body, json_path)

        passed = actual == expected
        message = f"JSON Path 验证: 路径 '{json_path}' 预期 {expected}, 实际 {actual}"

        return AssertionResult(
            type="json_path",
            passed=passed,
            message=message,
            expected=expected,
            actual=actual
        )

    def _assert_field_value(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        field = assertion.get("field", "")
        expected = assertion.get("expected")
        operator = assertion.get("operator", "equals")

        actual = self._get_nested_value(response_body, field)

        passed = self._compare_values(actual, expected, operator)
        message = f"字段值验证: 字段 '{field}' 预期 {operator} {expected}, 实际 {actual}"

        return AssertionResult(
            type="field_value",
            passed=passed,
            message=message,
            expected=expected,
            actual=actual
        )

    def _assert_field_exists(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        field = assertion.get("field", "")

        actual = self._get_nested_value(response_body, field)
        passed = actual is not None

        message = f"字段存在验证: 字段 '{field}' {'存在' if passed else '不存在'}"

        return AssertionResult(
            type="field_exists",
            passed=passed,
            message=message,
            expected="存在",
            actual="存在" if passed else "不存在"
        )

    def _assert_body_contains(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        expected = assertion.get("expected", "")

        body_str = json.dumps(response_body) if response_body else ""
        passed = str(expected) in body_str

        message = f"响应体包含验证: 预期包含 '{expected}' {'是' if passed else '否'}"

        return AssertionResult(
            type="body_contains",
            passed=passed,
            message=message,
            expected=expected,
            actual=body_str
        )

    def _assert_header_exists(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        header_name = assertion.get("header", "")

        headers = response.headers if response else {}
        passed = header_name.lower() in [h.lower() for h in headers.keys()]

        message = f"响应头存在验证: 头 '{header_name}' {'存在' if passed else '不存在'}"

        return AssertionResult(
            type="header_exists",
            passed=passed,
            message=message,
            expected="存在",
            actual="存在" if passed else "不存在"
        )

    def _assert_header_value(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        header_name = assertion.get("header", "")
        expected = assertion.get("expected", "")

        headers = response.headers if response else {}
        actual = headers.get(header_name, headers.get(header_name.lower(), ""))

        passed = str(expected) in str(actual)
        message = f"响应头值验证: 头 '{header_name}' 预期包含 '{expected}', 实际 '{actual}'"

        return AssertionResult(
            type="header_value",
            passed=passed,
            message=message,
            expected=expected,
            actual=actual
        )

    def _assert_array_length(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        field = assertion.get("field", "")
        expected_length = assertion.get("length", 0)
        operator = assertion.get("operator", "equals")

        array_value = self._get_nested_value(response_body, field)

        if not isinstance(array_value, list):
            return AssertionResult(
                type="array_length",
                passed=False,
                message=f"字段 '{field}' 不是数组类型",
                expected=expected_length,
                actual=type(array_value).__name__
            )

        actual_length = len(array_value)
        passed = self._compare_values(actual_length, expected_length, operator)

        message = f"数组长度验证: 字段 '{field}' 长度预期 {operator} {expected_length}, 实际 {actual_length}"

        return AssertionResult(
            type="array_length",
            passed=passed,
            message=message,
            expected=expected_length,
            actual=actual_length
        )

    def _assert_array_contains(
        self,
        assertion: Dict[str, Any],
        response,
        response_body: Optional[Dict[str, Any]],
        response_time_ms: int
    ) -> AssertionResult:
        field = assertion.get("field", "")
        expected_item = assertion.get("item", "")

        array_value = self._get_nested_value(response_body, field)

        if not isinstance(array_value, list):
            return AssertionResult(
                type="array_contains",
                passed=False,
                message=f"字段 '{field}' 不是数组类型",
                expected=expected_item,
                actual=None
            )

        passed = expected_item in array_value
        message = f"数组包含验证: 字段 '{field}' {'包含' if passed else '不包含'} '{expected_item}'"

        return AssertionResult(
            type="array_contains",
            passed=passed,
            message=message,
            expected=expected_item,
            actual=array_value
        )

    def _get_nested_value(self, data: Optional[Dict], path: str) -> Any:
        if not data or not path:
            return None

        keys = path.split(".")
        value = data

        for key in keys:
            if isinstance(value, dict):
                if key in value:
                    value = value[key]
                else:
                    if "[" in key and "]" in key:
                        match = re.match(r'(\w+)\[(\d+)\]', key)
                        if match:
                            array_key = match.group(1)
                            index = int(match.group(2))
                            if array_key in value and isinstance(value[array_key], list):
                                if 0 <= index < len(value[array_key]):
                                    value = value[array_key][index]
                                else:
                                    return None
                            else:
                                return None
                        else:
                            return None
                    else:
                        return None
            elif isinstance(value, list) and key.isdigit():
                index = int(key)
                if 0 <= index < len(value):
                    value = value[index]
                else:
                    return None
            else:
                return None

        return value

    def _get_value_by_json_path(self, data: Optional[Dict], json_path: str) -> Any:
        if not data or not json_path:
            return None

        path = json_path.replace("$.", "").replace("$", "")
        return self._get_nested_value(data, path)

    def _compare_values(self, actual: Any, expected: Any, operator: str) -> bool:
        if operator == "equals":
            return actual == expected
        elif operator == "not_equals":
            return actual != expected
        elif operator == "greater_than":
            return actual > expected
        elif operator == "less_than":
            return actual < expected
        elif operator == "greater_than_or_equal":
            return actual >= expected
        elif operator == "less_than_or_equal":
            return actual <= expected
        elif operator == "contains":
            return str(expected) in str(actual)
        elif operator == "not_contains":
            return str(expected) not in str(actual)
        elif operator == "regex":
            return bool(re.match(str(expected), str(actual)))
        elif operator == "is_null":
            return actual is None
        elif operator == "is_not_null":
            return actual is not None
        else:
            return actual == expected

    def get_supported_assertions(self) -> List[Dict[str, Any]]:
        return [
            {
                "type": "status_code",
                "name": "响应状态码",
                "description": "验证 HTTP 响应状态码",
                "parameters": ["expected"]
            },
            {
                "type": "response_time",
                "name": "响应时间",
                "description": "验证响应时间（毫秒）",
                "parameters": ["max_ms"]
            },
            {
                "type": "content_type",
                "name": "Content-Type",
                "description": "验证响应 Content-Type 头",
                "parameters": ["expected"]
            },
            {
                "type": "json_schema",
                "name": "JSON Schema",
                "description": "验证响应 JSON 符合 Schema",
                "parameters": ["schema"]
            },
            {
                "type": "json_path",
                "name": "JSON Path",
                "description": "使用 JSON Path 验证字段值",
                "parameters": ["path", "expected"]
            },
            {
                "type": "field_value",
                "name": "字段值",
                "description": "验证特定字段的值",
                "parameters": ["field", "operator", "expected"]
            },
            {
                "type": "field_exists",
                "name": "字段存在",
                "description": "验证字段是否存在",
                "parameters": ["field"]
            },
            {
                "type": "body_contains",
                "name": "响应体包含",
                "description": "验证响应体包含指定内容",
                "parameters": ["expected"]
            },
            {
                "type": "header_exists",
                "name": "响应头存在",
                "description": "验证响应头是否存在",
                "parameters": ["header"]
            },
            {
                "type": "header_value",
                "name": "响应头值",
                "description": "验证响应头的值",
                "parameters": ["header", "expected"]
            },
            {
                "type": "array_length",
                "name": "数组长度",
                "description": "验证数组的长度",
                "parameters": ["field", "operator", "length"]
            },
            {
                "type": "array_contains",
                "name": "数组包含",
                "description": "验证数组包含指定元素",
                "parameters": ["field", "item"]
            }
        ]

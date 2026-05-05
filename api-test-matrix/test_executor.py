from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import httpx
import asyncio
import json

from openapi_importer import APITestCase
from assertion_engine import AssertionEngine


@dataclass
class TestResult:
    test_case_id: str
    test_case_name: str
    method: str
    path: str
    full_url: str
    status: str
    response_status: int
    response_time_ms: int
    response_body: Optional[Dict[str, Any]] = None
    response_headers: Optional[Dict[str, str]] = None
    request_body: Optional[Dict[str, Any]] = None
    request_headers: Optional[Dict[str, str]] = None
    error_message: Optional[str] = None
    assertion_results: List[Dict[str, Any]] = field(default_factory=list)
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


class TestExecutor:
    def __init__(
        self,
        base_url: str = "",
        timeout: int = 30000,
        verify_ssl: bool = True,
        default_headers: Optional[Dict[str, str]] = None
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.verify_ssl = verify_ssl
        self.default_headers = default_headers or {}
        self.assertion_engine = AssertionEngine()
        self.results: List[TestResult] = []

    def _build_url(self, path: str, path_params: Dict[str, Any]) -> str:
        url = self.base_url + path if not path.startswith("http") else path

        for param_name, param_value in path_params.items():
            placeholder = f"{{{param_name}}}"
            if placeholder in url:
                url = url.replace(placeholder, str(param_value))

        return url

    async def execute_test_case(
        self,
        test_case: APITestCase,
        variable_overrides: Optional[Dict[str, Any]] = None
    ) -> TestResult:
        result = TestResult(
            test_case_id=test_case.id,
            test_case_name=test_case.name,
            method=test_case.method,
            path=test_case.path,
            full_url="",
            status="running",
            response_status=0,
            response_time_ms=0
        )

        try:
            path_params = test_case.path_params.copy()
            query_params = test_case.query_params.copy()
            headers = {**self.default_headers, **test_case.headers}
            request_body = test_case.request_body

            if variable_overrides:
                path_params.update(variable_overrides.get("path_params", {}))
                query_params.update(variable_overrides.get("query_params", {}))
                headers.update(variable_overrides.get("headers", {}))
                if variable_overrides.get("request_body"):
                    request_body = variable_overrides["request_body"]

            full_url = self._build_url(test_case.path, path_params)
            result.full_url = full_url
            result.request_headers = headers.copy()
            result.request_body = request_body

            start_time = datetime.now()

            async with httpx.AsyncClient(
                timeout=self.timeout / 1000,
                verify=self.verify_ssl
            ) as client:
                request_kwargs = {
                    "url": full_url,
                    "headers": headers,
                    "params": query_params if query_params else None
                }

                if test_case.method in ["POST", "PUT", "PATCH"] and request_body:
                    if test_case.request_content_type == "application/json":
                        request_kwargs["json"] = request_body
                    else:
                        request_kwargs["data"] = request_body

                response = await client.request(
                    method=test_case.method,
                    **{k: v for k, v in request_kwargs.items() if v is not None}
                )

            end_time = datetime.now()
            response_time_ms = int((end_time - start_time).total_seconds() * 1000)

            result.response_status = response.status_code
            result.response_time_ms = response_time_ms
            result.response_headers = dict(response.headers)
            result.completed_at = end_time

            try:
                result.response_body = response.json()
            except json.JSONDecodeError:
                result.response_body = {"text": response.text}

            assertion_results = []
            all_passed = True

            for assertion in test_case.assertions:
                assertion_result = self.assertion_engine.evaluate(
                    assertion=assertion,
                    response=response,
                    response_body=result.response_body,
                    response_time_ms=response_time_ms
                )
                assertion_results.append(assertion_result)

                if not assertion_result.get("passed", False):
                    all_passed = False

            result.assertion_results = assertion_results
            result.status = "passed" if all_passed else "failed"

        except Exception as e:
            result.status = "error"
            result.error_message = str(e)
            result.completed_at = datetime.now()

        self.results.append(result)
        return result

    async def execute_multiple(
        self,
        test_cases: List[APITestCase],
        concurrency: int = 5,
        variable_overrides: Optional[Dict[str, Any]] = None
    ) -> List[TestResult]:
        semaphore = asyncio.Semaphore(concurrency)

        async def execute_with_semaphore(test_case):
            async with semaphore:
                return await self.execute_test_case(test_case, variable_overrides)

        tasks = [execute_with_semaphore(tc) for tc in test_cases]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        return results

    def get_summary(self) -> Dict[str, Any]:
        total = len(self.results)
        passed = sum(1 for r in self.results if r.status == "passed")
        failed = sum(1 for r in self.results if r.status == "failed")
        errors = sum(1 for r in self.results if r.status == "error")

        avg_response_time = (
            sum(r.response_time_ms for r in self.results) / total
            if total > 0 else 0
        )

        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "errors": errors,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "avg_response_time_ms": avg_response_time,
            "results": [
                {
                    "test_case_id": r.test_case_id,
                    "test_case_name": r.test_case_name,
                    "method": r.method,
                    "path": r.path,
                    "status": r.status,
                    "response_status": r.response_status,
                    "response_time_ms": r.response_time_ms
                }
                for r in self.results
            ]
        }

    def export_results_as_json(self) -> Dict[str, Any]:
        return {
            "summary": self.get_summary(),
            "details": [
                {
                    "test_case_id": r.test_case_id,
                    "test_case_name": r.test_case_name,
                    "method": r.method,
                    "path": r.path,
                    "full_url": r.full_url,
                    "status": r.status,
                    "response_status": r.response_status,
                    "response_time_ms": r.response_time_ms,
                    "response_body": r.response_body,
                    "response_headers": r.response_headers,
                    "request_body": r.request_body,
                    "request_headers": r.request_headers,
                    "error_message": r.error_message,
                    "assertion_results": r.assertion_results,
                    "started_at": r.started_at.isoformat(),
                    "completed_at": r.completed_at.isoformat() if r.completed_at else None
                }
                for r in self.results
            ]
        }

    def clear_results(self):
        self.results = []

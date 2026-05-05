from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import os
import uuid
import shutil
from pathlib import Path

from test_executor import TestResult


@dataclass
class AllureStep:
    name: str
    status: str
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    description: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    attachments: List[Dict[str, Any]] = field(default_factory=list)
    steps: List['AllureStep'] = field(default_factory=list)


@dataclass
class AllureAttachment:
    name: str
    type: str
    source: str
    description: Optional[str] = None


@dataclass
class AllureTestCase:
    uuid: str
    full_name: str
    name: str
    history_id: str
    status: str
    stage: str
    description: Optional[str] = None
    description_html: Optional[str] = None
    start: int = 0
    stop: int = 0
    before: List[AllureStep] = field(default_factory=list)
    after: List[AllureStep] = field(default_factory=list)
    steps: List[AllureStep] = field(default_factory=list)
    attachments: List[AllureAttachment] = field(default_factory=list)
    parameters: List[Dict[str, Any]] = field(default_factory=list)
    labels: List[Dict[str, Any]] = field(default_factory=list)
    links: List[Dict[str, Any]] = field(default_factory=list)


class AllureReportGenerator:
    def __init__(self, output_dir: str = "./allure-results"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.test_cases: List[AllureTestCase] = []
        self.environment_info: Dict[str, str] = {}
        self.categories: List[Dict[str, Any]] = []

    def set_environment(self, environment: Dict[str, str]):
        self.environment_info = environment

    def add_category(
        self,
        name: str,
        description: str,
        matched_statuses: Optional[List[str]] = None,
        matched_message_regex: Optional[str] = None
    ):
        category = {
            "name": name,
            "description": description
        }
        if matched_statuses:
            category["matchedStatuses"] = matched_statuses
        if matched_message_regex:
            category["matchedMessageRegex"] = matched_message_regex
        self.categories.append(category)

    def convert_test_result(self, test_result: TestResult) -> AllureTestCase:
        test_uuid = str(uuid.uuid4())
        history_id = f"{test_result.test_case_id}_{test_result.started_at.strftime('%Y%m%d%H%M%S')}"

        status_map = {
            "passed": "passed",
            "failed": "failed",
            "error": "broken",
            "running": "running"
        }
        status = status_map.get(test_result.status, "unknown")

        start_ms = int(test_result.started_at.timestamp() * 1000)
        stop_ms = int(test_result.completed_at.timestamp() * 1000) if test_result.completed_at else start_ms

        steps = []
        for idx, assertion_result in enumerate(test_result.assertion_results):
            step_status = "passed" if assertion_result.get("passed", False) else "failed"
            step = AllureStep(
                name=f"断言 {idx + 1}: {assertion_result.get('type', assertion_result.get('message', 'Assertion'))}",
                status=step_status,
                description=assertion_result.get("message", ""),
                parameters={
                    "expected": assertion_result.get("expected"),
                    "actual": assertion_result.get("actual")
                }
            )
            steps.append(step)

        request_step = AllureStep(
            name="发送请求",
            status="passed" if status != "broken" else "broken",
            parameters={
                "method": test_result.method,
                "url": test_result.full_url,
                "headers": test_result.request_headers,
                "body": test_result.request_body
            }
        )
        steps.insert(0, request_step)

        response_step = AllureStep(
            name="接收响应",
            status="passed",
            parameters={
                "status_code": test_result.response_status,
                "response_time_ms": test_result.response_time_ms,
                "headers": test_result.response_headers,
                "body": test_result.response_body
            }
        )
        steps.insert(1, response_step)

        labels = [
            {"name": "testType", "value": "api"},
            {"name": "language", "value": "python"},
            {"name": "framework", "value": "api-test-matrix"},
            {"name": "parentSuite", "value": "API Tests"},
            {"name": "suite", "value": test_result.method},
            {"name": "testClass", "value": test_result.test_case_name},
            {"name": "tag", "value": "api"},
            {"name": "tag", "value": test_result.method.lower()},
            {"name": "host", "value": self._extract_host(test_result.full_url)}
        ]

        if status == "passed":
            labels.append({"name": "severity", "value": "normal"})
        elif status == "failed":
            labels.append({"name": "severity", "value": "critical"})
        elif status == "broken":
            labels.append({"name": "severity", "value": "blocker"})

        links = []
        if "id" in test_result.full_url:
            links.append({
                "name": "API Endpoint",
                "type": "link",
                "url": test_result.full_url
            })

        parameters = []
        if test_result.request_body:
            parameters.append({
                "name": "Request Body",
                "value": json.dumps(test_result.request_body, ensure_ascii=False)[:200]
            })

        description_lines = [
            f"**测试用例:** {test_result.test_case_name}",
            f"**请求方法:** {test_result.method}",
            f"**请求路径:** {test_result.path}",
            f"**完整 URL:** {test_result.full_url}",
            f"**响应状态码:** {test_result.response_status}",
            f"**响应时间:** {test_result.response_time_ms}ms"
        ]

        if test_result.error_message:
            description_lines.append(f"\n**错误信息:** {test_result.error_message}")

        description = "\n\n".join(description_lines)

        allure_test_case = AllureTestCase(
            uuid=test_uuid,
            full_name=f"api.test.{test_result.test_case_id}.{test_result.method.lower()}",
            name=test_result.test_case_name,
            history_id=history_id,
            status=status,
            stage="finished",
            description=description,
            start=start_ms,
            stop=stop_ms,
            steps=steps,
            parameters=parameters,
            labels=labels,
            links=links
        )

        return allure_test_case

    def _extract_host(self, url: str) -> str:
        import re
        match = re.match(r'https?://([^/]+)', url)
        if match:
            return match.group(1)
        return "unknown"

    def add_test_result(self, test_result: TestResult):
        allure_case = self.convert_test_result(test_result)
        self.test_cases.append(allure_case)

    def add_test_results(self, test_results: List[TestResult]):
        for result in test_results:
            self.add_test_result(result)

    def _step_to_dict(self, step: AllureStep) -> Dict[str, Any]:
        return {
            "name": step.name,
            "status": step.status,
            "stage": "finished",
            "start": int(step.started_at.timestamp() * 1000),
            "stop": int(step.completed_at.timestamp() * 1000) if step.completed_at else int(step.started_at.timestamp() * 1000),
            "parameters": [
                {"name": k, "value": str(v) if v is not None else "null"}
                for k, v in step.parameters.items()
            ],
            "attachments": step.attachments,
            "steps": [self._step_to_dict(s) for s in step.steps],
            "description": step.description
        }

    def _test_case_to_dict(self, test_case: AllureTestCase) -> Dict[str, Any]:
        result = {
            "uuid": test_case.uuid,
            "fullName": test_case.full_name,
            "name": test_case.name,
            "historyId": test_case.history_id,
            "status": test_case.status,
            "stage": test_case.stage,
            "start": test_case.start,
            "stop": test_case.stop
        }

        if test_case.description:
            result["description"] = test_case.description

        if test_case.labels:
            result["labels"] = test_case.labels

        if test_case.parameters:
            result["parameters"] = test_case.parameters

        if test_case.links:
            result["links"] = test_case.links

        if test_case.steps:
            result["steps"] = [self._step_to_dict(step) for step in test_case.steps]

        if test_case.before:
            result["before"] = [self._step_to_dict(step) for step in test_case.before]

        if test_case.after:
            result["after"] = [self._step_to_dict(step) for step in test_case.after]

        return result

    def generate_results(self):
        for test_case in self.test_cases:
            result_data = self._test_case_to_dict(test_case)
            result_file = self.output_dir / f"{test_case.uuid}-result.json"

            with open(result_file, "w", encoding="utf-8") as f:
                json.dump(result_data, f, ensure_ascii=False, indent=2)

        if self.environment_info:
            env_file = self.output_dir / "environment.properties"
            lines = []
            for key, value in self.environment_info.items():
                safe_key = key.replace(" ", "_").replace("=", "_")
                safe_value = str(value).replace("\\", "\\\\").replace("\n", "\\n")
                lines.append(f"{safe_key}={safe_value}")

            with open(env_file, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))

        if self.categories:
            categories_file = self.output_dir / "categories.json"
            with open(categories_file, "w", encoding="utf-8") as f:
                json.dump(self.categories, f, ensure_ascii=False, indent=2)

        executor_file = self.output_dir / "executor.json"
        executor_info = {
            "name": "API Test Matrix",
            "type": "api-test-matrix",
            "buildName": "API Test Run",
            "buildUrl": "",
            "reportName": "API Test Report",
            "reportUrl": ""
        }
        with open(executor_file, "w", encoding="utf-8") as f:
            json.dump(executor_info, f, ensure_ascii=False, indent=2)

    def get_summary(self) -> Dict[str, Any]:
        status_counts = {
            "passed": 0,
            "failed": 0,
            "broken": 0,
            "skipped": 0,
            "unknown": 0
        }

        total_duration = 0
        for test_case in self.test_cases:
            status_counts[test_case.status] = status_counts.get(test_case.status, 0) + 1
            total_duration += (test_case.stop - test_case.start)

        total = len(self.test_cases)
        passed = status_counts["passed"]
        failed = status_counts["failed"] + status_counts["broken"]

        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "broken": status_counts["broken"],
            "skipped": status_counts["skipped"],
            "unknown": status_counts["unknown"],
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "total_duration_ms": total_duration,
            "avg_duration_ms": total_duration / total if total > 0 else 0,
            "status_breakdown": status_counts,
            "output_directory": str(self.output_dir)
        }

    def clear(self):
        self.test_cases = []
        self.environment_info = {}
        self.categories = []

        if self.output_dir.exists():
            shutil.rmtree(self.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)


def generate_allure_report_from_results(
    test_results: List[TestResult],
    output_dir: str = "./allure-results",
    environment: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    generator = AllureReportGenerator(output_dir=output_dir)

    if environment:
        generator.set_environment(environment)

    generator.add_category(
        name="API 错误",
        description="API 调用错误或连接问题",
        matched_statuses=["broken"]
    )

    generator.add_category(
        name="断言失败",
        description="测试断言未通过",
        matched_statuses=["failed"]
    )

    generator.add_test_results(test_results)
    generator.generate_results()

    return generator.get_summary()

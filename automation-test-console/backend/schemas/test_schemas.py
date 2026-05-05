from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class UITestStep(BaseModel):
    action: str
    element: Optional[str] = None
    value: Optional[str] = None
    assertion: Optional[str] = None


class UITestCaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[UITestStep]
    assertions: Optional[List[Dict[str, Any]]] = None
    target_url: str


class UITestCaseCreate(UITestCaseBase):
    pass


class UITestCaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[UITestStep]] = None
    assertions: Optional[List[Dict[str, Any]]] = None
    target_url: Optional[str] = None


class UITestCaseResponse(UITestCaseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    last_status: Optional[str] = None

    class Config:
        from_attributes = True


class APITestCaseBase(BaseModel):
    name: str
    method: str
    path: str
    headers: Optional[Dict[str, str]] = None
    body: Optional[Dict[str, Any]] = None
    expected_status: int = 200
    expected_response: Optional[Dict[str, Any]] = None


class APITestCaseCreate(APITestCaseBase):
    pass


class APITestCaseUpdate(BaseModel):
    name: Optional[str] = None
    method: Optional[str] = None
    path: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    body: Optional[Dict[str, Any]] = None
    expected_status: Optional[int] = None
    expected_response: Optional[Dict[str, Any]] = None


class APITestCaseResponse(APITestCaseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    last_status: Optional[str] = None

    class Config:
        from_attributes = True


class ScheduleTaskBase(BaseModel):
    name: str
    task_type: str
    test_cases: Optional[List[int]] = None
    environment: str = "test"
    schedule_type: str = "once"
    cron_expression: Optional[str] = None
    interval: Optional[int] = None
    interval_unit: Optional[str] = None
    enabled: bool = True
    notify_on_success: bool = False
    notify_on_failure: bool = True


class ScheduleTaskCreate(ScheduleTaskBase):
    pass


class ScheduleTaskUpdate(BaseModel):
    name: Optional[str] = None
    task_type: Optional[str] = None
    test_cases: Optional[List[int]] = None
    environment: Optional[str] = None
    schedule_type: Optional[str] = None
    cron_expression: Optional[str] = None
    interval: Optional[int] = None
    interval_unit: Optional[str] = None
    enabled: Optional[bool] = None
    notify_on_success: Optional[bool] = None
    notify_on_failure: Optional[bool] = None


class ScheduleTaskResponse(ScheduleTaskBase):
    id: int
    created_at: datetime
    last_run_at: Optional[datetime] = None
    last_status: Optional[str] = None

    class Config:
        from_attributes = True


class TestReportResponse(BaseModel):
    id: int
    name: str
    report_type: str
    environment: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    skipped_tests: int
    duration: float
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EnvironmentConfigResponse(BaseModel):
    id: int
    name: str
    base_url: str
    variables: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OpenAPIImportRequest(BaseModel):
    url: Optional[str] = None
    content: Optional[str] = None


class TestExecutionResult(BaseModel):
    test_case_id: int
    test_case_name: str
    status: str
    duration: float
    error_message: Optional[str] = None
    screenshot: Optional[str] = None


class ExecutionResponse(BaseModel):
    execution_id: str
    status: str
    message: str
    results: Optional[List[TestExecutionResult]] = None


class LocatorValidationRequest(BaseModel):
    url: str
    locator_type: str
    locator_value: str

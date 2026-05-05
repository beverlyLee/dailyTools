"""Document processing workflows with scheduling support.

This module provides:
- Document workflow definitions
- Scheduled batch processing
- Task orchestration
"""

import json
import os
import threading
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union

try:
    import schedule
    HAS_SCHEDULE = True
except ImportError:
    HAS_SCHEDULE = False


class TaskStatus(str, Enum):
    """Task status enumeration."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ScheduleFrequency(str, Enum):
    """Schedule frequency enumeration."""

    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    HOURLY = "hourly"
    MINUTELY = "minutely"


@dataclass
class WorkflowTask:
    """Single task in a document workflow."""

    task_id: str
    task_name: str
    task_type: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    result: Any = None
    error_message: str = ""
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: float = 0.0
    priority: int = 0
    max_retries: int = 0
    retry_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "task_id": self.task_id,
            "task_name": self.task_name,
            "task_type": self.task_type,
            "parameters": self.parameters,
            "dependencies": self.dependencies,
            "status": self.status.value,
            "error_message": self.error_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_seconds": self.duration_seconds,
            "priority": self.priority,
            "max_retries": self.max_retries,
            "retry_count": self.retry_count,
        }


@dataclass
class DocumentWorkflow:
    """Document processing workflow definition."""

    workflow_id: str
    workflow_name: str
    description: str = ""
    tasks: List[WorkflowTask] = field(default_factory=list)
    input_directory: Optional[str] = None
    output_directory: Optional[str] = None
    file_patterns: List[str] = field(default_factory=lambda: ["*"])
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def add_task(
        self,
        task_name: str,
        task_type: str,
        parameters: Optional[Dict[str, Any]] = None,
        dependencies: Optional[List[str]] = None,
        priority: int = 0,
        max_retries: int = 0,
    ) -> str:
        """Add a task to the workflow.

        Args:
            task_name: Name of the task
            task_type: Type of task
            parameters: Task parameters
            dependencies: List of task IDs that must complete first
            priority: Task priority
            max_retries: Maximum retry attempts

        Returns:
            Generated task ID
        """
        import uuid
        task_id = str(uuid.uuid4())[:8]

        task = WorkflowTask(
            task_id=task_id,
            task_name=task_name,
            task_type=task_type,
            parameters=parameters or {},
            dependencies=dependencies or [],
            priority=priority,
            max_retries=max_retries,
        )

        self.tasks.append(task)
        self.updated_at = datetime.now()

        return task_id

    def get_task(self, task_id: str) -> Optional[WorkflowTask]:
        """Get a task by ID."""
        for task in self.tasks:
            if task.task_id == task_id:
                return task
        return None

    def get_ready_tasks(self) -> List[WorkflowTask]:
        """Get tasks that are ready to run (dependencies completed)."""
        ready = []
        for task in self.tasks:
            if task.status != TaskStatus.PENDING:
                continue

            dependencies_met = True
            for dep_id in task.dependencies:
                dep_task = self.get_task(dep_id)
                if dep_task is None or dep_task.status != TaskStatus.COMPLETED:
                    dependencies_met = False
                    break

            if dependencies_met:
                ready.append(task)

        return sorted(ready, key=lambda t: -t.priority)

    def is_complete(self) -> bool:
        """Check if all tasks are complete."""
        return all(
            task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]
            for task in self.tasks
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "workflow_id": self.workflow_id,
            "workflow_name": self.workflow_name,
            "description": self.description,
            "tasks": [t.to_dict() for t in self.tasks],
            "input_directory": self.input_directory,
            "output_directory": self.output_directory,
            "file_patterns": self.file_patterns,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DocumentWorkflow":
        """Create workflow from dictionary."""
        tasks = []
        for task_data in data.get("tasks", []):
            task = WorkflowTask(
                task_id=task_data["task_id"],
                task_name=task_data["task_name"],
                task_type=task_data["task_type"],
                parameters=task_data.get("parameters", {}),
                dependencies=task_data.get("dependencies", []),
                status=TaskStatus(task_data.get("status", "pending")),
                error_message=task_data.get("error_message", ""),
                priority=task_data.get("priority", 0),
                max_retries=task_data.get("max_retries", 0),
                retry_count=task_data.get("retry_count", 0),
            )
            if task_data.get("started_at"):
                task.started_at = datetime.fromisoformat(task_data["started_at"])
            if task_data.get("completed_at"):
                task.completed_at = datetime.fromisoformat(task_data["completed_at"])
            task.duration_seconds = task_data.get("duration_seconds", 0.0)
            tasks.append(task)

        workflow = cls(
            workflow_id=data["workflow_id"],
            workflow_name=data["workflow_name"],
            description=data.get("description", ""),
            tasks=tasks,
            input_directory=data.get("input_directory"),
            output_directory=data.get("output_directory"),
            file_patterns=data.get("file_patterns", ["*"]),
            metadata=data.get("metadata", {}),
        )

        if data.get("created_at"):
            workflow.created_at = datetime.fromisoformat(data["created_at"])
        if data.get("updated_at"):
            workflow.updated_at = datetime.fromisoformat(data["updated_at"])

        return workflow


@dataclass
class ScheduledWorkflow:
    """Scheduled workflow configuration."""

    schedule_id: str
    workflow: DocumentWorkflow
    frequency: ScheduleFrequency
    time: Optional[str] = None
    day: Optional[Union[int, str]] = None
    enabled: bool = True
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    run_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "schedule_id": self.schedule_id,
            "workflow": self.workflow.to_dict(),
            "frequency": self.frequency.value,
            "time": self.time,
            "day": self.day,
            "enabled": self.enabled,
            "last_run_at": self.last_run_at.isoformat() if self.last_run_at else None,
            "next_run_at": self.next_run_at.isoformat() if self.next_run_at else None,
            "run_count": self.run_count,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScheduledWorkflow":
        """Create from dictionary."""
        scheduled = cls(
            schedule_id=data["schedule_id"],
            workflow=DocumentWorkflow.from_dict(data["workflow"]),
            frequency=ScheduleFrequency(data["frequency"]),
            time=data.get("time"),
            day=data.get("day"),
            enabled=data.get("enabled", True),
            run_count=data.get("run_count", 0),
        )

        if data.get("last_run_at"):
            scheduled.last_run_at = datetime.fromisoformat(data["last_run_at"])
        if data.get("next_run_at"):
            scheduled.next_run_at = datetime.fromisoformat(data["next_run_at"])

        return scheduled


class TaskExecutor:
    """Executor for workflow tasks."""

    TASK_HANDLERS: Dict[str, Callable] = {}

    @classmethod
    def register_handler(cls, task_type: str, handler: Callable) -> None:
        """Register a task handler."""
        cls.TASK_HANDLERS[task_type] = handler

    @classmethod
    def execute_task(cls, task: WorkflowTask, context: Dict[str, Any]) -> Any:
        """Execute a task.

        Args:
            task: Task to execute
            context: Execution context

        Returns:
            Task result
        """
        if task.task_type not in cls.TASK_HANDLERS:
            raise ValueError(f"No handler registered for task type: {task.task_type}")

        handler = cls.TASK_HANDLERS[task.task_type]
        return handler(task, context)


class WorkflowEngine:
    """Engine for executing document processing workflows."""

    def __init__(
        self,
        max_workers: int = 4,
        output_directory: str = "./workflow-outputs",
    ):
        self.max_workers = max_workers
        self.output_directory = Path(output_directory)
        self.output_directory.mkdir(parents=True, exist_ok=True)

        self._scheduled_workflows: Dict[str, ScheduledWorkflow] = {}
        self._scheduler_running = False
        self._scheduler_thread: Optional[threading.Thread] = None
        self._execution_context: Dict[str, Any] = {}

    def _get_matching_files(
        self,
        directory: str,
        patterns: List[str],
        recursive: bool = True,
    ) -> List[Path]:
        """Get files matching patterns from directory."""
        import fnmatch

        dir_path = Path(directory)
        if not dir_path.exists():
            return []

        matching_files = []

        if recursive:
            for root, dirs, files in os.walk(dir_path):
                for file_name in files:
                    for pattern in patterns:
                        if fnmatch.fnmatch(file_name, pattern):
                            matching_files.append(Path(root) / file_name)
                            break
        else:
            for item in dir_path.iterdir():
                if item.is_file():
                    for pattern in patterns:
                        if fnmatch.fnmatch(item.name, pattern):
                            matching_files.append(item)
                            break

        return matching_files

    def execute_workflow(
        self,
        workflow: DocumentWorkflow,
        context: Optional[Dict[str, Any]] = None,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """Execute a workflow.

        Args:
            workflow: Workflow to execute
            context: Execution context
            progress_callback: Optional callback for progress updates

        Returns:
            Execution results
        """
        execution_context = {
            **self._execution_context,
            **(context or {}),
            "workflow_id": workflow.workflow_id,
            "workflow_name": workflow.workflow_name,
            "output_directory": str(self.output_directory),
        }

        if workflow.input_directory:
            files = self._get_matching_files(
                workflow.input_directory,
                workflow.file_patterns,
            )
            execution_context["input_files"] = [str(f) for f in files]
            execution_context["file_count"] = len(files)

        if workflow.output_directory:
            output_path = Path(workflow.output_directory)
            output_path.mkdir(parents=True, exist_ok=True)
            execution_context["workflow_output_directory"] = str(output_path)

        results = {
            "workflow_id": workflow.workflow_id,
            "started_at": datetime.now().isoformat(),
            "tasks": {},
        }

        for task in workflow.tasks:
            task.status = TaskStatus.PENDING
            task.result = None
            task.error_message = ""
            task.started_at = None
            task.completed_at = None
            task.duration_seconds = 0.0
            task.retry_count = 0

        while not workflow.is_complete():
            ready_tasks = workflow.get_ready_tasks()

            if not ready_tasks:
                break

            for task in ready_tasks:
                task.status = TaskStatus.RUNNING
                task.started_at = datetime.now()

                if progress_callback:
                    progress_callback(
                        task.task_id,
                        task.task_name,
                        TaskStatus.RUNNING,
                    )

                try:
                    result = TaskExecutor.execute_task(task, execution_context)
                    task.result = result
                    task.status = TaskStatus.COMPLETED
                except Exception as e:
                    if task.retry_count < task.max_retries:
                        task.retry_count += 1
                        task.status = TaskStatus.PENDING
                        continue

                    task.status = TaskStatus.FAILED
                    task.error_message = str(e)

                task.completed_at = datetime.now()
                if task.started_at and task.completed_at:
                    task.duration_seconds = (
                        task.completed_at - task.started_at
                    ).total_seconds()

                if progress_callback:
                    progress_callback(
                        task.task_id,
                        task.task_name,
                        task.status,
                    )

                results["tasks"][task.task_id] = {
                    "status": task.status.value,
                    "error_message": task.error_message,
                    "duration_seconds": task.duration_seconds,
                }

        results["completed_at"] = datetime.now().isoformat()
        results["summary"] = {
            "total_tasks": len(workflow.tasks),
            "completed": sum(1 for t in workflow.tasks if t.status == TaskStatus.COMPLETED),
            "failed": sum(1 for t in workflow.tasks if t.status == TaskStatus.FAILED),
        }

        return results

    def schedule_workflow(
        self,
        workflow: DocumentWorkflow,
        frequency: ScheduleFrequency,
        time: Optional[str] = None,
        day: Optional[Union[int, str]] = None,
        enabled: bool = True,
    ) -> str:
        """Schedule a workflow for recurring execution.

        Args:
            workflow: Workflow to schedule
            frequency: Execution frequency
            time: Time of day (HH:MM format) for daily/weekly/monthly
            day: Day for weekly (monday, etc.) or monthly (1-31)
            enabled: Whether the schedule is enabled

        Returns:
            Schedule ID
        """
        import uuid
        schedule_id = str(uuid.uuid4())[:8]

        scheduled = ScheduledWorkflow(
            schedule_id=schedule_id,
            workflow=workflow,
            frequency=frequency,
            time=time,
            day=day,
            enabled=enabled,
        )

        self._scheduled_workflows[schedule_id] = scheduled
        return schedule_id

    def _run_scheduler_loop(self) -> None:
        """Main scheduler loop."""
        if not HAS_SCHEDULE:
            return

        for schedule_id, scheduled in self._scheduled_workflows.items():
            if not scheduled.enabled:
                continue

            if scheduled.frequency == ScheduleFrequency.DAILY and scheduled.time:
                schedule.every().day.at(scheduled.time).do(
                    self._execute_scheduled_workflow, schedule_id
                )
            elif scheduled.frequency == ScheduleFrequency.HOURLY:
                schedule.every().hour.do(
                    self._execute_scheduled_workflow, schedule_id
                )
            elif scheduled.frequency == ScheduleFrequency.MINUTELY:
                schedule.every().minute.do(
                    self._execute_scheduled_workflow, schedule_id
                )
            elif scheduled.frequency == ScheduleFrequency.WEEKLY and scheduled.day and scheduled.time:
                day_func = getattr(schedule.every(), scheduled.day.lower(), None)
                if day_func:
                    day_func.at(scheduled.time).do(
                        self._execute_scheduled_workflow, schedule_id
                    )

        while self._scheduler_running:
            schedule.run_pending()
            time.sleep(1)

    def _execute_scheduled_workflow(self, schedule_id: str) -> None:
        """Execute a scheduled workflow."""
        if schedule_id not in self._scheduled_workflows:
            return

        scheduled = self._scheduled_workflows[schedule_id]
        if not scheduled.enabled:
            return

        scheduled.last_run_at = datetime.now()
        scheduled.run_count += 1

        try:
            self.execute_workflow(scheduled.workflow)
        except Exception:
            pass

    def start_scheduler(self) -> None:
        """Start the scheduler in a background thread."""
        if self._scheduler_running:
            return

        if not HAS_SCHEDULE:
            raise ImportError(
                "schedule library is required for scheduling. "
                "Install with: pip install schedule"
            )

        self._scheduler_running = True
        self._scheduler_thread = threading.Thread(
            target=self._run_scheduler_loop,
            daemon=True,
        )
        self._scheduler_thread.start()

    def stop_scheduler(self) -> None:
        """Stop the scheduler."""
        self._scheduler_running = False
        if self._scheduler_thread:
            self._scheduler_thread.join(timeout=5)
            self._scheduler_thread = None

    def get_scheduled_workflows(self) -> List[ScheduledWorkflow]:
        """Get all scheduled workflows."""
        return list(self._scheduled_workflows.values())

    def remove_scheduled_workflow(self, schedule_id: str) -> bool:
        """Remove a scheduled workflow.

        Args:
            schedule_id: Schedule ID to remove

        Returns:
            True if removed, False if not found
        """
        if schedule_id in self._scheduled_workflows:
            del self._scheduled_workflows[schedule_id]
            return True
        return False

    def save_workflow(self, workflow: DocumentWorkflow, path: str) -> Path:
        """Save a workflow to JSON file.

        Args:
            workflow: Workflow to save
            path: File path

        Returns:
            Path to saved file
        """
        file_path = Path(path)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(workflow.to_dict(), f, indent=2, ensure_ascii=False)

        return file_path

    def load_workflow(self, path: str) -> DocumentWorkflow:
        """Load a workflow from JSON file.

        Args:
            path: File path

        Returns:
            Loaded workflow
        """
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        return DocumentWorkflow.from_dict(data)


def create_batch_processing_workflow(
    name: str,
    input_dir: str,
    output_dir: str,
    file_patterns: Optional[List[str]] = None,
    classify: bool = True,
    summarize: bool = True,
    extract_info: bool = True,
) -> DocumentWorkflow:
    """Create a standard batch processing workflow.

    Args:
        name: Workflow name
        input_dir: Input directory
        output_dir: Output directory
        file_patterns: File patterns to process
        classify: Whether to classify documents
        summarize: Whether to summarize documents
        extract_info: Whether to extract key information

    Returns:
        DocumentWorkflow
    """
    import uuid
    workflow = DocumentWorkflow(
        workflow_id=str(uuid.uuid4())[:8],
        workflow_name=name,
        description=f"Batch processing workflow for {name}",
        input_directory=input_dir,
        output_directory=output_dir,
        file_patterns=file_patterns or ["*.pdf", "*.docx", "*.xlsx", "*.txt", "*.md"],
    )

    scan_task_id = workflow.add_task(
        task_name="Scan Input Directory",
        task_type="scan_directory",
        parameters={
            "directory": input_dir,
            "patterns": workflow.file_patterns,
        },
    )

    process_task_id = workflow.add_task(
        task_name="Process Documents",
        task_type="process_documents",
        parameters={
            "classify": classify,
            "summarize": summarize,
            "extract_info": extract_info,
        },
        dependencies=[scan_task_id],
    )

    workflow.add_task(
        task_name="Generate Report",
        task_type="generate_report",
        parameters={
            "output_dir": output_dir,
        },
        dependencies=[process_task_id],
    )

    return workflow

"""Configuration settings for doc-code-security-toolkit."""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from dotenv import load_dotenv

load_dotenv()


@dataclass
class LLMSettings:
    """LLM API settings."""

    api_key: str = ""
    model: str = "gpt-4"
    base_url: Optional[str] = None
    max_tokens: int = 4000
    temperature: float = 0.7
    timeout: int = 60

    def __post_init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", self.api_key)
        self.base_url = os.getenv("OPENAI_BASE_URL", self.base_url)
        self.model = os.getenv("LLM_MODEL", self.model)


@dataclass
class SecurityAuditSettings:
    """Security audit settings."""

    default_rules: List[str] = field(default_factory=lambda: [
        "sql_injection",
        "xss",
        "command_injection",
        "path_traversal",
        "insecure_auth",
        "sensitive_data_exposure",
    ])
    custom_rules_path: Optional[str] = None
    ignore_patterns: List[str] = field(default_factory=list)
    risk_level_threshold: str = "medium"
    output_format: str = "json"
    output_directory: str = "./security-reports"

    @property
    def risk_level_order(self) -> Dict[str, int]:
        return {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1,
            "info": 0,
        }


@dataclass
class DocumentProcessingSettings:
    """Document processing settings."""

    supported_formats: List[str] = field(default_factory=lambda: [
        "pdf",
        "docx",
        "doc",
        "xlsx",
        "xls",
        "txt",
        "md",
        "html",
    ])
    extraction_presets: Dict[str, Any] = field(default_factory=lambda: {
        "text": {"priority": "text", "include_tables": True},
        "tables": {"priority": "tables", "include_text": False},
        "full": {"include_text": True, "include_tables": True, "include_images": False},
    })
    output_directory: str = "./output"
    temp_directory: str = "./temp"
    batch_size: int = 10


@dataclass
class WorkflowSettings:
    """Workflow settings."""

    default_schedule: Dict[str, Any] = field(default_factory=lambda: {
        "daily": {"time": "03:00"},
        "weekly": {"day": "monday", "time": "02:00"},
        "monthly": {"day": 1, "time": "01:00"},
    })
    max_retries: int = 3
    retry_delay: int = 5
    parallel_processing: bool = True
    max_workers: int = 4


@dataclass
class Settings:
    """Main settings container."""

    llm: LLMSettings = field(default_factory=LLMSettings)
    security_audit: SecurityAuditSettings = field(default_factory=SecurityAuditSettings)
    document_processing: DocumentProcessingSettings = field(default_factory=DocumentProcessingSettings)
    workflow: WorkflowSettings = field(default_factory=WorkflowSettings)

    config_path: Optional[str] = None

    def __post_init__(self):
        if self.config_path:
            self.load_from_file(self.config_path)

    def load_from_file(self, path: str) -> None:
        """Load configuration from YAML file."""
        config_path = Path(path)
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config = yaml.safe_load(f) or {}

            if "llm" in config:
                for key, value in config["llm"].items():
                    if hasattr(self.llm, key):
                        setattr(self.llm, key, value)

            if "security_audit" in config:
                for key, value in config["security_audit"].items():
                    if hasattr(self.security_audit, key):
                        setattr(self.security_audit, key, value)

            if "document_processing" in config:
                for key, value in config["document_processing"].items():
                    if hasattr(self.document_processing, key):
                        setattr(self.document_processing, key, value)

            if "workflow" in config:
                for key, value in config["workflow"].items():
                    if hasattr(self.workflow, key):
                        setattr(self.workflow, key, value)

    def to_dict(self) -> Dict[str, Any]:
        """Convert settings to dictionary."""
        return {
            "llm": {
                "api_key": "***",
                "model": self.llm.model,
                "base_url": self.llm.base_url,
                "max_tokens": self.llm.max_tokens,
                "temperature": self.llm.temperature,
                "timeout": self.llm.timeout,
            },
            "security_audit": {
                "default_rules": self.security_audit.default_rules,
                "custom_rules_path": self.security_audit.custom_rules_path,
                "ignore_patterns": self.security_audit.ignore_patterns,
                "risk_level_threshold": self.security_audit.risk_level_threshold,
                "output_format": self.security_audit.output_format,
                "output_directory": self.security_audit.output_directory,
            },
            "document_processing": {
                "supported_formats": self.document_processing.supported_formats,
                "extraction_presets": self.document_processing.extraction_presets,
                "output_directory": self.document_processing.output_directory,
                "temp_directory": self.document_processing.temp_directory,
                "batch_size": self.document_processing.batch_size,
            },
            "workflow": {
                "default_schedule": self.workflow.default_schedule,
                "max_retries": self.workflow.max_retries,
                "retry_delay": self.workflow.retry_delay,
                "parallel_processing": self.workflow.parallel_processing,
                "max_workers": self.workflow.max_workers,
            },
        }


settings = Settings()

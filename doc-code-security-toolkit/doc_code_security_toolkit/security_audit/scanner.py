"""Code scanner module for security auditing."""

import fnmatch
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Set, Tuple

from doc_code_security_toolkit.security_audit.rules import (
    MatchContext,
    RiskLevel,
    SecurityRule,
    SecurityRuleManager,
    VulnerabilityType,
)


FILE_EXTENSION_TO_LANGUAGE = {
    ".py": "python",
    ".pyw": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".php": "php",
    ".php3": "php",
    ".php4": "php",
    ".php5": "php",
    ".php7": "php",
    ".rb": "ruby",
    ".rbw": "ruby",
    ".java": "java",
    ".jsp": "java",
    ".go": "go",
    ".rs": "rust",
    ".c": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".vb": "vb",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "zsh",
    ".sql": "sql",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".scss": "scss",
    ".sass": "sass",
    ".xml": "xml",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
    ".rst": "restructuredtext",
}

DEFAULT_IGNORE_PATTERNS = [
    "**/__pycache__/**",
    "**/.git/**",
    "**/.hg/**",
    "**/.svn/**",
    "**/node_modules/**",
    "**/venv/**",
    "**/env/**",
    "**/.venv/**",
    "**/dist/**",
    "**/build/**",
    "**/*.pyc",
    "**/*.pyo",
    "**/*.pyd",
    "**/*.so",
    "**/*.dll",
    "**/*.exe",
    "**/*.bin",
    "**/*.jpg",
    "**/*.jpeg",
    "**/*.png",
    "**/*.gif",
    "**/*.bmp",
    "**/*.ico",
    "**/*.pdf",
    "**/*.doc",
    "**/*.docx",
    "**/*.xls",
    "**/*.xlsx",
    "**/*.zip",
    "**/*.tar",
    "**/*.gz",
    "**/*.rar",
    "**/.DS_Store",
    "**/Thumbs.db",
]


@dataclass
class VulnerabilityFinding:
    """Represents a detected vulnerability finding."""

    rule_id: str
    rule_name: str
    vulnerability_type: VulnerabilityType
    risk_level: RiskLevel
    description: str
    file_path: str
    line_number: int
    column: int
    matched_text: str
    surrounding_lines: List[str]
    language: str
    remediation: str
    references: List[str]
    timestamp: datetime = field(default_factory=datetime.now)
    llm_analysis: Optional[Dict[str, Any]] = None
    severity_score: int = 0

    def __post_init__(self):
        risk_order = {
            "critical": 100,
            "high": 75,
            "medium": 50,
            "low": 25,
            "info": 10,
        }
        self.severity_score = risk_order.get(self.risk_level.value, 0)

    def to_dict(self) -> Dict[str, Any]:
        """Convert finding to dictionary."""
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "vulnerability_type": self.vulnerability_type.value,
            "risk_level": self.risk_level.value,
            "description": self.description,
            "file_path": self.file_path,
            "line_number": self.line_number,
            "column": self.column,
            "matched_text": self.matched_text,
            "surrounding_lines": self.surrounding_lines,
            "language": self.language,
            "remediation": self.remediation,
            "references": self.references,
            "timestamp": self.timestamp.isoformat(),
            "llm_analysis": self.llm_analysis,
            "severity_score": self.severity_score,
        }


class CodeScanner:
    """Code scanner for security vulnerability detection."""

    def __init__(
        self,
        rule_manager: Optional[SecurityRuleManager] = None,
        custom_rules_path: Optional[str] = None,
        ignore_patterns: Optional[List[str]] = None,
    ):
        self.rule_manager = rule_manager or SecurityRuleManager(custom_rules_path)
        self.ignore_patterns = ignore_patterns or []
        self._all_ignore_patterns = DEFAULT_IGNORE_PATTERNS + self.ignore_patterns
        self.findings: List[VulnerabilityFinding] = []
        self.scanned_files: int = 0
        self.scan_duration: float = 0.0

    def get_language_from_path(self, file_path: str) -> str:
        """Determine programming language from file extension."""
        path = Path(file_path)
        ext = path.suffix.lower()
        return FILE_EXTENSION_TO_LANGUAGE.get(ext, "unknown")

    def should_ignore(self, path: str) -> bool:
        """Check if a path should be ignored."""
        for pattern in self._all_ignore_patterns:
            if fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(Path(path).name, pattern):
                return True
            if "/**/" in pattern:
                parts = pattern.split("/**/")
                if len(parts) == 2:
                    prefix, suffix = parts
                    if prefix and not path.startswith(prefix.rstrip("*")):
                        continue
                    if suffix and path.endswith(suffix.lstrip("*")):
                        return True
        return False

    def get_supported_files(
        self,
        target_path: str,
        recursive: bool = True,
    ) -> Iterator[Path]:
        """Get all supported files from target path."""
        target = Path(target_path)

        if target.is_file():
            if not self.should_ignore(str(target)):
                yield target
        elif target.is_dir():
            if recursive:
                for root, dirs, files in os.walk(target):
                    dirs[:] = [d for d in dirs if not self.should_ignore(os.path.join(root, d))]
                    for file_name in files:
                        file_path = os.path.join(root, file_name)
                        if not self.should_ignore(file_path):
                            yield Path(file_path)
            else:
                for item in target.iterdir():
                    if item.is_file() and not self.should_ignore(str(item)):
                        yield item

    def get_file_lines(self, file_path: Path) -> Tuple[List[str], str]:
        """Read file lines and content.

        Returns:
            Tuple of (lines list, full content string)
        """
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
                content = "".join(lines)
            return lines, content
        except (UnicodeDecodeError, IOError, PermissionError):
            return [], ""

    def get_surrounding_lines(
        self,
        lines: List[str],
        line_number: int,
        context_lines: int = 3,
    ) -> List[str]:
        """Get surrounding lines for context."""
        if not lines:
            return []

        start = max(0, line_number - context_lines - 1)
        end = min(len(lines), line_number + context_lines)

        result = []
        for i in range(start, end):
            marker = ">>>" if i == line_number - 1 else "   "
            result.append(f"{marker} {i + 1:4d}: {lines[i].rstrip()}")

        return result

    def get_line_number_from_position(self, content: str, position: int) -> int:
        """Convert character position to line number."""
        return content[:position].count("\n") + 1

    def get_column_from_position(self, content: str, position: int) -> int:
        """Get column number from character position."""
        last_newline = content.rfind("\n", 0, position)
        if last_newline == -1:
            return position + 1
        return position - last_newline

    def scan_file(self, file_path: Path) -> List[VulnerabilityFinding]:
        """Scan a single file for security vulnerabilities."""
        findings = []
        language = self.get_language_from_path(str(file_path))

        lines, content = self.get_file_lines(file_path)
        if not content:
            return findings

        applicable_rules = self.rule_manager.get_rules_by_language(language)

        for rule in applicable_rules:
            matches = rule.match(content)
            for pattern_idx, match in matches:
                start_pos = match.start()
                end_pos = match.end()
                matched_text = match.group(0)

                line_number = self.get_line_number_from_position(content, start_pos)
                column = self.get_column_from_position(content, start_pos)
                surrounding_lines = self.get_surrounding_lines(lines, line_number)

                finding = VulnerabilityFinding(
                    rule_id=rule.id,
                    rule_name=rule.name,
                    vulnerability_type=rule.vulnerability_type,
                    risk_level=rule.risk_level,
                    description=rule.description,
                    file_path=str(file_path),
                    line_number=line_number,
                    column=column,
                    matched_text=matched_text,
                    surrounding_lines=surrounding_lines,
                    language=language,
                    remediation=rule.remediation,
                    references=rule.references,
                )
                findings.append(finding)

        return findings

    def scan(
        self,
        target_path: str,
        recursive: bool = True,
        file_types: Optional[List[str]] = None,
    ) -> List[VulnerabilityFinding]:
        """Scan target path for security vulnerabilities.

        Args:
            target_path: Path to file or directory to scan
            recursive: Whether to scan recursively through directories
            file_types: Optional list of file extensions to scan (e.g., ['.py', '.js'])

        Returns:
            List of vulnerability findings
        """
        self.findings = []
        self.scanned_files = 0
        start_time = datetime.now()

        for file_path in self.get_supported_files(target_path, recursive):
            if file_types:
                if file_path.suffix.lower() not in [ft.lower() for ft in file_types]:
                    continue

            file_findings = self.scan_file(file_path)
            self.findings.extend(file_findings)
            self.scanned_files += 1

        end_time = datetime.now()
        self.scan_duration = (end_time - start_time).total_seconds()

        return self.findings

    def filter_findings(
        self,
        findings: Optional[List[VulnerabilityFinding]] = None,
        min_risk_level: Optional[RiskLevel] = None,
        vulnerability_types: Optional[List[VulnerabilityType]] = None,
        file_pattern: Optional[str] = None,
    ) -> List[VulnerabilityFinding]:
        """Filter findings by various criteria.

        Args:
            findings: Findings to filter (uses self.findings if None)
            min_risk_level: Minimum risk level to include
            vulnerability_types: List of vulnerability types to include
            file_pattern: Glob pattern for file paths

        Returns:
            Filtered list of findings
        """
        findings_to_filter = findings or self.findings
        filtered = list(findings_to_filter)

        if min_risk_level:
            risk_order = {
                "info": 0,
                "low": 1,
                "medium": 2,
                "high": 3,
                "critical": 4,
            }
            min_level = risk_order[min_risk_level.value]
            filtered = [
                f for f in filtered
                if risk_order[f.risk_level.value] >= min_level
            ]

        if vulnerability_types:
            filtered = [
                f for f in filtered
                if f.vulnerability_type in vulnerability_types
            ]

        if file_pattern:
            filtered = [
                f for f in filtered
                if fnmatch.fnmatch(f.file_path, file_pattern)
            ]

        return filtered

    def get_statistics(self, findings: Optional[List[VulnerabilityFinding]] = None) -> Dict[str, Any]:
        """Get statistics about findings.

        Args:
            findings: Findings to analyze (uses self.findings if None)

        Returns:
            Dictionary containing statistics
        """
        findings_to_analyze = findings or self.findings

        risk_counts = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "info": 0,
        }
        type_counts: Dict[str, int] = {}
        file_counts: Dict[str, int] = {}
        language_counts: Dict[str, int] = {}

        for finding in findings_to_analyze:
            risk_counts[finding.risk_level.value] += 1

            vuln_type = finding.vulnerability_type.value
            type_counts[vuln_type] = type_counts.get(vuln_type, 0) + 1

            file_path = finding.file_path
            file_counts[file_path] = file_counts.get(file_path, 0) + 1

            lang = finding.language
            language_counts[lang] = language_counts.get(lang, 0) + 1

        total_findings = len(findings_to_analyze)
        files_with_issues = len(file_counts)

        return {
            "summary": {
                "total_findings": total_findings,
                "files_scanned": self.scanned_files,
                "files_with_issues": files_with_issues,
                "scan_duration_seconds": self.scan_duration,
            },
            "risk_distribution": risk_counts,
            "vulnerability_types": type_counts,
            "languages": language_counts,
            "most_affected_files": sorted(
                file_counts.items(), key=lambda x: x[1], reverse=True
            )[:10],
        }

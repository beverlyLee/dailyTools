"""Security Audit Module for doc-code-security-toolkit.

This module provides intelligent code security auditing capabilities:
- Static code analysis for security vulnerabilities
- LLM-powered vulnerability explanation and fix suggestions
- Custom security rules support
- Comprehensive security audit reports
"""

from doc_code_security_toolkit.security_audit.rules import (
    SecurityRule,
    SecurityRuleManager,
    get_default_rules,
)
from doc_code_security_toolkit.security_audit.scanner import CodeScanner
from doc_code_security_toolkit.security_audit.analyzer import VulnerabilityAnalyzer
from doc_code_security_toolkit.security_audit.reporter import SecurityReporter

__all__ = [
    "SecurityRule",
    "SecurityRuleManager",
    "get_default_rules",
    "CodeScanner",
    "VulnerabilityAnalyzer",
    "SecurityReporter",
]

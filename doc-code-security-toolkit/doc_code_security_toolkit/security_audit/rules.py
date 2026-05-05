"""Security rules definition and management module."""

import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Pattern, Union

import yaml


class RiskLevel(str, Enum):
    """Risk level enumeration."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class VulnerabilityType(str, Enum):
    """Vulnerability type enumeration."""

    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    COMMAND_INJECTION = "command_injection"
    PATH_TRAVERSAL = "path_traversal"
    INSECURE_AUTH = "insecure_auth"
    SENSITIVE_DATA_EXPOSURE = "sensitive_data_exposure"
    INSECURE_CRYPTO = "insecure_crypto"
    HARDCODED_SECRETS = "hardcoded_secrets"
    CUSTOM = "custom"


@dataclass
class MatchContext:
    """Context for a rule match."""

    file_path: str
    line_number: int
    column: int = 0
    matched_text: str = ""
    surrounding_lines: List[str] = field(default_factory=list)
    language: str = "unknown"


@dataclass
class SecurityRule:
    """Security rule definition."""

    id: str
    name: str
    vulnerability_type: VulnerabilityType
    risk_level: RiskLevel
    description: str
    patterns: List[Dict[str, Any]]
    languages: List[str] = field(default_factory=list)
    examples: List[Dict[str, str]] = field(default_factory=list)
    remediation: str = ""
    references: List[str] = field(default_factory=list)
    custom_metadata: Dict[str, Any] = field(default_factory=dict)

    _compiled_patterns: List[Pattern] = field(default_factory=list, init=False)

    def compile_patterns(self) -> None:
        """Compile regex patterns for matching."""
        self._compiled_patterns = []
        for pattern_config in self.patterns:
            pattern_str = pattern_config.get("pattern", "")
            flags = 0
            if pattern_config.get("case_insensitive", False):
                flags |= re.IGNORECASE
            if pattern_config.get("multiline", False):
                flags |= re.MULTILINE
            if pattern_config.get("dotall", False):
                flags |= re.DOTALL

            try:
                compiled = re.compile(pattern_str, flags)
                self._compiled_patterns.append(compiled)
            except re.error as e:
                raise ValueError(f"Invalid regex pattern '{pattern_str}': {e}")

    def match(self, content: str) -> List[tuple]:
        """Match the rule against content.

        Returns:
            List of tuples (pattern_index, match_object)
        """
        if not self._compiled_patterns:
            self.compile_patterns()

        matches = []
        for idx, pattern in enumerate(self._compiled_patterns):
            for match in pattern.finditer(content):
                matches.append((idx, match))
        return matches

    def to_dict(self) -> Dict[str, Any]:
        """Convert rule to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "vulnerability_type": self.vulnerability_type.value,
            "risk_level": self.risk_level.value,
            "description": self.description,
            "patterns": self.patterns,
            "languages": self.languages,
            "examples": self.examples,
            "remediation": self.remediation,
            "references": self.references,
            "custom_metadata": self.custom_metadata,
        }


class SecurityRuleManager:
    """Manager for security rules."""

    def __init__(self, custom_rules_path: Optional[str] = None):
        self._rules: Dict[str, SecurityRule] = {}
        self._custom_rules_path = custom_rules_path

        self._load_default_rules()
        if custom_rules_path:
            self.load_custom_rules(custom_rules_path)

    def _load_default_rules(self) -> None:
        """Load default security rules."""
        default_rules = get_default_rules()
        for rule in default_rules:
            self.add_rule(rule)

    def add_rule(self, rule: SecurityRule) -> None:
        """Add a rule to the manager."""
        if rule.id in self._rules:
            raise ValueError(f"Rule with id '{rule.id}' already exists")
        rule.compile_patterns()
        self._rules[rule.id] = rule

    def update_rule(self, rule: SecurityRule) -> None:
        """Update an existing rule."""
        if rule.id not in self._rules:
            raise ValueError(f"Rule with id '{rule.id}' does not exist")
        rule.compile_patterns()
        self._rules[rule.id] = rule

    def remove_rule(self, rule_id: str) -> None:
        """Remove a rule from the manager."""
        if rule_id not in self._rules:
            raise ValueError(f"Rule with id '{rule_id}' does not exist")
        del self._rules[rule_id]

    def get_rule(self, rule_id: str) -> Optional[SecurityRule]:
        """Get a rule by id."""
        return self._rules.get(rule_id)

    def get_rules_by_type(
        self, vulnerability_type: VulnerabilityType
    ) -> List[SecurityRule]:
        """Get rules by vulnerability type."""
        return [
            rule for rule in self._rules.values()
            if rule.vulnerability_type == vulnerability_type
        ]

    def get_rules_by_language(self, language: str) -> List[SecurityRule]:
        """Get rules applicable to a specific language."""
        return [
            rule for rule in self._rules.values()
            if not rule.languages or language.lower() in [l.lower() for l in rule.languages]
        ]

    def get_all_rules(self) -> List[SecurityRule]:
        """Get all rules."""
        return list(self._rules.values())

    def load_custom_rules(self, path: str) -> None:
        """Load custom rules from YAML file."""
        rules_path = Path(path)
        if not rules_path.exists():
            raise FileNotFoundError(f"Custom rules file not found: {path}")

        with open(rules_path, "r", encoding="utf-8") as f:
            rules_data = yaml.safe_load(f) or {}

        for rule_data in rules_data.get("rules", []):
            rule = SecurityRule(
                id=rule_data["id"],
                name=rule_data["name"],
                vulnerability_type=VulnerabilityType(rule_data["vulnerability_type"]),
                risk_level=RiskLevel(rule_data["risk_level"]),
                description=rule_data["description"],
                patterns=rule_data.get("patterns", []),
                languages=rule_data.get("languages", []),
                examples=rule_data.get("examples", []),
                remediation=rule_data.get("remediation", ""),
                references=rule_data.get("references", []),
                custom_metadata=rule_data.get("custom_metadata", {}),
            )
            self.add_rule(rule)

    def export_rules(self, path: str) -> None:
        """Export all rules to YAML file."""
        export_data = {
            "rules": [rule.to_dict() for rule in self._rules.values()]
        }
        with open(path, "w", encoding="utf-8") as f:
            yaml.dump(export_data, f, allow_unicode=True, default_flow_style=False)


def get_default_rules() -> List[SecurityRule]:
    """Get default security rules."""
    return [
        SecurityRule(
            id="SQLI-001",
            name="SQL Injection - String Formatting",
            vulnerability_type=VulnerabilityType.SQL_INJECTION,
            risk_level=RiskLevel.CRITICAL,
            description="Direct string formatting for SQL queries can lead to SQL injection attacks.",
            patterns=[
                {
                    "pattern": r"(?:execute|cursor\.execute|query)\s*\(\s*[f\"']%s|(?:\+\s*[a-zA-Z_][a-zA-Z0-9_]*)",
                    "case_insensitive": True,
                    "description": "String concatenation in SQL execution",
                },
                {
                    "pattern": r"\.format\(.*\)|\%s\s*\%|\%d\s*\%",
                    "description": "String formatting for SQL queries",
                },
            ],
            languages=["python", "php", "java", "javascript"],
            examples=[
                {
                    "vulnerable": "cursor.execute(f\"SELECT * FROM users WHERE id = {user_id}\")",
                    "safe": "cursor.execute(\"SELECT * FROM users WHERE id = ?\", (user_id,))",
                }
            ],
            remediation="Use parameterized queries or prepared statements instead of string formatting.",
            references=[
                "https://owasp.org/www-community/attacks/SQL_Injection",
                "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
            ],
        ),
        SecurityRule(
            id="XSS-001",
            name="Cross-Site Scripting - Unsanitized Output",
            vulnerability_type=VulnerabilityType.XSS,
            risk_level=RiskLevel.HIGH,
            description="Rendering user input without proper sanitization can lead to XSS attacks.",
            patterns=[
                {
                    "pattern": r"(?:innerHTML|document\.write|eval\()\s*\([^)]*[a-zA-Z_]",
                    "description": "Direct innerHTML or document.write with user input",
                },
                {
                    "pattern": r"render_template_string|safe\s*\||Jinja2\.escape\s*\(\s*\)",
                    "case_insensitive": True,
                    "description": "Marking input as safe without sanitization",
                },
            ],
            languages=["javascript", "python", "php"],
            examples=[
                {
                    "vulnerable": "element.innerHTML = user_input;",
                    "safe": "element.textContent = user_input;",
                }
            ],
            remediation="Always sanitize user input before rendering. Use context-aware escaping.",
            references=[
                "https://owasp.org/www-community/attacks/xss/",
                "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
            ],
        ),
        SecurityRule(
            id="CMDI-001",
            name="Command Injection - Unsanitized Input",
            vulnerability_type=VulnerabilityType.COMMAND_INJECTION,
            risk_level=RiskLevel.CRITICAL,
            description="Passing unsanitized user input to system commands can lead to command injection.",
            patterns=[
                {
                    "pattern": r"(?:os\.system|subprocess\.call|subprocess\.run|exec\(|eval\()\s*\(\s*[a-zA-Z_]",
                    "description": "Direct command execution with variables",
                },
                {
                    "pattern": r"(?:shell=True|shell\s*=\s*True)",
                    "description": "Using shell=True in subprocess calls",
                },
            ],
            languages=["python", "php", "ruby", "javascript"],
            examples=[
                {
                    "vulnerable": "os.system(f\"ping {hostname}\")",
                    "safe": "subprocess.run([\"ping\", hostname], check=False)",
                }
            ],
            remediation="Use parameterized command execution and avoid shell=True. Validate all user input.",
            references=[
                "https://owasp.org/www-community/attacks/Command_Injection",
                "https://cheatsheetseries.owasp.org/cheatsheets/Command_Injection_Prevention_Cheat_Sheet.html",
            ],
        ),
        SecurityRule(
            id="PTRV-001",
            name="Path Traversal - Unsanitized File Paths",
            vulnerability_type=VulnerabilityType.PATH_TRAVERSAL,
            risk_level=RiskLevel.HIGH,
            description="Using unsanitized user input in file paths can lead to path traversal attacks.",
            patterns=[
                {
                    "pattern": r"(?:open\(|file\(|read\(|write\()\s*\([^)]*\.\.\/",
                    "description": "File operations with potential path traversal",
                },
                {
                    "pattern": r"(?:os\.path\.join|Path\()\s*\([^)]*[a-zA-Z_][a-zA-Z0-9_]*\s*[,\)]",
                    "description": "Path joining with user input without validation",
                },
            ],
            languages=["python", "php", "java", "javascript"],
            examples=[
                {
                    "vulnerable": "with open(f\"/data/{filename}\") as f:",
                    "safe": "base_path = Path(\"/data\")\nfull_path = (base_path / filename).resolve()\nif str(full_path).startswith(str(base_path)): ...",
                }
            ],
            remediation="Validate file paths and ensure they stay within intended directories. Use path normalization and validation.",
            references=[
                "https://owasp.org/www-community/attacks/Path_Traversal",
                "https://cheatsheetseries.owasp.org/cheatsheets/Path_Traversal_Prevention_Cheat_Sheet.html",
            ],
        ),
        SecurityRule(
            id="SECR-001",
            name="Hardcoded Secrets",
            vulnerability_type=VulnerabilityType.HARDCODED_SECRETS,
            risk_level=RiskLevel.HIGH,
            description="Hardcoding secrets in source code can lead to credential leakage.",
            patterns=[
                {
                    "pattern": r"(?:password|passwd|pwd|secret|api[_-]?key|token)\s*[=:]\s*[\"'][^\"']{8,}[\"']",
                    "case_insensitive": True,
                    "description": "Hardcoded passwords, API keys, or secrets",
                },
                {
                    "pattern": r"(?:-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----)",
                    "description": "Hardcoded private keys",
                },
            ],
            languages=["all"],
            examples=[
                {
                    "vulnerable": "API_KEY = \"sk-1234567890abcdef\"",
                    "safe": "API_KEY = os.getenv(\"API_KEY\")",
                }
            ],
            remediation="Store secrets in environment variables or secure vaults. Never commit secrets to version control.",
            references=[
                "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
            ],
        ),
        SecurityRule(
            id="CRYP-001",
            name="Insecure Cryptographic Algorithms",
            vulnerability_type=VulnerabilityType.INSECURE_CRYPTO,
            risk_level=RiskLevel.HIGH,
            description="Using deprecated or insecure cryptographic algorithms.",
            patterns=[
                {
                    "pattern": r"(?:md5|sha1|des|rc4|md4)\s*\(",
                    "case_insensitive": True,
                    "description": "Using deprecated hash algorithms",
                },
                {
                    "pattern": r"(?:urllib|requests)\.get\s*\([^)]*verify\s*=\s*(?:False|0)",
                    "case_insensitive": True,
                    "description": "Disabling SSL verification",
                },
            ],
            languages=["all"],
            examples=[
                {
                    "vulnerable": "hashlib.md5(password.encode())",
                    "safe": "hashlib.sha256(password.encode())",
                }
            ],
            remediation="Use secure cryptographic algorithms: SHA-256+ for hashing, AES-256-GCM for encryption, always enable SSL verification.",
            references=[
                "https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html",
                "https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html",
            ],
        ),
        SecurityRule(
            id="AUTH-001",
            name="Insecure Authentication",
            vulnerability_type=VulnerabilityType.INSECURE_AUTH,
            risk_level=RiskLevel.HIGH,
            description="Authentication mechanisms that are vulnerable to attacks.",
            patterns=[
                {
                    "pattern": r"(?:password)\s*==\s*[a-zA-Z_][a-zA-Z0-9_]*|(?:username|user)\s*==\s*[a-zA-Z_]",
                    "description": "Direct password comparison without timing-safe comparison",
                },
                {
                    "pattern": r"(?:session|cookie)\s*\[.*\]\s*=\s*[a-zA-Z_][a-zA-Z0-9_]*",
                    "description": "Setting session/cookie values without proper signing",
                },
            ],
            languages=["python", "php", "javascript"],
            examples=[
                {
                    "vulnerable": "if password == stored_password:",
                    "safe": "if hmac.compare_digest(password, stored_password):",
                }
            ],
            remediation="Use timing-safe comparison functions. Use framework-provided authentication mechanisms.",
            references=[
                "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html",
                "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html",
            ],
        ),
        SecurityRule(
            id="SDE-001",
            name="Sensitive Data Exposure",
            vulnerability_type=VulnerabilityType.SENSITIVE_DATA_EXPOSURE,
            risk_level=RiskLevel.MEDIUM,
            description="Exposing sensitive data through logging or error messages.",
            patterns=[
                {
                    "pattern": r"(?:print|logger\.(?:info|debug|warning|error))\s*\([^)]*(?:password|ssn|credit|card|token)",
                    "case_insensitive": True,
                    "description": "Logging sensitive data",
                },
                {
                    "pattern": r"(?:traceback|exception|error)\s*\([^)]*[a-zA-Z_][a-zA-Z0-9_]*",
                    "description": "Exposing internal error details to users",
                },
            ],
            languages=["all"],
            examples=[
                {
                    "vulnerable": "logging.info(f\"User login failed: password={password}\")",
                    "safe": "logging.info(\"User login failed\")",
                }
            ],
            remediation="Never log sensitive data. Use structured logging with proper redaction. Return generic error messages to users.",
            references=[
                "https://owasp.org/www-project-top-ten/2021/A02_2021-Cryptographic_Failures",
                "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
            ],
        ),
    ]

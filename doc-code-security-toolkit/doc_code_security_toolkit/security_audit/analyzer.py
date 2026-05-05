"""Vulnerability analyzer module using LLM for deep analysis."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from doc_code_security_toolkit.llm.client import LLMClient, get_llm_client
from doc_code_security_toolkit.security_audit.rules import RiskLevel, VulnerabilityType
from doc_code_security_toolkit.security_audit.scanner import VulnerabilityFinding


@dataclass
class LLMAnalysisResult:
    """Result of LLM analysis on a vulnerability."""

    vulnerability_explanation: str = ""
    technical_details: str = ""
    potential_impact: str = ""
    fix_code_example: str = ""
    alternative_solutions: List[str] = field(default_factory=list)
    best_practices: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    additional_references: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "vulnerability_explanation": self.vulnerability_explanation,
            "technical_details": self.technical_details,
            "potential_impact": self.potential_impact,
            "fix_code_example": self.fix_code_example,
            "alternative_solutions": self.alternative_solutions,
            "best_practices": self.best_practices,
            "confidence_score": self.confidence_score,
            "additional_references": self.additional_references,
        }


class VulnerabilityAnalyzer:
    """Analyzer for deep vulnerability analysis using LLM."""

    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm_client = llm_client or get_llm_client()

    def _build_analysis_prompt(
        self,
        finding: VulnerabilityFinding,
    ) -> str:
        """Build prompt for LLM analysis."""

        vulnerability_type_descriptions = {
            VulnerabilityType.SQL_INJECTION: "SQL Injection - An attack technique that allows attackers to execute malicious SQL statements in a database.",
            VulnerabilityType.XSS: "Cross-Site Scripting (XSS) - An attack that injects malicious scripts into trusted websites.",
            VulnerabilityType.COMMAND_INJECTION: "Command Injection - An attack that allows execution of arbitrary commands on the host operating system.",
            VulnerabilityType.PATH_TRAVERSAL: "Path Traversal - An attack that accesses files and directories outside the intended folder.",
            VulnerabilityType.INSECURE_AUTH: "Insecure Authentication - Authentication mechanisms that are vulnerable to attacks.",
            VulnerabilityType.SENSITIVE_DATA_EXPOSURE: "Sensitive Data Exposure - Accidental exposure of sensitive information.",
            VulnerabilityType.INSECURE_CRYPTO: "Insecure Cryptography - Use of weak or deprecated cryptographic algorithms.",
            VulnerabilityType.HARDCODED_SECRETS: "Hardcoded Secrets - Credentials or keys embedded in source code.",
            VulnerabilityType.CUSTOM: "Custom Vulnerability - User-defined security issue.",
        }

        vuln_description = vulnerability_type_descriptions.get(
            finding.vulnerability_type,
            f"{finding.vulnerability_type.value} vulnerability",
        )

        code_context = "\n".join(finding.surrounding_lines)

        prompt = f"""You are a senior security analyst. Analyze the following security vulnerability and provide a detailed analysis.

## Vulnerability Information
- **Type**: {finding.vulnerability_type.value} ({vuln_description})
- **Risk Level**: {finding.risk_level.value}
- **Rule**: {finding.rule_name} ({finding.rule_id})
- **File**: {finding.file_path}:{finding.line_number}
- **Language**: {finding.language}

## Vulnerable Code Context
```
{code_context}
```

## Matched Pattern
```
{finding.matched_text}
```

## Existing Remediation Guidance
{finding.remediation}

Please provide a comprehensive analysis in the following JSON format:
{{
    "vulnerability_explanation": "Detailed explanation of why this code is vulnerable in plain language",
    "technical_details": "Deep technical analysis including how an attacker could exploit this",
    "potential_impact": "What could happen if this vulnerability is exploited (business impact)",
    "fix_code_example": "Complete code example showing the fixed version. Use the same programming language.",
    "alternative_solutions": ["List of alternative approaches to fix this issue"],
    "best_practices": ["List of security best practices to prevent similar issues"],
    "additional_references": ["List of useful documentation URLs or OWASP cheat sheets"],
    "confidence_score": 0.95
}}

Only return the JSON, no other text. The confidence_score should be between 0 and 1 indicating your confidence in the analysis."""

        return prompt

    def _parse_llm_response(self, response: str) -> LLMAnalysisResult:
        """Parse LLM response into structured result."""
        import json
        import re

        json_match = re.search(r"\{[\s\S]*\}", response)
        if json_match:
            try:
                data = json.loads(json_match.group())
            except json.JSONDecodeError:
                data = {}
        else:
            data = {}

        return LLMAnalysisResult(
            vulnerability_explanation=data.get("vulnerability_explanation", ""),
            technical_details=data.get("technical_details", ""),
            potential_impact=data.get("potential_impact", ""),
            fix_code_example=data.get("fix_code_example", ""),
            alternative_solutions=data.get("alternative_solutions", []),
            best_practices=data.get("best_practices", []),
            confidence_score=data.get("confidence_score", 0.0),
            additional_references=data.get("additional_references", []),
        )

    def analyze_finding(
        self,
        finding: VulnerabilityFinding,
    ) -> LLMAnalysisResult:
        """Analyze a single vulnerability finding using LLM.

        Args:
            finding: The vulnerability finding to analyze

        Returns:
            Structured LLM analysis result
        """
        prompt = self._build_analysis_prompt(finding)

        try:
            response = self.llm_client.generate(
                prompt=prompt,
                max_tokens=2000,
                temperature=0.3,
            )
            result = self._parse_llm_response(response)
        except Exception as e:
            result = LLMAnalysisResult(
                vulnerability_explanation=f"LLM analysis failed: {str(e)}",
                technical_details="The LLM service could not be reached or returned an error.",
                potential_impact="Please review the vulnerability manually.",
                confidence_score=0.0,
            )

        return result

    def analyze_findings_batch(
        self,
        findings: List[VulnerabilityFinding],
        progress_callback=None,
    ) -> Dict[str, LLMAnalysisResult]:
        """Analyze multiple findings in batch.

        Args:
            findings: List of vulnerability findings to analyze
            progress_callback: Optional callback for progress updates

        Returns:
            Dictionary mapping finding indices to analysis results
        """
        results = {}

        for idx, finding in enumerate(findings):
            if progress_callback:
                progress_callback(idx + 1, len(findings), finding.file_path)

            analysis = self.analyze_finding(finding)
            results[str(idx)] = analysis

            finding.llm_analysis = analysis.to_dict()

        return results

    def generate_vulnerability_summary(
        self,
        findings: List[VulnerabilityFinding],
    ) -> str:
        """Generate a high-level summary of all findings.

        Args:
            findings: List of vulnerability findings

        Returns:
            Summary text generated by LLM
        """
        if not findings:
            return "No vulnerabilities found."

        risk_summary = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "info": 0,
        }
        type_counts = {}

        for finding in findings:
            risk_summary[finding.risk_level.value] += 1
            vuln_type = finding.vulnerability_type.value
            type_counts[vuln_type] = type_counts.get(vuln_type, 0) + 1

        prompt = f"""As a security analyst, provide a concise executive summary of the following security scan results.

## Scan Summary
Total vulnerabilities found: {len(findings)}

Risk Distribution:
- Critical: {risk_summary['critical']}
- High: {risk_summary['high']}
- Medium: {risk_summary['medium']}
- Low: {risk_summary['low']}
- Info: {risk_summary['info']}

Vulnerability Types:
{chr(10).join(f'- {k}: {v}' for k, v in type_counts.items())}

Provide:
1. An overall security assessment (Critical/High/Medium/Low risk posture)
2. The most concerning issues that need immediate attention
3. Recommended priorities for remediation
4. Key recommendations for improving security posture

Keep it concise and executive-friendly (3-4 paragraphs maximum)."""

        try:
            summary = self.llm_client.generate(
                prompt=prompt,
                max_tokens=1000,
                temperature=0.5,
            )
        except Exception as e:
            summary = f"Failed to generate summary: {str(e)}"

        return summary

    def suggest_severity_adjustment(
        self,
        finding: VulnerabilityFinding,
        context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Ask LLM to suggest if severity should be adjusted based on context.

        Args:
            finding: The vulnerability finding
            context: Additional context about the codebase/environment

        Returns:
            Dictionary with suggested severity and reasoning
        """
        prompt = f"""Review this security finding and determine if the severity level should be adjusted based on the context.

## Finding
- Vulnerability: {finding.rule_name}
- Current Risk Level: {finding.risk_level.value}
- File: {finding.file_path}
- Language: {finding.language}

## Code Context
```
{chr(10).join(finding.surrounding_lines)}
```

{f'## Additional Context\\n{context}' if context else ''}

Please analyze and determine if the severity should be:
1. INCREASED: The vulnerability is more severe than indicated
2. MAINTAINED: Current severity is appropriate
3. DECREASED: The vulnerability is less severe in this context

Return JSON:
{{
    "recommendation": "INCREASED|MAINTAINED|DECREASED",
    "suggested_severity": "critical|high|medium|low|info",
    "reasoning": "Detailed explanation for the recommendation",
    "factors": ["List of factors that influenced the decision"]
}}"""

        try:
            response = self.llm_client.generate(
                prompt=prompt,
                max_tokens=800,
                temperature=0.3,
            )
            import json
            import re
            json_match = re.search(r"\{[\s\S]*\}", response)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass

        return {
            "recommendation": "MAINTAINED",
            "suggested_severity": finding.risk_level.value,
            "reasoning": "Analysis unavailable, maintain current severity.",
            "factors": [],
        }

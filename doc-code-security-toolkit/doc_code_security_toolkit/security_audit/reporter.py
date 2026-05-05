"""Security report generation module."""

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from jinja2 import Environment, FileSystemLoader, PackageLoader, select_autoescape

from doc_code_security_toolkit.security_audit.rules import RiskLevel
from doc_code_security_toolkit.security_audit.scanner import VulnerabilityFinding


@dataclass
class SecurityReport:
    """Security audit report data structure."""

    scan_id: str
    scan_time: datetime
    target_path: str
    total_files_scanned: int
    total_findings: int
    findings: List[VulnerabilityFinding]
    statistics: Dict[str, Any]
    summary: str = ""
    recommendations: List[str] = field(default_factory=list)
    llm_analyses: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert report to dictionary."""
        risk_order = {
            "critical": 0,
            "high": 1,
            "medium": 2,
            "low": 3,
            "info": 4,
        }

        sorted_findings = sorted(
            self.findings,
            key=lambda f: risk_order[f.risk_level.value]
        )

        return {
            "scan_id": self.scan_id,
            "scan_time": self.scan_time.isoformat(),
            "target_path": self.target_path,
            "total_files_scanned": self.total_files_scanned,
            "total_findings": self.total_findings,
            "summary": self.summary,
            "recommendations": self.recommendations,
            "statistics": self.statistics,
            "findings": [f.to_dict() for f in sorted_findings],
            "llm_analyses": self.llm_analyses,
        }


class SecurityReporter:
    """Security report generator."""

    OUTPUT_FORMATS = ["json", "yaml", "html", "markdown"]

    def __init__(self, output_directory: str = "./security-reports"):
        self.output_directory = Path(output_directory)
        self.output_directory.mkdir(parents=True, exist_ok=True)

    def generate_report(
        self,
        findings: List[VulnerabilityFinding],
        statistics: Dict[str, Any],
        target_path: str,
        summary: str = "",
        recommendations: Optional[List[str]] = None,
        llm_analyses: Optional[Dict[str, Any]] = None,
    ) -> SecurityReport:
        """Generate a security report.

        Args:
            findings: List of vulnerability findings
            statistics: Scan statistics
            target_path: Path that was scanned
            summary: Executive summary
            recommendations: List of recommendations
            llm_analyses: LLM analysis results

        Returns:
            SecurityReport object
        """
        import uuid

        report = SecurityReport(
            scan_id=str(uuid.uuid4())[:8],
            scan_time=datetime.now(),
            target_path=target_path,
            total_files_scanned=statistics.get("summary", {}).get("files_scanned", 0),
            total_findings=len(findings),
            findings=findings,
            statistics=statistics,
            summary=summary,
            recommendations=recommendations or self._generate_default_recommendations(findings),
            llm_analyses=llm_analyses or {},
        )

        return report

    def _generate_default_recommendations(
        self, findings: List[VulnerabilityFinding]
    ) -> List[str]:
        """Generate default recommendations based on findings."""
        recommendations = []

        risk_counts = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
        }

        vuln_types = set()

        for finding in findings:
            if finding.risk_level.value in risk_counts:
                risk_counts[finding.risk_level.value] += 1
            vuln_types.add(finding.vulnerability_type.value)

        if risk_counts["critical"] > 0:
            recommendations.append(
                f"Address the {risk_counts['critical']} critical vulnerability(ies) immediately. These pose immediate security risks."
            )

        if risk_counts["high"] > 0:
            recommendations.append(
                f"Prioritize fixing the {risk_counts['high']} high-severity issues within the next sprint."
            )

        if "sql_injection" in vuln_types:
            recommendations.append(
                "Review all database interactions and ensure parameterized queries are used consistently."
            )

        if "xss" in vuln_types:
            recommendations.append(
                "Implement proper output encoding and input validation for all user-facing components."
            )

        if "command_injection" in vuln_types:
            recommendations.append(
                "Replace shell command execution with safer library alternatives where possible."
            )

        if "hardcoded_secrets" in vuln_types:
            recommendations.append(
                "Rotate any exposed credentials and move all secrets to environment variables or a secure vault."
            )

        if not recommendations:
            recommendations.append(
                "No high-risk issues found. Continue regular security audits to maintain security posture."
            )

        return recommendations

    def save_report(
        self,
        report: SecurityReport,
        output_format: str = "json",
        filename: Optional[str] = None,
    ) -> Path:
        """Save report to file.

        Args:
            report: SecurityReport to save
            output_format: Output format (json, yaml, html, markdown)
            filename: Optional filename (without extension)

        Returns:
            Path to saved file
        """
        if output_format.lower() not in self.OUTPUT_FORMATS:
            raise ValueError(
                f"Unsupported format: {output_format}. "
                f"Supported formats: {self.OUTPUT_FORMATS}"
            )

        output_format = output_format.lower()

        if not filename:
            timestamp = report.scan_time.strftime("%Y%m%d_%H%M%S")
            filename = f"security_report_{report.scan_id}_{timestamp}"

        file_path = self.output_directory / f"{filename}.{output_format}"

        if output_format == "json":
            self._save_json(report, file_path)
        elif output_format == "yaml":
            self._save_yaml(report, file_path)
        elif output_format == "html":
            self._save_html(report, file_path)
        elif output_format == "markdown":
            self._save_markdown(report, file_path)

        return file_path

    def _save_json(self, report: SecurityReport, file_path: Path) -> None:
        """Save report as JSON."""
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(report.to_dict(), f, indent=2, ensure_ascii=False)

    def _save_yaml(self, report: SecurityReport, file_path: Path) -> None:
        """Save report as YAML."""
        with open(file_path, "w", encoding="utf-8") as f:
            yaml.dump(report.to_dict(), f, allow_unicode=True, default_flow_style=False)

    def _get_risk_badge(self, risk_level: str) -> str:
        """Get HTML badge for risk level."""
        badges = {
            "critical": '<span class="badge bg-danger">CRITICAL</span>',
            "high": '<span class="badge bg-warning text-dark">HIGH</span>',
            "medium": '<span class="badge bg-primary">MEDIUM</span>',
            "low": '<span class="badge bg-info">LOW</span>',
            "info": '<span class="badge bg-secondary">INFO</span>',
        }
        return badges.get(risk_level.lower(), f'<span class="badge bg-secondary">{risk_level.upper()}</span>')

    def _save_html(self, report: SecurityReport, file_path: Path) -> None:
        """Save report as HTML."""
        report_dict = report.to_dict()

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Audit Report - {report.scan_id}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }}
        .header h1 {{ font-size: 2em; margin-bottom: 10px; }}
        .header .meta {{ opacity: 0.9; font-size: 0.9em; }}
        .card {{ background: white; border-radius: 10px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .card h2 {{ font-size: 1.4em; margin-bottom: 20px; color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
        .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }}
        .summary-item {{ text-align: center; padding: 20px; border-radius: 8px; }}
        .summary-item .value {{ font-size: 2.5em; font-weight: bold; }}
        .summary-item .label {{ font-size: 0.9em; opacity: 0.7; }}
        .critical {{ background: #fee2e2; color: #dc2626; }}
        .high {{ background: #fef3c7; color: #d97706; }}
        .medium {{ background: #dbeafe; color: #2563eb; }}
        .low {{ background: #d1fae5; color: #059669; }}
        .info {{ background: #f3f4f6; color: #6b7280; }}
        .finding {{ border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 15px; overflow: hidden; }}
        .finding-header {{ padding: 15px 20px; background: #f9fafb; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }}
        .finding-header:hover {{ background: #f3f4f6; }}
        .finding-title {{ font-weight: 600; }}
        .finding-meta {{ font-size: 0.85em; color: #6b7280; }}
        .finding-content {{ padding: 20px; display: none; border-top: 1px solid #e5e7eb; }}
        .finding-content.active {{ display: block; }}
        .finding-content h4 {{ margin: 15px 0 10px; color: #374151; }}
        .finding-content pre {{ background: #1f2937; color: #e5e7eb; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 0.9em; }}
        .finding-content code {{ font-family: 'Fira Code', monospace; }}
        .recommendations ul {{ list-style: none; }}
        .recommendations li {{ padding: 12px 15px 12px 40px; background: #f0f9ff; border-left: 4px solid #3b82f6; margin-bottom: 10px; border-radius: 0 6px 6px 0; position: relative; }}
        .recommendations li::before {{ content: "💡"; position: absolute; left: 12px; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.75em; font-weight: 600; }}
        .bg-danger {{ background: #dc2626; color: white; }}
        .bg-warning {{ background: #f59e0b; color: #1f2937; }}
        .bg-primary {{ background: #3b82f6; color: white; }}
        .bg-info {{ background: #06b6d4; color: white; }}
        .bg-secondary {{ background: #6b7280; color: white; }}
        table {{ width: 100%; border-collapse: collapse; }}
        th, td {{ padding: 12px 15px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
        th {{ background: #f9fafb; font-weight: 600; }}
        tr:hover {{ background: #f9fafb; }}
        .executive-summary {{ white-space: pre-line; line-height: 1.8; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Security Audit Report</h1>
            <div class="meta">
                <strong>Scan ID:</strong> {report.scan_id} | 
                <strong>Time:</strong> {report.scan_time.strftime('%Y-%m-%d %H:%M:%S')} | 
                <strong>Target:</strong> {report.target_path}
            </div>
        </div>

        <div class="card">
            <h2>📊 Summary</h2>
            <div class="summary-grid">
                <div class="summary-item critical">
                    <div class="value">{report_dict['statistics']['risk_distribution']['critical']}</div>
                    <div class="label">Critical</div>
                </div>
                <div class="summary-item high">
                    <div class="value">{report_dict['statistics']['risk_distribution']['high']}</div>
                    <div class="label">High</div>
                </div>
                <div class="summary-item medium">
                    <div class="value">{report_dict['statistics']['risk_distribution']['medium']}</div>
                    <div class="label">Medium</div>
                </div>
                <div class="summary-item low">
                    <div class="value">{report_dict['statistics']['risk_distribution']['low']}</div>
                    <div class="label">Low</div>
                </div>
                <div class="summary-item info">
                    <div class="value">{report_dict['summary']['total_findings']}</div>
                    <div class="label">Total Findings</div>
                </div>
                <div class="summary-item info">
                    <div class="value">{report_dict['summary']['total_files_scanned']}</div>
                    <div class="label">Files Scanned</div>
                </div>
            </div>
        </div>
"""

        if report.summary:
            html_content += f"""
        <div class="card">
            <h2>📋 Executive Summary</h2>
            <div class="executive-summary">{report.summary}</div>
        </div>
"""

        html_content += f"""
        <div class="card recommendations">
            <h2>✅ Recommendations</h2>
            <ul>
                {''.join(f'<li>{rec}</li>' for rec in report.recommendations)}
            </ul>
        </div>
"""

        if report_dict["statistics"]["vulnerability_types"]:
            html_content += f"""
        <div class="card">
            <h2>📈 Vulnerability Types</h2>
            <table>
                <thead>
                    <tr>
                        <th>Vulnerability Type</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(f'<tr><td>{k}</td><td><strong>{v}</strong></td></tr>' for k, v in sorted(report_dict['statistics']['vulnerability_types'].items(), key=lambda x: -x[1]))}
                </tbody>
            </table>
        </div>
"""

        if report.findings:
            html_content += f"""
        <div class="card">
            <h2>🔍 Findings</h2>
"""

            risk_order = ["critical", "high", "medium", "low", "info"]
            sorted_findings = sorted(
                report.findings,
                key=lambda f: risk_order.index(f.risk_level.value) if f.risk_level.value in risk_order else 999
            )

            for idx, finding in enumerate(sorted_findings, 1):
                html_content += f"""
            <div class="finding">
                <div class="finding-header" onclick="toggleFinding({idx})">
                    <div>
                        <span class="finding-title">
                            {self._get_risk_badge(finding.risk_level.value)}
                            {idx}. {finding.rule_name}
                        </span>
                        <div class="finding-meta">
                            {finding.file_path}:{finding.line_number} | {finding.language}
                        </div>
                    </div>
                    <span>▼</span>
                </div>
                <div class="finding-content" id="finding-{idx}">
                    <h4>Description</h4>
                    <p>{finding.description}</p>

                    <h4>Location</h4>
                    <p><strong>File:</strong> {finding.file_path}:{finding.line_number}</p>
                    <p><strong>Language:</strong> {finding.language}</p>

                    <h4>Vulnerable Code</h4>
                    <pre><code>{chr(10).join(finding.surrounding_lines)}</code></pre>

                    <h4>Remediation</h4>
                    <p>{finding.remediation}</p>

                    {f'{"".join(f"<h4>References</h4><ul><li><a href=\\\"{r}\\\" target=\\\"_blank\\\">{r}</a></li></ul>" for r in finding.references)}' if finding.references else ''}

                    {finding.llm_analysis and f'''
                    <h4>🤖 LLM Analysis</h4>
                    <h5>Vulnerability Explanation</h5>
                    <p>{finding.llm_analysis.get('vulnerability_explanation', '')}</p>

                    <h5>Technical Details</h5>
                    <p>{finding.llm_analysis.get('technical_details', '')}</p>

                    <h5>Potential Impact</h5>
                    <p>{finding.llm_analysis.get('potential_impact', '')}</p>

                    {finding.llm_analysis.get('fix_code_example') and f'''
                    <h5>Suggested Fix</h5>
                    <pre><code>{finding.llm_analysis['fix_code_example']}</code></pre>
                    '''}

                    {finding.llm_analysis.get('best_practices') and f'''
                    <h5>Best Practices</h5>
                    <ul>{''.join(f'<li>{bp}</li>' for bp in finding.llm_analysis['best_practices'])}</ul>
                    '''}
                    '''}
                </div>
            </div>
"""

            html_content += """
        </div>
"""

        html_content += f"""
        <div class="card">
            <h2>📁 Statistics</h2>
            <table>
                <tr>
                    <td><strong>Files Scanned:</strong></td>
                    <td>{report_dict['summary']['total_files_scanned']}</td>
                </tr>
                <tr>
                    <td><strong>Files with Issues:</strong></td>
                    <td>{report_dict['statistics']['summary']['files_with_issues']}</td>
                </tr>
                <tr>
                    <td><strong>Scan Duration:</strong></td>
                    <td>{report_dict['statistics']['summary']['scan_duration_seconds']:.2f} seconds</td>
                </tr>
                <tr>
                    <td><strong>Programming Languages:</strong></td>
                    <td>{', '.join(report_dict['statistics']['languages'].keys()) or 'N/A'}</td>
                </tr>
            </table>
        </div>

        <div class="card">
            <p style="text-align: center; color: #6b7280; font-size: 0.9em;">
                Generated by doc-code-security-toolkit | Scan ID: {report.scan_id}
            </p>
        </div>
    </div>

    <script>
        function toggleFinding(id) {{
            const content = document.getElementById('finding-' + id);
            content.classList.toggle('active');
        }}
    </script>
</body>
</html>
"""

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html_content)

    def _save_markdown(self, report: SecurityReport, file_path: Path) -> None:
        """Save report as Markdown."""
        report_dict = report.to_dict()

        md_content = f"""# 🔒 Security Audit Report

**Scan ID:** {report.scan_id}  
**Time:** {report.scan_time.strftime('%Y-%m-%d %H:%M:%S')}  
**Target:** {report.target_path}

---

## 📊 Summary

| Risk Level | Count |
|------------|-------|
| Critical | {report_dict['statistics']['risk_distribution']['critical']} |
| High | {report_dict['statistics']['risk_distribution']['high']} |
| Medium | {report_dict['statistics']['risk_distribution']['medium']} |
| Low | {report_dict['statistics']['risk_distribution']['low']} |
| Info | {report_dict['statistics']['risk_distribution']['info']} |

**Total Findings:** {report_dict['summary']['total_findings']}  
**Files Scanned:** {report_dict['summary']['total_files_scanned']}  
**Scan Duration:** {report_dict['statistics']['summary']['scan_duration_seconds']:.2f}s

---

"""

        if report.summary:
            md_content += f"""## 📋 Executive Summary

{report.summary}

---

"""

        md_content += """## ✅ Recommendations

"""
        for rec in report.recommendations:
            md_content += f"- {rec}\n"

        md_content += """
---

## 📈 Vulnerability Types

| Type | Count |
|------|-------|
"""
        for vuln_type, count in sorted(
            report_dict["statistics"]["vulnerability_types"].items(),
            key=lambda x: -x[1]
        ):
            md_content += f"| {vuln_type} | {count} |\n"

        md_content += """
---

## 🔍 Findings

"""

        risk_order = ["critical", "high", "medium", "low", "info"]
        sorted_findings = sorted(
            report.findings,
            key=lambda f: risk_order.index(f.risk_level.value) if f.risk_level.value in risk_order else 999
        )

        for idx, finding in enumerate(sorted_findings, 1):
            md_content += f"""### {idx}. [{finding.risk_level.value.upper()}] {finding.rule_name}

**ID:** {finding.rule_id}  
**File:** `{finding.file_path}:{finding.line_number}`  
**Language:** {finding.language}  
**Type:** {finding.vulnerability_type.value}

**Description:**  
{finding.description}

**Vulnerable Code:**
```
{chr(10).join(finding.surrounding_lines)}
```

**Remediation:**  
{finding.remediation}

"""
            if finding.references:
                md_content += "**References:**\n"
                for ref in finding.references:
                    md_content += f"- {ref}\n"

            if finding.llm_analysis:
                md_content += """
**🤖 LLM Analysis:**

"""
                if finding.llm_analysis.get("vulnerability_explanation"):
                    md_content += f"**Explanation:** {finding.llm_analysis['vulnerability_explanation']}\n\n"
                if finding.llm_analysis.get("technical_details"):
                    md_content += f"**Technical Details:** {finding.llm_analysis['technical_details']}\n\n"
                if finding.llm_analysis.get("potential_impact"):
                    md_content += f"**Potential Impact:** {finding.llm_analysis['potential_impact']}\n\n"
                if finding.llm_analysis.get("fix_code_example"):
                    md_content += f"""**Suggested Fix:**
```
{finding.llm_analysis['fix_code_example']}
```

"""

            md_content += "---\n\n"

        md_content += f"""## 📁 Statistics

- **Files Scanned:** {report_dict['summary']['total_files_scanned']}
- **Files with Issues:** {report_dict['statistics']['summary']['files_with_issues']}
- **Languages Detected:** {', '.join(report_dict['statistics']['languages'].keys()) or 'N/A'}

---

*Generated by doc-code-security-toolkit | Scan ID: {report.scan_id}*
"""

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(md_content)

    def export_finding(
        self,
        finding: VulnerabilityFinding,
        output_format: str = "json",
    ) -> str:
        """Export a single finding as string.

        Args:
            finding: The vulnerability finding to export
            output_format: Output format (json, yaml)

        Returns:
            Formatted string
        """
        data = finding.to_dict()

        if output_format == "json":
            return json.dumps(data, indent=2, ensure_ascii=False)
        elif output_format == "yaml":
            return yaml.dump(data, allow_unicode=True, default_flow_style=False)
        else:
            raise ValueError(f"Unsupported format: {output_format}")

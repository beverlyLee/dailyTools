"""Main CLI entry point for doc-code-security-toolkit."""

import json
import os
from pathlib import Path
from typing import List, Optional

import click
from rich.console import Console
from rich.table import Table
from rich.tree import Tree

from doc_code_security_toolkit import __version__
from doc_code_security_toolkit.config.settings import settings
from doc_code_security_toolkit.document_processing.converters import TextFormatConverter
from doc_code_security_toolkit.document_processing.processors import DocumentProcessor
from doc_code_security_toolkit.document_processing.readers import (
    DocumentContent,
    read_document,
)
from doc_code_security_toolkit.security_audit.analyzer import VulnerabilityAnalyzer
from doc_code_security_toolkit.security_audit.reporter import SecurityReporter
from doc_code_security_toolkit.security_audit.rules import RiskLevel
from doc_code_security_toolkit.security_audit.scanner import CodeScanner, VulnerabilityFinding

console = Console()


@click.group()
@click.version_option(__version__, "-v", "--version")
@click.option("--config", "-c", type=click.Path(exists=True), help="Path to config file")
@click.pass_context
def cli(ctx, config: Optional[str]):
    """Development Documentation and Code Security Toolkit.

    A comprehensive toolkit for code security auditing and document automation processing.
    """
    ctx.ensure_object(dict)
    ctx.obj["config_path"] = config

    if config:
        settings.load_from_file(config)


@cli.group(name="audit")
def audit_group():
    """Code security audit commands."""
    pass


@audit_group.command(name="scan")
@click.argument("path", type=click.Path(exists=True))
@click.option("--recursive/--no-recursive", default=True, help="Scan recursively")
@click.option("--output-format", "-f", type=click.Choice(["json", "yaml", "html", "markdown"]), default="json", help="Output format")
@click.option("--output-dir", "-o", type=click.Path(), default="./security-reports", help="Output directory")
@click.option("--min-risk", "-r", type=click.Choice(["info", "low", "medium", "high", "critical"]), default="info", help="Minimum risk level to report")
@click.option("--llm-analyze/--no-llm-analyze", default=False, help="Use LLM to analyze findings")
@click.option("--file-types", "-t", multiple=True, help="File types to scan (e.g., .py, .js)")
@click.option("--ignore", "-i", multiple=True, help="Patterns to ignore")
def audit_scan(
    path: str,
    recursive: bool,
    output_format: str,
    output_dir: str,
    min_risk: str,
    llm_analyze: bool,
    file_types: List[str],
    ignore: List[str],
):
    """Scan code for security vulnerabilities.

    PATH: Path to file or directory to scan
    """
    console.print(f"[bold blue]🔒 Starting Security Audit[/bold blue]")
    console.print(f"Target: {path}")
    console.print(f"Output format: {output_format}")
    console.print(f"Minimum risk: {min_risk}")
    console.print()

    ignore_patterns = list(ignore) if ignore else None
    file_types_list = list(file_types) if file_types else None

    scanner = CodeScanner(ignore_patterns=ignore_patterns)

    with console.status("[bold green]Scanning files..."):
        findings = scanner.scan(
            target_path=path,
            recursive=recursive,
            file_types=file_types_list,
        )

    risk_level_map = {
        "info": RiskLevel.INFO,
        "low": RiskLevel.LOW,
        "medium": RiskLevel.MEDIUM,
        "high": RiskLevel.HIGH,
        "critical": RiskLevel.CRITICAL,
    }

    filtered_findings = scanner.filter_findings(
        findings,
        min_risk_level=risk_level_map[min_risk],
    )

    statistics = scanner.get_statistics(filtered_findings)

    console.print(f"[bold]📊 Scan Complete[/bold]")
    console.print(f"Files scanned: {scanner.scanned_files}")
    console.print(f"Scan duration: {scanner.scan_duration:.2f}s")
    console.print()

    if not filtered_findings:
        console.print("[bold green]✅ No vulnerabilities found![/bold green]")
        return

    table = Table(title="Vulnerability Summary")
    table.add_column("Risk Level", style="bold")
    table.add_column("Count", justify="right")

    risk_order = ["critical", "high", "medium", "low", "info"]
    risk_styles = {
        "critical": "bold red",
        "high": "bold yellow",
        "medium": "bold blue",
        "low": "bold green",
        "info": "bold white",
    }

    for risk in risk_order:
        count = statistics["risk_distribution"].get(risk, 0)
        if count > 0:
            table.add_row(
                f"[{risk_styles[risk]}]{risk.upper()}[/{risk_styles[risk]}]",
                str(count),
            )

    console.print(table)
    console.print()

    if llm_analyze and filtered_findings:
        console.print("[bold yellow]🤖 Running LLM analysis...[/bold yellow]")

        def progress_callback(current: int, total: int, file_path: str):
            console.print(f"  Analyzing {current}/{total}: {Path(file_path).name}")

        analyzer = VulnerabilityAnalyzer()
        analyzer.analyze_findings_batch(
            filtered_findings,
            progress_callback=progress_callback,
        )
        console.print()

    with console.status("[bold green]Generating report..."):
        reporter = SecurityReporter(output_directory=output_dir)

        summary = ""
        if llm_analyze and filtered_findings:
            try:
                analyzer = VulnerabilityAnalyzer()
                summary = analyzer.generate_vulnerability_summary(filtered_findings)
            except Exception:
                summary = ""

        report = reporter.generate_report(
            findings=filtered_findings,
            statistics=statistics,
            target_path=path,
            summary=summary,
        )

        saved_path = reporter.save_report(
            report=report,
            output_format=output_format,
        )

    console.print(f"[bold green]✅ Report saved to: {saved_path}[/bold green]")

    if filtered_findings:
        console.print()
        console.print("[bold]Top Findings (by risk):[/bold]")

        sorted_by_risk = sorted(
            filtered_findings,
            key=lambda f: {
                "critical": 0,
                "high": 1,
                "medium": 2,
                "low": 3,
                "info": 4,
            }.get(f.risk_level.value, 999)
        )

        for finding in sorted_by_risk[:5]:
            style = risk_styles.get(finding.risk_level.value, "bold white")
            console.print(
                f"  [{style}]●[/{style}] {finding.rule_name} - "
                f"{Path(finding.file_path).name}:{finding.line_number}"
            )


@audit_group.command(name="list-rules")
@click.option("--custom-rules", "-c", type=click.Path(exists=True), help="Custom rules file")
def audit_list_rules(custom_rules: Optional[str]):
    """List available security rules."""
    from doc_code_security_toolkit.security_audit.rules import SecurityRuleManager

    console.print("[bold blue]📋 Security Rules[/bold blue]")
    console.print()

    rule_manager = SecurityRuleManager(custom_rules_path=custom_rules)
    rules = rule_manager.get_all_rules()

    if not rules:
        console.print("[yellow]No rules found.[/yellow]")
        return

    table = Table(title="Available Rules")
    table.add_column("ID", style="bold cyan")
    table.add_column("Name", style="bold")
    table.add_column("Type")
    table.add_column("Risk", style="bold")
    table.add_column("Languages")

    risk_styles = {
        "critical": "bold red",
        "high": "bold yellow",
        "medium": "bold blue",
        "low": "bold green",
        "info": "bold white",
    }

    for rule in rules:
        style = risk_styles.get(rule.risk_level.value, "bold white")
        languages = ", ".join(rule.languages) if rule.languages else "All"

        table.add_row(
            rule.id,
            rule.name,
            rule.vulnerability_type.value,
            f"[{style}]{rule.risk_level.value.upper()}[/{style}]",
            languages,
        )

    console.print(table)
    console.print()
    console.print(f"Total rules: {len(rules)}")


@audit_group.command(name="export-rules")
@click.argument("output_path", type=click.Path())
@click.option("--custom-rules", "-c", type=click.Path(exists=True), help="Custom rules to include")
def audit_export_rules(output_path: str, custom_rules: Optional[str]):
    """Export rules to a file.

    OUTPUT_PATH: Path to save the rules file
    """
    from doc_code_security_toolkit.security_audit.rules import SecurityRuleManager

    console.print(f"[bold blue]📤 Exporting Rules[/bold blue]")

    rule_manager = SecurityRuleManager(custom_rules_path=custom_rules)

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    rule_manager.export_rules(output_path)

    console.print(f"[bold green]✅ Rules exported to: {output_path}[/bold green]")


@cli.group(name="document")
def document_group():
    """Document processing commands."""
    pass


@document_group.command(name="read")
@click.argument("path", type=click.Path(exists=True))
@click.option("--extract-tables/--no-tables", default=True, help="Extract tables")
@click.option("--extract-images/--no-images", default=False, help="Extract images")
@click.option("--output", "-o", type=click.Path(), help="Output text file path")
@click.option("--json", is_flag=True, help="Output as JSON")
def document_read(
    path: str,
    extract_tables: bool,
    extract_images: bool,
    output: Optional[str],
    json: bool,
):
    """Read and extract content from a document.

    PATH: Path to document file
    """
    console.print(f"[bold blue]📄 Reading Document[/bold blue]")
    console.print(f"File: {path}")
    console.print()

    with console.status("[bold green]Extracting content..."):
        content = read_document(
            file_path=path,
            extract_tables=extract_tables,
            extract_images=extract_images,
        )

    if json:
        output_json = json.dumps(content.to_dict(), indent=2, ensure_ascii=False)
        if output:
            output_path = Path(output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(output_json)
            console.print(f"[bold green]✅ JSON saved to: {output}[/bold green]")
        else:
            console.print(output_json)
        return

    table = Table(title="Document Summary")
    table.add_column("Attribute", style="bold cyan")
    table.add_column("Value")

    table.add_row("File Name", content.file_name)
    table.add_row("File Size", f"{content.file_size:,} bytes")
    table.add_row("Document Type", content.document_type)
    table.add_row("Page Count", str(content.page_count))
    table.add_row("Text Length", f"{len(content.text):,} chars")
    table.add_row("Tables Found", str(len(content.tables)))
    table.add_row("Images Found", str(len(content.images)))
    table.add_row("Links Found", str(len(content.links)))

    console.print(table)
    console.print()

    console.print("[bold]📝 Text Preview:[/bold]")
    preview = content.text[:500] + "..." if len(content.text) > 500 else content.text
    console.print(preview)
    console.print()

    if content.tables:
        console.print("[bold]📊 Tables:[/bold]")
        for idx, table_data in enumerate(content.tables[:3]):
            console.print(f"  Table {idx + 1}: {table_data.table_id}")
            if table_data.headers:
                console.print(f"    Headers: {', '.join(table_data.headers[:5])}")
            console.print(f"    Rows: {len(table_data.rows)}")
        if len(content.tables) > 3:
            console.print(f"  ... and {len(content.tables) - 3} more tables")
        console.print()

    if output:
        output_path = Path(output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        content.save_text(output_path)
        console.print(f"[bold green]✅ Text saved to: {output}[/bold green]")


@document_group.command(name="process")
@click.argument("path", type=click.Path(exists=True))
@click.option("--classify/--no-classify", default=True, help="Classify document type")
@click.option("--summarize/--no-summarize", default=True, help="Generate summary")
@click.option("--extract-info/--no-extract", default=True, help="Extract key information")
@click.option("--summary-length", type=click.Choice(["short", "medium", "long"]), default="medium", help="Summary length")
@click.option("--output", "-o", type=click.Path(), help="Output JSON file path")
def document_process(
    path: str,
    classify: bool,
    summarize: bool,
    extract_info: bool,
    summary_length: str,
    output: Optional[str],
):
    """Process a document with LLM.

    PATH: Path to document file
    """
    console.print(f"[bold blue]🤖 Processing Document[/bold blue]")
    console.print(f"File: {path}")
    console.print()

    with console.status("[bold green]Reading document..."):
        content = read_document(path)

    processor = DocumentProcessor()

    with console.status("[bold yellow]Running LLM processing..."):
        results = processor.process_document(
            content=content,
            classify=classify,
            summarize=summarize,
            extract_info=extract_info,
            summary_length=summary_length,
        )

    console.print("[bold]Processing Results:[/bold]")
    console.print()

    if classify and "classification" in results:
        cls = results["classification"]
        console.print("[bold cyan]📋 Classification:[/bold cyan]")
        console.print(f"  Type: {cls['document_type']}")
        console.print(f"  Category: {cls['category']}")
        console.print(f"  Confidence: {cls['confidence']:.1%}")
        console.print(f"  Keywords: {', '.join(cls.get('keywords', []))}")
        console.print()

    if summarize and "summarization" in results:
        summ = results["summarization"]
        console.print("[bold magenta]📝 Summary:[/bold magenta]")
        console.print(summ["summary"])
        console.print()
        console.print("[bold]Key Points:[/bold]")
        for idx, point in enumerate(summ.get("key_points", []), 1):
            console.print(f"  {idx}. {point}")
        console.print()
        console.print(f"  Original words: {summ['original_word_count']}")
        console.print(f"  Summary words: {summ['word_count']}")
        console.print(f"  Compression: {summ['compression_ratio']:.1%}")
        console.print()

    if extract_info and "key_information" in results:
        info = results["key_information"]
        console.print("[bold green]🔍 Key Information:[/bold green]")

        if info.get("names"):
            console.print(f"  Names: {', '.join(info['names'][:5])}")
        if info.get("organizations"):
            console.print(f"  Organizations: {', '.join(info['organizations'][:5])}")
        if info.get("dates"):
            console.print(f"  Dates: {', '.join(info['dates'][:5])}")
        if info.get("amounts"):
            console.print(f"  Amounts: {', '.join(info['amounts'][:5])}")
        if info.get("emails"):
            console.print(f"  Emails: {', '.join(info['emails'])}")
        if info.get("urls"):
            console.print(f"  URLs: {', '.join(info['urls'][:5])}")
        if info.get("locations"):
            console.print(f"  Locations: {', '.join(info['locations'][:5])}")
        console.print()

    if output:
        output_path = Path(output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        console.print(f"[bold green]✅ Results saved to: {output}[/bold green]")


@document_group.command(name="convert")
@click.argument("source", type=click.Path(exists=True))
@click.argument("target", type=click.Path())
@click.option("--full-html/--body-only", default=True, help="For MD->HTML: create full document")
@click.option("--title", type=str, help="Document title for HTML conversion")
@click.option("--include-tables/--no-tables", default=True, help="For PDF->Word: include tables")
def document_convert(
    source: str,
    target: str,
    full_html: bool,
    title: Optional[str],
    include_tables: bool,
):
    """Convert document formats.

    SOURCE: Source file path
    TARGET: Target file path

    Supported conversions:
      - .md -> .html (Markdown to HTML)
      - .html -> .md (HTML to Markdown)
      - .pdf -> .docx (PDF to Word)
    """
    console.print(f"[bold blue]🔄 Converting Document[/bold blue]")
    console.print(f"Source: {source}")
    console.print(f"Target: {target}")
    console.print()

    source_path = Path(source)
    target_path = Path(target)

    source_ext = source_path.suffix.lower()
    target_ext = target_path.suffix.lower()

    converter = TextFormatConverter()

    supported = converter.list_supported_conversions()
    valid = any(
        c["source"] == source_ext.lstrip(".") and c["target"] == target_ext.lstrip(".")
        for c in supported
    )

    if not valid:
        console.print("[bold red]❌ Unsupported conversion[/bold red]")
        console.print()
        console.print("[bold]Supported conversions:[/bold]")
        for conv in supported:
            console.print(f"  .{conv['source']} -> .{conv['target']}")
        return

    with console.status("[bold green]Converting..."):
        result = TextFormatConverter.convert(
            source_path=source,
            target_path=target,
            full_html=full_html,
            title=title,
            include_tables=include_tables,
        )

    if result.success:
        console.print(f"[bold green]✅ Conversion successful![/bold green]")
        console.print(f"Output: {result.target_path}")
        if result.metadata:
            console.print(f"Metadata: {result.metadata}")
    else:
        console.print(f"[bold red]❌ Conversion failed[/bold red]")
        console.print(f"Error: {result.error_message}")


@document_group.command(name="batch")
@click.argument("input_dir", type=click.Path(exists=True))
@click.argument("output_dir", type=click.Path())
@click.option("--pattern", "-p", multiple=True, default=["*.pdf", "*.docx", "*.xlsx", "*.txt", "*.md"], help="File patterns to process")
@click.option("--classify/--no-classify", default=True, help="Classify documents")
@click.option("--summarize/--no-summarize", default=True, help="Summarize documents")
@click.option("--extract-info/--no-extract", default=True, help="Extract key info")
@click.option("--output-format", "-f", type=click.Choice(["json", "jsonl"]), default="json", help="Output format")
def document_batch(
    input_dir: str,
    output_dir: str,
    pattern: List[str],
    classify: bool,
    summarize: bool,
    extract_info: bool,
    output_format: str,
):
    """Batch process multiple documents.

    INPUT_DIR: Input directory
    OUTPUT_DIR: Output directory
    """
    import fnmatch

    console.print(f"[bold blue]📦 Batch Processing[/bold blue]")
    console.print(f"Input: {input_dir}")
    console.print(f"Output: {output_dir}")
    console.print(f"Patterns: {', '.join(pattern)}")
    console.print()

    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    files_to_process = []
    for root, dirs, files in os.walk(input_path):
        for file_name in files:
            for pat in pattern:
                if fnmatch.fnmatch(file_name, pat):
                    files_to_process.append(Path(root) / file_name)
                    break

    if not files_to_process:
        console.print("[yellow]No matching files found.[/yellow]")
        return

    console.print(f"Found {len(files_to_process)} files to process.")
    console.print()

    processor = DocumentProcessor()
    all_results = []

    for idx, file_path in enumerate(files_to_process, 1):
        console.print(f"[bold cyan]Processing {idx}/{len(files_to_process)}: {file_path.name}[/bold cyan]")

        try:
            content = read_document(str(file_path))
            results = processor.process_document(
                content=content,
                classify=classify,
                summarize=summarize,
                extract_info=extract_info,
            )
            results["source_file"] = str(file_path)
            results["relative_path"] = str(file_path.relative_to(input_path))
            all_results.append(results)

        except Exception as e:
            console.print(f"  [bold red]Error: {e}[/bold red]")
            all_results.append({
                "source_file": str(file_path),
                "error": str(e),
            })

        console.print()

    output_file = output_path / "batch_results.json"

    with console.status("[bold green]Saving results..."):
        if output_format == "jsonl":
            output_file = output_path / "batch_results.jsonl"
            with open(output_file, "w", encoding="utf-8") as f:
                for result in all_results:
                    f.write(json.dumps(result, ensure_ascii=False) + "\n")
        else:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(all_results, f, indent=2, ensure_ascii=False)

    success_count = sum(1 for r in all_results if "error" not in r)
    error_count = len(all_results) - success_count

    console.print(f"[bold green]✅ Batch processing complete![/bold green]")
    console.print(f"Success: {success_count}")
    console.print(f"Errors: {error_count}")
    console.print(f"Results saved to: {output_file}")


@cli.group(name="config")
def config_group():
    """Configuration commands."""
    pass


@config_group.command(name="show")
def config_show():
    """Show current configuration."""
    console.print(f"[bold blue]⚙️  Configuration[/bold blue]")
    console.print()

    config_dict = settings.to_dict()

    tree = Tree("Settings")

    llm_branch = tree.add("LLM")
    llm_branch.add(f"Model: {config_dict['llm']['model']}")
    llm_branch.add(f"API Key: {'***' if config_dict['llm']['api_key'] else 'Not set'}")
    llm_branch.add(f"Max Tokens: {config_dict['llm']['max_tokens']}")
    llm_branch.add(f"Temperature: {config_dict['llm']['temperature']}")

    security_branch = tree.add("Security Audit")
    security_branch.add(f"Default Rules: {', '.join(config_dict['security_audit']['default_rules'])}")
    security_branch.add(f"Output Format: {config_dict['security_audit']['output_format']}")
    security_branch.add(f"Output Directory: {config_dict['security_audit']['output_directory']}")

    doc_branch = tree.add("Document Processing")
    doc_branch.add(f"Supported Formats: {', '.join(config_dict['document_processing']['supported_formats'])}")
    doc_branch.add(f"Output Directory: {config_dict['document_processing']['output_directory']}")
    doc_branch.add(f"Batch Size: {config_dict['document_processing']['batch_size']}")

    workflow_branch = tree.add("Workflow")
    workflow_branch.add(f"Max Retries: {config_dict['workflow']['max_retries']}")
    workflow_branch.add(f"Max Workers: {config_dict['workflow']['max_workers']}")
    workflow_branch.add(f"Parallel Processing: {config_dict['workflow']['parallel_processing']}")

    console.print(tree)


@config_group.command(name="init")
@click.option("--output", "-o", type=click.Path(), default="./docsec-config.yaml", help="Output file path")
def config_init(output: str):
    """Initialize a new configuration file.

    Creates a template configuration file that you can customize.
    """
    import yaml

    console.print(f"[bold blue]📝 Initializing Configuration[/bold blue]")
    console.print()

    template = {
        "llm": {
            "model": "gpt-4",
            "max_tokens": 4000,
            "temperature": 0.7,
            "timeout": 60,
        },
        "security_audit": {
            "default_rules": [
                "sql_injection",
                "xss",
                "command_injection",
                "path_traversal",
                "insecure_auth",
                "sensitive_data_exposure",
            ],
            "custom_rules_path": None,
            "ignore_patterns": [],
            "risk_level_threshold": "medium",
            "output_format": "json",
            "output_directory": "./security-reports",
        },
        "document_processing": {
            "supported_formats": [
                "pdf",
                "docx",
                "doc",
                "xlsx",
                "xls",
                "txt",
                "md",
                "html",
            ],
            "output_directory": "./output",
            "temp_directory": "./temp",
            "batch_size": 10,
        },
        "workflow": {
            "max_retries": 3,
            "retry_delay": 5,
            "parallel_processing": True,
            "max_workers": 4,
        },
    }

    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("# doc-code-security-toolkit Configuration\n")
        f.write("# Edit this file to customize your settings\n")
        f.write("#\n")
        f.write("# For LLM API key, set OPENAI_API_KEY environment variable\n")
        f.write("# or use OPENAI_BASE_URL for custom endpoints\n")
        f.write("\n")
        yaml.dump(template, f, allow_unicode=True, default_flow_style=False, sort_keys=False)

    console.print(f"[bold green]✅ Configuration file created: {output_path}[/bold green]")
    console.print()
    console.print("[bold]Next steps:[/bold]")
    console.print("  1. Edit the configuration file to customize your settings")
    console.print("  2. Set OPENAI_API_KEY environment variable for LLM features")
    console.print("  3. Use the --config flag to use this configuration file")
    console.print()
    console.print("[bold]Example:[/bold]")
    console.print(f"  docsec audit scan --config {output_path} ./my-project")


if __name__ == "__main__":
    cli()

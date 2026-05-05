"""Document Processing Module for doc-code-security-toolkit.

This module provides intelligent document automation processing capabilities:
- Batch processing of PDF, Word, Excel, and other document formats
- Text extraction, table data extraction, and metadata extraction
- LLM-powered document classification, summarization, and key information extraction
- Document format conversion (PDF to Word, Markdown to HTML, etc.)
- Automated workflows with scheduling and batch processing support
"""

from doc_code_security_toolkit.document_processing.readers import (
    DocumentReader,
    PDFReader,
    WordReader,
    ExcelReader,
    TextReader,
    get_reader_for_format,
)
from doc_code_security_toolkit.document_processing.processors import (
    DocumentProcessor,
    ClassificationResult,
    SummarizationResult,
    KeyInfoExtractionResult,
)
from doc_code_security_toolkit.document_processing.converters import (
    DocumentConverter,
    PDFToWordConverter,
    MarkdownToHTMLConverter,
    HTMLToMarkdownConverter,
)
from doc_code_security_toolkit.document_processing.workflows import (
    WorkflowEngine,
    DocumentWorkflow,
    WorkflowTask,
    ScheduledWorkflow,
)

__all__ = [
    "DocumentReader",
    "PDFReader",
    "WordReader",
    "ExcelReader",
    "TextReader",
    "get_reader_for_format",
    "DocumentProcessor",
    "ClassificationResult",
    "SummarizationResult",
    "KeyInfoExtractionResult",
    "DocumentConverter",
    "PDFToWordConverter",
    "MarkdownToHTMLConverter",
    "HTMLToMarkdownConverter",
    "WorkflowEngine",
    "DocumentWorkflow",
    "WorkflowTask",
    "ScheduledWorkflow",
]

"""Document processors for intelligent document analysis.

This module provides LLM-powered document processing capabilities:
- Document classification
- Document summarization
- Key information extraction
"""

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from doc_code_security_toolkit.document_processing.readers import DocumentContent
from doc_code_security_toolkit.llm.client import LLMClient, get_llm_client


@dataclass
class ClassificationResult:
    """Result of document classification."""

    document_type: str
    confidence: float
    category: str
    subcategory: Optional[str] = None
    keywords: List[str] = field(default_factory=list)
    reasoning: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    processed_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "document_type": self.document_type,
            "confidence": self.confidence,
            "category": self.category,
            "subcategory": self.subcategory,
            "keywords": self.keywords,
            "reasoning": self.reasoning,
            "metadata": self.metadata,
            "processed_at": self.processed_at.isoformat(),
        }


@dataclass
class SummarizationResult:
    """Result of document summarization."""

    summary: str
    key_points: List[str]
    word_count: int
    original_word_count: int
    compression_ratio: float
    summary_type: str = "extract_and_abstract"
    metadata: Dict[str, Any] = field(default_factory=dict)
    processed_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "summary": self.summary,
            "key_points": self.key_points,
            "word_count": self.word_count,
            "original_word_count": self.original_word_count,
            "compression_ratio": self.compression_ratio,
            "summary_type": self.summary_type,
            "metadata": self.metadata,
            "processed_at": self.processed_at.isoformat(),
        }


@dataclass
class KeyInfoExtractionResult:
    """Result of key information extraction."""

    entities: List[Dict[str, Any]]
    dates: List[str]
    amounts: List[str]
    emails: List[str]
    phone_numbers: List[str]
    urls: List[str]
    names: List[str]
    organizations: List[str]
    locations: List[str]
    custom_fields: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    processed_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "entities": self.entities,
            "dates": self.dates,
            "amounts": self.amounts,
            "emails": self.emails,
            "phone_numbers": self.phone_numbers,
            "urls": self.urls,
            "names": self.names,
            "organizations": self.organizations,
            "locations": self.locations,
            "custom_fields": self.custom_fields,
            "metadata": self.metadata,
            "processed_at": self.processed_at.isoformat(),
        }


DEFAULT_DOCUMENT_CATEGORIES = [
    "Legal Document",
    "Financial Report",
    "Contract",
    "Invoice",
    "Resume/CV",
    "Technical Specification",
    "Meeting Minutes",
    "Project Proposal",
    "Email",
    "Letter",
    "Report",
    "Academic Paper",
    "Presentation",
    "Manual/Guide",
    "Policy Document",
    "Form",
    "Receipt",
    "Certificate",
    "News Article",
    "Other",
]


class DocumentProcessor:
    """Intelligent document processor using LLM."""

    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm_client = llm_client or get_llm_client()
        self.max_text_length = 8000

    def _truncate_text(self, text: str, max_chars: int = None) -> str:
        """Truncate text to fit within LLM context limits."""
        max_chars = max_chars or self.max_text_length
        if len(text) <= max_chars:
            return text

        keep_ratio = 0.7
        start_length = int(max_chars * keep_ratio)
        end_length = max_chars - start_length

        return text[:start_length] + "\n\n... [text truncated] ...\n\n" + text[-end_length:]

    def classify_document(
        self,
        content: DocumentContent,
        custom_categories: Optional[List[str]] = None,
    ) -> ClassificationResult:
        """Classify a document.

        Args:
            content: DocumentContent object
            custom_categories: Optional custom list of categories

        Returns:
            ClassificationResult
        """
        categories = custom_categories or DEFAULT_DOCUMENT_CATEGORIES

        truncated_text = self._truncate_text(content.text)

        prompt = f"""Classify the following document.

Document Content:
{truncated_text}

Available Categories:
{chr(10).join(f'- {cat}' for cat in categories)}

Please classify this document and return JSON:
{{
    "document_type": "One of the available categories",
    "category": "Main category",
    "subcategory": "Specific subcategory if applicable, or null",
    "confidence": 0.95,
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "reasoning": "Brief explanation of why this classification was chosen"
}}

Only return the JSON, no other text."""

        try:
            response = self.llm_client.generate(
                prompt=prompt,
                max_tokens=500,
                temperature=0.3,
            )

            json_match = re.search(r"\{[\s\S]*\}", response)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = {}

        except Exception as e:
            data = {
                "document_type": "Unknown",
                "category": "Other",
                "subcategory": None,
                "confidence": 0.0,
                "keywords": [],
                "reasoning": f"Classification failed: {str(e)}",
            }

        return ClassificationResult(
            document_type=data.get("document_type", "Unknown"),
            confidence=float(data.get("confidence", 0.0)),
            category=data.get("category", "Other"),
            subcategory=data.get("subcategory"),
            keywords=data.get("keywords", []),
            reasoning=data.get("reasoning", ""),
            metadata={
                "file_name": content.file_name,
                "document_type_source": content.document_type,
                "page_count": content.page_count,
            },
        )

    def summarize_document(
        self,
        content: DocumentContent,
        summary_length: str = "medium",
        focus_areas: Optional[List[str]] = None,
    ) -> SummarizationResult:
        """Summarize a document.

        Args:
            content: DocumentContent object
            summary_length: "short", "medium", or "long"
            focus_areas: Optional list of areas to focus on

        Returns:
            SummarizationResult
        """
        length_configs = {
            "short": {"max_tokens": 300, "instruction": "Create a very concise summary (2-3 paragraphs maximum)"},
            "medium": {"max_tokens": 800, "instruction": "Create a comprehensive summary covering all key points"},
            "long": {"max_tokens": 1500, "instruction": "Create a detailed summary with context and background"},
        }

        config = length_configs.get(summary_length, length_configs["medium"])

        truncated_text = self._truncate_text(content.text)

        focus_instruction = ""
        if focus_areas:
            focus_instruction = f"\nPay special attention to these areas: {', '.join(focus_areas)}"

        prompt = f"""Summarize the following document.

{config['instruction']}{focus_instruction}

Document Content:
{truncated_text}

Return JSON with summary and key points:
{{
    "summary": "The complete summary text",
    "key_points": [
        "Key point 1",
        "Key point 2",
        "Key point 3",
        "Key point 4",
        "Key point 5"
    ]
}}

Only return the JSON, no other text."""

        try:
            response = self.llm_client.generate(
                prompt=prompt,
                max_tokens=config["max_tokens"],
                temperature=0.5,
            )

            json_match = re.search(r"\{[\s\S]*\}", response)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = {"summary": response, "key_points": []}

        except Exception as e:
            data = {
                "summary": f"Summary generation failed: {str(e)}",
                "key_points": [],
            }

        original_words = len(content.text.split())
        summary_words = len(data.get("summary", "").split())
        compression_ratio = summary_words / original_words if original_words > 0 else 0

        return SummarizationResult(
            summary=data.get("summary", ""),
            key_points=data.get("key_points", []),
            word_count=summary_words,
            original_word_count=original_words,
            compression_ratio=compression_ratio,
            summary_type=summary_length,
            metadata={
                "file_name": content.file_name,
                "document_type": content.document_type,
                "page_count": content.page_count,
            },
        )

    def extract_key_information(
        self,
        content: DocumentContent,
        custom_fields: Optional[List[str]] = None,
    ) -> KeyInfoExtractionResult:
        """Extract key information from a document.

        Args:
            content: DocumentContent object
            custom_fields: Optional list of custom fields to extract

        Returns:
            KeyInfoExtractionResult
        """
        truncated_text = self._truncate_text(content.text)

        custom_fields_prompt = ""
        if custom_fields:
            custom_fields_prompt = f"""
## Custom Fields to Extract
Also extract these specific fields:
{chr(10).join(f'- {field}' for field in custom_fields)}
"""

        prompt = f"""Extract key information from the following document.

Document Content:
{truncated_text}

## Information to Extract
Extract the following types of information:
1. **Dates**: Any dates mentioned (YYYY-MM-DD, MM/DD/YYYY, etc.)
2. **Amounts/Currency**: Any monetary values, quantities, or measurements
3. **Emails**: Email addresses
4. **Phone Numbers**: Phone numbers in any format
5. **URLs**: Web addresses
6. **Names**: Person names mentioned
7. **Organizations**: Companies, institutions, government bodies
8. **Locations**: Cities, countries, addresses

{custom_fields_prompt}

Return JSON:
{{
    "dates": ["2024-01-15", "January 20, 2024"],
    "amounts": ["$1,500.00", "500 units"],
    "emails": ["john.doe@example.com"],
    "phone_numbers": ["+1 (555) 123-4567"],
    "urls": ["https://www.example.com"],
    "names": ["John Doe", "Jane Smith"],
    "organizations": ["Acme Corporation", "Department of Justice"],
    "locations": ["New York", "London, UK"],
    "entities": [
        {{"type": "Person", "value": "John Doe", "context": "CEO of Acme Corp"}},
        {{"type": "Organization", "value": "Acme Corp", "context": "Technology company"}}
    ],
    "custom_fields": {{
        "field_name": "extracted_value"
    }}
}}

Only return the JSON, no other text."""

        try:
            response = self.llm_client.generate(
                prompt=prompt,
                max_tokens=1500,
                temperature=0.2,
            )

            json_match = re.search(r"\{[\s\S]*\}", response)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = {}

        except Exception:
            data = {}

        return KeyInfoExtractionResult(
            entities=data.get("entities", []),
            dates=data.get("dates", []),
            amounts=data.get("amounts", []),
            emails=data.get("emails", []),
            phone_numbers=data.get("phone_numbers", []),
            urls=data.get("urls", []),
            names=data.get("names", []),
            organizations=data.get("organizations", []),
            locations=data.get("locations", []),
            custom_fields=data.get("custom_fields", {}),
            metadata={
                "file_name": content.file_name,
                "document_type": content.document_type,
                "page_count": content.page_count,
            },
        )

    def process_document(
        self,
        content: DocumentContent,
        classify: bool = True,
        summarize: bool = True,
        extract_info: bool = True,
        classification_categories: Optional[List[str]] = None,
        summary_length: str = "medium",
        custom_extract_fields: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Complete document processing pipeline.

        Args:
            content: DocumentContent object
            classify: Whether to classify the document
            summarize: Whether to summarize the document
            extract_info: Whether to extract key information
            classification_categories: Optional custom categories
            summary_length: Summary length preference
            custom_extract_fields: Optional custom fields to extract

        Returns:
            Dictionary with all processing results
        """
        results = {
            "file_name": content.file_name,
            "file_path": content.file_path,
            "document_type": content.document_type,
            "page_count": content.page_count,
            "processed_at": datetime.now().isoformat(),
        }

        if classify:
            results["classification"] = self.classify_document(
                content,
                custom_categories=classification_categories,
            ).to_dict()

        if summarize:
            results["summarization"] = self.summarize_document(
                content,
                summary_length=summary_length,
            ).to_dict()

        if extract_info:
            results["key_information"] = self.extract_key_information(
                content,
                custom_fields=custom_extract_fields,
            ).to_dict()

        return results

    def answer_question(
        self,
        content: DocumentContent,
        question: str,
    ) -> str:
        """Answer a question about the document.

        Args:
            content: DocumentContent object
            question: The question to answer

        Returns:
            Answer from LLM
        """
        truncated_text = self._truncate_text(content.text)

        prompt = f"""Answer the following question based on this document.

Document Content:
{truncated_text}

Question: {question}

Provide a comprehensive answer based solely on the document content. If the information is not in the document, say "The document does not contain information to answer this question."

Answer:"""

        try:
            response = self.llm_client.generate(
                prompt=prompt,
                max_tokens=1000,
                temperature=0.3,
            )
            return response.strip()
        except Exception as e:
            return f"Failed to answer question: {str(e)}"

    def batch_process(
        self,
        documents: List[DocumentContent],
        classify: bool = True,
        summarize: bool = True,
        extract_info: bool = True,
        progress_callback=None,
    ) -> List[Dict[str, Any]]:
        """Process multiple documents in batch.

        Args:
            documents: List of DocumentContent objects
            classify: Whether to classify
            summarize: Whether to summarize
            extract_info: Whether to extract info
            progress_callback: Optional callback (current, total, file_name)

        Returns:
            List of processing results
        """
        results = []

        for idx, doc in enumerate(documents):
            if progress_callback:
                progress_callback(idx + 1, len(documents), doc.file_name)

            result = self.process_document(
                doc,
                classify=classify,
                summarize=summarize,
                extract_info=extract_info,
            )
            results.append(result)

        return results

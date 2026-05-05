"""LLM Integration Module for doc-code-security-toolkit.

This module provides LLM integration capabilities:
- OpenAI API client
- Support for custom base URLs (compatible with OpenAI API)
- Prompt management
"""

from doc_code_security_toolkit.llm.client import LLMClient, get_llm_client

__all__ = ["LLMClient", "get_llm_client"]

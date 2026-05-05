"""LLM client for OpenAI API and compatible services.

This module provides a unified interface for interacting with LLMs
through the OpenAI API or compatible services.
"""

import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union

from doc_code_security_toolkit.config.settings import settings


@dataclass
class ChatMessage:
    """Represents a chat message."""

    role: str
    content: str
    name: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = {
            "role": self.role,
            "content": self.content,
        }
        if self.name:
            result["name"] = self.name
        return result


@dataclass
class LLMResponse:
    """Represents an LLM response."""

    content: str
    model: str
    tokens_used: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    finish_reason: str = "stop"
    raw_response: Any = None
    created_at: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "content": self.content,
            "model": self.model,
            "tokens_used": self.tokens_used,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "finish_reason": self.finish_reason,
            "created_at": self.created_at,
        }


class LLMClient:
    """Client for LLM API interactions."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        max_tokens: int = 4000,
        temperature: float = 0.7,
        timeout: int = 60,
    ):
        self.api_key = api_key or settings.llm.api_key
        self.model = model or settings.llm.model
        self.base_url = base_url or settings.llm.base_url
        self.max_tokens = max_tokens or settings.llm.max_tokens
        self.temperature = temperature if temperature is not None else settings.llm.temperature
        self.timeout = timeout or settings.llm.timeout

        self._client = None
        self._init_client()

    def _init_client(self) -> None:
        """Initialize the OpenAI client."""
        try:
            from openai import OpenAI

            client_kwargs = {
                "api_key": self.api_key,
                "timeout": self.timeout,
            }

            if self.base_url:
                client_kwargs["base_url"] = self.base_url

            self._client = OpenAI(**client_kwargs)

        except ImportError:
            self._client = None

    def is_available(self) -> bool:
        """Check if LLM client is available.

        Returns:
            True if client is initialized and has API key
        """
        return self._client is not None and bool(self.api_key)

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        **kwargs,
    ) -> str:
        """Generate text from a prompt.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            model: Model to use (defaults to configured model)
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            **kwargs: Additional API parameters

        Returns:
            Generated text string
        """
        response = self.chat(
            messages=[ChatMessage(role="user", content=prompt)],
            system_prompt=system_prompt,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
            **kwargs,
        )
        return response.content

    def chat(
        self,
        messages: List[Union[ChatMessage, Dict[str, str]]],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        **kwargs,
    ) -> LLMResponse:
        """Chat with the LLM.

        Args:
            messages: List of chat messages
            system_prompt: Optional system prompt to prepend
            model: Model to use
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            **kwargs: Additional API parameters

        Returns:
            LLMResponse object
        """
        if not self.is_available():
            raise RuntimeError(
                "LLM client is not available. "
                "Please set OPENAI_API_KEY environment variable or configure API key."
            )

        processed_messages: List[Dict[str, Any]] = []

        if system_prompt:
            processed_messages.append({"role": "system", "content": system_prompt})

        for msg in messages:
            if isinstance(msg, ChatMessage):
                processed_messages.append(msg.to_dict())
            else:
                processed_messages.append(msg)

        api_params = {
            "model": model or self.model,
            "messages": processed_messages,
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": temperature if temperature is not None else self.temperature,
        }

        for key, value in kwargs.items():
            if key not in api_params:
                api_params[key] = value

        try:
            response = self._client.chat.completions.create(**api_params)

            content = response.choices[0].message.content or ""
            usage = response.usage

            return LLMResponse(
                content=content,
                model=response.model,
                tokens_used=usage.total_tokens if usage else 0,
                prompt_tokens=usage.prompt_tokens if usage else 0,
                completion_tokens=usage.completion_tokens if usage else 0,
                finish_reason=response.choices[0].finish_reason or "stop",
                raw_response=response,
            )

        except Exception as e:
            raise RuntimeError(f"LLM API call failed: {str(e)}") from e

    def chat_stream(
        self,
        messages: List[Union[ChatMessage, Dict[str, str]]],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        **kwargs,
    ):
        """Stream chat responses.

        Args:
            messages: List of chat messages
            system_prompt: Optional system prompt
            model: Model to use
            max_tokens: Maximum tokens
            temperature: Sampling temperature
            **kwargs: Additional parameters

        Yields:
            Chunks of response content
        """
        if not self.is_available():
            raise RuntimeError(
                "LLM client is not available. "
                "Please set OPENAI_API_KEY environment variable."
            )

        processed_messages: List[Dict[str, Any]] = []

        if system_prompt:
            processed_messages.append({"role": "system", "content": system_prompt})

        for msg in messages:
            if isinstance(msg, ChatMessage):
                processed_messages.append(msg.to_dict())
            else:
                processed_messages.append(msg)

        api_params = {
            "model": model or self.model,
            "messages": processed_messages,
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": temperature if temperature is not None else self.temperature,
            "stream": True,
        }

        for key, value in kwargs.items():
            if key not in api_params:
                api_params[key] = value

        try:
            stream = self._client.chat.completions.create(**api_params)

            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            raise RuntimeError(f"LLM streaming failed: {str(e)}") from e

    def generate_with_retry(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        **kwargs,
    ) -> str:
        """Generate text with automatic retry on failure.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            max_retries: Maximum number of retries
            retry_delay: Delay between retries in seconds
            **kwargs: Additional generation parameters

        Returns:
            Generated text
        """
        last_error = None

        for attempt in range(max_retries):
            try:
                return self.generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    **kwargs,
                )
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (attempt + 1))

        raise RuntimeError(f"Failed after {max_retries} retries: {str(last_error)}")

    def count_tokens(self, text: str, model: Optional[str] = None) -> int:
        """Count tokens in text (approximate).

        Args:
            text: Text to count tokens for
            model: Model to use for token counting

        Returns:
            Estimated token count
        """
        words = text.split()
        return int(len(words) * 1.3)


_default_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """Get or create the default LLM client.

    Returns:
        Singleton LLMClient instance
    """
    global _default_client

    if _default_client is None:
        _default_client = LLMClient()

    return _default_client


def set_llm_client(client: LLMClient) -> None:
    """Set the default LLM client.

    Args:
        client: LLMClient instance to use as default
    """
    global _default_client
    _default_client = client

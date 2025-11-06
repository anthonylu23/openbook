"""Vector database utilities for the OpenBook project."""

from .embedding import (
    DEFAULT_MODEL_NAME,
    embed_text,
    embed_texts,
    get_model,
)
from .vector_db import ChromaVectorStore

__all__ = [
    "ChromaVectorStore",
    "DEFAULT_MODEL_NAME",
    "embed_text",
    "embed_texts",
    "get_model",
]

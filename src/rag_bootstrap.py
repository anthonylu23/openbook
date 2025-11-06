"""Utilities to bootstrap the MiniLM embedding model and Chroma vector store."""

from __future__ import annotations

from typing import Any, Dict, Optional, Sequence

from chromadb.utils import embedding_functions

from vector_db import ChromaVectorStore, DEFAULT_MODEL_NAME, embed_texts, get_model


class MiniLMEmbeddingFunction(embedding_functions.EmbeddingFunction):
    """Chroma-compatible embedding function backed by a MiniLM SentenceTransformer."""

    def __init__(
        self,
        *,
        model_name: str = DEFAULT_MODEL_NAME,
        device: Optional[str] = None,
        batch_size: int = 32,
        normalize: bool = True,
        show_progress_bar: bool = False,
    ) -> None:
        self._model = get_model(model_name=model_name, device=device)
        self._model_name = model_name
        self._device = device
        self._batch_size = batch_size
        self._normalize = normalize
        self._show_progress_bar = show_progress_bar

    def __call__(self, input_texts: Sequence[str]) -> Sequence[Sequence[float]]:  # type: ignore[override]
        if not input_texts:
            return []
        return embed_texts(
            list(input_texts),
            model=self._model,
            model_name=self._model_name,
            device=self._device,
            batch_size=self._batch_size,
            normalize=self._normalize,
            show_progress_bar=self._show_progress_bar,
        )


def initialize_embedding_function(
    *,
    model_name: str = DEFAULT_MODEL_NAME,
    device: Optional[str] = None,
    batch_size: int = 32,
    normalize: bool = True,
    show_progress_bar: bool = False,
) -> MiniLMEmbeddingFunction:
    """Create a reusable MiniLM embedding function for Chroma collections."""

    return MiniLMEmbeddingFunction(
        model_name=model_name,
        device=device,
        batch_size=batch_size,
        normalize=normalize,
        show_progress_bar=show_progress_bar,
    )


def initialize_vector_store(
    *,
    collection_name: str = "openbook",
    persist_directory: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    client_settings: Optional[Any] = None,
    embedding_function: Optional[embedding_functions.EmbeddingFunction] = None,
    model_name: str = DEFAULT_MODEL_NAME,
    device: Optional[str] = None,
    batch_size: int = 32,
    normalize: bool = True,
    show_progress_bar: bool = False,
) -> ChromaVectorStore:
    """Instantiate a Chroma vector store pre-configured with MiniLM embeddings."""

    embedding_fn = embedding_function or initialize_embedding_function(
        model_name=model_name,
        device=device,
        batch_size=batch_size,
        normalize=normalize,
        show_progress_bar=show_progress_bar,
    )

    return ChromaVectorStore(
        collection_name=collection_name,
        persist_directory=persist_directory,
        embedding_function=embedding_fn,
        client_settings=client_settings,
        metadata=metadata,
    )

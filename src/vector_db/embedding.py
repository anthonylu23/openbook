"""Generate embeddings with Hugging Face MiniLM-L6-v2."""

from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Tuple

try:
    from sentence_transformers import SentenceTransformer
except ImportError as exc:  # pragma: no cover - import guard
    raise ImportError(
        "sentence-transformers is required to use MiniLM embeddings."
    ) from exc

DEFAULT_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_MODEL_CACHE: Dict[Tuple[str, Optional[str]], SentenceTransformer] = {}


def get_model(
    model_name: str = DEFAULT_MODEL_NAME, *, device: Optional[str] = None
) -> SentenceTransformer:
    """Load (and cache) a SentenceTransformer model instance."""

    cache_key = (model_name, device)
    if cache_key not in _MODEL_CACHE:
        _MODEL_CACHE[cache_key] = SentenceTransformer(model_name, device=device)
    return _MODEL_CACHE[cache_key]


def embed_text(
    text: str,
    *,
    model: Optional[SentenceTransformer] = None,
    model_name: str = DEFAULT_MODEL_NAME,
    device: Optional[str] = None,
    normalize: bool = True,
) -> List[float]:
    """Generate an embedding vector for a single text string."""

    if not text:
        raise ValueError("`text` must be a non-empty string.")

    encoder = model or get_model(model_name, device=device)
    vector = encoder.encode(
        text,
        convert_to_numpy=True,
        normalize_embeddings=normalize,
    )
    return vector.tolist()


def embed_texts(
    texts: Sequence[str],
    *,
    model: Optional[SentenceTransformer] = None,
    model_name: str = DEFAULT_MODEL_NAME,
    device: Optional[str] = None,
    batch_size: int = 32,
    normalize: bool = True,
    show_progress_bar: bool = False,
) -> List[List[float]]:
    """Generate embeddings for a batch of texts."""

    if not texts:
        return []

    encoder = model or get_model(model_name, device=device)
    vectors = encoder.encode(
        list(texts),
        batch_size=batch_size,
        convert_to_numpy=True,
        normalize_embeddings=normalize,
        show_progress_bar=show_progress_bar,
    )
    return [vector.tolist() for vector in vectors]

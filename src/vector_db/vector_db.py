"""ChromaDB backed vector database helper for RAG workflows."""

from __future__ import annotations

import uuid
from typing import Any, Dict, Optional, Sequence

import chromadb

DEFAULT_INCLUDES = ("metadatas", "distances", "documents")


class ChromaVectorStore:
    """Utility wrapper around ChromaDB collections for RAG pipelines."""

    def __init__(
        self,
        collection_name: str = "openbook",
        persist_directory: Optional[str] = None,
        embedding_function: Optional[Any] = None,
        client_settings: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self._collection_name = collection_name
        self._embedding_function = embedding_function
        self._metadata = metadata
        self._client = self._build_client(persist_directory, client_settings)
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata=metadata,
            embedding_function=embedding_function,
        )

    @staticmethod
    def _build_client(
        persist_directory: Optional[str], client_settings: Optional[Any]
    ) -> Any:
        if persist_directory:
            return chromadb.PersistentClient(path=persist_directory, settings=client_settings)
        return chromadb.Client(settings=client_settings)

    @property
    def client(self) -> Any:
        return self._client

    @property
    def collection(self) -> Any:
        return self._collection

    def add_texts(
        self,
        texts: Sequence[str],
        metadatas: Optional[Sequence[Dict[str, Any]]] = None,
        ids: Optional[Sequence[str]] = None,
    ) -> Sequence[str]:
        if not texts:
            return []
        generated_ids = list(ids) if ids else [str(uuid.uuid4()) for _ in texts]
        if len(generated_ids) != len(texts):
            raise ValueError("Length of `ids` must match length of `texts`.")
        if metadatas and len(metadatas) != len(texts):
            raise ValueError("Length of `metadatas` must match length of `texts`.")

        self._collection.add(
            documents=list(texts),
            metadatas=list(metadatas) if metadatas else None,
            ids=generated_ids,
        )
        return generated_ids

    def upsert_texts(
        self,
        texts: Sequence[str],
        metadatas: Optional[Sequence[Dict[str, Any]]] = None,
        ids: Optional[Sequence[str]] = None,
    ) -> Sequence[str]:
        if not texts:
            return []
        generated_ids = list(ids) if ids else [str(uuid.uuid4()) for _ in texts]
        if len(generated_ids) != len(texts):
            raise ValueError("Length of `ids` must match length of `texts`.")
        if metadatas and len(metadatas) != len(texts):
            raise ValueError("Length of `metadatas` must match length of `texts`.")

        self._collection.upsert(
            documents=list(texts),
            metadatas=list(metadatas) if metadatas else None,
            ids=generated_ids,
        )
        return generated_ids

    def add_embeddings(
        self,
        embeddings: Sequence[Sequence[float]],
        metadatas: Optional[Sequence[Dict[str, Any]]] = None,
        ids: Optional[Sequence[str]] = None,
        documents: Optional[Sequence[str]] = None,
    ) -> Sequence[str]:
        if not embeddings:
            return []
        generated_ids = list(ids) if ids else [str(uuid.uuid4()) for _ in embeddings]
        if len(generated_ids) != len(embeddings):
            raise ValueError("Length of `ids` must match length of `embeddings`.")
        if metadatas and len(metadatas) != len(embeddings):
            raise ValueError("Length of `metadatas` must match length of `embeddings`.")
        if documents and len(documents) != len(embeddings):
            raise ValueError("Length of `documents` must match length of `embeddings`.")

        self._collection.add(
            embeddings=[list(values) for values in embeddings],
            documents=list(documents) if documents else None,
            metadatas=list(metadatas) if metadatas else None,
            ids=generated_ids,
        )
        return generated_ids

    def query(
        self,
        query_texts: Sequence[str],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None,
        include: Optional[Sequence[str]] = None,
    ) -> Dict[str, Any]:
        if not query_texts:
            raise ValueError("`query_texts` must contain at least one item.")
        return self._collection.query(
            query_texts=list(query_texts),
            n_results=n_results,
            where=where,
            where_document=where_document,
            include=list(include) if include else list(DEFAULT_INCLUDES),
        )

    def similarity_search(
        self,
        query: str,
        k: int = 5,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None,
        include: Optional[Sequence[str]] = None,
    ) -> Dict[str, Any]:
        return self.query(
            query_texts=[query],
            n_results=k,
            where=where,
            where_document=where_document,
            include=include,
        )

    def delete(
        self,
        ids: Optional[Sequence[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None,
    ) -> None:
        self._collection.delete(
            ids=list(ids) if ids else None,
            where=where,
            where_document=where_document,
        )

    def count(self) -> int:
        return self._collection.count()

    def persist(self) -> None:
        if hasattr(self._client, "persist"):
            self._client.persist()

    def reset_collection(self) -> None:
        self._client.delete_collection(self._collection_name)
        self._collection = self._client.get_or_create_collection(
            name=self._collection_name,
            metadata=self._metadata,
            embedding_function=self._embedding_function,
        )

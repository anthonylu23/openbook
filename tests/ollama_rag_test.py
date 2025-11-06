"""Quick smoke test wiring the local Chroma RAG store to Ollama via LangChain."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")

import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from langchain.chains import RetrievalQA
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_ollama import OllamaLLM
from pydantic import Field

from rag_bootstrap import initialize_vector_store
from vector_db import ChromaVectorStore


class ChromaVectorStoreRetriever(BaseRetriever):
    """LangChain retriever backed by the project-local Chroma vector store."""

    vector_store: ChromaVectorStore = Field(..., exclude=True)
    search_kwargs: Dict[str, Any] = Field(default_factory=lambda: {"k": 4})

    model_config = {"arbitrary_types_allowed": True}

    def _get_relevant_documents(self, query: str) -> List[Document]:
        result = self.vector_store.similarity_search(
            query,
            k=int(self.search_kwargs.get("k", 4)),
        )
        return _chroma_result_to_documents(result)

    async def _aget_relevant_documents(self, query: str) -> List[Document]:
        return self._get_relevant_documents(query)


def _chroma_result_to_documents(result: Dict[str, Any]) -> List[Document]:
    documents = result.get("documents", []) or []
    metadatas = result.get("metadatas", []) or []
    ids = result.get("ids", []) or []

    if not documents:
        return []

    flat_docs = documents[0] if isinstance(documents[0], list) else documents
    flat_meta = metadatas[0] if metadatas and isinstance(metadatas[0], list) else metadatas
    flat_ids = ids[0] if ids and isinstance(ids[0], list) else ids

    docs: List[Document] = []
    for idx, text in enumerate(flat_docs):
        metadata: Dict[str, Any]
        if flat_meta:
            metadata = dict(flat_meta[idx])
        else:
            metadata = {}
        metadata.setdefault("doc_id", flat_ids[idx] if flat_ids else str(idx))
        docs.append(Document(page_content=text, metadata=metadata))
    return docs


def build_sample_vector_store(collection_name: str = "ollama_rag_session") -> ChromaVectorStore:
    store = initialize_vector_store(collection_name=collection_name)
    texts = [
        "OpenBook is a local-first CLI that builds a private knowledge base using RAG.",
        "Ollama serves large language models locally over an HTTP interface.",
        "LangChain provides retrieval chains that combine vector stores with LLMs.",
    ]
    metadatas = [
        {"source": "project_overview.md"},
        {"source": "ollama_docs.md"},
        {"source": "langchain_docs.md"},
    ]
    store.add_texts(texts=texts, metadatas=metadatas)
    return store


def main() -> None:
    print("⚙️  Preparing in-memory Chroma collection...")
    vector_store = build_sample_vector_store()
    retriever = ChromaVectorStoreRetriever(vector_store=vector_store, search_kwargs={"k": 3})

    print("🤖 Spinning up Ollama LLM via LangChain...")
    llm = OllamaLLM(model="qwen3:1.7b", base_url="http://127.0.0.1:11434")

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        return_source_documents=True,
    )

    question = (
        "How does OpenBook keep my data private when combined with Ollama?"
    )
    print(f"\n🔍 Question: {question}\n")

    response = qa_chain.invoke({"query": question})
    answer: str = response.get("result", "<no answer>")
    print(f"📝 Answer: {answer}\n")

    sources: Optional[List[Document]] = response.get("source_documents")
    if sources:
        print("📄 Context snippets:")
        for doc in sources:
            origin = doc.metadata.get("source", doc.metadata.get("doc_id", "unknown"))
            preview = doc.page_content[:160].replace("\n", " ")
            print(f" - {origin}: {preview}...")

    print("\n✅ Done. Remember, the Chroma collection vanishes once this process exits.")


if __name__ == "__main__":
    main()

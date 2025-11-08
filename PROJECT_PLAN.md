# OpenBook Project Plan

## Privacy-First RAG System (CLI-first focus)

## Project Overview

**OpenBook** is a local-first CLI that indexes document directories into a private knowledge base using RAG (Retrieval-Augmented Generation). The current focus is on fast, offline-friendly indexing, chunking, and configuration management through the CLI. Querying, LLM orchestration, and optional web-search augmentation are on the roadmap, with the MCP/server experiments paused for now.

**Core Philosophy**: Your documents stay on your machine. No cloud syncing, no tracking, and you choose the LLM provider (local or cloud) when you’re ready.

### Core Value Proposition

- **Local Document Processing**: Files are read and chunked locally.
- **Private Embeddings**: MiniLM embeddings generated entirely on your hardware.
- **In-Memory Vector Store**: ChromaDB lives only for the CLI session.
- **Configurable Defaults**: CLI commands manage chunking, recursion, file filters, LLM provider, model, API key, and web-search toggles.
- **Provider Flexibility (Future)**: Hooks for Ollama, OpenAI, Anthropic, etc., via config commands.

---

## Architecture

### High-Level Design

```
╔═══════════════════════════════════════════════════════════════╗
║                    YOUR LOCAL MACHINE                         ║
║                    (100% Offline Indexing)                    ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │                    OpenBook CLI                          │ ║
║  │                 (TypeScript/Node.js)                     │ ║
║  └────────────┬────────────────────────────┬────────────────┘ ║
║               │                            │                  ║
║               ▼                            ▼                  ║
║      ┌─────────────────┐          ┌──────────────────┐       ║
║      │  File Indexing  │          │  Config Manager  │       ║
║      │     Module      │          │ (Provider/Model) │       ║
║      └────────┬────────┘          └────────┬─────────┘       ║
║               │                            │                  ║
║               ▼                            ▼                  ║
║      ┌─────────────────────────────────────────────────┐     ║
║      │         Python Backend Services                  │     ║
║      │  ┌──────────────┐      ┌───────────────────┐   │     ║
║      │  │  Embedding   │      │   Vector Store    │   │     ║
║      │  │   Service    │◄────►│   (ChromaDB)      │   │     ║
║      │  │ (MiniLM-L6)  │      │   (In-Memory)     │   │     ║
║      │  └──────────────┘      └───────────────────┘   │     ║
║      └─────────────────────────────────────────────────┘     ║
║                                                               ║
║  📁 Documents → 📝 Chunks → 🔢 Embeddings → 💾 In-Memory DB    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### Technology Stack (All Local for Indexing)

- **TypeScript/Node.js**: CLI, configuration commands, chunking logic.
- **Python 3.x** + **sentence-transformers** + **ChromaDB**: Embedding + vector store backend (invoked from CLI workflows).
- **Ollama/OpenAI/Anthropic (Future)**: Not yet wired, but settings are captured via CLI for future integration.

---

## Roadmap

### Phase 1: Core Indexing (Current)

- [x] CLI framework with version/help commands
- [x] Chunking pipeline (sentence-aware, overlapping windows)
- [x] In-memory Chroma vector store wrapper
- [x] `index` command consuming CLI-configured defaults
- [x] Configuration commands (`chunksize`, `recursive`, `extensions`, `model-provider`, `model`, `api-key`, `web-search`, `end-session`)
- [ ] Query command (deferred)

### Phase 2: Retrieval & Query UX

- [ ] Implement `query` command using stored provider/model
- [ ] Format search results with source snippets
- [ ] Optionally invoke local/cloud LLMs with retrieved context
- [ ] Respect `web-search` flag when augmenting LLM calls

### Phase 3: Advanced Indexing Features

- [ ] Multi-format parsing (Markdown done; PDF, DOCX, etc.)
- [ ] Incremental indexing (skip unchanged files)
- [ ] `.openbookignore` patterns
- [ ] Parallel file processing and progress indicators

### Phase 4: Persistence & Sharing

- [ ] Optional on-disk persistence for Chroma
- [ ] Snapshot export/import
- [ ] Future server or MCP bridge (revisit once CLI path stabilizes)

---

## Implementation Notes

- **Config Storage**: `~/.openbook/config.json` now tracks chunk size, recursion flag, extension filters, model provider/model, API key, and web-search toggle.
- **Default Behavior**: indexes `.txt` and `.md` files recursively disabled, chunk size 800, overlap 80.
- **Session Lifecycle**: in-memory Chroma destroyed when the CLI process exits. `end-session` is currently a no-op placeholder.

---

## Next Steps

1. Build the `query` command leveraging the config-specified provider/model.
2. Add local LLM invocation (e.g., call Ollama if provider=ollama).
3. Explore optional on-disk persistence and incremental reindexing.

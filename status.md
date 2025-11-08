# OpenBook Status

_Last updated: 2025-11-08 18:32 EST_

## Completed
- CLI bootstrap with commands:
  - `index`
  - `chunksize`
  - `recursive`
  - `extensions`
  - `model-provider`
  - `model`
  - `api-key`
  - `web-search`
  - `query`
  - `chat`
  - `end-session`
  - `help`
- Persistent config at `~/.openbook/config.json` (chunk size, recursion, extensions, provider/model, per-provider API keys, web-search toggle).
- Document chunking + storage pipeline (MiniLM + Chroma in-memory store, chunks persisted to `chunks.jsonl`).
- Query framework that ranks chunks, builds prompts, and dispatches to Ollama/OpenAI/Anthropic/Google Gemini.
- Build pipeline (`npm run build`) producing executable `dist/index.js` with `openbook` bin entry.

## In Progress / Planned
- Real response rendering (citations, streaming) for all providers.
- Improve retrieval scoring (embedding similarity, metadata filters).
- Optional multi-format ingestion (PDF, DOCX) and `.openbookignore` patterns.
- Incremental indexing & on-disk persistence options.

## Deferred / Paused
- MCP server / tool bundling experiments (removed for now).
- Web-search augmentation backend (flag captured, backend TBD).

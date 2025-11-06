# OpenBook Project Plan

## Privacy-First RAG System with Flexible LLM Integration

## Project Overview

**OpenBook** is a privacy-first command-line interface (CLI) tool that transforms local document directories into a queryable knowledge base using RAG (Retrieval-Augmented Generation) technology. Documents are indexed into a local vector database, and users can query the indexed knowledge using their choice of LLM provider—from fully local models (Ollama) to cloud-based APIs (OpenAI, Anthropic).

**Core Philosophy**: Your documents stay local. Choose your LLM freely. Maximum flexibility, maximum control.

### Core Value Proposition

- **Local Document Processing**: Your documents are indexed locally and never transmitted anywhere
- **Privacy First**: Document embeddings and vector database stay completely private on your machine
- **Flexible LLM Integration**: Choose between fully local (Ollama) or cloud-based LLMs (OpenAI, Anthropic)
- **Instant Context**: Turn any directory into searchable knowledge in seconds
- **Simple CLI Interface**: Easy-to-use commands for indexing and querying
- **Offline Indexing**: Index documents without internet connection after initial model download

---

## Architecture

### High-Level Design

```
╔═══════════════════════════════════════════════════════════════╗
║                    YOUR LOCAL MACHINE                         ║
║               (Documents Stay Private)                        ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │                    OpenBook CLI                          │ ║
║  │                 (TypeScript/Node.js)                     │ ║
║  └────────────┬────────────────────────────┬────────────────┘ ║
║               │                            │                  ║
║               ▼                            ▼                  ║
║      ┌─────────────────┐          ┌──────────────────┐       ║
║      │  File Indexing  │          │  Query Handler   │       ║
║      │     Module      │          │   with Provider  │       ║
║      └────────┬────────┘          │     Switcher     │       ║
║               │                   └────────┬─────────┘       ║
║               ▼                            │                  ║
║      ┌─────────────────────────────────────┴───────────┐     ║
║      │         Python Backend Services                  │     ║
║      │  ┌──────────────┐      ┌───────────────────┐   │     ║
║      │  │  Embedding   │      │   Vector Store    │   │     ║
║      │  │   Service    │◄────►│   (ChromaDB)      │   │     ║
║      │  │ (MiniLM-L6)  │      │   (In-Memory)     │   │     ║
║      │  └──────────────┘      └───────────────────┘   │     ║
║      └──────────────────────────┬───────────────────────┘     ║
║                                 │                             ║
║                                 ▼                             ║
║                        ┌────────────────┐                     ║
║                        │ LLM Providers  │                     ║
║                        │ (User Choice)  │                     ║
║                        └───────┬────────┘                     ║
║                                │                              ║
╠════════════════════════════════┼══════════════════════════════╣
║  📁 Documents (Local)          │                              ║
║  🧠 Embeddings (Local)          │                              ║
║  💾 Vector DB (Local)           │                              ║
║                                 │                              ║
║  ┌──────────────────────────────┼──────────────────────────┐  ║
║  │              CHOOSE YOUR LLM PROVIDER                    │  ║
║  │                                                          │  ║
║  │  🏠 Ollama (100% Local)   ☁️ OpenAI    ☁️ Anthropic      │  ║
║  │     - No API Key           - API Key    - API Key       │  ║
║  │     - Fully Offline        - Cloud      - Cloud         │  ║
║  │     - Maximum Privacy      - Fast       - Fast          │  ║
║  └──────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════╝
```

### Technology Stack

#### Frontend (CLI)

- **TypeScript/Node.js**: Core CLI implementation (runs locally)
- **Commander.js**: Command-line argument parsing and routing (local)
- **Figlet**: ASCII art banner for branding (local)

#### Backend (Processing)

- **Python 3.x**: Embedding and vector operations (runs locally on your CPU/GPU)
- **sentence-transformers**: Local embedding generation (all-MiniLM-L6-v2, downloaded once and cached)
- **ChromaDB**: In-memory vector database for semantic search (lifespan tied to CLI session)
- **LangChain**: Framework for RAG chain orchestration and LLM provider abstraction

#### LLM Providers (User Choice)

- **Ollama (Local)**: 100% local LLM execution via langchain-ollama
- **OpenAI (Cloud)**: GPT-4 and other models via langchain-openai
- **Anthropic (Cloud)**: Claude models via langchain-anthropic
- **Extensible**: Easy to add more providers (Cohere, Google AI, etc.)

#### Integration

- **Child Process/IPC**: TypeScript-Python communication (in-process, no network)
- **Environment Variables**: Secure API key management for cloud providers

### Privacy & Execution Guarantees

#### What Always Stays Local

✅ **All Documents**: Never leave your file system  
✅ **All Embeddings**: Generated on your CPU/GPU  
✅ **All Vector Data**: Stored in in-memory ChromaDB session  
✅ **Retrieved Context**: Similarity search happens entirely locally  
✅ **Zero Telemetry**: No usage tracking or analytics

#### What You Control

🎛️ **LLM Provider Choice**:

- Choose Ollama for 100% local, offline execution
- Choose OpenAI/Anthropic for cloud LLM processing (requires API key)
- Switch providers anytime with a simple flag

🔐 **Your Documents Stay Private**:

- Documents are never sent to cloud providers
- Only the query + retrieved context chunks are sent to LLMs (if using cloud providers)
- Embedding generation always happens locally

#### Network Requirements

**For Local-Only Mode (Ollama)**:

- One-time download of MiniLM-L6-v2 model (~90MB)
- One-time download of Ollama model (varies by model)
- After setup: Zero network activity
- Fully offline capable

**For Cloud LLM Mode (OpenAI/Anthropic)**:

- Same embedding model download as above
- API requests sent only during query execution
- Your indexed documents remain local

### Data Flow

#### Indexing Flow (Always Local)

```
📂 Your Files (Local Disk)
    ↓
    ↓ [Read by Node.js File System API]
    ↓
📄 Text Content (Local Memory)
    ↓
    ↓ [Chunked by Local Algorithm]
    ↓
📝 Text Chunks (Local Memory)
    ↓
    ↓ [Sent to Local Python Process via IPC]
    ↓
🧠 SentenceTransformer Model (Local CPU/GPU)
    ↓
    ↓ [Generates Embeddings Locally]
    ↓
🔢 Vector Embeddings (Local Memory)
    ↓
    ↓ [Stored in In-Memory ChromaDB Collection]
    ↓
💾 Vector Database (In-Memory Session)

🚫 NO NETWORK TRAFFIC DURING INDEXING
🔒 DOCUMENTS NEVER LEAVE YOUR MACHINE
```

#### Query Flow (Provider Dependent)

```
❓ User Query
    ↓
    ↓ [Embed query locally using MiniLM]
    ↓
💾 ChromaDB Similarity Search (Local)
    ↓
    ↓ [Retrieve top-K relevant chunks]
    ↓
📊 Context Chunks (Local Memory)
    ↓
    ├─────────────────────┬─────────────────────┐
    ↓                     ↓                     ↓
🏠 OLLAMA           ☁️ OPENAI API        ☁️ ANTHROPIC API
(Local)             (Cloud)              (Cloud)
    ↓                     ↓                     ↓
🤖 LLM Response ←────────┴─────────────────────┘

PRIVACY NOTE:
- Your full documents are NEVER sent to cloud providers
- Only: Query + Retrieved Chunks (typically 2-4KB) sent if using cloud LLMs
- Choose Ollama for zero network traffic
```

---

## Core Components

### 1. CLI Interface (`src/index.ts`)

**Purpose**: Entry point for all user interactions

**Commands**:

```bash
# Index documents in a directory
openbook index <directory>

# Query with different providers
openbook query "What is memory consolidation?" --provider ollama --model llama3
openbook query "Explain decision-making" --provider openai --model gpt-4
openbook query "Language development?" --provider anthropic --model claude-3-5-sonnet-20241022

# Query options
openbook query <query> [options]
  -p, --provider <provider>      LLM provider: ollama, openai, anthropic (default: ollama)
  -m, --model <model>            Model name (e.g., llama3, gpt-4, claude-3-5-sonnet)
  -k, --top-k <number>           Number of relevant chunks to retrieve (default: 4)
  -t, --temperature <number>     Temperature for LLM response (default: 0.7)
  --api-key <key>                API key for cloud providers (or use env variable)
  --ollama-url <url>             Ollama endpoint URL (default: http://127.0.0.1:11434)

# Check status
openbook status
```

**Environment Variables**:

- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key

**Lifecycle**:

1. Display ASCII banner
2. Parse command-line arguments
3. Execute requested command (index, query, status)
4. Clean up and exit

### 2. Embedding Service (`src/embedding.py`)

**Purpose**: Generate semantic embeddings for text documents

**Key Functions**:

- `get_model()`: Load and cache SentenceTransformer model
- `embed_text()`: Generate embedding for single text
- `embed_texts()`: Batch process multiple texts with progress tracking

**Model**: `sentence-transformers/all-MiniLM-L6-v2`

- 384-dimensional vectors
- Optimized for semantic similarity
- Fully local (no API calls)

### 3. Vector Database (`src/vector_db/vector_db.py`)

**Purpose**: Store and retrieve document embeddings with ChromaDB

**Key Operations**:

- `add_texts()`: Index new documents
- `upsert_texts()`: Update or insert documents
- `similarity_search()`: Find relevant documents for a query
- `delete()`: Remove documents by ID or filter
- `reset_collection()`: Clear entire database

**Features**:

- Automatic ID generation (UUID)
- Metadata support for document tracking
- Flexible querying with filters
- Ephemeral collection lifecycle (cleared automatically on shutdown)

### 4. File Indexing Module (`src/file_indexing.py`)

**Purpose**: Process directory trees and extract indexable content

**Planned Functionality**:

- Recursive directory traversal
- File type detection and filtering
- Text extraction from various formats
- Document chunking for optimal embedding
- Metadata extraction (filename, path, modified date)

### 5. Query Module (`src/query_rag.py`)

**Purpose**: Handle RAG queries with flexible LLM provider support

**Key Components**:

- **ChromaVectorStoreRetriever**: LangChain-compatible retriever for local vector store
- **LLM Provider Factory**: Creates appropriate LLM client based on user selection
- **RAG Chain**: Orchestrates retrieval + generation using RetrievalQA

**Supported Providers**:

- **Ollama**: Local execution via `langchain-ollama`

  - Default models: llama3, qwen3, mistral
  - No API key required
  - Fully offline after model download

- **OpenAI**: Cloud API via `langchain-openai`

  - Models: gpt-4, gpt-3.5-turbo, gpt-4-turbo
  - Requires `OPENAI_API_KEY` environment variable

- **Anthropic**: Cloud API via `langchain-anthropic`
  - Models: claude-3-5-sonnet, claude-3-opus, claude-3-haiku
  - Requires `ANTHROPIC_API_KEY` environment variable

**Query Flow**:

1. Load indexed vector store from ChromaDB
2. Create retriever with configurable top-K
3. Initialize LLM provider based on user selection
4. Build RetrievalQA chain
5. Execute query and return answer with sources

---

## Features & Functionality

### Phase 1: Core Indexing (Current Development)

- [x] CLI framework setup
- [x] Embedding service with MiniLM-L6-v2
- [x] ChromaDB vector store wrapper
- [x] Basic RAG testing with Ollama
- [ ] File discovery and reading
- [ ] Document chunking strategy
- [ ] Index command implementation

### Phase 2: Multi-Provider LLM Integration

- [ ] Query command with provider switcher
- [ ] Ollama provider integration (local)
- [ ] OpenAI provider integration (cloud)
- [ ] Anthropic provider integration (cloud)
- [ ] Environment variable API key management
- [ ] Provider-specific error handling
- [ ] Query result formatting with source citations

### Phase 3: Advanced Features

- [ ] Multi-format support (PDF, DOCX, Markdown, etc.)
- [ ] Smart chunking algorithms
- [ ] Incremental indexing (only changed files)
- [ ] Custom embedding models
- [ ] Query result ranking and filtering
- [ ] Persistent vector database option

### Phase 4: Performance & UX

- [ ] Parallel file processing
- [ ] Progress indicators
- [ ] Configuration file support (~/.openbook/config.json)
- [ ] .openbookignore for selective indexing
- [ ] Cache management
- [ ] Error recovery and logging
- [ ] Default provider preferences

---

## File Structure

```
openbook/
├── src/
│   ├── index.ts                 # CLI entry point with Commander.js
│   ├── utils.ts                 # Shared utilities
│   ├── config.ts                # Configuration management (optional)
│   ├── commands/                # Command handlers
│   │   ├── indexDocuments.ts   # Index command handler
│   │   └── (future commands)   # Status, etc.
│   ├── file_indexing.py        # Document processing and chunking
│   ├── query_rag.py            # RAG query with multi-provider support
│   ├── rag_bootstrap.py        # Initialize vector store and embeddings
│   └── vector_db/
│       ├── __init__.py         # Package initialization
│       ├── vector_db.py        # ChromaDB wrapper
│       └── embedding.py        # Embedding service (MiniLM)
├── dist/                        # Compiled TypeScript
├── tests/                       # Test suite
│   └── ollama_rag_test.py      # Test RAG with Ollama
├── docs/                        # Indexed documents (example)
├── package.json                 # Node dependencies
├── requirements.txt             # Python dependencies
├── tsconfig.json               # TypeScript config
├── .gitignore
├── PROJECT_PLAN.md             # This file
└── README.md
```

---

## Implementation Details

### Database Lifecycle

**On Startup**:

```typescript
1. Initialize in-memory ChromaDB client
2. Create collection with embedding function
3. Ready for indexing/queries
```

**During Operation**:

```typescript
1. User runs index command
2. Files are discovered and read
3. Content is chunked into optimal sizes
4. Embeddings generated via Python service
5. Vectors stored in ChromaDB with metadata
```

**On Exit**:

```typescript
1. Flush any pending operations
2. Delete collection
3. Clean up temporary files
4. Terminate Python processes
```

### Document Chunking Strategy

**Principles**:

- Target 512 tokens per chunk (optimal for MiniLM)
- Maintain semantic boundaries (paragraphs, sections)
- Preserve context with overlapping windows
- Store chunk relationships in metadata

**Metadata Schema**:

```javascript
{
  file_path: string,        // Original file location
  chunk_index: number,      // Position in document
  total_chunks: number,     // Total chunks for document
  file_type: string,        // Extension/format
  modified_date: timestamp, // File last modified
  size: number,            // Original file size
  hash: string             // Content hash for deduplication
}
```

### Query Response Format

When querying the knowledge base, results are returned with:

**Answer**: Generated by the selected LLM provider based on retrieved context

**Source Citations**: References to the original documents that informed the answer

```
📝 Answer:
Memory consolidation is the process by which short-term memories are
transformed into long-term memories through synaptic changes...

📄 Context sources:
  [1] 8. Memory 2025F.txt: Memory consolidation occurs during sleep...
  [2] 7. Learning 2025F.txt: The hippocampus plays a crucial role...
  [3] 8. Memory 2025F.txt: Long-term potentiation (LTP) is...
```

**Privacy Note**:

- Retrieved chunks (typically 2-4KB total) are sent to the LLM
- Your full documents remain on your machine
- Choose Ollama for zero external data transmission

---

## Development Roadmap

### Milestone 1: Basic Indexing (Week 1-2)

- Complete file discovery and reading
- Implement document chunking
- Connect CLI to Python backend
- Test with text files
- Index command fully functional

### Milestone 2: Multi-Provider Query System (Week 3-4)

- Build query command with provider switcher
- Implement Ollama integration (local)
- Implement OpenAI integration (cloud)
- Implement Anthropic integration (cloud)
- Add provider-specific error handling
- Format and display results with source citations

### Milestone 3: Enhanced Features (Week 5-6)

- Multi-format support (PDF, DOCX, Markdown)
- Smart chunking algorithms
- Configuration file support
- Environment variable management
- Progress indicators
- Status command

### Milestone 4: Production Ready (Week 7-8)

- Incremental indexing
- Error handling and recovery
- Comprehensive testing (unit + integration)
- Performance optimization
- User documentation
- README with quick start examples

---

## Technical Considerations

### Performance

- **Target**: Index 1000 documents in < 60 seconds
- **Strategy**: Batch embeddings, parallel file I/O, efficient chunking
- **Monitoring**: Progress bars, time estimates, memory usage

### Scalability

- **Small Projects**: < 100 files (single run indexing)
- **Medium Projects**: 100-1000 files (batch indexing with caching)
- **Large Projects**: 1000+ files (consider incremental runs and cache pruning)

### Security & Privacy

- **Documents Stay Local**: All documents, embeddings, and vector data remain on your machine
- **Minimal Data Transmission**: When using cloud LLMs, only query + retrieved chunks are sent (not full documents)
- **No Telemetry**: No usage statistics, crash reports, or analytics collected
- **User-Controlled Privacy**: Choose Ollama for 100% local execution with zero network calls
- **Sandboxing**: Limit file system access to specified directories only
- **Input Validation**: Sanitize file paths and query inputs to prevent injection attacks
- **Secure API Key Management**: Cloud provider keys stored in environment variables, never in code
- **No Data Retention**: Ephemeral mode deletes all indexed data on exit
- **GDPR/HIPAA Friendly**: Documents never transmitted; compliance simplified even with cloud LLMs

### Compatibility

- **OS Support**: macOS, Linux, Windows
- **Node Version**: 16+ (for ES modules)
- **Python Version**: 3.8+ (for type hints)

---

## Configuration

### Default Settings

```json
{
  "embedding": {
    "model": "sentence-transformers/all-MiniLM-L6-v2",
    "batch_size": 32,
    "device": "cpu",
    "cache_dir": "~/.openbook/models"
  },
  "chunking": {
    "max_tokens": 512,
    "overlap": 50
  },
  "database": {
    "collection": "openbook"
  },
  "query": {
    "default_provider": "ollama",
    "default_model": {
      "ollama": "llama3",
      "openai": "gpt-4",
      "anthropic": "claude-3-5-sonnet-20241022"
    },
    "top_k": 4,
    "temperature": 0.7,
    "ollama_url": "http://127.0.0.1:11434"
  }
}
```

### User Configuration

- **Location**: `~/.openbook/config.json` (stored locally)
- **Override**: Use `--config` flag to specify alternate config file
- **Privacy**: No cloud sync—config stays on your machine
- **Model Cache**: Downloaded models stored in `~/.openbook/models/`
- **API Keys**: Stored in environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)

---

## Testing Strategy

### Unit Tests

- Embedding generation accuracy
- Vector store operations (add, search, delete)
- File parsing and chunking
- CLI argument parsing
- Provider factory function

### Integration Tests

- End-to-end indexing workflow
- Query with Ollama provider
- Query with OpenAI provider (requires API key)
- Query with Anthropic provider (requires API key)
- TypeScript-Python bridge communication
- Error handling for missing API keys

### Performance Tests

- Large directory indexing (1000+ files)
- Query response time across providers
- Memory usage under load
- Embedding batch processing speed

---

## Future Enhancements

### Advanced Provider Features

- **More LLM Providers**: Add support for Cohere, Google AI, Mistral API
- **Local Model Management**: Built-in Ollama model download and management
- **Provider Fallback**: Automatically switch providers if one fails
- **Streaming Responses**: Real-time token streaming for cloud providers
- **Cost Tracking**: Monitor API usage and costs for cloud providers

### Advanced RAG Features

- **Semantic Caching**: Reuse embeddings for unchanged files (stored locally)
- **Hybrid Search**: Combine semantic and keyword search
- **Multi-Modal**: Support images, code, structured data
- **Reranking**: Improve relevance with cross-encoder reranking
- **Query Expansion**: Automatic query reformulation for better results

### Integration Features

- **Git Integration**: Auto-index on commit (local git hooks)
- **IDE Plugins**: VSCode, JetBrains extensions
- **Web UI**: Browser-based interface at localhost:port
- **Watch Mode**: Auto-reindex on file changes
- **Export/Import**: Share index snapshots (without original documents)

### AI-Powered Features

- **Auto-Summarization**: Generate document summaries using your chosen LLM
- **Entity Extraction**: Identify key concepts and entities
- **Question Generation**: Create Q&A pairs from documents
- **Cross-References**: Automatically link related documents
- **OCR Support**: Extract text from images/PDFs (Tesseract)

### Enterprise Features

- **Persistent Storage**: Optional disk-based vector store (SQLite + ChromaDB)
- **Multi-Collection**: Manage multiple isolated knowledge bases
- **Access Control**: Basic auth for shared deployments
- **Audit Logging**: Track queries and access (stored locally)
- **Batch Processing**: Queue multiple documents for indexing

---

## Success Metrics

### User Experience

- < 5 seconds for first query after indexing (any provider)
- < 1 second for local similarity search
- > 90% relevance for top-3 results
- < 5 minute setup time for new users
- Easy provider switching with single flag

### Technical

- 100% test coverage for core modules
- < 100MB memory for 1000 documents
- 0 data loss on crashes
- Support for 3+ LLM providers (Ollama, OpenAI, Anthropic)
- Clear error messages for missing API keys

### Privacy & Security

- Documents never transmitted in full
- API keys stored securely in environment variables
- Zero telemetry or tracking
- Transparent data flow in documentation

---

## Documentation Plan

### User Documentation

1. **Quick Start Guide**: 5-minute tutorial
2. **Command Reference**: Detailed CLI options
3. **Configuration Guide**: Customization options
4. **Troubleshooting**: Common issues and solutions

### Developer Documentation

1. **Architecture Overview**: System design
2. **API Reference**: Internal modules
3. **Contributing Guide**: How to extend
4. **Testing Guide**: How to run tests

---

## Frequently Asked Questions

### Q: Does OpenBook require an internet connection?

**A**: It depends on your LLM provider choice:

- **Ollama (local)**: Only once, to download the MiniLM-L6-v2 embedding model (~90MB) and your chosen Ollama model. After that, it works completely offline.
- **OpenAI/Anthropic (cloud)**: Requires internet during queries to call the API, but indexing is still local.

### Q: Will my documents ever be sent to the cloud?

**A**: No, never. Your full documents always stay on your machine. When using cloud LLMs, only your query and the retrieved context chunks (typically 2-4KB) are sent to the API. The full documents are never transmitted.

### Q: Can I use OpenBook in an air-gapped environment?

**A**: Yes! Use Ollama as your provider for 100% local execution. Once models are cached (after first run with internet), OpenBook works perfectly offline.

### Q: Does OpenBook collect any telemetry or usage data?

**A**: No. OpenBook has zero telemetry, no analytics, and no tracking. Your usage is completely private.

### Q: What happens to my data when I close OpenBook?

**A**: The vector database lives entirely in memory and is cleared as soon as the CLI exits. Re-run the index command whenever you need a fresh session.

### Q: How is this different from cloud-based RAG solutions?

**A**: Cloud RAG solutions send your entire documents to remote servers for indexing and storage. OpenBook indexes documents locally—your full documents never leave your machine. You can even choose Ollama for 100% local LLM execution.

### Q: What are the hardware requirements?

**A**: Minimal! OpenBook's indexing runs on CPU (no GPU required). For optimal performance: 4GB+ RAM, 500MB disk space for models, and any modern CPU from the last 5 years. If using Ollama, you'll need additional resources based on your chosen model.

### Q: Can I use custom embedding models?

**A**: Yes! While MiniLM-L6-v2 is the default (optimized for speed and size), you can configure any model from the sentence-transformers library. All embedding models run locally.

### Q: Which LLM provider should I choose?

**A**:

- **Ollama**: Best for privacy, offline work, and cost-free operation. Slightly slower responses.
- **OpenAI**: Fast responses, high quality, requires API key and costs money per query.
- **Anthropic**: Excellent for complex reasoning, requires API key and costs money per query.

### Q: How much does it cost to use cloud providers?

**A**: With cloud providers, you pay per API call:

- **OpenAI**: ~$0.01-0.03 per query (depending on model)
- **Anthropic**: ~$0.01-0.02 per query (depending on model)
- **Ollama**: $0.00 (completely free, runs locally)

---

## Conclusion

OpenBook provides a flexible, privacy-first approach to RAG-powered document search. By keeping your documents local while offering choice in LLM providers, it gives you control over both your data and your workflow.

### Key Differentiators

- **Documents Stay Private**: Your full documents never leave your machine—indexing and embedding generation happen locally
- **LLM Flexibility**: Choose between fully local (Ollama), or cloud providers (OpenAI, Anthropic)
- **Simple CLI**: Easy-to-use command-line interface with clear provider options
- **Open Source**: Transparent codebase you can audit and modify
- **Cost Control**: Use Ollama for $0 per query, or cloud providers when you need top-tier performance
- **No Telemetry**: Zero tracking or analytics

The modular architecture ensures extensibility, with a clear separation between document processing (always local) and LLM inference (your choice). Built on proven technologies (Node.js, Python, ChromaDB, LangChain, sentence-transformers), OpenBook makes RAG accessible without forcing you into a single approach.

### Perfect For

- 🔒 **Privacy-Conscious Users**: Lawyers, doctors, researchers handling sensitive data who want documents to stay local
- 💻 **Flexible Developers**: Use Ollama for development, cloud APIs for production—switch anytime
- 💰 **Cost-Conscious Teams**: Start with free Ollama, scale to cloud when needed
- 🏢 **Enterprise**: Documents never transmitted; use local or cloud LLMs based on policy
- 🌍 **Open Source Advocates**: Transparent, auditable, and community-driven

### Use Cases

- **Local-First Research**: Index papers and notes locally, query with Ollama
- **Development Docs**: Quick RAG over codebases, API docs, internal wikis
- **Hybrid Workflows**: Index sensitive docs locally, query with your preferred LLM
- **Education**: Students can build a personal knowledge base for studying
- **Content Analysis**: Journalists, writers analyzing document collections

---

**Status**: Active Development  
**Version**: 1.0.0  
**Last Updated**: November 6, 2025  
**License**: ISC

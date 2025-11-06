# OpenBook Project Plan

## 100% Local, Privacy-First RAG System

## Project Overview

**OpenBook** is a fully local, privacy-first command-line interface (CLI) tool that transforms local document directories into a queryable knowledge base using RAG (Retrieval-Augmented Generation) technology. The tool runs entirely on your machine, indexing documents into a local vector database and providing an MCP (Model Context Protocol) server interface for seamless integration with LLM tools—all without any network requests or cloud dependencies.

**Core Philosophy**: Your documents, your machine, your privacy. No cloud, no APIs, no tracking—ever.

### Core Value Proposition

- **100% Local Execution**: Everything runs on your machine—no internet required, no data ever leaves your computer
- **Privacy First**: Your documents, embeddings, and queries stay completely private
- **Instant Context**: Turn any directory into searchable LLM context in seconds
- **Ephemeral Storage**: Database is created on startup and cleaned up on exit (optional persistence available)
- **Offline Ready**: Works without internet connection after initial model download
- **MCP Integration**: Local server exposes indexed knowledge via standardized protocol for LLM tools

---

## Architecture

### High-Level Design

```
╔═══════════════════════════════════════════════════════════════╗
║                    YOUR LOCAL MACHINE                         ║
║                      (100% Offline)                           ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │                    OpenBook CLI                          │ ║
║  │                 (TypeScript/Node.js)                     │ ║
║  └────────────┬────────────────────────────┬────────────────┘ ║
║               │                            │                  ║
║               ▼                            ▼                  ║
║      ┌─────────────────┐          ┌──────────────────┐       ║
║      │  File Indexing  │          │  MCP Server      │       ║
║      │     Module      │          │  (localhost/IPC) │       ║
║      └────────┬────────┘          └────────┬─────────┘       ║
║               │                            │                  ║
║               ▼                            ▼                  ║
║      ┌─────────────────────────────────────────────────┐     ║
║      │         Python Backend Services                  │     ║
║      │  ┌──────────────┐      ┌───────────────────┐   │     ║
║      │  │  Embedding   │      │   Vector Store    │   │     ║
║      │  │   Service    │◄────►│   (ChromaDB)      │   │     ║
║      │  │ (MiniLM-L6)  │      │   (Local Disk)    │   │     ║
║      │  └──────────────┘      └───────────────────┘   │     ║
║      └─────────────────────────────────────────────────┘     ║
║                                                               ║
║  📁 Your Documents  →  🧠 Local Embeddings  →  💾 Local DB    ║
║                                                               ║
║                    ❌ NO INTERNET REQUIRED                    ║
║                    ❌ NO CLOUD SERVICES                       ║
║                    ❌ NO DATA TRANSMISSION                    ║
╚═══════════════════════════════════════════════════════════════╝
```

### Technology Stack (All Local)

#### Frontend (CLI)

- **TypeScript/Node.js**: Core CLI implementation (runs locally)
- **Commander.js**: Command-line argument parsing and routing (local)
- **Figlet**: ASCII art banner for branding (local)

#### Backend (Processing)

- **Python 3.x**: Embedding and vector operations (runs locally on your CPU/GPU)
- **sentence-transformers**: Local embedding generation (all-MiniLM-L6-v2, downloaded once and cached)
- **ChromaDB**: Local vector database for semantic search (stored on your disk)

#### Integration

- **MCP (Model Context Protocol)**: Local server interface via stdio/localhost
- **Child Process/IPC**: TypeScript-Python communication (in-process, no network)

### Local Execution Guarantees

#### What Stays Local

✅ **All Documents**: Never leave your file system  
✅ **All Embeddings**: Generated on your CPU/GPU  
✅ **All Vector Data**: Stored in local ChromaDB  
✅ **All Queries**: Processed locally  
✅ **All Results**: Computed and served from local storage  
✅ **MCP Server**: Listens only on localhost or uses stdio

#### Network Requirements

- **Initial Setup**: One-time download of MiniLM-L6-v2 model (~90MB)
- **After Setup**: Zero network activity
- **Offline Mode**: Fully functional once model is cached

#### Privacy & Security

- **Zero Telemetry**: No usage tracking or analytics
- **Zero Cloud Dependencies**: No AWS, Azure, OpenAI, or any cloud service
- **Zero Data Leakage**: Your documents are never transmitted anywhere
- **Local LLM Compatible**: Works with Ollama, LM Studio, and other local LLMs

### Data Flow (100% Local)

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
    ↓ [Stored via Local ChromaDB Instance]
    ↓
💾 Vector Database (Local Disk: ~/.openbook/db)
    ↓
    ↓ [Query Processed Locally]
    ↓
📊 Search Results (Local Memory)
    ↓
    ↓ [Served via Local MCP Server]
    ↓
🤖 Your LLM Tool (Local Machine - Claude Desktop, etc.)

🚫 NO NETWORK TRAFFIC
🚫 NO CLOUD APIS
🚫 NO DATA EXFILTRATION
```

---

## Core Components

### 1. CLI Interface (`src/index.ts`)

**Purpose**: Entry point for all user interactions

**Commands**:

```bash
openbook --index <directory>    # Index documents in a directory
openbook --serve                # Start MCP server
openbook --query <query>        # Query the indexed knowledge
openbook --status               # Check server status
```

**Lifecycle**:

1. Display ASCII banner
2. Parse command-line arguments
3. Initialize vector database
4. Execute requested command
5. Clean up database on exit

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
- Ephemeral or persistent storage modes

### 4. File Indexing Module (`src/file_indexing.py`)

**Purpose**: Process directory trees and extract indexable content

**Planned Functionality**:

- Recursive directory traversal
- File type detection and filtering
- Text extraction from various formats
- Document chunking for optimal embedding
- Metadata extraction (filename, path, modified date)

### 5. MCP Server Interface

**Purpose**: Expose indexed knowledge to local LLM tools via Model Context Protocol

**Local Communication Methods**:

- **stdio**: Direct input/output stream communication (most common for MCP)
- **localhost**: Optional HTTP server on 127.0.0.1 (never exposed to network)
- **Unix sockets**: Local IPC for secure communication

**Capabilities**:

- Serve context on demand (locally)
- Handle similarity searches (processed on your machine)
- Provide document metadata (from local storage)
- Stream large results (in-memory or local temp files)

**Security Note**: The MCP server never binds to external network interfaces. All communication is strictly local-only, ensuring your data never leaves your machine.

---

## Features & Functionality

### Phase 1: Core Indexing (Current Development)

- [x] CLI framework setup
- [x] Embedding service with MiniLM-L6-v2
- [x] ChromaDB vector store wrapper
- [ ] File discovery and reading
- [ ] Document chunking strategy
- [ ] Index command implementation
- [ ] Query command implementation

### Phase 2: MCP Server Integration

- [ ] MCP protocol implementation
- [ ] Server lifecycle management
- [ ] Context serving endpoints
- [ ] Real-time index updates
- [ ] Status monitoring

### Phase 3: Advanced Features

- [ ] Multi-format support (PDF, DOCX, Markdown, etc.)
- [ ] Smart chunking algorithms
- [ ] Incremental indexing (only changed files)
- [ ] Custom embedding models
- [ ] Query result ranking and filtering
- [ ] Export/import index snapshots

### Phase 4: Performance & UX

- [ ] Parallel file processing
- [ ] Progress indicators
- [ ] Configuration file support
- [ ] .openbookignore for selective indexing
- [ ] Cache management
- [ ] Error recovery and logging

---

## File Structure

```
openbook/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── utils.ts                 # Shared utilities
│   ├── commands/                # Command handlers
│   │   ├── index.ts            # Index command
│   │   ├── serve.ts            # MCP server command
│   │   ├── query.ts            # Query command
│   │   └── status.ts           # Status command
│   ├── file_indexing.py        # Document processing
│   ├── embedding.py            # Embedding generation
│   └── vector_db/
│       ├── vector_db.py        # ChromaDB wrapper
│       └── embedding.py        # Alternative embedding module
├── dist/                        # Compiled TypeScript
├── tests/                       # Test suite
├── package.json                 # Node dependencies
├── requirements.txt             # Python dependencies
├── tsconfig.json               # TypeScript config
├── .gitignore
└── README.md
```

---

## Implementation Details

### Database Lifecycle

**On Startup**:

```typescript
1. Initialize ChromaDB client (ephemeral mode by default)
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

### MCP Server Protocol (Local Communication)

**Communication Methods**:

1. **stdio (Primary)**: JSON-RPC over standard input/output
2. **localhost HTTP (Optional)**: REST API bound to 127.0.0.1 only
3. **Unix Sockets (Alternative)**: Local filesystem-based IPC

**Local Endpoints** (if using HTTP mode):

- `GET /context`: Retrieve relevant context for a query (localhost only)
- `POST /index`: Trigger indexing of new documents (localhost only)
- `GET /status`: Server health and statistics (localhost only)
- `DELETE /clear`: Reset the database (localhost only)

**Response Format**:

```json
{
  "results": [
    {
      "content": "Document chunk text...",
      "metadata": { ... },
      "score": 0.95
    }
  ],
  "query": "Original query",
  "total_results": 10
}
```

**Security**:

- Server binds exclusively to `127.0.0.1` (localhost)
- No external network access configured
- Firewall-friendly (no incoming connections from internet)
- All processing happens in-process on your machine

---

## Development Roadmap

### Milestone 1: Basic Indexing (Weeks 1-2)

- Complete file discovery and reading
- Implement document chunking
- Connect CLI to Python backend
- Test with text files

### Milestone 2: Query System (Weeks 3-4)

- Build query command
- Format and display results
- Add ranking and filtering
- Performance optimization

### Milestone 3: MCP Server (Weeks 5-6)

- Implement MCP protocol
- Build server command
- Test with LLM tools
- Documentation and examples

### Milestone 4: Production Ready (Weeks 7-8)

- Multi-format support
- Error handling and recovery
- Configuration system
- Comprehensive testing
- User documentation

---

## Technical Considerations

### Performance

- **Target**: Index 1000 documents in < 60 seconds
- **Strategy**: Batch embeddings, parallel file I/O, efficient chunking
- **Monitoring**: Progress bars, time estimates, memory usage

### Scalability

- **Small Projects**: < 100 files, in-memory mode
- **Medium Projects**: 100-1000 files, persistent mode optional
- **Large Projects**: 1000+ files, incremental updates, disk persistence

### Security & Privacy

- **100% Local Processing**: All data stays on your machine—documents, embeddings, queries, and results
- **No Network Calls**: Zero outbound requests after initial model download
- **No Telemetry**: No usage statistics, crash reports, or analytics collected
- **No Cloud Dependencies**: No AWS, Azure, Google Cloud, or OpenAI API calls
- **Sandboxing**: Limit file system access to specified directories only
- **Input Validation**: Sanitize file paths and query inputs to prevent injection attacks
- **Localhost-Only Server**: MCP server never binds to external network interfaces (127.0.0.1 or stdio only)
- **No Data Retention**: Ephemeral mode deletes all indexed data on exit
- **GDPR/HIPAA Friendly**: Since data never leaves your machine, compliance is simplified

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
    "mode": "ephemeral",
    "persist_directory": "~/.openbook/db",
    "collection": "openbook"
  },
  "mcp": {
    "mode": "stdio",
    "localhost_port": 8080,
    "bind_address": "127.0.0.1",
    "max_results": 10
  }
}
```

### User Configuration

- **Location**: `~/.openbook/config.json` (stored locally)
- **Override**: Use `--config` flag to specify alternate config file
- **Privacy**: No cloud sync—config stays on your machine
- **Model Cache**: Downloaded models stored in `~/.openbook/models/`
- **Database Storage**: Persistent mode uses `~/.openbook/db/` (optional)

---

## Testing Strategy

### Unit Tests

- Embedding generation accuracy
- Vector store operations
- File parsing and chunking
- CLI argument parsing

### Integration Tests

- End-to-end indexing workflow
- Query accuracy and relevance
- MCP server requests
- TypeScript-Python bridge

### Performance Tests

- Large directory indexing
- Query response time
- Memory usage under load
- Concurrent operations

---

## Future Enhancements (Maintaining Local-First Approach)

### Advanced Features

- **Semantic Caching**: Reuse embeddings for unchanged files (stored locally)
- **Multi-Modal**: Support images, code, structured data (processed locally)
- **Local Collaborative**: Shared indexes via local network (optional LAN-only feature)
- **Local Analytics**: Usage tracking stored on your machine only (opt-in)
- **GPU Acceleration**: Faster embedding generation using local GPU

### Integration (All Local)

- **Git Integration**: Auto-index on commit (local git hooks)
- **IDE Plugins**: VSCode, JetBrains extensions (local extensions)
- **Local Web UI**: Browser-based interface at localhost:port
- **Local API**: RESTful access bound to 127.0.0.1 only
- **Watch Mode**: Auto-reindex on file changes (local file system monitoring)

### AI Features (Using Local Models)

- **Auto-Summarization**: Generate document summaries (using local LLMs like Ollama)
- **Entity Extraction**: Identify key concepts (local NLP models)
- **Question Generation**: Create Q&A pairs (local transformer models)
- **Cross-References**: Link related documents (local graph algorithms)
- **Local OCR**: Extract text from images/PDFs (Tesseract or similar local tools)

---

## Success Metrics

### User Experience

- < 5 seconds for first query after indexing
- < 1 second for subsequent queries
- > 90% relevance for top-3 results
- < 5 minute setup time for new users

### Technical

- 100% test coverage for core modules
- < 100MB memory for 1000 documents
- 0 data loss on crashes
- Compatible with all major LLM tools

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

## Frequently Asked Questions (Local Execution)

### Q: Does OpenBook require an internet connection?

**A**: Only once, during initial setup to download the MiniLM-L6-v2 model (~90MB). After that, it works completely offline.

### Q: Will my documents ever be sent to the cloud?

**A**: Never. All documents, embeddings, and queries are processed locally on your machine. There are no cloud services involved.

### Q: What does "MCP server" mean? Is it exposed to the internet?

**A**: No! The MCP server is a local-only interface that uses stdio (standard input/output) or localhost (127.0.0.1). It never binds to external network interfaces and is not accessible from the internet.

### Q: Can I use OpenBook in an air-gapped environment?

**A**: Yes! Once the embedding model is cached (after first run with internet), OpenBook works perfectly in completely offline/air-gapped environments.

### Q: Does OpenBook collect any telemetry or usage data?

**A**: No. OpenBook has zero telemetry, no analytics, and no tracking. Your usage is completely private.

### Q: What happens to my data when I close OpenBook?

**A**: By default (ephemeral mode), the vector database is deleted on exit. You can enable persistent mode if you want to keep the index between sessions—it will be stored locally at `~/.openbook/db`.

### Q: Can other people on my network access my indexed documents?

**A**: No. The MCP server binds only to localhost (127.0.0.1) by default, making it accessible only from your machine.

### Q: How is this different from cloud-based RAG solutions?

**A**: Cloud solutions send your documents to remote servers for processing. OpenBook processes everything locally, giving you complete privacy, zero ongoing costs, and no reliance on external services.

### Q: What are the hardware requirements?

**A**: Minimal! OpenBook runs on CPU (no GPU required). For optimal performance: 4GB+ RAM, 500MB disk space for models, and any modern CPU from the last 5 years.

### Q: Can I use custom embedding models?

**A**: Yes! While MiniLM-L6-v2 is the default (optimized for speed and size), you can configure any model from the sentence-transformers library. All models run locally.

---

## Conclusion

OpenBook bridges the gap between local knowledge bases and modern LLM tooling—all while keeping your data completely private on your machine. By providing ephemeral, fast, and 100% local document indexing with MCP integration, it enables developers and researchers to augment their AI workflows with secure, context-rich information retrieval.

### Key Differentiators

- **Privacy-First**: Your documents never leave your computer—no cloud, no APIs, no tracking
- **Offline-Ready**: Works fully offline after initial model download
- **Open Source**: Transparent codebase you can audit and modify
- **Fast**: Local processing means low latency and no rate limits
- **Cost-Free**: No subscription fees or API costs—run unlimited queries

The modular architecture ensures extensibility, while the unwavering local-first approach guarantees privacy, security, and performance. With a clear roadmap and solid technical foundation built on proven local technologies (Node.js, Python, ChromaDB, sentence-transformers), OpenBook is positioned to become an essential tool in the local-first RAG ecosystem.

### Perfect For

- 🔒 **Privacy-Conscious Users**: Lawyers, doctors, researchers handling sensitive data
- 💻 **Offline Workers**: Developers in air-gapped environments or with unreliable internet
- 💰 **Cost-Conscious Teams**: No per-query costs or monthly subscriptions
- 🏢 **Enterprise**: Deploy on-premises with zero data exfiltration risk
- 🌍 **Open Source Advocates**: Transparent, auditable, and community-driven

---

**Status**: Active Development  
**Version**: 1.0.0  
**Last Updated**: November 6, 2025  
**License**: ISC

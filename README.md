# OpenBook CLI

> **Your customizable NotebookLM in the terminal**

A local-first CLI that transforms your documents into a private, queryable knowledge base using RAG (Retrieval-Augmented Generation). Keep your data on your machine, choose your LLM provider, and interact with your documents through a powerful command-line interface.

```
   ___                   ____              _
  / _ \ _ __   ___ _ __ | __ )  ___   ___ | | __
 | | | | '_ \ / _ \ '_ \|  _ \ / _ \ / _ \| |/ /
 | |_| | |_) |  __/ | | | |_) | (_) | (_) |   <
  \___/| .__/ \___|_| |_|____/ \___/ \___/|_|\_\
       |_|
```

## Why OpenBook?

NotebookLM is powerful, but your data lives in the cloud. OpenBook brings the same RAG-powered document intelligence to your local machine:

- **100% Private**: Your documents never leave your computer
- **Flexible LLM Support**: Works with Ollama (local), OpenAI, Anthropic, or any provider you choose
- **Fast & Offline**: Index and search locally with Ollama embeddings
- **Customizable**: Configure chunking, file filters, models, and more
- **Interactive**: Query mode for one-off questions, chat mode for conversations

## Features

- 📚 **Local Document Indexing**: Recursively scan directories and build a searchable knowledge base
- 🔒 **Privacy-First**: All embeddings generated locally using Ollama
- 🧠 **RAG-Powered Queries**: Retrieve relevant context and generate answers with your chosen LLM
- 💬 **Interactive Chat**: Engage in multi-turn conversations with your documents
- ⚙️ **Highly Configurable**: Control chunking, models, extensions, and more
- 🚀 **Fast Setup**: Get started in minutes with simple CLI commands

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/openbook-cli.git
cd openbook-cli

# Install dependencies
npm install

# Build the CLI
npm run build

# Link globally (optional)
npm link

# Install and prepare Ollama embeddings
brew install ollama  # or follow https://ollama.com/download
ollama serve         # start the Ollama daemon
ollama pull nomic-embed-text  # embedding model used by OpenBook
```

### Basic Usage

```bash
# Index a directory of documents
openbook index ./my-docs

# Enable recursive indexing for subdirectories
openbook recursive on

# Filter specific file types
openbook extensions .md .txt .py .js

# Configure your LLM provider
openbook model-provider ollama          # or openai, anthropic, google
openbook model qwen3:1.7b               # set your chat model
openbook embedding-model nomic-embed-text   # set embedding model Ollama should use

# Set API key (if using cloud providers)
openbook api-key --provider openai sk-...

# Start an interactive chat session (type your question and press Enter)
openbook chat
```

### Ollama Embeddings Setup

OpenBook relies on Ollama to generate embeddings locally. Make sure to:

1. [Install Ollama](https://ollama.com/download) and run `ollama serve`.
2. Pull an embedding-capable model:
   ```bash
   ollama pull nomic-embed-text
   ```
3. (Optional) Choose a different embedding model via `openbook embedding-model <name>`.

If your Ollama daemon listens on a custom URL, set `OLLAMA_URL` before running OpenBook.

### Web Search Setup (Optional)

To augment answers with live web context:

1. Obtain a Bing Web Search API key (Azure Cognitive Services).
2. Export it before running OpenBook:
   ```bash
   export BING_SEARCH_KEY=your_key_here
   ```
3. Enable search and configure options:
   ```bash
   openbook web-search on
   openbook web-search-provider bing
   openbook web-search-results 3
   ```

To use Serper (Google results):

```bash
export SERPER_API_KEY=your_serper_key
openbook web-search on
openbook web-search-provider serper
openbook web-search-results 3
```

If you have a custom Bing endpoint, set `BING_SEARCH_ENDPOINT` accordingly.

## Architecture

OpenBook is built with a TypeScript CLI that talks to local services (Ollama) and optional cloud providers:

```
┌─────────────────────────────────────────────────────────┐
│                   OpenBook CLI (TypeScript)             │
│  • Command parsing & configuration                      │
│  • File discovery & chunking                            │
│  • LLM orchestration                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Python Backend Services                     │
│  ┌──────────────────┐      ┌────────────────────────┐  │
│  │  Ollama Embeddings│◄────►│  Vector Store (JSONL)  │  │
│  │  (nomic-embed)    │      │  + Semantic Search     │  │
│  └──────────────────┘      └────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    LLM Providers                         │
│  • Ollama (local)  • OpenAI  • Anthropic               │
└─────────────────────────────────────────────────────────┘
```

## Configuration

OpenBook stores configuration in `~/.openbook/config.json`. You can manage settings via CLI commands:

### Indexing Settings

```bash
# Set chunk size (default: 600)
openbook chunksize 800

# Enable/disable recursive directory scanning
openbook recursive on

# Configure file extensions to index
openbook extensions .md .txt .py .js

# Or index all file types
openbook extensions all

# Set number of context chunks per query (default: 5)
openbook context-chunks 6

# Toggle retrieval (default: on)
openbook rag off

# Set embedding model (default: nomic-embed-text)
openbook embedding-model nomic-embed-text
```

### Model Configuration

```bash
# View available providers
openbook model-provider

# Set provider
openbook model-provider ollama

# List available models for current provider
openbook model list

# Set model
openbook model qwen2.5:7b

# Use a custom model not in the list
openbook model my-custom-model --custom
```

### API Key Management

```bash
# View current API key (masked)
openbook api-key

# Set API key for current provider
openbook api-key sk-your-key-here

# Set API key for specific provider
openbook api-key --provider openai sk-your-key-here

# Clear API key
openbook api-key --clear
```

### Advanced Options

```bash
# Enable web search augmentation (when supported by provider)
openbook web-search on
openbook web-search-provider bing
openbook web-search-results 3

# End current session (clear in-memory state)
openbook end-session
```

## Supported Providers

| Provider | Type | Requires API Key | Models |
|----------|------|------------------|--------|
| **Ollama** | Local | ❌ | qwen3:1.7b, llama3.1:8b, mistral, etc. |
| **OpenAI** | Cloud | ✅ | gpt-5-preview, gpt-4.2, gpt-4o |
| **Anthropic** | Cloud | ✅ | claude-4.5-sonnet, claude-4-opus, claude-3.5-haiku |
| **Google** | Cloud | ✅ | gemini-2.5-pro, gemini-2.5-flash |

## Use Cases

### For Researchers
Index your papers, notes, and references. Ask questions across your entire research library.

```bash
openbook index ~/research-papers
openbook chat  # then ask “What are the common methodologies in my papers about neural networks?”
```

### For Developers
Search through documentation, code comments, and technical notes.

```bash
openbook extensions .md .py .js .ts .java
openbook index ~/projects
openbook chat  # Ask questions about your codebase
```

### For Writers
Query your drafts, outlines, and reference materials.

```bash
openbook recursive on
openbook index ~/writing
openbook chat  # then ask “What plot points have I mentioned about the protagonist?”
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `index <dir>` | Index documents in a directory |
| `chat` | Start interactive chat session |
| `chunksize [value]` | Get/set chunk size for indexing |
| `recursive [on\|off]` | Enable/disable recursive indexing |
| `extensions [ext...]` | Configure file extensions to index |
| `context-chunks [count]` | Set number of chunks per query |
| `rag [on\|off]` | Enable/disable RAG (local chunk retrieval) |
| `web-search [on\|off]` | Enable/disable web search |
| `web-search-provider [name]` | Choose web search provider (default: bing) |
| `web-search-results [count]` | Set number of web results when enabled |
| `model-provider [name]` | Get/set LLM provider |
| `model [id]` | Get/set model identifier |
| `embedding-model [id]` | Get/set Ollama embedding model |
| `api-key [value]` | Manage API keys |
| `end-session` | Clear session state |
| `help [command]` | Show help information |

## Roadmap

### Phase 1: Core Indexing ✅
- [x] CLI framework with configuration management
- [x] Document chunking with overlap
- [x] In-memory vector store
- [x] Multi-provider LLM support
- [x] Chat interface with retrieval

### Phase 2: Advanced Features (In Progress)
- [ ] Persistent vector store (on-disk storage)
- [ ] Incremental indexing (skip unchanged files)
- [ ] `.openbookignore` patterns
- [ ] PDF, DOCX, and more format support
- [ ] Enhanced progress indicators

### Phase 3: Intelligence & UX
- [ ] Automatic chunk size optimization
- [ ] Source citation in answers
- [ ] Export/import knowledge bases
- [ ] Web search integration
- [ ] MCP (Model Context Protocol) server

## Privacy & Security

OpenBook is designed with privacy as a core principle:

- **No telemetry**: Zero tracking or analytics
- **Local embeddings**: Ollama (e.g., `nomic-embed-text`) runs entirely on your machine
- **Your choice of LLM**: Use local Ollama models or cloud providers
- **No data persistence (by default)**: Vector store lives only during CLI session
- **API keys stay local**: Stored in your config file, never synced

## Development

```bash
# Clone and install
git clone https://github.com/yourusername/openbook-cli.git
cd openbook-cli
npm install

# Build
npm run build

# Run in development
npm run build && node dist/index.js

# Run tests
npm test
```

## Troubleshooting

### NumPy Compatibility Issues
If you encounter NumPy version conflicts:
```bash
pip install "numpy<2"
```

### ChromaDB Issues
Ensure ChromaDB is installed correctly:
```bash
pip install chromadb --upgrade
```

### Ollama Not Found
Make sure Ollama is running:
```bash
ollama serve
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Acknowledgments

- Built with [Commander.js](https://github.com/tj/commander.js) for CLI
- Embeddings powered by [sentence-transformers](https://www.sbert.net/)
- Vector store by [ChromaDB](https://www.trychroma.com/)
- LLM orchestration via [LangChain](https://www.langchain.com/)

---

**Made with ❤️ for developers who value privacy and local-first tools**

*OpenBook: Your documents, your machine, your intelligence.*

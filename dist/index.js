"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const figlet_1 = __importDefault(require("figlet"));
const path_1 = __importDefault(require("path"));
const indexDocuments_1 = require("./commands/indexDocuments");
const program = new commander_1.Command();
console.log(figlet_1.default.textSync("openbook"));
program
    .name("openbook")
    .description("Local-first CLI for indexing documents into a private RAG knowledge base")
    .version("1.0.0");
program
    .command("index")
    .description("Index documents in a directory and cache embeddings locally")
    .argument("<directory>", "Directory of documents to index")
    .option("-r, --recursive", "Include subdirectories", false)
    .option("--chunk-size <number>", "Chunk size in characters", parsePositiveInt)
    .option("--overlap <number>", "Character overlap between chunks", parseNonNegativeInt)
    .option("--ext <extensions...>", "Allowed file extensions (e.g. .md .txt)")
    .action(async (directory, options) => {
    const resolvedDirectory = path_1.default.resolve(directory);
    try {
        const chunkCount = await (0, indexDocuments_1.indexDocuments)({
            sourceDir: resolvedDirectory,
            recursive: Boolean(options.recursive),
            chunkSize: options.chunkSize,
            overlap: options.overlap,
            allowedExtensions: normalizeExtensions(options.ext),
        });
        console.log(chunkCount === 0
            ? `No eligible documents found in ${resolvedDirectory}`
            : `Indexed ${chunkCount} chunk${chunkCount === 1 ? "" : "s"} from ${resolvedDirectory}`);
    }
    catch (error) {
        handleCliError("index", error);
    }
});
program
    .command("serve")
    .description("Start the local MCP server (coming soon)")
    .action(() => {
    console.warn("The serve command is not implemented yet. Stay tuned!");
});
program
    .command("query")
    .description("Query the indexed knowledge base (coming soon)")
    .argument("<query>", "Query string to search for")
    .action((query) => {
    void query;
    console.warn("Querying is not implemented yet. Use the index command to prepare data first.");
});
program
    .command("status")
    .description("Show the current index and server status (coming soon)")
    .action(() => {
    console.warn("Status reporting not implemented yet.");
});
program
    .hook("preAction", () => {
    // Placeholder for future initialization (vector store, config, etc.).
});
program
    .hook("postAction", () => {
    // Placeholder for cleanup, e.g., flushing persisted state.
});
program.parseAsync(process.argv).catch((error) => {
    handleCliError("cli", error);
});
function normalizeExtensions(input) {
    if (!input) {
        return undefined;
    }
    const values = Array.isArray(input) ? input : [input];
    const normalized = values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0)
        .map((value) => (value.startsWith(".") ? value : `.${value}`));
    return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
}
function parsePositiveInt(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new commander_1.InvalidArgumentError("Expected a positive integer.");
    }
    return parsed;
}
function parseNonNegativeInt(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new commander_1.InvalidArgumentError("Expected a non-negative integer.");
    }
    return parsed;
}
function handleCliError(context, error) {
    if (error instanceof Error) {
        console.error(`[${context}] ${error.message}`);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
    }
    else {
        console.error(`[${context}] Unexpected error`, error);
    }
    process.exitCode = 1;
}
//# sourceMappingURL=index.js.map
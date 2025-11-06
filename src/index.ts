import { Command, InvalidArgumentError } from "commander";
import figlet from "figlet";
import path from "path";

import { indexDocuments } from "./commands/indexDocuments";

const program = new Command();

console.log(figlet.textSync("openbook"));

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
    .action(async (directory: string, options) => {
        const resolvedDirectory = path.resolve(directory);

        try {
            const chunkCount = await indexDocuments({
                sourceDir: resolvedDirectory,
                recursive: Boolean(options.recursive),
                chunkSize: options.chunkSize,
                overlap: options.overlap,
                allowedExtensions: normalizeExtensions(options.ext),
            });

            console.log(
                chunkCount === 0
                    ? `No eligible documents found in ${resolvedDirectory}`
                    : `Indexed ${chunkCount} chunk${chunkCount === 1 ? "" : "s"} from ${resolvedDirectory}`,
            );
        } catch (error) {
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
    .action((query: string) => {
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

function normalizeExtensions(input?: string[] | string): string[] | undefined {
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

function parsePositiveInt(value: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new InvalidArgumentError("Expected a positive integer.");
    }
    return parsed;
}

function parseNonNegativeInt(value: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new InvalidArgumentError("Expected a non-negative integer.");
    }
    return parsed;
}

function handleCliError(context: string, error: unknown): void {
    if (error instanceof Error) {
        console.error(`[${context}] ${error.message}`);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
    } else {
        console.error(`[${context}] Unexpected error`, error);
    }
    process.exitCode = 1;
}

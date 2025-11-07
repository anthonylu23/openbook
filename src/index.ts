#!/usr/bin/env node

import { Command, InvalidArgumentError } from "commander";
import figlet from "figlet";
import path from "path";

import packageJson from "../package.json";
import { indexDocuments } from "./commands/indexDocuments";
import { loadConfig, saveConfig, OpenBookConfig } from "./config";

const program = new Command();
const DEFAULT_OVERLAP = 80;
let currentConfig: OpenBookConfig = loadConfig();

console.log(figlet.textSync("openbook"));

program
    .name("openbook")
    .description("Local-first CLI for indexing documents into a private RAG knowledge base")
    .version(packageJson.version, "-v, --version", "Print the CLI version");

program
    .command("index")
    .description("Index documents in a directory and cache embeddings locally")
    .argument("<directory>", "Directory of documents to index")
    .action(async (directory: string) => {
        const resolvedDirectory = path.resolve(directory);

        try {
            const chunkCount = await indexDocuments({
                sourceDir: resolvedDirectory,
                recursive: currentConfig.recursive,
                chunkSize: currentConfig.chunkSize,
                overlap: DEFAULT_OVERLAP,
                allowedExtensions:
                    currentConfig.extensions.length > 0 ? currentConfig.extensions : undefined,
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
    .command("query")
    .description("Query the indexed knowledge base (coming soon)")
    .argument("<query>", "Query string to search for")
    .action((query: string) => {
        void query;
        console.warn("Querying is not implemented yet. Use the index command to prepare data first.");
    });

program
    .command("chunksize")
    .description("Get or set the default chunk size for indexing")
    .argument("[value]", "Positive integer chunk size")
    .action((value?: string) => {
        if (!value) {
            console.log(`Current chunk size: ${currentConfig.chunkSize}`);
            return;
        }

        const parsed = parsePositiveInt(value);
        updateConfig({ chunkSize: parsed });
        console.log(`Chunk size set to ${parsed}`);
    });

program
    .command("recursive")
    .description("Get or set whether subdirectories are indexed by default")
    .argument("[state]", "Use 'on' to enable or 'off' to disable")
    .action((state?: string) => {
        if (!state) {
            console.log(`Recursive indexing is ${currentConfig.recursive ? "enabled" : "disabled"}.`);
            return;
        }

        const normalized = state.toLowerCase();
        if (["on", "true", "yes", "1"].includes(normalized)) {
            updateConfig({ recursive: true });
            console.log("Recursive indexing enabled.");
            return;
        }
        if (["off", "false", "no", "0"].includes(normalized)) {
            updateConfig({ recursive: false });
            console.log("Recursive indexing disabled.");
            return;
        }
        throw new InvalidArgumentError("State must be 'on' or 'off'.");
    });

program
    .command("extensions")
    .description("Get or set the default list of file extensions to index")
    .argument("[ext...]", "Extensions like .md .txt. Use 'all' to allow every file.")
    .action((exts?: string[]) => {
        if (!exts || exts.length === 0) {
            if (currentConfig.extensions.length === 0) {
                console.log("All file extensions are currently indexed (no filters).");
            } else {
                console.log(
                    "Enabled extensions:\n" +
                        currentConfig.extensions.map((ext) => `  • ${ext}`).join("\n"),
                );
            }
            return;
        }

        if (exts.length === 1 && exts[0].toLowerCase() === "all") {
            updateConfig({ extensions: [] });
            console.log("Extension filter cleared. All files will be indexed.");
            return;
        }

        const normalized = normalizeExtensions(exts);
        if (!normalized || normalized.length === 0) {
            throw new InvalidArgumentError("Provide at least one valid extension (e.g. .md)");
        }

        updateConfig({ extensions: normalized });
        console.log(`Extensions set to: ${normalized.join(", ")}`);
    });

program
    .command("end-session")
    .description("Reset session-specific state (currently no-op)")
    .action(() => {
        console.log("Session ended. (No session state to clear yet.)");
    });

program
    .command("model-provider")
    .description("Get or set the active model provider (e.g., openai, ollama)")
    .argument("[provider]", "Provider identifier")
    .action((provider?: string) => {
        if (!provider) {
            console.log(`Current model provider: ${currentConfig.modelProvider}`);
            return;
        }

        updateConfig({ modelProvider: provider.toLowerCase() });
        console.log(`Model provider set to ${provider}`);
    });

program
    .command("model")
    .description("Get or set the default model identifier")
    .argument("[modelId]", "Model identifier (e.g., gpt-4o, qwen3:1.7b)")
    .action((modelId?: string) => {
        if (!modelId) {
            console.log(`Current model: ${currentConfig.model}`);
            return;
        }

        updateConfig({ model: modelId });
        console.log(`Model set to ${modelId}`);
    });

program
    .command("api-key")
    .description("Get or set the API key for the current provider")
    .argument("[key]", "API key value")
    .action((key?: string) => {
        if (!key) {
            if (currentConfig.apiKey) {
                console.log("API key is set (hidden). Use 'openbook api-key <value>' to update.");
            } else {
                console.log("No API key stored.");
            }
            return;
        }

        updateConfig({ apiKey: key });
        console.log("API key updated.");
    });

program
    .command("help")
    .description("Show help for a specific command")
    .argument("[command]", "Command to show help for", "")
    .action((commandName: string) => {
        const command = program.commands.find((cmd) => cmd.name() === commandName);
        if (command) {
            command.help();
            return;
        }

        if (!commandName) {
            program.help();
            return;
        }

        console.error(`Unknown command: ${commandName}`);
        program.help({ error: true });
    });

program
    .hook("preAction", () => {
        // Placeholder for future initialization (vector store, config, etc.).
    });

program
    .hook("postAction", () => {
        // Placeholder for cleanup, e.g., flushing persisted state.
    });

async function run(): Promise<void> {
    if (process.argv.length <= 2) {
        program.outputHelp();
        return;
    }

    try {
        await program.parseAsync(process.argv);
    } catch (error) {
        handleCliError("cli", error);
    }
}

run();

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

function updateConfig(partial: Partial<OpenBookConfig>): void {
    currentConfig = { ...currentConfig, ...partial };
    saveConfig(currentConfig);
}

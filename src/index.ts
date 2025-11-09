#!/usr/bin/env node

import "./utils/loadEnv";

import { Command, InvalidArgumentError } from "commander";
import figlet from "figlet";
import path from "path";
import { createInterface } from "readline/promises";

import packageJson from "../package.json";
import { indexDocuments } from "./commands/indexDocuments";
import { runQuery } from "./commands/query";
import { loadConfig, OpenBookConfig, getDefaultConfig, applyConfigUpdate } from "./config";
import { isValidProvider, PROVIDERS, ProviderName } from "./models/provider";
import { resetSession } from "./session/reset";

const program = new Command();
const DEFAULT_OVERLAP = 80;
let currentConfig: OpenBookConfig = loadConfig();
if (!currentConfig.apiKeys) {
    currentConfig.apiKeys = {};
}

const SUPPORTED_EXTENSIONS = [
    ".txt",
    ".md",
    ".mdx",
    ".rst",
    ".adoc",
    ".log",
    ".json",
    ".yaml",
    ".yml",
    ".csv",
    ".py",
    ".ts",
    ".js",
    ".java",
    ".html",
];

console.log(figlet.textSync("openbook"));

program.configureHelp({ sortSubcommands: true });
program.showHelpAfterError(true);

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
                embeddingModel: currentConfig.embeddingModel,
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
    .command("chat")
    .description("Start an interactive chat session with retrieval + LLM")
    .action(async () => {
        console.log("Starting chat. Type 'exit' to end.");
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        try {
            for (;;) {
                const question = await rl.question("You> ");
                if (!question.trim()) {
                    continue;
                }
                if (["exit", "quit", "bye"].includes(question.trim().toLowerCase())) {
                    break;
                }
                await executeQuery(question);
            }
        } finally {
            rl.close();
        }
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
                console.log("\nRecommended extensions: ");
                SUPPORTED_EXTENSIONS.forEach((ext) => console.log(`  • ${ext}`));
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
    .description("Reset indexed data and restore default settings")
    .action(() => {
        resetSession();
        currentConfig = getDefaultConfig();
        console.log("Session reset. Index cleared and settings restored to defaults.");
    });

program
    .command("context-chunks")
    .description("Get or set how many chunks are sent to the LLM per query")
    .argument("[count]", "Positive integer chunk count")
    .action((count?: string) => {
        if (!count) {
            console.log(`Chunks per query: ${currentConfig.chunksPerQuery}`);
            return;
        }
        const parsed = parsePositiveInt(count);
        updateConfig({ chunksPerQuery: parsed });
        console.log(`Chunks per query set to ${parsed}`);
    });

program
    .command("rag")
    .description("Get or set whether retrieval-augmented generation is enabled")
    .argument("[state]", "Use 'on' to enable or 'off' to disable")
    .action((state?: string) => {
        if (!state) {
            console.log(`RAG is ${currentConfig.ragEnabled ? "enabled" : "disabled"}.`);
            return;
        }
        const normalized = state.toLowerCase();
        if (["on", "true", "yes", "1"].includes(normalized)) {
            updateConfig({ ragEnabled: true });
            console.log("RAG enabled.");
            return;
        }
        if (["off", "false", "no", "0"].includes(normalized)) {
            updateConfig({ ragEnabled: false });
            console.log("RAG disabled. Answers will rely on web/general knowledge only.");
            return;
        }
        throw new InvalidArgumentError("State must be 'on' or 'off'.");
    });

program
    .command("model-provider")
    .description("Get or set the active model provider (e.g., openai, ollama)")
    .argument("[provider]", "Provider identifier")
    .action((provider?: string) => {
        if (!provider) {
            console.log(`Current model provider: ${currentConfig.modelProvider}`);
            console.log("Available providers:");
            Object.values(PROVIDERS).forEach((cfg) => {
                console.log(`  • ${cfg.name} — ${cfg.description}`);
            });
            return;
        }

        const normalized = provider.toLowerCase();
        if (!isValidProvider(normalized)) {
            console.error(`Unknown provider: ${provider}`);
            console.log("Valid providers:");
            Object.keys(PROVIDERS).forEach((name) => console.log(`  • ${name}`));
            process.exitCode = 1;
            return;
        }

        const nextModel = ensureModelForProvider(normalized, currentConfig.model, currentConfig.customModels);
        updateConfig({ modelProvider: normalized, model: nextModel });
        console.log(`Model provider set to ${normalized}`);

        const needsKey = PROVIDERS[normalized].needsApiKey;
        if (needsKey && !currentConfig.apiKeys?.[normalized]) {
            console.warn(`No API key stored for ${normalized}. Run 'openbook api-key --provider ${normalized} <value>'.`);
        }
    });

program
    .command("model")
    .description("Get or set the default model identifier")
    .argument("[modelId]", "Model identifier (use 'list' to view available options)")
    .option("--custom", "Allow setting models outside the recommended list")
    .action((modelId: string | undefined, options: { custom?: boolean }) => {
        if (!modelId) {
            console.log(`Current model: ${currentConfig.model}`);
            listModelsForProvider(currentConfig.modelProvider);
            return;
        }

        const provider = currentConfig.modelProvider;
        const cfg = PROVIDERS[provider];

        if (modelId.toLowerCase() === "list") {
            listModelsForProvider(provider);
            return;
        }

        const allowImplicitCustom = provider === "ollama";
        const listed = cfg.models.includes(modelId);
        const isCustom = options.custom || (!listed && allowImplicitCustom);

        if (!listed && !isCustom) {
            console.error(`Model '${modelId}' is not in the supported list for ${provider}.`);
            listModelsForProvider(provider);
            console.log("Use '--custom' to force a custom identifier.");
            process.exitCode = 1;
            return;
        }

        const customPatch: Partial<Record<ProviderName, string>> = {};
        customPatch[provider] = isCustom ? modelId : "";

        updateConfig({ model: modelId, customModels: customPatch });
        console.log(`Model set to ${modelId}`);
    });

program
    .command("api-key")
    .description("Get or set the API key for the current provider")
    .argument("[value]", "API key value")
    .option("-p, --provider <name>", "Provider to configure")
    .option("--clear", "Remove the stored API key for the target provider")
    .action((value: string | undefined, options: { provider?: string; clear?: boolean }) => {
        const target = (options.provider ?? currentConfig.modelProvider).toLowerCase();
        if (!isValidProvider(target)) {
            console.error(`Unknown provider: ${target}`);
            console.log("Valid providers:");
            Object.keys(PROVIDERS).forEach((name) => console.log(`  • ${name}`));
            process.exitCode = 1;
            return;
        }

        if (options.clear) {
            const nextKeys = { ...currentConfig.apiKeys };
            delete nextKeys[target];
            updateConfig({ apiKeys: nextKeys });
            console.log(`API key for ${target} cleared.`);
            return;
        }

        if (!value) {
            const key = currentConfig.apiKeys?.[target];
            if (key) {
                console.log(`API key for ${target}: ${maskKey(key)}`);
            } else {
                console.log(`No API key stored for ${target}.`);
            }
            return;
        }

        updateConfig({ apiKeys: { ...currentConfig.apiKeys, [target]: value } });
        console.log(`API key for ${target} updated.`);
    });

program
    .command("web-search")
    .description("Get or set whether the model is allowed to perform web search")
    .argument("[state]", "Use 'on' to enable or 'off' to disable")
    .action((state?: string) => {
        if (!state) {
            console.log(`Web search is ${currentConfig.webSearchEnabled ? "enabled" : "disabled"}.`);
            return;
        }

        const normalized = state.toLowerCase();
        if (["on", "true", "yes", "1"].includes(normalized)) {
            updateConfig({ webSearchEnabled: true });
            console.log("Web search enabled.");
            return;
        }
        if (["off", "false", "no", "0"].includes(normalized)) {
            updateConfig({ webSearchEnabled: false });
            console.log("Web search disabled.");
            return;
        }
        throw new InvalidArgumentError("State must be 'on' or 'off'.");
    });

program
    .command("web-search-provider")
    .description("Get or set the web search provider (default: bing)")
    .argument("[name]", "Provider identifier")
    .action((name?: string) => {
        if (!name) {
            console.log(`Web search provider: ${currentConfig.webSearchProvider}`);
            return;
        }
        updateConfig({ webSearchProvider: name.toLowerCase() });
        console.log(`Web search provider set to ${name}`);
    });

program
    .command("web-search-results")
    .description("Get or set how many web results to include when web search is enabled")
    .argument("[count]", "Positive integer result count")
    .action((count?: string) => {
        if (!count) {
            console.log(`Web search results: ${currentConfig.webSearchResults}`);
            return;
        }
        const parsed = parsePositiveInt(count);
        updateConfig({ webSearchResults: parsed });
        console.log(`Web search results set to ${parsed}`);
    });

program
    .command("embedding-model")
    .description("Get or set the embedding model used for indexing/querying")
    .argument("[name]", "Ollama embedding model ID")
    .action((name?: string) => {
        if (!name) {
            console.log(`Current embedding model: ${currentConfig.embeddingModel}`);
            console.log("Set this to an Ollama model that supports embeddings (e.g., nomic-embed-text).");
            return;
        }

        updateConfig({ embeddingModel: name });
        console.log(`Embedding model set to ${name}. Re-run indexing to regenerate embeddings.`);
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

async function executeQuery(question: string): Promise<void> {
    const provider = currentConfig.modelProvider;
    const providerConfig = PROVIDERS[provider];
    if (!providerConfig) {
        console.error(`Unknown provider in config: ${provider}`);
        process.exitCode = 1;
        return;
    }

    const apiKey = currentConfig.apiKeys?.[provider];
    if (providerConfig.needsApiKey && !apiKey) {
        console.error(
            `No API key configured for ${provider}. Use 'openbook api-key --provider ${provider} <value>' to set one.`,
        );
        process.exitCode = 1;
        return;
    }

    const stopSpinner = startSpinner("Thinking");
    try {
        await runQuery({
            question,
            provider,
            model: currentConfig.model,
            apiKey,
            webSearchEnabled: currentConfig.webSearchEnabled,
            chunksPerQuery: currentConfig.chunksPerQuery,
            embeddingModel: currentConfig.embeddingModel,
            webSearchProvider: currentConfig.webSearchProvider,
            webSearchResults: currentConfig.webSearchResults,
            ragEnabled: currentConfig.ragEnabled,
        });
    } finally {
        stopSpinner();
    }
}

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
    currentConfig = applyConfigUpdate(currentConfig, partial);
}

function maskKey(key: string): string {
    if (key.length <= 6) {
        return "*".repeat(key.length);
    }
    return `${key.slice(0, 3)}***${key.slice(-3)}`;
}

function listModelsForProvider(provider: ProviderName): void {
    const cfg = PROVIDERS[provider];
    
    if (provider === "ollama") {
        // Special handling for Ollama
        console.log("Recommended models:");
        if (cfg.recommendedModels && cfg.recommendedModels.length > 0) {
            cfg.recommendedModels.forEach((m) => {
                const marker = currentConfig.model === m ? "*" : " ";
                console.log(` ${marker} ${m}`);
            });
        }
        console.log("");
        if (cfg.instructions) {
            console.log("Instructions:");
            cfg.instructions.split("\n").forEach((line) => {
                console.log(`  ${line}`);
            });
        }
        console.log("\n(Use --custom to set any model name. Visit https://ollama.com/library for all available models.)");
    } else {
        // Standard handling for other providers
        console.log("Available models:");
        cfg.models.forEach((m) => {
            const marker = currentConfig.model === m ? "*" : " ";
            console.log(` ${marker} ${m}`);
        });
        console.log("(Use --custom to set models outside this list.)");
    }
}

function ensureModelForProvider(
    provider: ProviderName,
    currentModel: string,
    customModels: Partial<Record<ProviderName, string>>,
): string {
    const cfg = PROVIDERS[provider];
    if (!cfg) {
        return currentModel;
    }
    const custom = customModels?.[provider];
    if (custom) {
        return custom;
    }
    if (provider === "ollama") {
        return currentModel || cfg.defaultModel;
    }
    return cfg.models.includes(currentModel) ? currentModel : cfg.defaultModel;
}

function startSpinner(label: string): () => void {
    if (!process.stdout.isTTY) {
        return () => {};
    }
    const frames = ["|", "/", "-", "\\"];
    let i = 0;
    const interval = setInterval(() => {
        const frame = frames[i = (i + 1) % frames.length];
        process.stdout.write(`\r${label} ${frame}`);
    }, 100);
    return () => {
        clearInterval(interval);
        process.stdout.write("\r" + " ".repeat(label.length + 2) + "\r");
    };
}

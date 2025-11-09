import fs from "fs";
import os from "os";
import path from "path";

import { ProviderName, PROVIDERS } from "./models/provider";

export interface OpenBookConfig {
    chunkSize: number;
    recursive: boolean;
    extensions: string[];
    modelProvider: ProviderName;
    model: string;
    apiKeys: Partial<Record<ProviderName, string>>;
    webSearchEnabled: boolean;
    chunksPerQuery: number;
    embeddingModel: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".openbook");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const DEFAULT_PROVIDER: ProviderName = "ollama";

const DEFAULT_CONFIG: OpenBookConfig = {
    chunkSize: 600,
    recursive: false,
    extensions: [".txt", ".md"],
    modelProvider: DEFAULT_PROVIDER,
    model: PROVIDERS[DEFAULT_PROVIDER].defaultModel,
    apiKeys: {},
    webSearchEnabled: false,
    chunksPerQuery: 5,
    embeddingModel: "nomic-embed-text",
};

function ensureConfigDir() : void {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

export function loadConfig(): OpenBookConfig {
    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            return { ...DEFAULT_CONFIG };
        }
        const data = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
        const config: OpenBookConfig = {
            chunkSize: typeof data.chunkSize === "number" ? data.chunkSize : DEFAULT_CONFIG.chunkSize,
            recursive: typeof data.recursive === "boolean" ? data.recursive : DEFAULT_CONFIG.recursive,
            extensions: Array.isArray(data.extensions) ? data.extensions : DEFAULT_CONFIG.extensions,
    modelProvider:
        typeof data.modelProvider === "string" && isProviderName(data.modelProvider)
            ? data.modelProvider
            : DEFAULT_CONFIG.modelProvider,
            model: typeof data.model === "string" ? data.model : undefined,
            apiKeys:
                data.apiKeys && typeof data.apiKeys === "object"
                    ? (data.apiKeys as Partial<Record<ProviderName, string>>)
                    : {},
            webSearchEnabled:
                typeof data.webSearchEnabled === "boolean"
                    ? data.webSearchEnabled
                    : DEFAULT_CONFIG.webSearchEnabled,
            chunksPerQuery:
                typeof data.chunksPerQuery === "number" && data.chunksPerQuery > 0
                    ? data.chunksPerQuery
                    : DEFAULT_CONFIG.chunksPerQuery,
            embeddingModel:
                typeof data.embeddingModel === "string" && data.embeddingModel.length > 0
                    ? data.embeddingModel
                    : DEFAULT_CONFIG.embeddingModel,
        };
        normalizeModel(config);
        return config;
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

export function saveConfig(config: OpenBookConfig): void {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

export function getDefaultConfig(): OpenBookConfig {
    return { ...DEFAULT_CONFIG };
}

function normalizeModel(config: OpenBookConfig): void {
    const provider = config.modelProvider;
    const providerCfg = PROVIDERS[provider];
    if (!providerCfg) {
        config.modelProvider = DEFAULT_PROVIDER;
        config.model = PROVIDERS[DEFAULT_PROVIDER].defaultModel;
        return;
    }

    if (!providerCfg.models.includes(config.model)) {
        config.model = providerCfg.defaultModel;
    }
}

function isProviderName(value: string): value is ProviderName {
    return Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

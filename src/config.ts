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
    customModels: Partial<Record<ProviderName, string>>;
    webSearchEnabled: boolean;
    chunksPerQuery: number;
    embeddingModel: string;
    webSearchProvider: string;
    webSearchResults: number;
    ragEnabled: boolean;
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
    customModels: {},
    webSearchEnabled: false,
    chunksPerQuery: 5,
    embeddingModel: "nomic-embed-text",
    webSearchProvider: "bing",
    webSearchResults: 3,
    ragEnabled: true,
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
            customModels:
                data.customModels && typeof data.customModels === "object"
                    ? sanitizeCustomModels(data.customModels)
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
            webSearchProvider:
                typeof data.webSearchProvider === "string" && data.webSearchProvider.length > 0
                    ? data.webSearchProvider
                    : DEFAULT_CONFIG.webSearchProvider,
            webSearchResults:
                typeof data.webSearchResults === "number" && data.webSearchResults > 0
                    ? data.webSearchResults
                    : DEFAULT_CONFIG.webSearchResults,
            ragEnabled:
                typeof data.ragEnabled === "boolean" ? data.ragEnabled : DEFAULT_CONFIG.ragEnabled,
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

export function applyConfigUpdate(
    base: OpenBookConfig,
    partial: Partial<OpenBookConfig>,
): OpenBookConfig {
    const next: OpenBookConfig = {
        ...base,
        ...partial,
        apiKeys: partial.apiKeys ? { ...base.apiKeys, ...partial.apiKeys } : base.apiKeys,
        customModels: partial.customModels
            ? mergeCustomModels(base.customModels, partial.customModels)
            : base.customModels,
    };
    normalizeModel(next);
    saveConfig(next);
    return next;
}

export function resetConfig(): OpenBookConfig {
    const defaults = getDefaultConfig();
    saveConfig(defaults);
    return defaults;
}

function normalizeModel(config: OpenBookConfig): void {
    const provider = config.modelProvider;
    const providerCfg = PROVIDERS[provider];
    if (!providerCfg) {
        config.modelProvider = DEFAULT_PROVIDER;
        config.model = PROVIDERS[DEFAULT_PROVIDER].defaultModel;
        return;
    }

    const custom = config.customModels?.[provider];
    if (custom) {
        config.model = custom;
        return;
    }

    if (!providerCfg.models.includes(config.model)) {
        config.model = providerCfg.defaultModel;
    }
}

function isProviderName(value: string): value is ProviderName {
    return Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

function mergeCustomModels(
    base: Partial<Record<ProviderName, string>>,
    patch: Partial<Record<ProviderName, string>>,
): Partial<Record<ProviderName, string>> {
    const next = { ...base };
    for (const [key, value] of Object.entries(patch)) {
        const name = key as ProviderName;
        if (!value) {
            delete next[name];
        } else {
            next[name] = value;
        }
    }
    return next;
}

function sanitizeCustomModels(raw: Record<string, unknown>): Partial<Record<ProviderName, string>> {
    const result: Partial<Record<ProviderName, string>> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (typeof value === "string" && isProviderName(key)) {
            result[key] = value;
        }
    }
    return result;
}

import fs from "fs";
import os from "os";
import path from "path";

export interface OpenBookConfig {
    chunkSize: number;
    recursive: boolean;
    extensions: string[];
    modelProvider: string;
    model: string;
    apiKey?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".openbook");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: OpenBookConfig = {
    chunkSize: 800,
    recursive: false,
    extensions: [".txt", ".md"],
    modelProvider: "openai",
    model: "gpt-4o-mini",
    apiKey: undefined,
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
        return {
            chunkSize: typeof data.chunkSize === "number" ? data.chunkSize : DEFAULT_CONFIG.chunkSize,
            recursive: typeof data.recursive === "boolean" ? data.recursive : DEFAULT_CONFIG.recursive,
            extensions: Array.isArray(data.extensions) ? data.extensions : DEFAULT_CONFIG.extensions,
            modelProvider: typeof data.modelProvider === "string" ? data.modelProvider : DEFAULT_CONFIG.modelProvider,
            model: typeof data.model === "string" ? data.model : DEFAULT_CONFIG.model,
            apiKey: typeof data.apiKey === "string" ? data.apiKey : undefined,
        };
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

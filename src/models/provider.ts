export type ProviderName = "ollama" | "openai" | "anthropic" | "google";

export interface ProviderConfig {
    name: ProviderName;
    supportsWebSearch: boolean;
    needsApiKey: boolean;
    description: string;
    models: string[];
    defaultModel: string;
}

export const PROVIDERS: Record<ProviderName, ProviderConfig> = {
    ollama: {
        name: "ollama",
        supportsWebSearch: false,
        needsApiKey: false,
        description: "Local Ollama models (run via ollama serve)",
        models: ["qwen3:1.7b", "llama3.1:8b", "mistral-nemo:12b"],
        defaultModel: "qwen3:1.7b",
    },
    openai: {
        name: "openai",
        supportsWebSearch: false,
        needsApiKey: true,
        description: "OpenAI API models (GPT-4o, GPT-4o-mini, etc.)",
        models: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"],
        defaultModel: "gpt-4o-mini",
    },
    anthropic: {
        name: "anthropic",
        supportsWebSearch: false,
        needsApiKey: true,
        description: "Anthropic Claude models",
        models: ["claude-3.5-sonnet", "claude-3-opus", "claude-3-haiku"],
        defaultModel: "claude-3.5-sonnet",
    },
    google: {
        name: "google",
        supportsWebSearch: false,
        needsApiKey: true,
        description: "Google Gemini models",
        models: ["gemini-2.0-pro-exp", "gemini-2.0-flash", "gemini-2.0-flash-lite"],
        defaultModel: "gemini-2.0-flash",
    },
};

export function isValidProvider(name: string): name is ProviderName {
    return Object.prototype.hasOwnProperty.call(PROVIDERS, name);
}

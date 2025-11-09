export type ProviderName = "ollama" | "openai" | "anthropic" | "google";

export interface ProviderConfig {
    name: ProviderName;
    supportsWebSearch: boolean;
    needsApiKey: boolean;
    description: string;
    models: string[];
    defaultModel: string;
    // Optional fields for Ollama
    recommendedModels?: string[];
    instructions?: string;
}

export const PROVIDERS: Record<ProviderName, ProviderConfig> = {
    ollama: {
        name: "ollama",
        supportsWebSearch: false,
        needsApiKey: false,
        description: "Local Ollama models (run via ollama serve)",
        models: [], // No fixed list - users can use any model
        defaultModel: "qwen3:1.7b",
        recommendedModels: ["qwen3:1.7b", "qwen2.5:7b", "mistral:7b", "phi3:3.8b"],
        instructions: "Pull models: ollama pull <model-name>\nServe models: ollama serve\nFor available models, visit: https://ollama.com/library",
    },
    openai: {
        name: "openai",
        supportsWebSearch: false,
        needsApiKey: true,
        description: "OpenAI API models (GPT-5, GPT-4o, etc.)",
        models: ["gpt-5", "gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini"],
        defaultModel: "gpt-5",
    },
    anthropic: {
        name: "anthropic",
        supportsWebSearch: false,
        needsApiKey: true,
        description: "Anthropic Claude models",
        models: ["claude-opus-4", "claude-sonnet-4", "claude-haiku-4.5", "claude-3-5-sonnet-20241022"],
        defaultModel: "claude-opus-4",
    },
    google: {
        name: "google",
        supportsWebSearch: false,
        needsApiKey: true,
        description: "Google Gemini models",
        models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro"],
        defaultModel: "gemini-2.5-pro",
    },
};

export function isValidProvider(name: string): name is ProviderName {
    return Object.prototype.hasOwnProperty.call(PROVIDERS, name);
}

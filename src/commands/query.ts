import { ProviderName } from "../models/provider";
import { getEmbedding } from "../embed/ollama";
import { searchChunks, StoredChunk } from "../retrieval/store";
import { performWebSearch, WebSnippet } from "../web/search";
import { getSystemPrompt } from "../prompt/systemPrompt";

export interface QueryContext {
    question: string;
    provider: ProviderName;
    model: string;
    apiKey?: string;
    webSearchEnabled: boolean;
    chunksPerQuery: number;
    embeddingModel?: string;
    webSearchProvider?: string;
    webSearchResults?: number;
    ragEnabled?: boolean;
}

export async function runQuery(context: QueryContext): Promise<void> {
    const {
        question,
        provider,
        model,
        apiKey,
        webSearchEnabled,
        chunksPerQuery,
        embeddingModel,
        webSearchProvider,
        webSearchResults,
    } = context as QueryContext & { webSearchProvider?: string; webSearchResults?: number };

    const queryEmbedding = await getEmbedding(question, embeddingModel);
    const contexts = context.ragEnabled === false ? [] : searchChunks(queryEmbedding, chunksPerQuery);
    const webSnippets = webSearchEnabled
        ? await safeWebSearch(question, webSearchProvider, webSearchResults ?? 3)
        : [];
    const prompt = buildPrompt(question, contexts, webSnippets, webSearchEnabled);

    try {
        const answer = await dispatchToProvider({ provider, model, prompt, apiKey });
        console.log("\nAnswer:\n" + answer + "\n");
        console.log("Context snippets:");
        contexts.forEach((ctx, idx) => {
            console.log(`  [Chunk ${idx + 1}] ${ctx.filePath}`);
        });
        if (webSnippets.length) {
            console.log("Web sources:");
            webSnippets.forEach((snippet, idx) => {
                console.log(`  [Web ${idx + 1}] ${snippet.url}`);
            });
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Query failed: ${error.message}`);
        } else {
            console.error("Query failed.", error);
        }
    }
}

interface ProviderRequest {
    provider: ProviderName;
    model: string;
    prompt: string;
    apiKey?: string;
}

async function dispatchToProvider({ provider, model, prompt, apiKey }: ProviderRequest): Promise<string> {
    switch (provider) {
        case "ollama":
            return queryOllama(model, prompt);
        case "openai":
            if (!apiKey) throw new Error("API key required for OpenAI.");
            return queryOpenAI(model, prompt, apiKey);
        case "anthropic":
            if (!apiKey) throw new Error("API key required for Anthropic.");
            return queryAnthropic(model, prompt, apiKey);
        case "google":
            if (!apiKey) throw new Error("API key required for Google Gemini.");
            return queryGemini(model, prompt, apiKey);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

async function queryOllama(model: string, prompt: string): Promise<string> {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, stream: false }),
    });

    if (!response.ok) {
        throw new Error(`Ollama request failed (${response.status}): ${await response.text()}`);
    }

    const data: any = await response.json();
    return data.response?.trim() ?? "<no response>";
}

async function queryOpenAI(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenAI request failed (${response.status}): ${await response.text()}`);
    }

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "<no response>";
}

async function queryAnthropic(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model,
            max_tokens: 512,
            messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!response.ok) {
        throw new Error(`Anthropic request failed (${response.status}): ${await response.text()}`);
    }

    const data: any = await response.json();
    const content = data.content?.[0]?.text ?? data.content?.[0]?.content;
    return (typeof content === "string" ? content : "<no response>").trim();
}

async function queryGemini(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
            }),
        },
    );

    if (!response.ok) {
        throw new Error(`Gemini request failed (${response.status}): ${await response.text()}`);
    }

    const data: any = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return (typeof text === "string" ? text : "<no response>").trim();
}

function buildPrompt(
    question: string,
    contexts: StoredChunk[],
    webSnippets: WebSnippet[],
    webSearchEnabled: boolean,
): string {
    const basePrompt = getSystemPrompt();
    const contextSection = contexts.length
        ? contexts
              .map((chunk, idx) => `Chunk ${idx + 1} (source: ${chunk.filePath}):\n${chunk.content}`)
              .join("\n\n")
        : "<none>";

    const webSection = webSnippets.length
        ? webSnippets
              .map((snippet, idx) => `Web ${idx + 1} (url: ${snippet.url}):\n${snippet.snippet || snippet.title}`)
              .join("\n\n")
        : webSearchEnabled
        ? "<search enabled but no additional results>"
        : "<web search disabled>";

    return [
        basePrompt.trim(),
        "## Session Context",
        `Local chunks:\n${contextSection}`,
        "",
        "## Web Results",
        webSection,
        "",
        "## Question",
        question,
    ].join("\n");
}

async function safeWebSearch(
    question: string,
    provider?: string,
    limit?: number,
): Promise<WebSnippet[]> {
    try {
        return await performWebSearch(question, {
            provider,
            limit,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Web search failed: ${message}`);
        return [];
    }
}

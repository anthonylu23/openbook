import fs from "fs";
import os from "os";
import path from "path";

import { ProviderName } from "../models/provider";
import { getEmbedding } from "../embed/ollama";

export interface QueryContext {
    question: string;
    provider: ProviderName;
    model: string;
    apiKey?: string;
    webSearchEnabled: boolean;
    chunksPerQuery: number;
    embeddingModel?: string;
}

const INDEX_FILE = path.join(os.homedir(), ".openbook", "chunks.jsonl");

export async function runQuery(context: QueryContext): Promise<void> {
    const { question, provider, model, apiKey, webSearchEnabled, chunksPerQuery, embeddingModel } = context;

    const queryEmbedding = await getEmbedding(question, embeddingModel);
    const contexts = loadTopChunks(queryEmbedding, chunksPerQuery);
    const prompt = buildPrompt(question, contexts, webSearchEnabled);

    try {
        const answer = await dispatchToProvider({ provider, model, prompt, apiKey });
        console.log("\nAnswer:\n" + answer + "\n");
        console.log("Context snippets:");
        contexts.forEach((ctx, idx) => {
            console.log(`  [${idx + 1}] ${ctx.filePath}`);
        });
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Query failed: ${error.message}`);
        } else {
            console.error("Query failed.", error);
        }
    }
}

interface StoredChunk {
    id: string;
    filePath: string;
    content: string;
    embedding: number[];
}

function loadTopChunks(queryEmbedding: number[], k: number): StoredChunk[] {
    if (!fs.existsSync(INDEX_FILE)) {
        return [];
    }

    const lines = fs.readFileSync(INDEX_FILE, "utf8").trim().split(/\n+/);
    const chunks: StoredChunk[] = [];
    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            if (parsed && parsed.content && parsed.filePath && Array.isArray(parsed.embedding)) {
                chunks.push({
                    id: parsed.id,
                    filePath: parsed.filePath,
                    content: parsed.content,
                    embedding: parsed.embedding,
                });
            }
        } catch {
            // ignore malformed lines
        }
    }

    const scored = chunks
        .map((chunk) => ({
            chunk,
            score: cosineSimilarity(queryEmbedding, chunk.embedding ?? []),
        }))
        .filter((entry) => Number.isFinite(entry.score))
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map((entry) => entry.chunk);

    if (scored.length === 0) {
        return chunks.slice(0, k);
    }

    return scored;
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || a.length !== b.length) {
        return 0;
    }
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) {
        return 0;
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
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

function buildPrompt(question: string, contexts: StoredChunk[], webSearchEnabled: boolean): string {
    const contextText = contexts
        .map((chunk, idx) => `Chunk ${idx + 1} (source: ${chunk.filePath}):\n${chunk.content}`)
        .join("\n\n");

    const instructions = contexts.length
        ? "Prefer the provided context snippets when answering, citing chunk numbers when relevant."
        : "No local context is available—answer based on general knowledge, and let the user know local context was missing.";

    const searchLine = webSearchEnabled
        ? "If the user explicitly asks for web search, note that the feature is not yet available."
        : "Web search is disabled for this session.";

    return [
        "You are OpenBook, a privacy-first assistant.",
        instructions,
        searchLine,
        contexts.length ? "\nContext:\n" + contextText : "\nContext: <none>",
        "\nQuestion: " + question,
        "\nAnswer clearly. If local context was missing, mention that fact.",
    ].join("\n");
}

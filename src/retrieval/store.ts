import fs from "fs";
import path from "path";
import os from "os";

import { getEmbedding } from "../embed/ollama";

export interface StoredChunk {
    id: string;
    filePath: string;
    content: string;
    metadata?: Record<string, unknown>;
    embedding: number[];
    chunkSize: number;
}

const STORE_DIR = path.join(os.homedir(), ".openbook");
const STORE_FILE = path.join(STORE_DIR, "chunks.jsonl");

export async function appendChunks(
    chunks: Omit<StoredChunk, "embedding">[],
    options: { embeddingModel?: string; onProgress?: (current: number, total: number) => void },
): Promise<void> {
    if (!chunks.length) {
        return;
    }
    await fs.promises.mkdir(STORE_DIR, { recursive: true });
    const lines: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await getEmbedding(chunk.content, options.embeddingModel);
        lines.push(JSON.stringify({ ...chunk, embedding }));
        options.onProgress?.(i + 1, chunks.length);
    }
    await fs.promises.appendFile(STORE_FILE, lines.join("\n") + "\n", "utf8");
}

export function searchChunks(queryEmbedding: number[], k: number): StoredChunk[] {
    if (!fs.existsSync(STORE_FILE)) {
        return [];
    }
    const raw = fs.readFileSync(STORE_FILE, "utf8").trim();
    if (!raw) {
        return [];
    }
    const chunks: StoredChunk[] = [];
    for (const line of raw.split(/\n+/)) {
        try {
            const parsed = JSON.parse(line);
            if (parsed && Array.isArray(parsed.embedding)) {
                chunks.push(parsed);
            }
        } catch {
            continue;
        }
    }
    const ranked = chunks
        .map((chunk) => ({ chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
        .filter((entry) => Number.isFinite(entry.score))
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map((entry) => entry.chunk);
    return ranked.length ? ranked : chunks.slice(0, k);
}

export function clearStore(): void {
    if (fs.existsSync(STORE_FILE)) {
        fs.unlinkSync(STORE_FILE);
    }
    if (fs.existsSync(STORE_DIR) && fs.readdirSync(STORE_DIR).length === 0) {
        fs.rmdirSync(STORE_DIR);
    }
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

import fs from "fs/promises";
import os from "os";
import path from "path";
import { getEmbedding } from "../embed/ollama";

export interface IndexDocumentsOptions {
    sourceDir: string;
    recursive?: boolean;
    chunkSize?: number;
    overlap?: number;
    allowedExtensions?: string[];
    embeddingModel?: string;
}

export interface FileRecord {
    path: string;
    content: string;
}

export interface ChunkRecord {
    id: string;
    filePath: string;
    content: string;
    metadata?: Record<string, unknown>;
}

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_OVERLAP = 150;

export async function indexDocuments(options: IndexDocumentsOptions): Promise<number> {
    const {
        sourceDir,
        recursive = false,
        chunkSize = DEFAULT_CHUNK_SIZE,
        overlap = DEFAULT_OVERLAP,
        allowedExtensions,
        embeddingModel,
    } = options;

    if (chunkSize <= 0) {
        throw new Error("`chunkSize` must be a positive integer.");
    }
    if (overlap < 0) {
        throw new Error("`overlap` cannot be negative.");
    }

    await validateSourceDirectory(sourceDir);

    const files = await gatherFiles(sourceDir, recursive, allowedExtensions);
    if (files.length === 0) {
        await notifyIndexerComplete(0);
        return 0;
    }

    const fileRecords = await readFiles(files);
    const chunks = chunkFiles(fileRecords, { chunkSize, overlap });

    await persistChunks(chunks, chunkSize, embeddingModel);
    await notifyIndexerComplete(chunks.length);
    return chunks.length;
}

async function validateSourceDirectory(directory: string): Promise<void> {
    const stats = await fs.stat(directory);
    if (!stats.isDirectory()) {
        throw new Error(`Expected a directory: ${directory}`);
    }
}

async function gatherFiles(
    directory: string,
    recursive: boolean,
    allowedExtensions?: string[],
): Promise<string[]> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    const normalizedAllowed = allowedExtensions?.map((ext) => ext.toLowerCase());

    await Promise.all(
        entries.map(async (entry) => {
            const fullPath = path.join(directory, entry.name);

            if (entry.name.startsWith(".")) {
                return;
            }

            if (entry.isDirectory()) {
                if (recursive) {
                    files.push(...(await gatherFiles(fullPath, recursive, normalizedAllowed)));
                }
                return;
            }

            if (!entry.isFile()) {
                return;
            }

            if (normalizedAllowed && normalizedAllowed.length > 0) {
                const ext = path.extname(entry.name).toLowerCase();
                if (!normalizedAllowed.includes(ext)) {
                    return;
                }
            }

            files.push(fullPath);
        }),
    );

    return files;
}

async function readFiles(files: string[]): Promise<FileRecord[]> {
    return Promise.all(
        files.map(async (filePath) => ({
            path: filePath,
            content: await fs.readFile(filePath, "utf8"),
        })),
    );
}

interface ChunkingConfig {
    chunkSize: number;
    overlap: number;
}

function chunkFiles(files: FileRecord[], config: ChunkingConfig): ChunkRecord[] {
    const chunks: ChunkRecord[] = [];

    for (const file of files) {
        const chunkList = chunkContent(file.content, config);
        chunkList.forEach((content, index) => {
            chunks.push({
                id: `${file.path}:${index}`,
                filePath: file.path,
                content,
                metadata: {
                    index: index,
                    totalChunks: chunkList.length,
                },
            });
        });
    }

    return chunks;
}

function chunkContent(rawContent: string, config: ChunkingConfig): string[] {
    const content = normalizeWhitespace(rawContent);
    if (!content) {
        return [];
    }

    const sentences = segmentText(content);
    const chunks: string[] = [];

    const { chunkSize, overlap } = config;
    let startIndex = 0;

    while (startIndex < sentences.length) {
        let endIndex = startIndex;
        let currentLength = 0;

        while (endIndex < sentences.length) {
            const sentence = sentences[endIndex];
            const sentenceLength = sentence.length;
            const nextLength = currentLength === 0 ? sentenceLength : currentLength + 1 + sentenceLength;

            if (currentLength > 0 && nextLength > chunkSize) {
                break;
            }

            if (currentLength === 0 && sentenceLength > chunkSize) {
                const longChunks = splitLongSegment(sentence, chunkSize, overlap);
                chunks.push(...longChunks);
                endIndex++;
                startIndex = endIndex;
                currentLength = 0;
                break;
            }

            currentLength = nextLength;
            endIndex++;
        }

        if (currentLength === 0) {
            continue;
        }

        const chunkText = sentences.slice(startIndex, endIndex).join(" ").trim();
        if (chunkText) {
            chunks.push(chunkText);
        }

        if (endIndex >= sentences.length) {
            break;
        }

        let newStart = endIndex;
        let overlapLength = 0;

        while (newStart > startIndex && overlapLength + sentences[newStart - 1].length <= overlap) {
            overlapLength += sentences[newStart - 1].length;
            newStart--;
        }

        if (newStart <= startIndex) {
            newStart = endIndex;
        }

        startIndex = newStart;
    }

    return chunks;
}

function normalizeWhitespace(value: string): string {
    return value
        .replace(/\r\n/g, "\n")
        .replace(/\t/g, " ")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function segmentText(content: string): string[] {
    const paragraphs = content.split(/\n{2,}/);
    const sentences: string[] = [];

    for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim();
        if (!trimmed) {
            continue;
        }

        const matches = trimmed.match(/[^.!?]+[.!?]*(?:\s+|$)/g);
        if (!matches) {
            sentences.push(trimmed);
            continue;
        }

        for (const match of matches) {
            const sentence = match.trim();
            if (sentence) {
                sentences.push(sentence);
            }
        }
    }

    return sentences;
}

function splitLongSegment(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end).trim());

        if (end >= text.length) {
            break;
        }

        const nextStart = Math.max(end - overlap, start + 1);
        start = nextStart;
    }

    return chunks.filter((chunk) => chunk.length > 0);
}

export const INDEX_DIR = path.join(os.homedir(), ".openbook");
export const INDEX_FILE = path.join(INDEX_DIR, "chunks.jsonl");

async function persistChunks(chunks: ChunkRecord[], chunkSize: number, embeddingModel?: string): Promise<void> {
    if (!chunks.length) {
        return;
    }

    await fs.mkdir(INDEX_DIR, { recursive: true });
    const lines: string[] = [];
    const total = chunks.length;
    if (process.stdout.isTTY) {
        renderProgress(0, total);
    } else {
        console.log(`Embedding ${total} chunks...`);
    }

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await getEmbedding(chunk.content, embeddingModel);
        lines.push(
            JSON.stringify({
                id: chunk.id,
                filePath: chunk.filePath,
                content: chunk.content,
                metadata: chunk.metadata,
                embedding,
                chunkSize,
            }),
        );

        if (process.stdout.isTTY) {
            renderProgress(i + 1, total);
        }
    }

    if (process.stdout.isTTY) {
        process.stdout.write("\n");
    }

    await fs.appendFile(INDEX_FILE, lines.join("\n") + "\n", "utf8");
}

async function notifyIndexerComplete(totalChunks: number): Promise<void> {
    // TODO: hook into CLI logger or event system.
    void totalChunks;
}

function renderProgress(current: number, total: number): void {
    const width = 24;
    const ratio = Math.min(current / total, 1);
    const filled = Math.round(ratio * width);
    const bar = "█".repeat(filled) + "░".repeat(width - filled);
    process.stdout.write(`\rEmbedding chunks [${bar}] ${current}/${total}`);
}

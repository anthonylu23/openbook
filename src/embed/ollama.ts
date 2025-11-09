const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const DEFAULT_MODEL = process.env.OPENBOOK_EMBED_MODEL ?? "nomic-embed-text";

export async function getEmbedding(text: string, modelOverride?: string): Promise<number[]> {
    const model = modelOverride ?? DEFAULT_MODEL;
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: text }),
    });

    if (!response.ok) {
        throw new Error(`Ollama embeddings failed (${response.status}): ${await response.text()}`);
    }

    const data: any = await response.json();
    if (!Array.isArray(data.embedding)) {
        throw new Error("Embedding response missing 'embedding' array");
    }
    return data.embedding as number[];
}

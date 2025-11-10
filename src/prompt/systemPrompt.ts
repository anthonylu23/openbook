import fs from "fs";
import path from "path";

let cachedPrompt: string | null = null;

function loadPrompt(): string {
    if (cachedPrompt) {
        return cachedPrompt;
    }
    const candidatePaths = [
        path.resolve(__dirname, "systemprompt.txt"),
        path.resolve(process.cwd(), "src/prompt/systemprompt.txt"),
    ];
    for (const candidate of candidatePaths) {
        try {
            cachedPrompt = fs.readFileSync(candidate, "utf8");
            return cachedPrompt;
        } catch {
            continue;
        }
    }
    console.warn("systemprompt.txt not found; using fallback instructions.");
    cachedPrompt = "You are OpenBook, a privacy-first assistant.";
    return cachedPrompt;
}

export function getSystemPrompt(): string {
    return loadPrompt();
}

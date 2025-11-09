import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
    try {
        const content = fs.readFileSync(envPath, "utf8");
        for (const line of content.split(/\r?\n/)) {
            if (!line || line.trim().startsWith("#")) continue;
            const idx = line.indexOf("=");
            if (idx === -1) continue;
            const key = line.slice(0, idx).trim();
            const value = line.slice(idx + 1).trim();
            if (key && !(key in process.env)) {
                process.env[key] = value;
            }
        }
    } catch (error) {
        console.warn("Failed to load .env:", error instanceof Error ? error.message : error);
    }
}

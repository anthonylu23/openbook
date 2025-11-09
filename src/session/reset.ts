import fs from "fs";
import path from "path";

import { getDefaultConfig, saveConfig } from "../config";
import { INDEX_DIR, INDEX_FILE } from "../commands/indexDocuments";

export function resetSession(): void {
    try {
        if (fs.existsSync(INDEX_FILE)) {
            fs.rmSync(INDEX_FILE);
        }
        if (fs.existsSync(INDEX_DIR) && fs.readdirSync(INDEX_DIR).length === 0) {
            fs.rmdirSync(INDEX_DIR);
        }
    } catch (error) {
        console.warn("Failed to clear chunk index:", error instanceof Error ? error.message : error);
    }

    try {
        const defaultConfig = getDefaultConfig();
        saveConfig(defaultConfig);
    } catch (error) {
        console.warn("Failed to reset config:", error instanceof Error ? error.message : error);
    }
}

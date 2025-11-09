import { resetConfig } from "../config";
import { clearStore } from "../retrieval/store";

export function resetSession(): void {
    try {
        clearStore();
    } catch (error) {
        console.warn("Failed to clear chunk index:", error instanceof Error ? error.message : error);
    }

    try {
        resetConfig();
    } catch (error) {
        console.warn("Failed to reset config:", error instanceof Error ? error.message : error);
    }
}

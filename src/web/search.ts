const DEFAULT_PROVIDER = "bing";
const DEFAULT_BING_ENDPOINT = "https://api.bing.microsoft.com/v7.0/search";
const DEFAULT_SERPER_ENDPOINT = "https://google.serper.dev/search";

export interface WebSnippet {
    title: string;
    url: string;
    snippet: string;
}

interface SearchOptions {
    provider?: string;
    limit?: number;
    apiKey?: string;
    endpoint?: string;
}

export async function performWebSearch(query: string, options: SearchOptions): Promise<WebSnippet[]> {
    const provider = (options.provider ?? DEFAULT_PROVIDER).toLowerCase();
    switch (provider) {
        case "bing":
            return bingSearch(query, options);
        case "serper":
            return serperSearch(query, options);
        default:
            throw new Error(`Unsupported web search provider: ${provider}`);
    }
}

async function bingSearch(query: string, options: SearchOptions): Promise<WebSnippet[]> {
    const limit = options.limit ?? 3;
    const key = options.apiKey ?? process.env.BING_SEARCH_KEY ?? process.env.AZURE_BING_KEY;
    if (!key) {
        throw new Error("Bing search key not set. Define BING_SEARCH_KEY or AZURE_BING_KEY.");
    }
    const endpoint = options.endpoint ?? process.env.BING_SEARCH_ENDPOINT ?? DEFAULT_BING_ENDPOINT;
    const url = new URL(endpoint);
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(limit));

    const response = await fetch(url, {
        headers: {
            "Ocp-Apim-Subscription-Key": key,
        },
    });
    if (!response.ok) {
        throw new Error(`Bing search failed (${response.status}): ${await response.text()}`);
    }
    const data: any = await response.json();
    const items: any[] = data.webPages?.value ?? [];
    return items.slice(0, limit).map((item) => ({
        title: item.name,
        url: item.url,
        snippet: item.snippet ?? item.description ?? "",
    }));
}

async function serperSearch(query: string, options: SearchOptions): Promise<WebSnippet[]> {
    const limit = options.limit ?? 3;
    const key = options.apiKey ?? process.env.SERPER_API_KEY;
    if (!key) {
        throw new Error("Serper API key not set. Define SERPER_API_KEY in your environment.");
    }
    const endpoint = options.endpoint ?? process.env.SERPER_ENDPOINT ?? DEFAULT_SERPER_ENDPOINT;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": key,
        },
        body: JSON.stringify({ q: query, num: limit }),
    });
    if (!response.ok) {
        throw new Error(`Serper search failed (${response.status}): ${await response.text()}`);
    }
    const data: any = await response.json();
    const items: any[] = data.organic ?? [];
    return items.slice(0, limit).map((item) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet ?? item.description ?? "",
    }));
}

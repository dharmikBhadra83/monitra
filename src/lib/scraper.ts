import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

/**
 * Uses LangChain's Cheerio loader to scrape a URL and return raw HTML.
 * This is a free alternative to paid services like Firecrawl.
 */
export async function scrapeUrl(url: string): Promise<string> {
    console.log(`[Scraper] Initializing LangChain extraction for: ${url}`);

    try {
        // Use LangChain's Cheerio loader to fetch and parse HTML
        const loader = new CheerioWebBaseLoader(url, {
            selector: 'body', // Focus on body content
        });

        const docs = await loader.load();

        // Get the raw HTML from the loader
        // The loader uses cheerio internally, so we can access the HTML
        let content = docs.map(d => d.pageContent)
            .join('\n')
            .replace(/\s+/g, ' ') // Collapse whitespace
            .trim();

        if (content.length < 250) {
            console.warn(`[Scraper] Content too short (${content.length} chars). Possible block.`);
            throw new Error("Insufficient content extracted.");
        }

        // Truncate to avoid massive token usage in LLM, while keeping enough context
        return content.substring(0, 15000);
    } catch (e: any) {
        console.error(`[Scraper] LangChain fetch failed for ${url}: ${e.message}`);
        throw new Error(`Failed to scrape ${url}: ${e.message}`);
    }
}

/**
 * Fetches raw HTML from a URL using fetch (free alternative).
 * Returns the HTML string for parsing with cheerio.
 */
export async function fetchHtml(url: string): Promise<string> {
    console.log(`[Scraper] Fetching HTML for: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        
        console.log("html", html.substring(0, 100));

        console.log(`[Scraper] HTML length: ${html.length}`);

        if (html.length < 250) {
            throw new Error("Insufficient content extracted.");
        }

        return html;
    } catch (e: any) {
        console.error(`[Scraper] Fetch failed for ${url}: ${e.message}`);
        throw new Error(`Failed to fetch HTML from ${url}: ${e.message}`);
    }
}


/**
 * Bulk scrape multiple URLs in parallel using the LangChain-based scraper.
 */
export async function scrapeUrls(urls: string[]): Promise<string[]> {
    return Promise.all(urls.map(url => scrapeUrl(url)));
}

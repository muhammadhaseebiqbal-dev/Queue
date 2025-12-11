import axios from 'axios';
import * as cheerio from 'cheerio';

export async function performSearch(query) {
    try {
        console.log(`Searching for: ${query}`);
        // Use html.duckduckgo.com for easier scraping (no JS required)
        const response = await axios.post('https://html.duckduckgo.com/html/',
            new URLSearchParams({ q: query }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        );

        const $ = cheerio.load(response.data);
        const results = [];

        // DuckDuckGo HTML structure usually has results in .result
        $('.result').each((i, element) => {
            if (i >= 5) return false; // Limit to top 5 results

            const title = $(element).find('.result__title a').first().text().trim();
            const link = $(element).find('.result__title a').first().attr('href');
            const snippet = $(element).find('.result__snippet').text().trim();
            const icon = `https://www.google.com/s2/favicons?domain=${new URL(link).hostname}&sz=32`;

            if (title && link && snippet) {
                results.push({
                    title,
                    link,
                    snippet,
                    icon
                });
            }
        });

        console.log(`Found ${results.length} results.`);
        return results;

    } catch (error) {
        console.error('Search error:', error.message);
        return [];
    }
}

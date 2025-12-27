import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'WhatsApp Chat with SAJID MEHMOOD TARIQ.txt');

async function analyze() {
    try {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const messages = [];
        const girlsContext = [];
        const mehmood76Context = [];
        const commonPhrases = new Map();

        // Potential girl names or keywords to flag context
        const girlKeywords = ['ajwa', 'dure fishan', 'bhabi', 'larki', 'girl', 'mam', 'miss', 'annie'];

        let prevLine = "";

        for await (const line of rl) {
            if (line.includes('SAJID MEHMOOD TARIQ:')) {
                const parts = line.split('SAJID MEHMOOD TARIQ:');
                if (parts.length > 1) {
                    const content = parts[1].trim();
                    if (content && content !== '<Media omitted>' && content !== 'This message was deleted') {
                        messages.push(content);

                        // Capture 76 Mehmood Context
                        if (content.toLowerCase().includes('76') || content.toLowerCase().includes('mehmood')) {
                            mehmood76Context.push(`[CONTEXT]: ${prevLine} -> [SAJID]: ${content}`);
                        }

                        // Capture Girl references
                        if (girlKeywords.some(k => content.toLowerCase().includes(k))) {
                            girlsContext.push(content);
                        }

                        // Simple phrase frequency (3+ words)
                        const words = content.split(' ');
                        if (words.length >= 3) {
                            const phrase = words.slice(0, 4).join(' ').toLowerCase();
                            commonPhrases.set(phrase, (commonPhrases.get(phrase) || 0) + 1);
                        }
                    }
                }
            } else if (line.includes('𝙷𝚊𝚜𝚎𝚎𝚋 𝙸𝚚𝚋𝚊𝚕:')) {
                const parts = line.split('𝙷𝚊𝚜𝚎𝚎𝚋 𝙸𝚚𝚋𝚊𝚕:');
                if (parts.length > 1) prevLine = parts[1].trim();
            }
        }

        console.log(`\n=== ADVANCED ANALYSIS ===`);

        console.log('\n--- "76 MEHMOOD" CONTEXT ---');
        mehmood76Context.forEach(c => console.log(c));

        console.log('\n--- GIRL REFERENCES / NAMES ---');
        const uniqueGirls = [...new Set(girlsContext)];
        uniqueGirls.slice(0, 20).forEach(g => console.log(g));

        console.log('\n--- FREQUENT PHRASES (Style) ---');
        const sortedPhrases = [...commonPhrases.entries()]
            .filter(([_, count]) => count > 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);

        sortedPhrases.forEach(([p, c]) => console.log(`${p} (${c})`));

    } catch (err) {
        console.error('Error:', err);
    }
}

analyze();

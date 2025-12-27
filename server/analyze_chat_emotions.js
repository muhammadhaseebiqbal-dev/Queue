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

        const happyContext = [];
        const angryContext = [];
        const wordCounts = new Map();

        // Keywords
        const happyKeywords = ['😂', '🤣', 'haha', 'shabash', 'love', 'hero', 'best', 'good', 'thek hy', 'sahi hy', 'mubarak', 'party'];
        const angryKeywords = ['lanat', 'kutti', 'sali', 'beghairat', 'ghussa', 'dimagh', 'chup', 'bakwas', 'sharam', 'jahil', 'pagal', 'pencho', 'aby saale'];

        // Stop words to ignore (common Urdu/English structure words)
        const stopWords = new Set(['hai', 'hy', 'ka', 'ki', 'ke', 'ko', 'mein', 'me', 'se', 'par', 'aur', 'to', 'ye', 'wo', 'is', 'us', 'kya', 'kyun', 'nahi', 'nai', 'na', 'han', 'haan', 'ok', 'oka', 'acha', 'bhai', 'yaar', 'assignment', 'media', 'omitted', 'message', 'deleted', 'this', 'was', 'you', 'i', 'the', 'a', 'and', 'to', 'of', 'in', 'it', 'is']);

        for await (const line of rl) {
            if (line.includes('SAJID MEHMOOD TARIQ:')) {
                const parts = line.split('SAJID MEHMOOD TARIQ:');
                if (parts.length > 1) {
                    let content = parts[1].trim();
                    if (content && content !== '<Media omitted>' && content !== 'This message was deleted') {
                        const lowerContent = content.toLowerCase();

                        // Detect Emotion
                        if (happyKeywords.some(k => lowerContent.includes(k))) {
                            happyContext.push(content);
                        } else if (angryKeywords.some(k => lowerContent.includes(k))) {
                            angryContext.push(content);
                        }

                        // Word Frequency
                        const words = lowerContent.split(/[\s,.]+/);
                        words.forEach(w => {
                            if (w.length > 2 && !stopWords.has(w) && isNaN(w)) {
                                wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
                            }
                        });
                    }
                }
            }
        }

        console.log(`\n=== EMOTION & VOCABULARY ANALYSIS ===`);

        console.log('\n--- HAPPY/CHILL MOMENTS (Top 10 Samples) ---');
        // Shuffle and pick 10
        happyContext.sort(() => 0.5 - Math.random()).slice(0, 10).forEach(m => console.log(`- ${m}`));

        console.log('\n--- ANGRY/ROAST MOMENTS (Top 10 Samples) ---');
        angryContext.sort(() => 0.5 - Math.random()).slice(0, 10).forEach(m => console.log(`- ${m}`));

        console.log('\n--- TOP 30 COMMON WORDS (Excluding Assignment/Stopwords) ---');
        const sortedWords = [...wordCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30);

        sortedWords.forEach(([word, count]) => {
            console.log(`${word}: ${count}`);
        });

    } catch (err) {
        console.error('Error:', err);
    }
}

analyze();

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
        // Expanded keyword list based on initial manual scan
        const keywords = ['behen', 'pencho', 'saale', 'aby', 'yaar', 'bhai', 'lanat', 'chutiya', 'gandu', 'loru', 'sali', 'kutti', 'beghairat', 'mama', 'papa', 'rehan', 'mushkil', 'jugad', 'assignment', 'quiz'];
        const triggers = new Map(); // Use Map to count frequency
        let count = 0;

        for await (const line of rl) {
            if (line.includes('SAJID MEHMOOD TARIQ:')) {
                const parts = line.split('SAJID MEHMOOD TARIQ:');
                if (parts.length > 1) {
                    const content = parts[1].trim();
                    if (content && content !== '<Media omitted>' && content !== 'This message was deleted' && !content.includes('security code')) {
                        messages.push(content);

                        keywords.forEach(k => {
                            if (content.toLowerCase().includes(k)) {
                                const current = triggers.get(k) || 0;
                                triggers.set(k, current + 1);
                            }
                        });
                        count++;
                    }
                }
            }
        }

        console.log(`\n=== ANALYSIS RESULT ===`);
        console.log(`Total Messages Scanned: ${count}`);

        console.log('\n--- TOP TRIGGERS (FREQUENCY) ---');
        // Sort by frequency
        const sortedTriggers = [...triggers.entries()].sort((a, b) => b[1] - a[1]);
        sortedTriggers.forEach(([word, freq]) => {
            console.log(`${word}: ${freq}`);
        });

        console.log('\n--- SAMPLE DIALOGUES (RANDOM 10) ---');
        for (let i = 0; i < 10; i++) {
            console.log(`- "${messages[Math.floor(Math.random() * messages.length)]}"`);
        }
        console.log(`=======================\n`);

    } catch (err) {
        console.error('Error:', err);
    }
}

analyze();

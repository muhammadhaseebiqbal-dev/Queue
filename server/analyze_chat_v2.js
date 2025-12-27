const fs = require('fs');
const readline = require('readline');
const path = require('path');

const filePath = path.join(__dirname, 'WhatsApp Chat with SAJID MEHMOOD TARIQ.txt');

async function analyze() {
    try {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const messages = [];
        const keywords = ['behen', 'pencho', 'saale', 'aby', 'yaar', 'bhai', 'lanat', 'chutiya', 'gandu', 'loru', 'sali', 'kutti', 'beghairat', 'mama', 'papa', 'rehan'];
        const triggers = new Set();
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
                                triggers.add(content);
                            }
                        });
                        count++;
                    }
                }
            }
        }

        console.log(`Total Messages: ${count}`);

        console.log('\n--- SAMPLE MESSAGES ---');
        for (let i = 0; i < 15; i++) {
            console.log(messages[Math.floor(Math.random() * messages.length)]);
        }

        console.log('\n--- KEYWORD MATCHES (TRIGGERS) ---');
        const triggerArray = Array.from(triggers);
        for (let i = 0; i < 15; i++) {
            if (triggerArray.length > 0) {
                console.log(triggerArray[Math.floor(Math.random() * triggerArray.length)]);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

analyze();

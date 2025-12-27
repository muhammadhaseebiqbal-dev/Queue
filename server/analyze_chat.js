const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'WhatsApp Chat with SAJID MEHMOOD TARIQ.txt');

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');

    const sajidMessages = [];
    const keywords = ['behen', 'pencho', 'saale', 'aby', 'yaar', 'bhai', 'lanat', 'chutiya', 'gandu', 'loru', 'sali', 'kutti', 'beghairat'];
    const triggers = [];

    lines.forEach(line => {
        if (line.includes('SAJID MEHMOOD TARIQ:')) {
            const content = line.split('SAJID MEHMOOD TARIQ:')[1].trim();
            if (content && content !== '<Media omitted>' && content !== 'This message was deleted') {
                sajidMessages.push(content);

                // Check for keywords/triggers
                if (keywords.some(k => content.toLowerCase().includes(k))) {
                    triggers.push(content);
                }
            }
        }
    });

    console.log(`Total Messages from Sajid: ${sajidMessages.length}`);
    console.log('--- Random Samples (Style Check) ---');
    for (let i = 0; i < 20; i++) {
        console.log(sajidMessages[Math.floor(Math.random() * sajidMessages.length)]);
    }

    console.log('\n--- Anger/Slang Triggers (Context) ---');
    // Get unique triggers, shuffle and pick 20
    const uniqueTriggers = [...new Set(triggers)];
    for (let i = 0; i < 20 && i < uniqueTriggers.length; i++) {
        console.log(uniqueTriggers[Math.floor(Math.random() * uniqueTriggers.length)]);
    }

    console.log('\n--- Longest Messages (For Depth) ---');
    const longMessages = sajidMessages.sort((a, b) => b.length - a.length).slice(0, 10);
    longMessages.forEach(m => console.log(m));

} catch (err) {
    console.error('Error reading file:', err);
}

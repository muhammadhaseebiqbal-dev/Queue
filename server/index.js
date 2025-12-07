import express from "express";
import dotenv from "dotenv";
import { Groq } from 'groq-sdk';
import cors from 'cors';

dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express()
app.use(cors());
app.use(express.json());

const messages = [
    {
        "role": "system",
        "content": "Hi, I am and open source GPT model."
    },
    {
        "role": "user",
        "content": "Introduce yourself."
    }
]

app.post('/prepareCompletion', (req, res) => {
    
})

app.get('/completion', async (req, res) => {
    const request = req.body
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();


    try {
        const chatCompletion = await groq.chat.completions.create({
            "messages": messages,
            "model": "openai/gpt-oss-120b",
            "temperature": 1,
            "max_completion_tokens": 8192,
            "top_p": 1,
            "stream": true,
            "reasoning_effort": "medium",
            "stop": null
        });

        for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || '';
            res.write(`data: ${content}\n\n`);
        }

        res.write("data:[Done]\n\n")
        res.end()
    } catch (error) {
        console.error(error)
        res.write(`data:[Error]\n\n`)
        res.end();
    }

})

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on http://localhost:${process.env.PORT}`);
});
import express from "express";
import dotenv from "dotenv";
import { Groq } from 'groq-sdk';

import cors from 'cors';

import { performSearch } from './utils/search.js';
import { detectSearchIntent } from './utils/intent.js';
import { getWeatherData } from './utils/weather.js';

import { parseFileContent } from './utils/fileParser.js';
import multer from 'multer';
import fs from 'fs'; // Required for Groq audio API (file stream) OR we can use buffer if SDK supports it? 
// Wait, user said "dont use fs to store file use only the memory record sound in memory and directly pass."
// Groq SDK `client.audio.transcriptions.create` expects a `file` argument which can be `(filename, buffer)`.
// So we don't need fs to write to disk, but might need it for types if TS, but this is JS.
// We need imports.

dotenv.config({ override: true });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


const app = express()
app.use(cors());
app.use(express.json({ limit: '100mb' })); // Increase limit for file uploads

const store = {};
const chatContexts = {}; // Store conversation contexts by userId
const deepMindSessions = {}; // Store DeepMind processing sessions

// Context size limits (in tokens approximately)
const MAX_CONTEXT_TOKENS = 4000;
const CONTEXT_WARNING_THRESHOLD = 3000;

// DeepMind: Helper to select random models (excludes non-Groq models like Gemini)
// DeepMind: Helper to select random models (excludes non-Groq models like Gemini and Vision models)
function selectRandomModels(count = 3, exclude = []) {
    const allModels = Object.keys(MODEL_CONFIGS).filter(m =>
        !exclude.includes(m) &&
        !MODEL_CONFIGS[m].provider && // Only send Groq models
        m !== 'llama-4-maverick' // Exclude Vision/Specialized models from general consensus
    );
    const shuffled = allModels.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

// DeepMind: Get completion from a model (non-streaming)
async function getModelCompletion(modelKey, messages) {
    const config = MODEL_CONFIGS[modelKey];
    const completion = await groq.chat.completions.create({
        messages: messages,
        model: config.model,
        temperature: config.temperature,
        max_completion_tokens: config.max_completion_tokens,
        top_p: config.top_p,
        stream: false,
        ...(config.reasoning_effort && { reasoning_effort: config.reasoning_effort })
    });
    return completion.choices[0]?.message?.content || '';
}

// Helper function to estimate token count (rough estimation: ~4 chars = 1 token)
function estimateTokenCount(text) {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / 4);
}

// Helper function to calculate total context size
function getContextSize(messages) {
    if (!messages || !Array.isArray(messages)) return 0;
    return messages.reduce((total, msg) => {
        return total + estimateTokenCount(msg?.content || '');
    }, 0);
}

// Helper function to summarize context using Groq
async function summarizeContext(messages, modelKey = 'llama-3.3-70b') {
    try {
        const config = MODEL_CONFIGS[modelKey];
        const conversationText = messages
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\\n\\n');

        const summaryCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that creates concise summaries of conversations. Preserve key information, decisions, and context.'
                },
                {
                    role: 'user',
                    content: `Please provide a concise summary of this conversation that preserves all important context and information:\\n\\n${conversationText}`
                }
            ],
            model: config.model,
            temperature: 0.3,
            max_completion_tokens: 500,
            stream: false
        });

        return summaryCompletion.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('Error summarizing context:', error);
        return '';
    }
}

// Save or update chat context
app.post('/context/save', (req, res) => {
    const { userId, messages } = req.body;

    if (!userId || !messages) {
        return res.status(400).json({ error: 'userId and messages are required' });
    }

    chatContexts[userId] = {
        messages: messages,
        lastUpdated: new Date().toISOString(),
        tokenCount: getContextSize(messages)
    };

    // Debug: Check if hiddenContent is being saved
    const hasHidden = messages.some(m => m.hiddenContent);
    if (hasHidden) console.log(`[Context Save] Saved context with hiddenContent for user ${userId.substring(0, 5)}...`);

    res.json({
        success: true,
        tokenCount: chatContexts[userId].tokenCount,
        needsSummarization: chatContexts[userId].tokenCount > CONTEXT_WARNING_THRESHOLD
    });
});

// Get chat context
app.get('/context/:userId', (req, res) => {
    const { userId } = req.params;
    const context = chatContexts[userId];

    if (!context) {
        return res.json({ messages: [], tokenCount: 0 });
    }

    res.json({
        messages: context.messages,
        tokenCount: context.tokenCount,
        lastUpdated: context.lastUpdated,
        needsSummarization: context.tokenCount > CONTEXT_WARNING_THRESHOLD
    });
});

// Delete chat context
app.delete('/context/:userId', (req, res) => {
    const { userId } = req.params;
    delete chatContexts[userId];
    res.json({ success: true });
});

// Model configurations
const MODEL_CONFIGS = {
    'gpt-oss-120b': {
        model: 'openai/gpt-oss-120b',
        temperature: 1,
        max_completion_tokens: 8192,
        top_p: 1,
        reasoning_effort: 'medium'
    },
    'qwen-3-32b': {
        model: 'qwen/qwen3-32b',
        temperature: 0.6,
        max_completion_tokens: 4096,
        top_p: 0.95,
        reasoning_effort: 'default'
    },
    'llama-3.3-70b': {
        model: 'llama-3.3-70b-versatile',
        temperature: 1,
        max_completion_tokens: 1024,
        top_p: 1
    },
    'kimi-k2': {
        model: 'moonshotai/kimi-k2-instruct-0905',
        temperature: 0.6,
        max_completion_tokens: 4096,
        top_p: 1
    },
    'llama-4-maverick': {
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        temperature: 1,
        max_completion_tokens: 1024,
        top_p: 1
    }

};

// Multer setup for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Endpoint: Speech-to-Text (Whisper)
app.post('/transcribe', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded.' });
        }

        console.log(`[Transcribe] Processing audio: ${req.file.originalname} (${req.file.size} bytes)`);

        // Groq expects a File-like object with specific structure
        // Create a proper file object from the buffer
        const transcription = await groq.audio.transcriptions.create({
            file: new File([req.file.buffer], req.file.originalname, {
                type: req.file.mimetype || 'audio/webm'
            }),
            model: "whisper-large-v3-turbo",
            temperature: 0,
            response_format: "verbose_json",
        });

        console.log(`[Transcribe] Success: "${transcription.text.substring(0, 50)}..."`);
        res.json({ text: transcription.text });

    } catch (error) {
        console.error('[Transcribe] Error:', error);
        res.status(500).json({ error: 'Transcription failed.', details: error.message });
    }
});

// Endpoint: List available models
app.get('/models', async (req, res) => {
    const models = Object.keys(MODEL_CONFIGS).map(key => ({
        id: key,
        name: key.toUpperCase().replace(/-/g, ' '),
        model: MODEL_CONFIGS[key].model
    }));
    res.json({ models });
});

app.post('/prepare-stream', async (req, res) => {
    const streamId = Date.now().toString() + Math.random().toString(36).substring(7);
    const { userId, messages } = req.body;

    // Get stored context and merge with current messages
    let contextMessages = messages || [];

    if (userId && chatContexts[userId]) {
        const storedContext = chatContexts[userId];
        const contextSize = storedContext.tokenCount;

        // If context is too large, summarize it first
        if (contextSize > MAX_CONTEXT_TOKENS) {
            console.log(`Context too large (${contextSize} tokens), summarizing...`);
            const summary = await summarizeContext(storedContext.messages);

            if (summary) {
                // Replace old context with summary
                contextMessages = [
                    {
                        role: 'system',
                        content: `Previous conversation summary: ${summary}`
                    },
                    ...messages.slice(-2) // Keep last 2 messages for immediate context
                ];
            }
        } else {
            // Use full context if within limits
            contextMessages = [...storedContext.messages, ...messages];
        }
    }

    store[streamId] = { ...req.body, messages: contextMessages };
    res.json({ streamId });
});

app.get('/stream/:id', async (req, res) => {
    const payload = store[req.params.id];

    if (!payload) {
        res.status(404).json({ error: 'Stream not found' });
        return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
        const messages = payload.messages || [
            {
                "role": "user",
                "content": payload.message
            }
        ];

        // Clean messages: remove frontend-only properties like 'streaming', 'model', etc.
        // Clean messages: remove frontend-only properties and ephemeral system messages
        const cleanedMessages = messages
            .filter(msg => {
                if (msg.role === 'user' || msg.role === 'assistant') return true;
                if (msg.role === 'system') {
                    if (msg.content.includes("[SEARCH RESULTS")) return false;
                    if (msg.content.includes("CURRENT WEATHER DATA")) return false;
                    return true;
                }
                return false; // Drop separator, deepmind-progress, etc.
            })
            .map(msg => ({
                role: msg.role,
                content: msg.hiddenContent || msg.content // Use hiddenContent if available (for full context)
            }));

        // Add system prompt for LaTeX rendering if not already present
        const hasSystemPrompt = cleanedMessages.some(msg => msg.role === 'system');
        let finalMessages = hasSystemPrompt
            ? cleanedMessages
            : [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant. When explaining mathematical concepts, formulas, equations, or physics problems, ALWAYS use LaTeX notation. Use inline LaTeX with single dollar signs $...$ for inline formulas and double dollar signs $$...$$ for display equations. For example: "The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$" or for display mode use $$E=mc^2$$. Always format mathematical expressions properly in LaTeX.'
                },
                ...cleanedMessages
            ];

        // Logic for Intelligent Search Routing
        let shouldSearch = false;
        let shouldWeather = false;
        let weatherLocation = null; // Declare here so it's accessible but request-scoped
        let modelKey = payload.model || 'llama-3.3-70b'; // Default model

        let attachmentContext = "";

        // Handle File Attachment
        if (payload.attachment) {
            // Case A: Image -> Switch to Vision Model
            if (payload.attachment.type.startsWith('image/')) {
                console.log("Attachment is Image - Switching to Vision Model (Llama-4 Maverick)");
                modelKey = 'llama-4-maverick';

                // Add Image to User Message (Groq Vision Format)
                const lastMsg = finalMessages[finalMessages.length - 1];
                if (lastMsg.role === 'user') {
                    lastMsg.content = [
                        { type: "text", text: lastMsg.content || "Analyze this image." },
                        { type: "image_url", image_url: { url: payload.attachment.content } }
                    ];
                }
            }
            // Case B: Document (PDF/Docs/CSV/Text) -> Parse and Inject Context
            else {
                console.log(`Attachment is Document (${payload.attachment.name}) - Parsing content...`);

                // Decode base64 buffer for parser
                const buffer = Buffer.from(payload.attachment.content.split(',')[1], 'base64');
                const parsedText = await parseFileContent({
                    buffer,
                    mimetype: payload.attachment.type,
                    originalname: payload.attachment.name
                });

                if (parsedText) {
                    attachmentContext = `\n\n---\n[ATTACHED FILE: ${payload.attachment.name}]\n${parsedText.slice(0, 50000)}\n---\n`; // Cap at 50k chars to be safe
                    console.log(`Parsed ${parsedText.length} chars from ${payload.attachment.name}`);
                }
            }
        }


        // Case 1: Explicit Web Search Enabled (Force GPT-OSS-120B)
        if (payload.isWebSearchEnabled) {
            console.log("Explicit Web Search Enabled - Forcing gpt-oss-120b");
            shouldSearch = true;
            modelKey = 'gpt-oss-120b'; // Force model override
        }
        // Case 2: Intelligent Auto-Detection (If DeepMind is OFF and Explicit is OFF)
        else if (!payload.isDeepMindEnabled) {
            // Check for intent (Pass full message history for context)
            const intentData = await detectSearchIntent(payload.messages || payload.message || finalMessages[finalMessages.length - 1].content);
            const intent = intentData.category;

            if (intent === "SEARCH") {
                console.log("Intent: SEARCH - Enabling Auto-Search");
                shouldSearch = true;
                res.write(`data: ${JSON.stringify({ type: 'search_start', isAuto: true })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'search_progress', message: "Thinking..." })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'search_progress', message: "I think this needs real-time info. Searching..." })}\n\n`);
            } else if (intent === "WEATHER") {
                console.log(`Intent: WEATHER - Fetching Weather Data for ${intentData.location}`);
                shouldWeather = true;
                res.write(`data: ${JSON.stringify({ type: 'search_start', isAuto: true })}\n\n`); // Reuse start event for UI badge
                res.write(`data: ${JSON.stringify({ type: 'search_progress', message: `Checking forecast for ${intentData.location}...` })}\n\n`);

                // Pass the extracted location, not the full query
                weatherLocation = intentData.location;
                console.log(`Intent: WEATHER - Location: ${weatherLocation}`);
            } else if (intent === "IMAGE") {
                console.log(`Intent: IMAGE - Raw Prompt: ${intentData.image_prompt}`);

                res.write(`data: ${JSON.stringify({ type: 'search_start', isAuto: true })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'search_progress', message: "Enhancing prompt..." })}\n\n`);

                // 1. Enhance the prompt using the selected model (or a fast one)
                let enhancedPrompt = intentData.image_prompt;
                try {
                    const enhancementCompletion = await groq.chat.completions.create({
                        messages: [
                            {
                                role: "system",
                                content: "You are an expert AI image prompt engineer. Your task is to take a basic image description and rewrite it into a highly detailed, artistic, and effective prompt for an image generation model (like Flux or Midjourney). Focus on lighting, texture, composition, and style. RETURN ONLY THE ENHANCED PROMPT TEXT. NO PREAMBLE."
                            },
                            {
                                role: "user",
                                content: `Enhance this prompt: "${intentData.image_prompt}"`
                            }
                        ],
                        model: payload.model || "llama-3.1-70b-versatile",
                        temperature: 0.7,
                        max_completion_tokens: 200,
                    });
                    enhancedPrompt = enhancementCompletion.choices[0]?.message?.content?.trim() || intentData.image_prompt;
                    console.log(`Intent: IMAGE - Enhanced Prompt: ${enhancedPrompt}`);
                } catch (err) {
                    console.error("Prompt enhancement failed, using raw prompt:", err);
                }

                res.write(`data: ${JSON.stringify({ type: 'search_progress', message: "Generating image..." })}\n\n`);

                // 2. Construct Pollinations URL with Enhanced Prompt
                const finalPrompt = enhancedPrompt;
                // Use model 'flux-realism' for high quality results as requested
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&nologo=true&model=flux-realism`;

                // 3. Send Image Event
                res.write(`data: ${JSON.stringify({
                    type: 'image_generated',
                    url: imageUrl,
                    prompt: finalPrompt,
                    rawPrompt: intentData.image_prompt
                })}\n\n`);

                // 4. Send the ENHANCED PROMPT as content (hidden in UI) so future turns know what was generated
                res.write(`data: ${JSON.stringify({
                    type: 'content',
                    content: `Generated image: ${finalPrompt}`
                })}\n\n`);

                res.write(`data: [DONE]\n\n`);
                res.end();
                delete store[req.params.id];
                return; // Stop further processing
            }
        }

        // <<< INJECT ATTACHMENT CONTEXT >>>
        if (attachmentContext) {
            console.log("Injecting Attachment Context...");

            // Send event to frontend to update persistent state
            res.write(`data: ${JSON.stringify({ type: 'attachment_processed', content: attachmentContext })}\n\n`);

            // Append to the last user message
            const lastMsg = finalMessages[finalMessages.length - 1];
            if (lastMsg.role === 'user') {
                lastMsg.content += attachmentContext;

                // <<< PERSISTENCE FIX >>>
                // Also update the persistent store so this context is saved for future turns
                if (payload.messages && payload.messages.length > 0) {
                    const persistentLastMsg = payload.messages[payload.messages.length - 1];
                    if (persistentLastMsg.role === 'user') {
                        persistentLastMsg.content = lastMsg.content; // Sync content
                    }
                }
            } else {
                // Should not happen if history is correct, but safe fallback
                finalMessages.push({ role: 'user', content: attachmentContext });
            }
        }

        // Execute Weather Strategy
        if (shouldWeather) {
            const queryLocation = weatherLocation || payload.message || finalMessages[finalMessages.length - 1].content;
            const weatherData = await getWeatherData(queryLocation);

            if (weatherData) {
                // Stream structured data for UI Card
                res.write(`data: ${JSON.stringify({ type: 'weather_data', data: weatherData })}\n\n`);

                // Construct context for LLM
                const weatherContext = `
                CURRENT WEATHER DATA for ${weatherData.location.name}, ${weatherData.location.country}:
                - Condition Code: ${weatherData.current.weather_code}
                - Temperature: ${weatherData.current.temperature}°C
                - Feels Like: ${weatherData.current.feels_like}°C
                - Humidity: ${weatherData.current.humidity}%
                - Wind Speed: ${weatherData.current.wind_speed} km/h
                
                FORECAST:
                ${weatherData.daily.map(d => `- ${d.date}: Max ${d.temp_max}°C, Min ${d.temp_min}°C`).join('\n')}
                
                INSTRUCTIONS:
                - Present the weather in a friendly, conversational way.
                - Mention the current condition and specifically the "feels like" temp if different.
                - Give a quick summary of the upcoming forecast.
                `;

                // Insert context
                const systemContextMsg = {
                    role: 'system',
                    content: weatherContext
                };
                finalMessages.splice(finalMessages.length - 1, 0, systemContextMsg);
                res.write(`data: ${JSON.stringify({ type: 'search_progress', message: "Weather data acquired." })}\n\n`);

            } else {
                res.write(`data: ${JSON.stringify({ type: 'search_progress', message: "Could not find weather location." })}\n\n`);
            }
        }

        // Execute Search Strategy
        if (shouldSearch) {
            const userQuery = payload.message || finalMessages[finalMessages.length - 1].content;

            // If explicit, we trigger the start event now (Auto already did above)
            if (payload.isWebSearchEnabled) {
                res.write(`data: ${JSON.stringify({ type: 'search_start' })}\n\n`);
            }

            res.write(`data: ${JSON.stringify({ type: 'search_progress', message: `Searching for: "${userQuery.substring(0, 30)}..."` })}\n\n`);

            const searchResults = await performSearch(userQuery);

            if (searchResults && searchResults.length > 0) {
                res.write(`data: ${JSON.stringify({ type: 'search_progress', message: `Found ${searchResults.length} sources` })}\n\n`);

                // Stream sources to frontend
                for (const source of searchResults) {
                    res.write(`data: ${JSON.stringify({ type: 'search_source', source })}\n\n`);
                }

                // Construct search context
                const searchContext = searchResults.map((r, i) =>
                    `Source ${i + 1} (${r.title}): ${r.snippet}\nURL: ${r.link}`
                ).join('\n\n');

                // Insert search context as a specialized ephemeral system message
                const systemContextMsg = {
                    role: 'system',
                    content: `[SEARCH RESULTS for "${userQuery}"]\nHere is real-time information from the web to help answer the user's question:\n\n${searchContext}\n\nIMPORTANT: Use this information ONLY for the current query. Do NOT assume this context applies to future unrelated queries.\n\n[END SEARCH RESULTS]`
                };

                // Insert search context before the last user message
                finalMessages.splice(finalMessages.length - 1, 0, systemContextMsg);

            } else {
                res.write(`data: ${JSON.stringify({ type: 'search_progress', message: "No relevant results found." })}\n\n`);
            }
        }

        // Get model config
        const config = MODEL_CONFIGS[modelKey] || MODEL_CONFIGS['llama-3.3-70b'];

        // Use Groq for all models
        const chatCompletion = await groq.chat.completions.create({
            messages: finalMessages,
            model: config.model,
            temperature: config.temperature,
            max_completion_tokens: config.max_completion_tokens,
            top_p: config.top_p,
            stream: true,
            stop: null,
            ...(config.reasoning_effort && { reasoning_effort: config.reasoning_effort })
        });

        for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

        // Clean up store
        delete store[req.params.id];
    } catch (error) {
        console.error(error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
        delete store[req.params.id];
    }
});

// DeepMind: Prepare multi-model consensus query
app.post('/deepmind/prepare', async (req, res) => {
    const sessionId = Date.now().toString() + Math.random().toString(36).substring(7);
    const { userId, messages, message } = req.body;

    // Handle both 'message' (single) and 'messages' (array) parameters
    let contextMessages = [];
    if (message) {
        contextMessages = [{ role: 'user', content: message }];
    } else if (messages) {
        contextMessages = messages;
    }

    if (userId && chatContexts[userId]) {
        const storedContext = chatContexts[userId];
        const contextSize = storedContext.tokenCount;

        if (contextSize > MAX_CONTEXT_TOKENS) {
            console.log(`Context too large (${contextSize} tokens), summarizing...`);
            const summary = await summarizeContext(storedContext.messages);

            if (summary) {
                contextMessages = [
                    {
                        role: 'system',
                        content: `Previous conversation summary: ${summary}`
                    },
                    ...contextMessages.slice(-2)
                ];
            }
        } else {
            contextMessages = [...storedContext.messages, ...contextMessages];
        }
    }

    // Clean messages for storage - Remove ephemeral system messages (Search Results, Weather)
    const cleanedMessages = contextMessages
        .filter(msg => {
            // Keep User and Assistant messages
            if (msg.role === 'user' || msg.role === 'assistant') return true;
            // Keep System messages ONLY if they are the original system prompt (usually index 0)
            // or specific persistent instructions.
            // DROP "SEARCH RESULTS" and "CURRENT WEATHER DATA"
            if (msg.role === 'system') {
                if (msg.content.includes("[SEARCH RESULTS")) return false;
                if (msg.content.includes("CURRENT WEATHER DATA")) return false;
                return true;
            }
            return false; // Strict filter: Drop everything else (deepmind-progress, separator, etc.)
        })
        .map(msg => ({
            role: msg.role,
            content: msg.content
        }));

    // Pre-select phase 1 models
    const phase1Models = selectRandomModels(3);

    deepMindSessions[sessionId] = {
        messages: cleanedMessages,
        phase: 0,
        phase1Models: phase1Models,
        phase1Responses: [],
        phase2Models: [],
        phase2Responses: [],
        finalResponse: ''
    };

    res.json({ sessionId, session: deepMindSessions[sessionId] });
});

// DeepMind: Stream multi-phase processing
app.get('/deepmind/stream/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = deepMindSessions[sessionId];

    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
        // Add system prompt if needed
        const hasSystemPrompt = session.messages.some(msg => msg.role === 'system');
        const finalMessages = hasSystemPrompt
            ? session.messages
            : [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant. When explaining mathematical concepts, formulas, equations, or physics problems, ALWAYS use LaTeX notation. Use inline LaTeX with single dollar signs $...$ for inline formulas and double dollar signs $$...$$ for display equations.'
                },
                ...session.messages
            ];

        // PHASE 0.5: Research (Gathering Resources)
        // Check if we need external info before starting the debate
        const originalUserMsg = session.messages.find(m => m.role === 'user');
        const intentData = await detectSearchIntent(originalUserMsg?.content || "");

        if (intentData.category === "SEARCH") {
            session.phase = 0.5;
            res.write(`data: ${JSON.stringify({ type: 'phase', phase: 0.5, message: "Gathering resources..." })}\n\n`);

            // Perform search
            const searchResults = await performSearch(originalUserMsg.content);
            const searchContext = searchResults.map(r => `[${r.title}](${r.link}): ${r.snippet}`).join('\n\n');

            // Inject ephemeral search context
            const researchContextMsg = {
                role: 'system',
                content: `[SEARCH RESULTS for "${originalUserMsg.content}"]\nHere is real-time information to help answer the user's question:\n\n${searchContext}\n\nIMPORTANT: Use this information ONLY for the current query.\n[END SEARCH RESULTS]`
            };

            // Inject into finalMessages for the models to see
            // We insert it after the system prompt (index 1) or at the beginning if no system prompt
            if (finalMessages[0].role === 'system') {
                finalMessages.splice(1, 0, researchContextMsg);
            } else {
                finalMessages.unshift(researchContextMsg);
            }
            res.write(`data: ${JSON.stringify({ type: 'research_complete', results: searchResults.length })}\n\n`);
        }

        // PHASE 1: Query 2 random models (Parallel Execution)
        session.phase = 1;
        session.phase1Models = selectRandomModels(2);
        res.write(`data: ${JSON.stringify({ type: 'phase', phase: 1, models: session.phase1Models })}\n\n`);

        // Execute Phase 1 models in parallel
        await Promise.all(session.phase1Models.map(async (modelKey) => {
            const response = await getModelCompletion(modelKey, finalMessages);
            session.phase1Responses.push({ model: modelKey, response });
            res.write(`data: ${JSON.stringify({ type: 'phase1_complete', model: modelKey, response })}\n\n`);
        }));

        // PHASE 2: Send phase 1 responses to 3 different models for validation
        session.phase = 2;
        // Get all unused models first, then add one from phase 1 if we need more
        const unusedModels = Object.keys(MODEL_CONFIGS).filter(m => !session.phase1Models.includes(m));
        session.phase2Models = unusedModels.length >= 3
            ? selectRandomModels(3, session.phase1Models)
            : [...unusedModels, session.phase1Models[0]]; // Add one phase1 model if needed
        res.write(`data: ${JSON.stringify({ type: 'phase', phase: 2, models: session.phase2Models })}\n\n`);

        // Create individual prompts for each phase2 model to validate specific phase1 responses
        for (let i = 0; i < session.phase2Models.length; i++) {
            const modelKey = session.phase2Models[i];

            // Give each validator a concise view of phase 1 responses
            const phase2Prompt = `Analyze these AI responses and provide a comprehensive answer:

${session.phase1Responses.map((r, idx) => `${idx + 1}. ${r.response.substring(0, 1500)}${r.response.length > 1500 ? '...' : ''}`).join('\n\n')}

Provide your own well-reasoned answer synthesizing the best insights.`;

            const phase2Messages = [
                ...finalMessages.slice(-2), // Only use last 2 messages to save tokens
                { role: 'assistant', content: phase2Prompt }
            ];

            const response = await getModelCompletion(modelKey, phase2Messages);
            session.phase2Responses.push({ model: modelKey, response });
            res.write(`data: ${JSON.stringify({ type: 'phase2_complete', model: modelKey, response })}\n\n`);
        }

        // PHASE 3: GPT-OSS synthesizes final answer
        session.phase = 3;
        res.write(`data: ${JSON.stringify({ type: 'phase', phase: 3, models: ['gpt-oss-120b'] })}\n\n`);

        // Send phase3_start signal immediately to show UI progress
        res.write(`data: ${JSON.stringify({ type: 'phase3_start' })}\n\n`);

        // Use concise synthesis prompt with truncated responses to stay under token limit
        const synthesisPrompt = `Synthesize this into a final comprehensive answer:

${session.phase2Responses.map((r, i) => `${i + 1}. ${r.response.substring(0, 1200)}${r.response.length > 1200 ? '...' : ''}`).join('\n\n')}

Provide the final answer incorporating the best insights.`;

        // Use only the original user query + synthesis prompt to minimize tokens
        const originalUserMessage = finalMessages.find(m => m.role === 'user');
        const synthesisMessages = [
            {
                role: 'system',
                content: 'You are a helpful AI assistant. Synthesize multiple expert analyses into a clear, comprehensive answer.'
            },
            originalUserMessage || finalMessages[finalMessages.length - 1],
            { role: 'assistant', content: synthesisPrompt }
        ];

        // Stream the final synthesis - send initial content event to start streaming UI immediately
        res.write(`data: ${JSON.stringify({ type: 'content', content: '' })}\n\n`);

        const config = MODEL_CONFIGS['gpt-oss-120b'];
        const finalCompletion = await groq.chat.completions.create({
            messages: synthesisMessages,
            model: config.model,
            temperature: config.temperature,
            max_completion_tokens: config.max_completion_tokens,
            top_p: config.top_p,
            stream: true,
            ...(config.reasoning_effort && { reasoning_effort: config.reasoning_effort })
        });

        for await (const chunk of finalCompletion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                session.finalResponse += content;
                res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
            }
        }

        res.write(`data: ${JSON.stringify({ type: 'done', done: true })}\n\n`);
        res.end();

        // Clean up
        delete deepMindSessions[sessionId];
    } catch (error) {
        console.error('DeepMind error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
        delete deepMindSessions[sessionId];
    }
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on http://localhost:${process.env.PORT}`);
});
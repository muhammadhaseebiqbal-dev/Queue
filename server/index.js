import express from "express";
import dotenv from "dotenv";
import { Groq } from 'groq-sdk';

import cors from 'cors';

import { performSearch } from './utils/search.js';
import { detectSearchIntent } from './utils/intent.js';
import { getWeatherData } from './utils/weather.js';

dotenv.config({ override: true });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


const app = express()
app.use(cors());
app.use(express.json());

const store = {};
const chatContexts = {}; // Store conversation contexts by userId
const deepMindSessions = {}; // Store DeepMind processing sessions

// Context size limits (in tokens approximately)
const MAX_CONTEXT_TOKENS = 4000;
const CONTEXT_WARNING_THRESHOLD = 3000;

// DeepMind: Helper to select random models (excludes non-Groq models like Gemini)
function selectRandomModels(count = 3, exclude = []) {
    const allModels = Object.keys(MODEL_CONFIGS).filter(m =>
        !exclude.includes(m) && !MODEL_CONFIGS[m].provider // Only include Groq models
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

};

// Get available models endpoint
app.get('/models', (req, res) => {
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
        const cleanedMessages = messages
            .filter(msg => msg.role !== 'separator') // Remove separator messages
            .map(msg => ({
                role: msg.role,
                content: msg.content
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
        let modelKey = payload.model || 'llama-3.3-70b'; // Default model

        // Case 1: Explicit Web Search Enabled (Force GPT-OSS-120B)
        if (payload.isWebSearchEnabled) {
            console.log("Explicit Web Search Enabled - Forcing gpt-oss-120b");
            shouldSearch = true;
            modelKey = 'gpt-oss-120b'; // Force model override
        }
        // Case 2: Intelligent Auto-Detection (If DeepMind is OFF and Explicit is OFF)
        else if (!payload.isDeepMindEnabled) {
            // Check for intent (Returns { category, location })
            const intentData = await detectSearchIntent(payload.message || finalMessages[finalMessages.length - 1].content);
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
                var weatherLocation = intentData.location;
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

                const systemContextMsg = {
                    role: 'system',
                    content: `Here is real-time information from the web to help answer the user's question:\n\n${searchContext}\n\nPlease use this information to provide an up-to-date and accurate answer. Cite your sources if relevant.`
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

    // Clean messages
    const cleanedMessages = contextMessages
        .filter(msg => msg.role !== 'separator' && msg.role !== 'deepmind-progress')
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

        // PHASE 1: Query 2 random models
        session.phase = 1;
        session.phase1Models = selectRandomModels(2);
        res.write(`data: ${JSON.stringify({ type: 'phase', phase: 1, models: session.phase1Models })}\n\n`);

        for (const modelKey of session.phase1Models) {
            const response = await getModelCompletion(modelKey, finalMessages);
            session.phase1Responses.push({ model: modelKey, response });
            res.write(`data: ${JSON.stringify({ type: 'phase1_complete', model: modelKey, response })}\n\n`);
        }

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
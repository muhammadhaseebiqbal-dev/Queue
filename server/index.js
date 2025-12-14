import express from "express";
import dotenv from "dotenv";
import { Groq } from 'groq-sdk';

import cors from 'cors';

import { performSearch } from './utils/search.js';
import { detectSearchIntent } from './utils/intent.js';
import { getWeatherData } from './utils/weather.js';

import { parseFileContent } from './utils/fileParser.js';
import { connectDB, Project, Session, Message, User, isConnected } from './models.js'; // Import Models
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { authMiddleware } from './middleware/auth.js';
import multer from 'multer';
import fs from 'fs';

dotenv.config({ override: true });
connectDB(); // Initialize DB

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

// Cloudinary Helper (Dynamic Import)
async function uploadToCloudinary(base64OrUrl) {
    // Check if configuration exists
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
        return null;
    }

    try {
        const cloudinary = await import('cloudinary');
        cloudinary.v2.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        console.log('[Cloudinary] Uploading image...');
        const result = await cloudinary.v2.uploader.upload(base64OrUrl, {
            folder: 'queuebot_uploads',
            resource_type: 'auto'
        });
        console.log(`[Cloudinary] Upload success: ${result.secure_url}`);
        return result.secure_url;
    } catch (error) {
        console.warn("[Cloudinary] Upload failed:", error.message);
        return null; // Fallback
    }
}

// In-Memory Storage (Fallback when DB is disconnected)
const memorySessions = [];
const memoryProjects = [];

// Helper to update memory session
function updateMemorySession(userId, sessionId, messages) {
    const sessionIndex = memorySessions.findIndex(s => s._id === sessionId);
    const existing = sessionIndex >= 0 ? memorySessions[sessionIndex] : null;

    // Generate Title from first user message
    const firstUserMsg = messages.find(m => m.role === 'user');
    const title = firstUserMsg ? firstUserMsg.content.substring(0, 30) : 'New Chat';
    const preview = messages[messages.length - 1]?.content.substring(0, 50) || '...';

    if (existing) {
        memorySessions[sessionIndex] = {
            ...existing,
            title: existing.title === 'New Chat' ? title : existing.title, // Update title if it was generic
            preview,
            updatedAt: new Date(),
            messages: messages // Keep messages in memory for retrieval
        };
    } else {
        // Create new if not found (should be rare if created via API, but good for safety)
        memorySessions.push({
            _id: sessionId || `mem_${Date.now()}`,
            userId,
            title,
            preview,
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: messages,
            isArchived: false,
            model: 'llama-3.3-70b'
        });
    }
}

// DeepMind: Helper to select random models (excludes non-Groq models like Gemini)
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
app.post('/context/save', async (req, res) => {
    const { userId, messages, projectId } = req.body; // Extract projectId

    if (!userId || !messages) {
        return res.status(400).json({ error: 'userId and messages are required' });
    }

    // Save to Memory
    // Save to Memory (Merge to preserve locks)
    chatContexts[userId] = {
        ...chatContexts[userId],
        messages: messages,
        lastUpdated: new Date().toISOString(),
        tokenCount: getContextSize(messages),
        sessionId: chatContexts[userId]?.sessionId || null
    };

    let isNewSession = false;

    // Auto-Save Strategy
    console.log(`[Context Save] userId: ${userId.substring(0, 8)}, existingSessionId: ${chatContexts[userId]?.sessionId || 'NONE'}, isConnected: ${isConnected}`);

    if (!isConnected) {
        console.log('[Context Save] DB disconnected, using Memory Store');
        // Fallback: Save to In-Memory Session Store for Sidebar display
        if (!chatContexts[userId].sessionId) {
            chatContexts[userId].sessionId = `mem_${Date.now()}`;
            isNewSession = true;
        }
        updateMemorySession(userId, chatContexts[userId].sessionId, messages);
    } else {
        // Save to MongoDB - AWAIT to ensure session is created before responding
        try {
            let sessionId = chatContexts[userId].sessionId;

            // If no session exists for this user in memory, create new with locking
            if (!sessionId) {
                if (chatContexts[userId].sessionCreationPromise) {
                    // Wait for pending creation (lock)
                    console.log(`[Context Save] Waiting for session creation lock...`);
                    sessionId = await chatContexts[userId].sessionCreationPromise;
                    chatContexts[userId].sessionId = sessionId;
                } else {
                    // Create lock
                    isNewSession = true;
                    chatContexts[userId].sessionCreationPromise = (async () => {
                        const firstUserMsg = messages.find(m => m.role === 'user');

                        // Generate AI title using Groq
                        let title = 'New Conversation';
                        if (firstUserMsg) {
                            try {
                                const titleCompletion = await groq.chat.completions.create({
                                    messages: [
                                        {
                                            role: 'system',
                                            content: 'You are a title generator. Create a concise 3-5 word title that captures the essence of the user\'s query. Return ONLY the title, no quotes or punctuation.'
                                        },
                                        {
                                            role: 'user',
                                            content: `Generate a title for this query: "${firstUserMsg.content}"`
                                        }
                                    ],
                                    model: 'llama-3.3-70b-versatile',
                                    temperature: 0.7,
                                    max_completion_tokens: 20,
                                });
                                title = titleCompletion.choices[0]?.message?.content?.trim() || firstUserMsg.content.substring(0, 30);
                            } catch (err) {
                                console.error('[Title Generation] Failed:', err);
                                title = firstUserMsg.content.substring(0, 30);
                            }
                        }

                        const newSession = await Session.create({
                            userId,
                            projectId: projectId || null, // Associate session with project
                            title,
                            preview: messages[messages.length - 1]?.content.substring(0, 50) || '...',
                            updatedAt: new Date()
                        });
                        console.log(`[Context Save] Created NEW Session: ${newSession._id} - "${title}"`);
                        return newSession._id;
                    })();

                    // Wait for completion and assign
                    try {
                        sessionId = await chatContexts[userId].sessionCreationPromise;
                        chatContexts[userId].sessionId = sessionId;
                    } finally {
                        // Release lock
                        setTimeout(() => {
                            if (chatContexts[userId]) {
                                delete chatContexts[userId].sessionCreationPromise;
                            }
                        }, 1000);
                    }
                }
            } else {
                // Update existing session preview
                await Session.findByIdAndUpdate(sessionId, {
                    updatedAt: new Date(),
                    preview: messages[messages.length - 1]?.content.substring(0, 50) || '...',
                });
                console.log(`[Context Save] Updated Session: ${sessionId}`);
            }

            // Save individual messages to DB (async, don't wait)
            (async () => {
                const messagesToSave = messages
                    .filter(m => m.role === 'user' || m.role === 'assistant')
                    .map(msg => ({
                        sessionId: chatContexts[userId].sessionId,
                        role: msg.role,
                        content: msg.content || (msg.type === 'image_generated' ? '[Image Generated]' : ' '),
                        // New fields for structured image content
                        type: msg.type || 'text',
                        generatedImage: msg.generatedImage || undefined,
                        model: msg.model || 'unknown',
                        mode: msg.mode || 'standard',
                        attachment: msg.attachment, // FIX: Save attachment data to DB
                        feedback: msg.feedback || null, // Persist feedback
                        timestamp: new Date()
                    }));

                // Debug: Check mapping
                if (messagesToSave.some(m => m.attachment)) {
                    console.log('[Message Save] Saving messages with attachments:', messagesToSave.filter(m => m.attachment).length);
                }

                await Message.deleteMany({ sessionId: chatContexts[userId].sessionId });
                if (messagesToSave.length > 0) {
                    await Message.insertMany(messagesToSave);
                    console.log(`[Context Save] Saved ${messagesToSave.length} messages to DB`);
                }
            })().catch(err => console.error('[Message Save] Error:', err));

        } catch (dbErr) {
            console.error('DB Auto-Save Error:', dbErr);
        }
    }

    // Debug: Check if hiddenContent is being saved
    const hasHidden = messages.some(m => m.hiddenContent);
    if (hasHidden) console.log(`[Context Save] Saved context with hiddenContent for user ${userId.substring(0, 5)}...`);

    console.log(`[Context Save] Responding with sessionId: ${chatContexts[userId]?.sessionId}, isNewSession: ${isNewSession}`);

    res.json({
        success: true,
        sessionId: chatContexts[userId]?.sessionId,
        isNewSession: isNewSession,
        tokenCount: chatContexts[userId].tokenCount,
        needsSummarization: chatContexts[userId].tokenCount > CONTEXT_WARNING_THRESHOLD
    });
});

// Get chat context
app.get('/context/:userId', (req, res) => {
    const { userId } = req.params;
    const context = chatContexts[userId]; // In future: Load from `Message.find({ sessionId })`

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
    const { userId, messages, projectId } = req.body;

    // Get stored context and merge with current messages
    let contextMessages = messages || [];

    // Inject Project Context if this is a new session
    if (projectId && (!chatContexts[userId] || chatContexts[userId].messages.length === 0)) {
        try {
            const project = await Project.findById(projectId);
            if (project && project.description) {
                console.log(`[Stream] Injecting context from project: ${project.name}`);
                contextMessages.unshift({
                    role: 'system',
                    content: `[PROJECT CONTEXT: ${project.name}]\n${project.description}\n\n(Use this context to guide your responses for this conversation)`
                });
            }
        } catch (err) {
            console.error('[Stream] Failed to load project context:', err);
        }
    }

    if (userId && chatContexts[userId]) {
        const storedContext = chatContexts[userId];
        const contextSize = storedContext.tokenCount;

        // If context is too large, summarize it first
        if (contextSize > MAX_CONTEXT_TOKENS) {
            console.log(`Context too large (${contextSize} tokens), summarizing...`);
            const summary = await summarizeContext(storedContext.messages);

            if (summary) {
                // Replace old context with summary
                // We might want to re-inject project context here if we want it to persist strongly
                // For now, relying on summary to capture essence
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
                    content: 'You are Queue, a helpful AI assistant created by Haseeb Iqbal. When explaining mathematical concepts, formulas, equations, or physics problems, ALWAYS use LaTeX notation. Use inline LaTeX with single dollar signs $...$ for inline formulas and double dollar signs $$...$$ for display equations. For example: "The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$" or for display mode use $$E=mc^2$$. Always format mathematical expressions properly in LaTeX.'
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

            // <<< CLOUDINARY UPLOAD FOR ATTACHMENT >>>
            let originalBase64 = null;
            if (payload.attachment.content) {
                originalBase64 = payload.attachment.content; // Store original for parsing
                const secureUrl = await uploadToCloudinary(payload.attachment.content);
                if (secureUrl) {
                    payload.attachment.content = secureUrl;
                    console.log('[Attachment] Replaced Base64 with Cloudinary URL');

                    // Send URL back to client to update state/persistence
                    res.write(`data: ${JSON.stringify({
                        type: 'attachment_uploaded',
                        url: secureUrl,
                        name: payload.attachment.name
                    })}\n\n`);
                }
            }

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

                // Decode base64 buffer for parser (Use protected originalBase64)
                if (originalBase64) {
                    const buffer = Buffer.from(originalBase64.split(',')[1], 'base64');
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
        }


        // Case 1: Explicit Web Search Enabled (Force GPT-OSS-120B)
        if (payload.isWebSearchEnabled) {
            console.log("Explicit Web Search Enabled - Forcing llama-3.3-70b-versatile");
            shouldSearch = true;
            modelKey = 'llama-3.3-70b-versatile'; // Force model override
        }
        // Case 2: Intelligent Auto-Detection (If DeepMind is OFF and Explicit is OFF)
        // SKIP if we have an Image Attachment (Explicit Vision Intent)
        else if (!payload.isDeepMindEnabled && (!payload.attachment || !payload.attachment.type.startsWith('image/'))) {
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
                let imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&nologo=true&model=flux-realism`;

                // <<< CLOUDINARY UPLOAD FOR GENERATED IMAGE >>>
                const secureUrl = await uploadToCloudinary(imageUrl);
                if (secureUrl) {
                    imageUrl = secureUrl; // Use persistent URL
                    console.log('[Image Gen] Persisted to Cloudinary');
                }

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
            if (content && typeof content === 'string') {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

        // Clean up store
        delete store[req.params.id];
    } catch (error) {
        console.error(error);
        const errorMessage = error?.message || error?.toString() || 'Unknown streaming error';
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.end();
        delete store[req.params.id];
    }
});

// Get Messages for a Session
app.get('/api/messages/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!isConnected) {
            // Fallback to memory
            const memSession = memorySessions.find(s => s._id === sessionId);
            return res.json({ messages: memSession?.messages || [] });
        }

        const messages = await Message.find({ sessionId })
            .sort({ timestamp: 1 })
            .lean(); // Use lean() for better performance

        res.json({ messages });
    } catch (error) {
        console.error('Get Messages API Error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
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

// --- Database APIs ---
// Reset Session for User (New Chat)
app.post('/api/session/reset', (req, res) => {
    const { userId } = req.body;
    if (chatContexts[userId]) {
        chatContexts[userId] = {
            ...chatContexts[userId],
            sessionId: null, // Clear active session ID
            messages: []     // Clear active context
        };
    }
    res.json({ success: true });
});

// Get Messages for a Session
app.get('/api/messages/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!isConnected) {
            // Fallback: Return from memory if available
            const memSession = memorySessions.find(s => s._id === sessionId);
            return res.json({ messages: memSession?.messages || [] });
        }

        const messages = await Message.find({ sessionId }).sort({ timestamp: 1 });
        res.json({ messages });
    } catch (error) {
        console.error('[Messages API] Error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Activate an existing session (when user clicks a chat in sidebar)
app.post('/api/session/activate', (req, res) => {
    const { userId, sessionId } = req.body;
    if (chatContexts[userId]) {
        chatContexts[userId].sessionId = sessionId;
        console.log(`[Session Activate] User ${userId} activated session ${sessionId}`);
    }
    res.json({ success: true });
});

// Delete a chat session
app.delete('/api/session/:sessionId', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { userId } = req.query;

        if (!isConnected) {
            // Memory mode: Remove from memory
            const sessionIndex = memorySessions.findIndex(s => s._id === sessionId);
            if (sessionIndex !== -1) {
                memorySessions.splice(sessionIndex, 1);
            }
            return res.json({ success: true });
        }

        // Database mode: Delete session and associated messages
        await Session.findByIdAndDelete(sessionId);
        await Message.deleteMany({ sessionId });

        // Clear from active context if this was the active session
        if (chatContexts[userId] && chatContexts[userId].sessionId === sessionId) {
            chatContexts[userId].sessionId = null;
            chatContexts[userId].messages = [];
        }

        console.log(`[Session Delete] Deleted session ${sessionId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('[Session Delete] Error:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Get Sidebar Data (Projects + Recent Sessions)
app.get('/api/sidebar/:userId', authMiddleware, async (req, res) => {
    try {
        if (!isConnected) {
            const userSessions = memorySessions
                .filter(s => s.userId === req.params.userId && !s.isArchived)
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            return res.json({ projects: [], sessions: userSessions });
        }

        const { userId } = req.params;
        const projects = await Project.find({ userId }).sort({ createdAt: -1 });
        // Only fetch sessions WITHOUT projectId for standard chat tab
        const sessions = await Session.find({ userId, isArchived: false, projectId: null })
            .sort({ updatedAt: -1 })
            .limit(20); // Limit to 20 recent chats

        // Count chats per project
        const projectdata = await Promise.all(projects.map(async (p) => {
            const count = await Session.countDocuments({ projectId: p._id });
            return { ...p.toObject(), chats: count };
        }));

        res.json({ projects: projectdata, sessions });
    } catch (error) {
        console.error('Sidebar API Error:', error);
        res.status(500).json({ error: 'Failed to fetch sidebar data' });
    }
});

// Sync User Profile (Login) for Persistence
// Auth: Google Login
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/api/auth/google', async (req, res) => {
    try {
        const { accessToken } = req.body;

        // Fetch User Info using Access Token
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info from Google');
        }

        const data = await response.json();
        const { sub: googleId, email, name, picture } = data;

        // Sync User in DB
        let user = null;
        if (isConnected) {
            user = await User.findOne({ userId: googleId }); // Use googleId as userId
            if (!user) {
                user = await User.create({
                    userId: googleId,
                    email,
                    displayName: name,
                    photoURL: picture
                });
            } else {
                // Update profile
                user.lastLogin = new Date();
                user.photoURL = picture;
                await user.save();
            }
        } else {
            // Fallback for memory mode (Mock user)
            user = { userId: googleId, email, displayName: name, photoURL: picture };
        }

        // Generate Session JWT
        const token = jwt.sign(
            { userId: googleId, email },
            process.env.JWT_SECRET || 'dev_secret_key_123',
            { expiresIn: '7d' }
        );

        res.json({ token, user });
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(401).json({ error: 'Authentication Failed' });
    }
});

// Get Sessions for a Specific Project
app.get('/api/project/:projectId/sessions', async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!isConnected) {
            const projectSessions = memorySessions
                .filter(s => s.projectId === projectId && !s.isArchived)
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            return res.json({ sessions: projectSessions });
        }

        const sessions = await Session.find({ projectId, isArchived: false })
            .sort({ updatedAt: -1 })
            .limit(20);

        res.json({ sessions });
    } catch (error) {
        console.error('Project Sessions API Error:', error);
        res.status(500).json({ error: 'Failed to fetch project sessions' });
    }
});

// Create Project
app.post('/api/projects', async (req, res) => {
    try {
        const { userId, name, color, emoji, description } = req.body;
        const project = await Project.create({ userId, name, color, emoji, description });
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create New Session
app.post('/api/sessions', async (req, res) => {
    try {
        const { userId, projectId, title, model } = req.body;
        const session = await Session.create({
            userId,
            projectId: projectId || null,
            title: title || 'New Chat',
            model: model || 'llama-3.3-70b'
        });
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DeepMind: Start a multi-model session
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

// default route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the QueueBot API',
        status: true,
        data: {
            name: 'QueueBot',
            version: '1.2.0',
            description: 'Standard api for my queuebot project',
            license: 'ISC',
            author: 'Haseeb Iqbal',
        }
    });
});

app.listen(process.env.PORT || 5000, '192.168.100.215', () => {
    console.log(`Server running on http://localhost:${process.env.PORT}`);
});
import { Groq } from 'groq-sdk';
let groq;

// Function to format history for the prompt
const formatHistory = (messages) => {
    if (!messages || messages.length === 0) return "";
    return messages.slice(-6).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
};

export async function detectSearchIntent(queryOrMessages) {
    if (!groq) groq = new Groq();

    // Handle both single query string and messages array
    let lastQuery = "";
    let contextHistory = "";

    if (Array.isArray(queryOrMessages)) {
        const lastMsg = queryOrMessages[queryOrMessages.length - 1];
        lastQuery = lastMsg.content;
        // Get previous messages for context (excluding the very last one which is the query)
        contextHistory = formatHistory(queryOrMessages.slice(0, -1));
    } else {
        lastQuery = queryOrMessages;
    }

    // 0. IMMEDIATE SAFETY KEYWORD CHECK (Fail-Fast)
    const UNSAFE_KEYWORDS = [
        /\bnude\b/i, /\bnaked\b/i, /\bsex\b/i, /\bporn\b/i, /\bnsfw\b/i,
        /\bcensored\b/i, /\bdick\b/i, /\bvagina\b/i, /\bpussy\b/i, /\bpenis\b/i,
        /\bboobs\b/i, /\bbreast\b/i, /\btits\b/i, /\bundressed\b/i, /\btoppless\b/i,
        /\bess\b/i, /\berotic\b/i, /\bkink\b/i, /\bfetish\b/i, /\bbikini\b/i,
        /\bswimsuit\b/i, /\blingerie\b/i, /\bunderwear\b/i, /\bpanty\b/i,
        /\bbra\b/i, /\bthong\b/i
    ];

    if (UNSAFE_KEYWORDS.some(regex => regex.test(lastQuery))) {
        console.log(`[Intent] Safety Violation Detected via Regex: "${lastQuery}"`);
        return { category: "SAFETY_VIOLATION" };
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a query intent classifier. Classify the user's query into one of three categories:
                    
                    1. "WEATHER": The user is asking for current weather, forecast, or temperature for a specific location. EXTRACT THE LOCATION.
                    2. "IMAGE": The user wants to generate, create, draw, or paint an image. EXTRACT THE IMAGE PROMPT (detailed description).
                    3. "SEARCH": The query requires real-time information from the web (news, stocks, sports, recent events), BUT IS NOT WEATHER or IMAGE.
                    4. "SAFETY_VIOLATION": The query violates safety policies (NSFW, sexual, explicit violence, illegal acts).
                    5. "NO": The query can be answered by general knowledge or is a coding/creative task.

                    IMPORTANT: Use the provided CONVERSATION HISTORY to understand context.
                    - If the user says "make it angry", look at previous messages to find what "it" refers to (e.g., a cat) and create a full prompt: "An angry cat".
                    - If the user says "change the background to blue", combine it with the previous image subject.
                    - **CRITICAL**: If the user asks a NEW question unrelated to the previous topic (e.g., switch from Weather to Search, or Image to Code), IGNORE the history and classify based on the new query.
                    - "Google Antigravity" after "Weather" is a SEARCH, not Weather.

                    Return ONLY a JSON object: { "category": "WEATHER" | "SEARCH" | "IMAGE" | "SAFETY_VIOLATION" | "NO", "location": "City Name" (only for WEATHER), "image_prompt": "Detailed description" (only for IMAGE) }

                    Examples:
                    "What's the weather in Tokyo?" -> { "category": "WEATHER", "location": "Tokyo" }
                    "Generate an image of a futuristic city" -> { "category": "IMAGE", "image_prompt": "A futuristic city with neon lights and flying cars, cyberpunk style, high resolution" }
                    (Context: User asked for a cat) "Make it angry" -> { "category": "IMAGE", "image_prompt": "An angry cat with aggressive expression, detailed fur" }
                    "Who won the Super Bowl?" -> { "category": "SEARCH" }
                    "Write a python script" -> { "category": "NO" }
                    "Is it raining in London?" -> { "category": "WEATHER", "location": "London" }
                    "Temperature in New York City" -> { "category": "WEATHER", "location": "New York City" }
                    "Who won the Super Bowl 2024?" -> { "category": "SEARCH" }
                    "Latest AI news" -> { "category": "SEARCH" }
                    "Write a loop in Python" -> { "category": "NO" }
                    "Capital of France" -> { "category": "NO" }
                    "Generate a nude image" -> { "category": "SAFETY_VIOLATION" }
                    "Show me explicit content" -> { "category": "SAFETY_VIOLATION" }`
                },
                {
                    role: "user",
                    content: `CONVERSATION HISTORY:\n${contextHistory}\n\nCURRENT QUERY:\n${lastQuery}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            max_completion_tokens: 1024,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content?.trim();
        let result;
        try {
            result = JSON.parse(content);
        } catch (e) { // eslint-disable-line no-unused-vars
            console.error("[Intent] Failed to parse JSON:", content);
            return { category: "NO" };
        }

        console.log(`[Intent] Query: "${lastQuery}" -> `, result);

        return result;
    } catch (error) {
        console.error("[Intent] Error detecting intent:", error);
        return { category: "NO" }; // Default object on error
    }
}

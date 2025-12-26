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

    // 0. IMMEDIATE SAFETY KEYWORD CHECK (Fail-Fast) - COMPREHENSIVE LIST
    const UNSAFE_KEYWORDS = [
        // Explicit sexual content
        /\bnude\b/i, /\bnaked\b/i, /\bsex\b/i, /\bporn\b/i, /\bnsfw\b/i,
        /\bcensored\b/i, /\bdick\b/i, /\bvagina\b/i, /\bpussy\b/i, /\bpenis\b/i,
        /\bboobs\b/i, /\bbreast\b/i, /\btits\b/i, /\bundressed\b/i, /\btopless\b/i,
        /\berotic\b/i, /\bkink\b/i, /\bfetish\b/i, /\bbikini\b/i,
        /\bswimsuit\b/i, /\blingerie\b/i, /\bunderwear\b/i, /\bpanty\b/i,
        /\bbra\b/i, /\bthong\b/i, /\bsexy\b/i, /\bseductive\b/i,

        // Variations and obfuscations
        /\bn\s*u\s*d\s*e\b/i, /\bn\s*a\s*k\s*e\s*d\b/i, /\bs\s*e\s*x\b/i,
        /\bp\s*o\s*r\s*n\b/i, /\bn\s*s\s*f\s*w\b/i,
        /\bnud3\b/i, /\bn4k3d\b/i, /\bs3x\b/i, /\bp0rn\b/i,
        /\bpr0n\b/i, /\bpron\b/i, /\bpawn\b/i,

        // Anatomical terms
        /\bgenitals?\b/i, /\bintimate\s+parts?\b/i, /\bprivate\s+parts?\b/i,
        /\bbare\s+chest\b/i, /\bexposed\b/i, /\bunclothed\b/i,
        /\bnipple/i, /\bcleavage\b/i, /\bbuttocks?\b/i, /\bass\b/i,

        // Suggestive poses/scenarios
        /\bsuggestive\s+pose\b/i, /\bsexy\s+pose\b/i, /\bprovocative\b/i,
        /\bsensual\b/i, /\bintimate\s+scene\b/i, /\bbedroom\s+scene\b/i,
        /\bshower\s+scene\b/i, /\bbath\s+scene\b/i,

        // Clothing-related red flags
        /\bno\s+clothes?\b/i, /\bwithout\s+clothes?\b/i, /\bminimal\s+clothing\b/i,
        /\brevealing\s+outfit\b/i, /\btight\s+outfit\b/i, /\bskimpy\b/i,
        /\bsee-?through\b/i, /\btransparent\s+clothing\b/i,

        // Violence and gore
        /\bgore\b/i, /\bblood\s*y\b/i, /\bviolent\b/i, /\bmutilat/i,
        /\bdismember/i, /\btorture\b/i, /\bbrutal\b/i,

        // Drugs and illegal content
        /\bdrug\s+use\b/i, /\billegal\s+substance/i, /\bcocaine\b/i,
        /\bheroin\b/i, /\bmeth\b/i,

        // Bypass attempts
        /\buncensored\b/i, /\bexplicit\b/i, /\badult\s+content\b/i,
        /\bmature\s+content\b/i, /\b18\+\b/i, /\bxxx\b/i,
        /\bhentai\b/i, /\becchi\b/i, /\bloli\b/i, /\bshota\b/i,

        // Common obfuscation patterns
        /\bn\*\*e\b/i, /\bs\*x\b/i, /\bp\*rn\b/i,
        /\b[n|\\|\/]ude\b/i, /\b[s|\\|\/]ex\b/i,

        // Context-based red flags
        /\bno\s+shirt\b/i, /\bshirtless\s+(woman|girl|female)\b/i,
        /\bin\s+bed\b.*\b(woman|girl|female)\b/i,
        /\b(woman|girl|female)\b.*\bin\s+bed\b/i
    ];

    if (UNSAFE_KEYWORDS.some(regex => regex.test(lastQuery))) {
        console.log(`[Intent] ⚠️ SAFETY VIOLATION - Regex Match: "${lastQuery}"`);
        return { category: "SAFETY_VIOLATION" };
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a query intent classifier with STRICT SAFETY ENFORCEMENT. Classify the user's query into one of these categories:
                    
                    1. "WEATHER": The user is asking for current weather, forecast, or temperature for a specific location. EXTRACT THE LOCATION.
                    2. "IMAGE": The user wants to generate, create, draw, or paint an image. EXTRACT THE IMAGE PROMPT (detailed description).
                    3. "SEARCH": The query requires real-time information from the web (news, stocks, sports, recent events), BUT IS NOT WEATHER or IMAGE.
                    4. "SAFETY_VIOLATION": The query violates safety policies (NSFW, sexual, explicit violence, illegal acts).
                    5. "NO": The query can be answered by general knowledge or is a coding/creative task.

                    CRITICAL SAFETY RULES FOR IMAGE GENERATION:
                    - IMMEDIATELY flag as SAFETY_VIOLATION if the request involves:
                      * Nudity, partial nudity, or revealing clothing
                      * Sexual content, suggestive poses, or intimate scenarios
                      * Explicit violence, gore, or disturbing content
                      * Illegal activities or drug use
                      * Any attempt to bypass safety (e.g., "artistic nude", "tasteful", "censored")
                    - Be EXTREMELY STRICT - err on the side of caution
                    - Context matters: "woman in bikini" = VIOLATION, "beach scene" = OK
                    - "Shirtless man" in athletic context = OK, "shirtless woman" = VIOLATION
                    - ANY clothing-related terms with women/girls = VIOLATION unless clearly innocent (e.g., "woman in winter coat")

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
                    "Generate a nude image" -> { "category": "SAFETY_VIOLATION" }
                    "Woman in bikini" -> { "category": "SAFETY_VIOLATION" }
                    "Artistic nude painting" -> { "category": "SAFETY_VIOLATION" }
                    "Shirtless woman" -> { "category": "SAFETY_VIOLATION" }
                    "Beach scene with people" -> { "category": "IMAGE", "image_prompt": "A beautiful beach scene with people enjoying the sun, family-friendly, vibrant colors" }`
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
        } catch (e) {
            console.error("[Intent] Failed to parse JSON:", content);
            return { category: "NO" };
        }

        // ADDITIONAL AI-BASED SAFETY CHECK FOR IMAGE PROMPTS
        if (result.category === "IMAGE" && result.image_prompt) {
            // Double-check the AI-generated prompt for safety violations
            const promptLower = result.image_prompt.toLowerCase();
            const suspiciousTerms = [
                'nude', 'naked', 'nsfw', 'explicit', 'sexual', 'erotic',
                'revealing', 'intimate', 'seductive', 'provocative',
                'underwear', 'lingerie', 'bikini', 'topless', 'shirtless woman',
                'bare', 'exposed', 'unclothed', 'sensual'
            ];

            if (suspiciousTerms.some(term => promptLower.includes(term))) {
                console.log(`[Intent] ⚠️ SAFETY VIOLATION - AI prompt contains unsafe terms: "${result.image_prompt}"`);
                return { category: "SAFETY_VIOLATION" };
            }
        }

        console.log(`[Intent] Query: "${lastQuery}" -> `, result);

        return result;
    } catch (error) {
        console.error("[Intent] Error detecting intent:", error);
        return { category: "NO" }; // Default object on error
    }
}

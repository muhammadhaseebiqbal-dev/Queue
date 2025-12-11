import { Groq } from 'groq-sdk';
let groq;

export async function detectSearchIntent(query) {
    if (!groq) groq = new Groq();
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a query intent classifier. Classify the user's query into one of three categories:
                    
                    1. "WEATHER": The user is asking for current weather, forecast, or temperature for a specific location. EXTRACT THE LOCATION.
                    2. "SEARCH": The query requires real-time information from the web (news, stocks, sports, recent events), BUT IS NOT WEATHER.
                    3. "NO": The query can be answered by general knowledge or is a coding/creative task.

                    Return ONLY a JSON object: { "category": "WEATHER" | "SEARCH" | "NO", "location": "City Name" (only for WEATHER) }

                    Examples:
                    "What's the weather in Tokyo?" -> { "category": "WEATHER", "location": "Tokyo" }
                    "Is it raining in London?" -> { "category": "WEATHER", "location": "London" }
                    "Temperature in New York City" -> { "category": "WEATHER", "location": "New York City" }
                    "Who won the Super Bowl 2024?" -> { "category": "SEARCH" }
                    "Latest AI news" -> { "category": "SEARCH" }
                    "Write a loop in Python" -> { "category": "NO" }
                    "Capital of France" -> { "category": "NO" }`
                },
                {
                    role: "user",
                    content: query
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            max_completion_tokens: 30,
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

        console.log(`[Intent] Query: "${query}" ->`, result);

        return result;
    } catch (error) {
        console.error("[Intent] Error detecting intent:", error);
        return { category: "NO" }; // Default object on error
    }
}

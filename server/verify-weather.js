import { getWeatherData } from './utils/weather.js';
import { detectSearchIntent } from './utils/intent.js';
import dotenv from 'dotenv';

dotenv.config();

async function runTests() {
    console.log("=== Testing Weather Integration ===");

    // 1. Test Intent Detection & Extraction
    console.log("\n1. Testing Intent Detection & Extraction:");
    const queries = [
        "What is the weather in London?",
        "Is it raining in Tokyo?",
        "Forecast for New York City",
        "search the internet for news",
        "hello"
    ];

    for (const q of queries) {
        const result = await detectSearchIntent(q);
        console.log(`Query: "${q}" -> Intent: ${result.category}, Location: ${result.location || 'N/A'}`);
    }

    // 2. Test Weather Data Fetching with Extracted Location
    console.log("\n2. Testing Weather Data Fetching:");
    // Simulate what happens in index.js: passing extracted "London"
    const location = "London";
    console.log(`Simulating fetch for extracted location: "${location}"`);
    const data = await getWeatherData(location);

    if (data) {
        console.log(`Successfully fetched weather for ${data.location.name}, ${data.location.country}`);
        console.log(`Temp: ${data.current.temperature}°C`);
    } else {
        console.error("Failed to fetch weather data.");
    }
}

runTests();

import axios from 'axios';

export async function getWeatherData(locationQuery) {
    try {
        console.log(`[Weather] Fetching data for: ${locationQuery}`);

        // 1. Geocode the location
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationQuery)}&count=1&language=en&format=json`;
        const geoRes = await axios.get(geoUrl);

        if (!geoRes.data.results || geoRes.data.results.length === 0) {
            console.log("[Weather] Location not found");
            return null;
        }

        const location = geoRes.data.results[0];
        const { latitude, longitude, name, country } = location;

        // 2. Fetch Weather Data (Current + Forecast)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`;

        const weatherRes = await axios.get(weatherUrl);
        const data = weatherRes.data;

        // 3. Format Response
        return {
            location: {
                name,
                country,
                lat: latitude,
                lon: longitude
            },
            current: {
                temperature: data.current.temperature_2m,
                humidity: data.current.relative_humidity_2m,
                feels_like: data.current.apparent_temperature,
                wind_speed: data.current.wind_speed_10m,
                weather_code: data.current.weather_code,
                is_day: data.current.is_day
            },
            daily: data.daily.time.map((date, i) => ({
                date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                temp_max: data.daily.temperature_2m_max[i],
                temp_min: data.daily.temperature_2m_min[i],
                weather_code: data.daily.weather_code[i]
            }))
        };

    } catch (error) {
        console.error("[Weather] Error fetching data:", error.message);
        return null; // Fail gracefully
    }
}

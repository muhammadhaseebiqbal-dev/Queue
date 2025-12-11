import { motion } from "framer-motion"
import { Cloud, CloudRain, Sun, Wind, Droplets, Thermometer, CloudLightning, Snowflake } from "lucide-react"

function WeatherCard({ data }) {
    if (!data) return null;

    const { current, location, daily } = data;

    // Helper to get icon based on weather code
    const getSchema = (code) => {
        // Simple mapping for OpenMeteo codes
        if (code <= 1) return { icon: Sun, color: "text-yellow-400", label: "Clear" };
        if (code <= 3) return { icon: Cloud, color: "text-gray-400", label: "Cloudy" };
        if (code <= 67) return { icon: CloudRain, color: "text-blue-400", label: "Rain" };
        if (code <= 77) return { icon: Snowflake, color: "text-cyan-200", label: "Snow" };
        if (code <= 99) return { icon: CloudLightning, color: "text-purple-400", label: "Storm" };
        return { icon: Cloud, color: "text-gray-400", label: "Unknown" };
    }

    const mainSchema = getSchema(current.weather_code);
    const MainIcon = mainSchema.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-sm mx-auto mb-6 relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl shadow-2xl"
        >
            {/* Background Gradient Blob */}
            <div className={`absolute -top-10 -right-10 w-40 h-40 bg-${mainSchema.color.split('-')[1]}-500/20 rounded-full blur-3xl`} />

            <div className="p-6 relative z-10">
                {/* Header: Location & Date */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{location.name}</h2>
                        <p className="text-white/60 text-sm font-medium">{location.country}</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs text-white/80 font-medium">
                        Live
                    </div>
                </div>

                {/* Main Stats: Temp & Icon */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                        <span className="text-6xl font-light text-white tracking-tighter">
                            {Math.round(current.temperature)}°
                        </span>
                        <span className={`text-lg font-medium ${mainSchema.color} flex items-center gap-2`}>
                            {mainSchema.label}
                        </span>
                    </div>
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    >
                        <MainIcon size={80} className={mainSchema.color} strokeWidth={1.5} />
                    </motion.div>
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                        <Wind size={20} className="text-blue-300 mb-2" />
                        <span className="text-white/90 font-semibold">{current.wind_speed}</span>
                        <span className="text-xs text-white/50">km/h</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                        <Droplets size={20} className="text-cyan-300 mb-2" />
                        <span className="text-white/90 font-semibold">{current.humidity}%</span>
                        <span className="text-xs text-white/50">Hum</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                        <Thermometer size={20} className="text-orange-300 mb-2" />
                        <span className="text-white/90 font-semibold">{Math.round(current.feels_like)}°</span>
                        <span className="text-xs text-white/50">Feels</span>
                    </div>
                </div>

                {/* Forecast Mini-List */}
                {daily && (
                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Forecast</p>
                        {daily.slice(0, 3).map((day, i) => {
                            const daySchema = getSchema(day.weather_code);
                            const DayIcon = daySchema.icon;
                            return (
                                <div key={i} className="flex items-center justify-between group">
                                    <span className="text-white/70 w-16 text-sm font-medium">{day.date}</span>
                                    <div className="flex items-center gap-2 text-white/60">
                                        <DayIcon size={16} className={daySchema.color} />
                                        <span className="text-xs">{daySchema.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3 w-20 justify-end">
                                        <span className="text-white text-sm font-medium">{Math.round(day.temp_max)}°</span>
                                        <span className="text-white/40 text-xs">{Math.round(day.temp_min)}°</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    )
}

export default WeatherCard

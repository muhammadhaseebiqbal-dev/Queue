import { motion } from "framer-motion";
import { Sparkles, Code, Image as ImageIcon, Globe, Brain } from "lucide-react";
import { useEffect, useState } from "react";

function WelcomeScreen({ onSuggestionClick }) {
    const [greeting, setGreeting] = useState("Good Morning");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good Morning");
        else if (hour < 18) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");
    }, []);

    const suggestions = [
        { icon: Code, label: "Analyze Code", prompt: "Can you review this code snippet and suggest optimizations?" },
        { icon: ImageIcon, label: "Generate Image", prompt: "Generate a futuristic cityscape with neon lights." },
        { icon: Brain, label: "Brainstorm", prompt: "Help me brainstorm ideas for a new SaaS product." },
        { icon: Globe, label: "Web Search", prompt: "What are the latest developments in AI agents?" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center justify-center h-full w-full max-w-2xl mx-auto px-6 text-center z-10"
        >
            {/* Greeting */}
            <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 mb-1 md:mb-4 tracking-tight">
                {greeting}, User.
            </h1>
            <p className="text-sm md:text-lg text-zinc-400 mb-4 md:mb-12 max-w-lg leading-relaxed">
                I'm QueueAI. Your multi-model intelligent assistant. <br className="hidden md:block" />
                How can I help you accelerate your work today?
            </p>

            {/* Suggestions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                {suggestions.map((item, index) => (
                    <motion.button
                        key={index}
                        whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.08)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSuggestionClick(item.prompt)}
                        className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                    >
                        <div className="p-3 rounded-xl bg-white/5 text-zinc-400 group-hover:text-white group-hover:bg-indigo-500/20 transition-colors">
                            <item.icon size={20} />
                        </div>
                        <span className="text-xs font-medium text-zinc-400 group-hover:text-white transition-colors">{item.label}</span>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
}

export default WelcomeScreen;

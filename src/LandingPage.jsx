import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap, Brain, MessageSquare, Layers, Command } from "lucide-react";
import { useAuth } from "./context/AuthContext";

function LandingPage() {
    const { token } = useAuth();
    const destination = token ? "/app" : "/signin";

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-indigo-500/30 overflow-x-hidden font-sans">

            {/* Floating Navbar (Mobbin Style) */}
            <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6">
                <nav className="w-full max-w-3xl bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center justify-between shadow-2xl shadow-black/50">
                    <div className="flex items-center gap-2">
                        <img src="/logo.svg" alt="QueueBot" className="h-8 w-8" />
                    </div>
                    <div className="flex items-center gap-6">
                        {token ? (
                            <Link to="/app" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                                Dashboard
                            </Link>
                        ) : (
                            <Link to="/signin" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                                Sign In
                            </Link>
                        )}
                        <Link
                            to={destination}
                            className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-zinc-200 transition-colors"
                        >
                            Get Started
                        </Link>
                    </div>
                </nav>
            </div>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 px-6">
                {/* Background Glow - Neutral */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs font-medium mb-8"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        v2.0 Now Available with Vision & Voice
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
                    >
                        The Ultimate <br />
                        <span className="text-zinc-500">
                            AI Workspace
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed"
                    >
                        Orchestrate multiple AI models, manage projects, and analyze complex data with a powerful, chat-based operating system.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            to="/app"
                            className="px-8 py-4 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-100 transition-all flex items-center gap-2 group w-full sm:w-auto justify-center"
                        >
                            Launch App
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <button className="px-8 py-4 bg-white/5 text-white font-semibold rounded-2xl hover:bg-white/10 border border-white/10 transition-all w-full sm:w-auto">
                            View Changelog
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* Feature Grid (Compact Bento Style) */}
            {/* Feature Grid (Wide 90% Bento Style) */}
            <section className="py-20 mx-auto w-[90%] max-w-[1600px]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">

                    {/* Card 1: DeepMind (Large 2x2) */}
                    <FeatureCard
                        icon={<Brain size={24} className="text-zinc-500" />}
                        title="DeepMind 2.0"
                        description="Multi-model consensus engine that debates via internal monologue to find the best answer."
                        className="md:col-span-2 md:row-span-2 min-h-[400px]"
                    />

                    {/* Card 2: Vision Analysis (Tall 1x2) */}
                    <FeatureCard
                        icon={<Layers size={24} className="text-zinc-500" />}
                        title="Vision Analysis"
                        description="Llama-4 Vision analyzes structures, code, and diagrams instantly."
                        className="md:col-span-1 md:row-span-2 min-h-[400px]"
                    />

                    {/* Card 3: Project Context (Wide 2x1) */}
                    <FeatureCard
                        icon={<Command size={24} className="text-zinc-500" />}
                        title="Project Context"
                        description="Organize chats into Projects. Persistent context awareness across sessions."
                        className="md:col-span-2 min-h-[200px]"
                    />

                    {/* Card 4: Voice Control (Small 1x1) */}
                    <FeatureCard
                        icon={<Zap size={24} className="text-zinc-500" />}
                        title="Voice Command"
                        description="Speak naturally. Auto-silence detection and Whisper Turbo transcription for hands-free coding."
                        className="md:col-span-1 min-h-[200px]"
                    />

                </div>
            </section>

            {/* Model Ecosystem */}
            <section className="py-20 px-6 bg-zinc-900/20 border-y border-white/5">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">Powered by Frontier Models</h2>
                        <p className="text-zinc-500">Access the world's most capable intelligence engines in one unified interface.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 md:gap-8 opacity-70">
                        {['GPT-OSS 120B', 'QWEN 3 32B', 'LLAMA 3.3 70B', 'KIMI K2'].map((model) => (
                            <div key={model} className="px-6 py-3 rounded-full bg-white/5 border border-white/5 text-zinc-300 font-mono text-sm">
                                {model}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Privacy / Security Support */}
            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                    {[
                        { title: "Zero Retention", desc: "Your code is never stored or used for model training." },
                        { title: "End-to-End Encrypted", desc: "Enterprise-grade encryption for all data in transit and at rest." },
                        { title: "Secure Cloud Storage", desc: "Uploaded files and images are securely stored for persistent history." }
                    ].map((feature, i) => (
                        <div key={i} className="bg-zinc-900/30 border border-white/5 p-8 rounded-2xl text-left">
                            <h3 className="text-white font-medium mb-2">{feature.title}</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 bg-[#0A0A0A]">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-zinc-500" />
                        <span className="text-sm text-zinc-500">© 2025 QueueBot Inc.</span>
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">Twitter</a>
                        <a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">GitHub</a>
                        <a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">Discord</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description, className = "", image }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={`relative group overflow-hidden bg-zinc-900/50 border border-white/5 rounded-3xl p-10 hover:border-indigo-500/30 transition-colors ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="mb-4 p-3 bg-white/5 rounded-2xl w-fit border border-white/5">
                    {icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
                <p className="text-zinc-400 leading-relaxed mb-8">{description}</p>

                {/* Feature Image or Placeholder */}
                {image && (
                    <div className="mt-4 flex-1 w-full min-h-[200px] overflow-hidden rounded-xl flex items-center justify-center p-2">
                        <img
                            src={image}
                            alt={title}
                            className="w-full h-full object-contain opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500"
                        />
                    </div>
                )}
            </div>
        </motion.div>
    )
}
export default LandingPage;

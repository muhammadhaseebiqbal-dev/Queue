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
                    <Link to="/changelog">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs font-medium mb-8 cursor-pointer hover:bg-white/10 transition-colors"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            v2.5.0 Now Available with Cross-Platform Auth
                        </motion.div>
                    </Link>

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
                        <Link to="/changelog" className="px-8 py-4 bg-white/5 text-white font-semibold rounded-2xl hover:bg-white/10 border border-white/10 transition-all w-full sm:w-auto text-center">
                            View Changelog
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* SECTION 2: Multi-Model Intelligence */}
            <section id="features" className="py-24 px-6 bg-zinc-900/30 border-y border-white/5">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Engineered for Intelligence</h2>
                        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                            Switch between the world's most capable open-source models instantly.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { name: "GPT-OSS 120B", role: "General Purpose", desc: "Balanced performance for everyday tasks and coding." },
                            { name: "QWEN 3 32B", role: "Reasoning", desc: "Exceptional logic and math capabilities." },
                            { name: "LLAMA 3.3 70B", role: "Creative", desc: "Nuanced writing and creative generation." },
                            { name: "KIMI K2", role: "Speed", desc: "Ultra-fast responses for quick queries." }
                        ].map((model, i) => (
                            <div key={i} className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-colors">
                                <div className="text-xs font-mono text-indigo-400 mb-2 uppercase tracking-wider">{model.role}</div>
                                <h3 className="text-lg font-bold text-white mb-2">{model.name}</h3>
                                <p className="text-sm text-zinc-500">{model.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 3: Persistent Workspace */}
            <section className="py-24 px-6 relative">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-6">
                            Workspace
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white leading-tight">
                            Memory that <br />
                            <span className="text-zinc-500">Persists.</span>
                        </h2>
                        <div className="space-y-8 mt-8">
                            {[
                                { title: "Project Organization", desc: "Group related chats into dedicated Projects to keep your workspace clean." },
                                { title: "Context Awareness", desc: "AI remembers previous messages in the session, even after you refresh or switch devices." },
                                { title: "Cross-Platform Sync", desc: "Start on your laptop, continue on your phone. Your history travels with you." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-px h-full bg-white/10 relative">
                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zinc-800 border border-white/20" />
                                    </div>
                                    <div className="pb-8">
                                        <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                                        <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Visual representation of workspace */}
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 aspect-square flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-50" />
                        <Layers size={64} className="text-white/20 mb-6" />
                        <div className="text-center relative z-10">
                            <div className="bg-zinc-800 rounded-lg p-3 mb-3 border border-white/5 w-48 mx-auto flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="text-xs text-zinc-300">Project Alpha</span>
                            </div>
                            <div className="bg-zinc-800 rounded-lg p-3 mb-3 border border-white/5 w-48 mx-auto flex items-center gap-3 opacity-60">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="text-xs text-zinc-300">Website Redesign</span>
                            </div>
                            <div className="bg-zinc-800 rounded-lg p-3 border border-white/5 w-48 mx-auto flex items-center gap-3 opacity-40">
                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                                <span className="text-xs text-zinc-300">Marketing Assets</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 4: Vision & Voice */}
            <section className="py-24 px-6 bg-white/[0.02]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">See. Speak. Create.</h2>
                        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
                            Multimodal capabilities that expand how you interact with AI.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Vision Card */}
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-10 flex flex-col relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Sparkles size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6 text-indigo-400">
                                    <Sparkles size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">Vision Analysis</h3>
                                <p className="text-zinc-400 mb-6">Upload images to get instant analysis, code generation from UI screenshots, or detailed descriptions.</p>
                                <ul className="space-y-2 text-sm text-zinc-500">
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> PNG, JPG support</li>
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Cloudinary storage</li>
                                </ul>
                            </div>
                        </div>

                        {/* Voice Card */}
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-10 flex flex-col relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-6 text-orange-400">
                                    <Zap size={24} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">Voice Interaction</h3>
                                <p className="text-zinc-400 mb-6">Speak naturally to QueueBot. Advanced speech-to-text captures your intent without typing.</p>
                                <ul className="space-y-2 text-sm text-zinc-500">
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> Whisper Turbo integration</li>
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> Hands-free coding</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 5: Smart Features */}
            <section className="py-24 px-6 border-b border-white/5">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-center">
                    <div className="p-6">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
                            <Command size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Web Search</h3>
                        <p className="text-sm text-zinc-500">Integrated Tavily API for real-time information retrieval from the web.</p>
                    </div>
                    <div className="p-6">
                        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-400">
                            <Sparkles size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Weather Data</h3>
                        <p className="text-sm text-zinc-500">Instant visual weather cards and forecasts based on your location query.</p>
                    </div>
                    <div className="p-6">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400">
                            <MessageSquare size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">DeepMind Mode</h3>
                        <p className="text-sm text-zinc-500">Multi-step reasoning and consensus for complex problem solving.</p>
                    </div>
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
                    <div className="flex flex-wrap gap-6">
                        <Link to="/changelog" className="text-sm text-zinc-500 hover:text-white transition-colors">Changelog</Link>
                        <a href="#features" className="text-sm text-zinc-500 hover:text-white transition-colors">Features</a>
                        <a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">Documentation</a>
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

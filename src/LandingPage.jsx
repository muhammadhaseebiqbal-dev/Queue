import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap, Brain, MessageSquare, Layers, Command } from "lucide-react";
import { useAuth } from "./context/AuthContext";

function LandingPage() {
    const { token } = useAuth();
    const destination = token ? "/app" : "/signin";

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-indigo-500/30 overflow-x-hidden font-sans">

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                            <Sparkles size={18} className="text-white" fill="currentColor" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                            QueueBot
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to={destination} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                            {token ? "Dashboard" : "Sign In"}
                        </Link>
                        <Link
                            to={destination}
                            className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-indigo-50 transition-colors"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-400 text-xs font-medium mb-6"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        v2.0 Now Available with Vision & Voice
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
                    >
                        The Ultimate <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">
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

            {/* Feature Grid (Mobbin Style) */}
            <section className="py-20 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Card 1: DeepMind */}
                    <FeatureCard
                        icon={<Brain size={24} className="text-indigo-400" />}
                        title="DeepMind 2.0"
                        description="Multi-model consensus engine that debates via internal monologue to find the best answer."
                        image="https://res.cloudinary.com/dgif63g0l/image/upload/v1734081600/deepmind-demo.png" // Placeholder or generates one
                    />

                    {/* Card 2: Vision Analysis */}
                    <FeatureCard
                        icon={<Layers size={24} className="text-purple-400" />}
                        title="Vision Analysis"
                        description="Drop images directly into chat. Llama-4 Vision analyzes structures, code, and diagrams instantly."
                        className="md:col-span-2"
                    />

                    {/* Card 3: Voice Control */}
                    <FeatureCard
                        icon={<Zap size={24} className="text-yellow-400" />}
                        title="Voice Command"
                        description="Speak naturally. Auto-silence detection and Whisper Turbo transcription for hands-free coding."
                        className="md:col-span-2"
                    />

                    {/* Card 4: Projects */}
                    <FeatureCard
                        icon={<Command size={24} className="text-green-400" />}
                        title="Project Context"
                        description="Organize chats into Projects. Persistent context awareness across sessions."
                    />

                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 px-6 bg-zinc-900/20 border-y border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-4">
                            Workflow Reimagined
                        </h2>
                        <p className="text-zinc-400 text-lg">From concept to code in three simple steps.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="relative text-center">
                            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <span className="text-2xl font-bold text-indigo-400">1</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Connect</h3>
                            <p className="text-zinc-500">Integrate your GitHub, Google Drive, and local files directly into the context window.</p>
                        </div>
                        <div className="relative text-center">
                            <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <span className="text-2xl font-bold text-purple-400">2</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Orchestrate</h3>
                            <p className="text-zinc-500">Let the DeepMind consensus engine debate and refine the logic before writing a single line of code.</p>
                        </div>
                        <div className="relative text-center">
                            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <span className="text-2xl font-bold text-green-400">3</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Execute</h3>
                            <p className="text-zinc-500">Generate production-ready code, analyze images, and deploy seamlessly.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonial / Social Proof */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-6 h-6 rounded-full bg-zinc-700 border border-[#0A0A0A]"></div>
                            ))}
                        </div>
                        <span className="text-sm text-zinc-400">Trusted by 10,000+ developers</span>
                    </div>
                    <blockquote className="text-2xl md:text-3xl font-medium text-white mb-6 leading-relaxed">
                        "QueueBot isn't just a chatbot. It's like pair-programming with a senior engineer who has access to the entire internet and never gets tired."
                    </blockquote>
                    <cite className="text-zinc-500 not-italic block font-medium">
                        — Sarah J., Senior Frontend Architect
                    </cite>
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
            className={`relative group overflow-hidden bg-zinc-900/50 border border-white/5 rounded-3xl p-8 hover:border-indigo-500/30 transition-colors ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="mb-4 p-3 bg-white/5 rounded-2xl w-fit border border-white/5">
                    {icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
                <p className="text-zinc-400 leading-relaxed mb-8">{description}</p>

                {/* Abstract Visual Placeholder */}
                <div className="mt-auto w-full h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl border border-white/5 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                    <span className="text-zinc-600 text-xs font-mono uppercase tracking-widest">Preview</span>
                </div>
            </div>
        </motion.div>
    )
}

export default LandingPage;

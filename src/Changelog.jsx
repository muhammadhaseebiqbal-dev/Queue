import { Link } from "react-router-dom";
import { ArrowLeft, Check, Sparkles, Zap, Brain, Image as ImageIcon, Lock, Mail, Database, MessageSquare } from "lucide-react";

function Changelog() {
    const updates = [
        {
            date: "December 18, 2025",
            version: "v2.5.1",
            title: "Production Ready: Safety & SEO",
            items: [
                { icon: Check, text: "Search Engine Optimization: Fully optimized for 2025 ranking standards" },
                { icon: Zap, text: "PWA Support: Install QueueAI as a native app on any device" },
                { icon: Lock, text: "Strict Safety Filters: Enhanced NSFW & Policy Violation protection" },
                { icon: Sparkles, text: "Dependency Cleanup: Optimized backend performance" }
            ]
        },
        {
            date: "December 14, 2025",
            version: "v2.5.0",
            title: "Cross-Login Authentication & UI Enhancements",
            items: [
                { icon: Lock, text: "Implemented cross-login chat persistence (Google OAuth ↔ Magic Link)" },
                { icon: Mail, text: "Magic link email authentication with 15-minute token expiry" },
                { icon: Database, text: "Fixed duplicate session creation with smart deduplication" },
                { icon: MessageSquare, text: "Resolved context persistence issues - AI now remembers conversation history" },
                { icon: Sparkles, text: "Added logo.svg integration across sidebar, navbar, and sign-in" },
                { icon: Sparkles, text: "Created minimal welcome screen with logo for new chats" },
                { icon: Check, text: "Fixed chat area refresh bug when creating new sessions" },
                { icon: Check, text: "Prevented duplicate chat entries in sidebar" }
            ]
        },
        {
            date: "December 13, 2025",
            version: "v2.4.0",
            title: "Attachment & Streaming Improvements",
            items: [
                { icon: ImageIcon, text: "Fixed image and document attachment upload and persistence" },
                { icon: Zap, text: "Resolved streaming state issues (blinking cursor bug)" },
                { icon: Check, text: "Ensured action buttons (Like/Dislike/Copy) appear only after generation" },
                { icon: Database, text: "Fixed attachment preview disappearance after chat switching" },
                { icon: Check, text: "Implemented Cloudinary URL force download functionality" }
            ]
        },
        {
            date: "December 10, 2025",
            version: "v2.3.0",
            title: "DeepMind Multi-Model Analysis",
            items: [
                { icon: Brain, text: "Introduced DeepMind mode with multi-phase AI processing" },
                { icon: Zap, text: "Parallel model execution for comprehensive responses" },
                { icon: Sparkles, text: "Real-time progress indicators for DeepMind analysis" },
                { icon: Check, text: "Consensus synthesis from multiple AI models" }
            ]
        },
        {
            date: "December 5, 2025",
            version: "v2.2.0",
            title: "Vision & Voice Capabilities",
            items: [
                { icon: ImageIcon, text: "Image upload and analysis with AI vision" },
                { icon: ImageIcon, text: "AI image generation with DALL-E integration" },
                { icon: Sparkles, text: "Document upload support (PDF, DOCX, TXT)" },
                { icon: Check, text: "Cloudinary integration for persistent media storage" }
            ]
        },
        {
            date: "November 28, 2025",
            version: "v2.1.0",
            title: "Web Search & Weather Integration",
            items: [
                { icon: Zap, text: "Real-time web search with Tavily API" },
                { icon: Sparkles, text: "Weather data integration with visual cards" },
                { icon: Check, text: "Auto-search detection for queries requiring current information" },
                { icon: MessageSquare, text: "Search sources and progress logs display" }
            ]
        },
        {
            date: "November 20, 2025",
            version: "v2.0.0",
            title: "Project Management & Context",
            items: [
                { icon: Database, text: "Project creation and management system" },
                { icon: Brain, text: "Project-specific context injection for AI responses" },
                { icon: MessageSquare, text: "Session-based chat organization" },
                { icon: Check, text: "MongoDB integration for persistent storage" }
            ]
        },
        {
            date: "November 10, 2025",
            version: "v1.5.0",
            title: "Multi-Model Support",
            items: [
                { icon: Sparkles, text: "Added GPT-OSS 120B model" },
                { icon: Sparkles, text: "Added QWEN 3 32B model" },
                { icon: Sparkles, text: "Added LLAMA 3.3 70B model" },
                { icon: Sparkles, text: "Added KIMI K2 model" },
                { icon: Check, text: "Model switching with conversation separators" }
            ]
        },
        {
            date: "November 1, 2025",
            version: "v1.0.0",
            title: "Initial Release",
            items: [
                { icon: MessageSquare, text: "Real-time AI chat with streaming responses" },
                { icon: Lock, text: "Google OAuth authentication" },
                { icon: Sparkles, text: "Modern, responsive UI with dark theme" },
                { icon: Check, text: "Message feedback system (Like/Dislike)" },
                { icon: Check, text: "Copy to clipboard functionality" }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={18} />
                        <span className="text-sm">Back to Home</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <img src="/logo.svg" alt="QueueAI" className="h-8 w-8" />
                        <span className="text-sm font-bold">Changelog</span>
                    </div>
                </div>
            </div>

            {/* Hero */}
            <div className="pt-32 pb-16 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs font-medium mb-6"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Latest: v2.5.1
                    </div>
                    <h1
                        className="text-5xl md:text-6xl font-bold mb-4"
                    >
                        Changelog
                    </h1>
                    <p
                        className="text-lg text-zinc-400 max-w-2xl mx-auto"
                    >
                        Track every feature, improvement, and fix we've shipped to make QueueAI better.
                    </p>
                </div>
            </div>

            {/* Timeline */}
            <div className="max-w-4xl mx-auto px-6 pb-20">
                <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent hidden md:block" />

                    {updates.map((update, index) => (
                        <div
                            key={index}
                            className="relative mb-12 md:pl-20"
                        >
                            {/* Timeline Dot */}
                            <div className="absolute left-6 top-6 w-5 h-5 rounded-full bg-white border-4 border-[#0A0A0A] hidden md:block" />

                            {/* Content Card */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">{update.date}</div>
                                        <h3 className="text-xl font-bold text-white mb-1">{update.version}</h3>
                                        <p className="text-sm text-zinc-400">{update.title}</p>

                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    {update.items.map((item, itemIndex) => (
                                        <li
                                            key={itemIndex}
                                            className="flex items-start gap-3 text-sm text-zinc-300"
                                        >
                                            <item.icon size={16} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                                            <span>{item.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Changelog;

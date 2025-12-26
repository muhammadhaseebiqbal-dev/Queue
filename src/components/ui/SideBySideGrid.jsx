import { motion } from "framer-motion";
import MarkdownRenderer from "./MarkdownRenderer";
import { Bot, Rocket, Mountain, Moon } from "lucide-react";

const MODEL_CONFIG = {
    'gpt-oss-120b': { name: 'GPT-OSS', icon: Bot, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    'qwen-3-32b': { name: 'Qwen 3', icon: Rocket, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    'llama-3.3-70b': { name: 'Llama 3.3', icon: Mountain, color: 'text-green-400', bg: 'bg-green-500/10' },
    'kimi-k2': { name: 'Kimi K2', icon: Moon, color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
};

function SideBySideGrid({ streams, isLoading }) {
    const models = Object.keys(MODEL_CONFIG);

    return (
        <div className="flex-1 w-full h-full overflow-hidden p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
                {models.map((modelId) => {
                    const config = MODEL_CONFIG[modelId];
                    const content = streams[modelId] || "";
                    const Icon = config.icon;

                    return (
                        <div
                            key={modelId}
                            className="bg-secondary/50 border border-white/5 rounded-2xl flex flex-col h-full overflow-hidden backdrop-blur-sm"
                        >
                            {/* Header */}
                            <div className={`p-3 border-b border-white/5 flex items-center gap-2 ${config.bg}`}>
                                <Icon size={16} className={config.color} />
                                <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                                    {config.name}
                                </span>
                                {isLoading && !content && (
                                    <div className="ml-auto w-2 h-2 rounded-full bg-white/20 animate-pulse" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {content ? (
                                    <MarkdownRenderer content={content} />
                                ) : (
                                    <div className="h-full flex items-center justify-center opacity-20">
                                        <Icon size={32} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default SideBySideGrid;

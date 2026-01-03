import { motion } from "framer-motion"
import { Search, CheckCircle, Globe, ExternalLink, Sparkles } from "lucide-react"

function SearchStatus({ status, logs, sources, isAuto }) {
    if (!status && sources.length === 0) return null;

    const getStatusText = () => {
        if (status === 'searching') {
            const lastLog = logs[logs.length - 1];
            if (lastLog && lastLog.toLowerCase().includes("enhancing")) {
                return "Enhancing prompt...";
            }
            if (lastLog && lastLog.toLowerCase().includes("generating")) {
                return "Generating image...";
            }
            return "Searching the web...";
        }
        return "Finished task";
    };

    return (
        <div className="w-full mb-4 p-4 bg-tertiary/20 border border-border/50 rounded-2xl backdrop-blur-sm">
            {/* Status Header */}
            <div className="flex items-center gap-3 mb-3 text-textLight">
                {status === 'searching' ? (
                    <div className="flex items-center justify-center">
                        {logs.some(l => l.includes("Enhancing") || l.includes("Generating")) ? (
                            <Sparkles size={18} className="text-purple-400 animate-pulse" />
                        ) : (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            >
                                <Globe size={18} className="text-blue-400" />
                            </motion.div>
                        )}
                    </div>
                ) : (
                    <CheckCircle size={18} className="text-secondary" />
                )}
                <span className="text-sm font-medium flex items-center gap-2">
                    {getStatusText()}
                </span>
            </div>

            {/* Log Status (Single Line) */}
            {logs.length > 0 && status === 'searching' && (
                <div className="flex items-center gap-3 text-xs text-textLight/70 px-1">
                    <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                    <motion.p
                        key={logs[logs.length - 1]} // Trigger animation on change
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="truncate"
                    >
                        {logs[logs.length - 1]}
                    </motion.p>
                </div>
            )}

            {/* Sources Horizontal Scroll (Hide scrollbar) */}
            {sources.length > 0 && (
                <div className="mt-2 w-full">
                    <p className="text-xs font-semibold text-text uppercase tracking-wider mb-2 pl-1">Sources</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none w-full">
                        <style>{`
                            .scrollbar-none::-webkit-scrollbar {
                                display: none;
                            }
                            .scrollbar-none {
                                -ms-overflow-style: none;
                                scrollbar-width: none;
                            }
                        `}</style>
                        {sources.map((source, i) => (
                            <a
                                key={i}
                                href={source.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 w-48 bg-secondary border border-border hover:border-textLight transition-colors rounded-xl p-3 flex flex-col gap-2 group decoration-0"
                            >
                                <div className="flex items-center gap-2">
                                    <img
                                        src={source.icon}
                                        alt=""
                                        className="w-4 h-4 rounded-sm"
                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
                                    />
                                    <Globe size={14} className="hidden text-textLight" />
                                    <span className="text-xs text-textLight truncate flex-1">{new URL(source.link).hostname}</span>
                                </div>
                                <h4 className="text-xs font-medium text-text line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">
                                    {source.title}
                                </h4>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default SearchStatus

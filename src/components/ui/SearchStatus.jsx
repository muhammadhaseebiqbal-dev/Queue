import { motion } from "framer-motion"
import { Search, CheckCircle, Globe, ExternalLink } from "lucide-react"

function SearchStatus({ status, logs, sources, isAuto }) {
    if (!status && sources.length === 0) return null;

    return (
        <div className="w-full mb-4 p-4 bg-tertiary/20 border border-border/50 rounded-2xl backdrop-blur-sm">
            {/* Status Header */}
            <div className="flex items-center gap-3 mb-3 text-textLight">
                {status === 'searching' ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    >
                        <Search size={18} />
                    </motion.div>
                ) : (
                    <CheckCircle size={18} className="text-secondary" />
                )}
                <span className="text-sm font-medium flex items-center gap-2">
                    {status === 'searching' ? "Searching the web..." : "Finished searching"}
                    {isAuto && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 tracking-wide uppercase">
                            ✨ Auto
                        </span>
                    )}
                </span>
            </div>

            {/* Timeline Logs (Only show during search) */}
            {logs.length > 0 && status === 'searching' && (
                <div className="relative pl-4 space-y-4 mb-4">
                    {/* Vertical Line */}
                    <div className="absolute left-[5px] top-1 bottom-1 w-0.5 bg-border/50 rounded-full" />

                    {logs.map((log, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative pl-6"
                        >
                            {/* Timeline Dot */}
                            <div className="absolute left-[-15px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-tertiary" />
                            <p className="text-sm text-textLight/90">{log}</p>
                        </motion.div>
                    ))}
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

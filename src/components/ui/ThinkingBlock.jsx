import { Brain, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function ThinkingBlock({ content, streaming = false }) {
    const [isExpanded, setIsExpanded] = useState(false)

    // Auto-expand when streaming starts
    useEffect(() => {
        if (streaming) {
            setIsExpanded(true)
        }
    }, [streaming])

    return (
        <div className="my-4 border-2 border-border rounded-xl overflow-hidden bg-secondary/30">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {streaming ? (
                        <Loader2 size={18} className="text-textLight animate-spin" />
                    ) : (
                        <Brain size={18} className="text-textLight" />
                    )}
                    <span className="text-sm font-medium text-textLight">
                        {streaming ? 'Thinking...' : (isExpanded ? 'Hide reasoning' : 'Show reasoning')}
                    </span>
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown size={18} className="text-textLight" />
                </motion.div>
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 py-3 border-t-2 border-border bg-black/20">
                            <p className="text-sm text-textLight leading-relaxed whitespace-pre-wrap">
                                {content}
                                {streaming && <span className="inline-block w-2 h-4 ml-1 bg-textLight animate-pulse"></span>}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default ThinkingBlock

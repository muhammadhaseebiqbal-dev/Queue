import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Rocket, Mountain, Moon, Brain, CheckCircle2, Loader2 } from 'lucide-react'

function DeepMindProgress({ phase, phaseData }) {
    const modelIcons = {
        'gpt-oss-120b': Bot,
        'qwen-3-32b': Rocket,
        'llama-3.3-70b': Mountain,
        'kimi-k2': Moon
    }

    const getModelName = (id) => {
        const names = {
            'gpt-oss-120b': 'GPT-OSS 120B',
            'qwen-3-32b': 'QWEN 3 32B',
            'llama-3.3-70b': 'LLAMA 3.3 70B',
            'kimi-k2': 'KIMI K2'
        }
        return names[id] || id
    }

    const isComplete = phase >= 4;

    return (
        <div className="w-[85%] bg-secondary rounded-2xl p-5 mb-3 border border-border">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
                <Brain size={18} className="text-text" />
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-text">DeepMind Analysis {isComplete && '✓'}</h3>
                    <p className="text-xs text-textLight">
                        {isComplete ? 'Multi-model consensus complete' : 'Multi-model consensus processing • This may take 2-3 minutes'}
                    </p>
                </div>
            </div>

            <div className="mb-4">
                {/* Research Phase Indicator */}
                {phase === 0.5 && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Loader2 size={16} className="text-blue-400 animate-spin" />
                        <span className="text-xs font-medium text-blue-400">Gathering resources from the web...</span>
                    </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                    {phase >= 1 ? (
                        <div className="w-4 h-4 rounded-full bg-tertiary border border-border flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-text"></div>
                        </div>
                    ) : (
                        <div className={`w-4 h-4 rounded-full border border-border flex items-center justify-center ${phase === 0.5 ? 'bg-tertiary' : ''}`}>
                            {phase === 0.5 ? <div className="w-2 h-2 rounded-full bg-textLight/50"></div> : <Loader2 size={16} className="text-textLight animate-spin" />}
                        </div>
                    )}
                    <span className="text-xs font-medium text-text">Phase 1: Initial Analysis</span>
                </div>

                {phaseData.phase1Models && (
                    <div className="flex flex-wrap gap-2 ml-6">
                        {phaseData.phase1Models.map((model, idx) => {
                            const ModelIcon = modelIcons[model] || Bot
                            const isComplete = phaseData.phase1Complete && phaseData.phase1Complete.includes(model)
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-tertiary rounded-lg px-2 py-1.5 border border-border flex items-center gap-1.5"
                                >
                                    <ModelIcon size={12} className="text-textLight" />
                                    <span className="text-xs text-textLight">{getModelName(model)}</span>
                                    {isComplete && (
                                        <CheckCircle2 size={10} className="text-text" />
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </div>

            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{
                    opacity: phase >= 1 ? 1 : 0,
                    height: phase >= 1 ? 'auto' : 0
                }}
                className="mb-4"
            >
                <div className="flex items-center gap-2 mb-2">
                    {phase >= 2 ? (
                        <div className="w-4 h-4 rounded-full bg-tertiary border border-border flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-text"></div>
                        </div>
                    ) : phase >= 1 ? (
                        <Loader2 size={16} className="text-textLight animate-spin" />
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-tertiary border border-border"></div>
                    )}
                    <span className="text-xs font-medium text-text">Phase 2: Cross-Validation</span>
                </div>

                {phaseData.phase2Models && (
                    <div className="flex flex-wrap gap-2 ml-6">
                        {phaseData.phase2Models.map((model, idx) => {
                            const ModelIcon = modelIcons[model] || Bot
                            const isComplete = phaseData.phase2Complete && phaseData.phase2Complete.includes(model)
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-tertiary rounded-lg px-2 py-1.5 border border-border flex items-center gap-1.5"
                                >
                                    <ModelIcon size={12} className="text-textLight" />
                                    <span className="text-xs text-textLight">{getModelName(model)}</span>
                                    {isComplete && (
                                        <CheckCircle2 size={10} className="text-text" />
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{
                    opacity: phase >= 2 ? 1 : 0,
                    height: phase >= 2 ? 'auto' : 0
                }}
                className="mb-4"
            >
                <div className="flex items-center gap-2 mb-2">
                    {phase >= 3 ? (
                        <div className="w-4 h-4 rounded-full bg-tertiary border border-border flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-text"></div>
                        </div>
                    ) : phase >= 2 ? (
                        <Loader2 size={16} className="text-textLight animate-spin" />
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-tertiary border border-border"></div>
                    )}
                    <span className="text-xs font-medium text-text">Phase 3: Final Synthesis</span>
                </div>

                <div className="ml-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-tertiary rounded-lg px-2 py-1.5 border border-border flex items-center gap-1.5 w-fit"
                    >
                        <Bot size={12} className="text-textLight" />
                        <span className="text-xs text-textLight">GPT-OSS 120B</span>
                        {phase >= 3 && (
                            <CheckCircle2 size={10} className="text-text" />
                        )}
                    </motion.div>
                </div>
            </motion.div>

            <div className="mt-4 pt-4 border-t border-border">
                <div className="bg-tertiary rounded-full h-1 overflow-hidden">
                    <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min(((phase + 1) / 4) * 100, 100)}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-text"
                    />
                </div>
            </div>
        </div>
    )
}

export default DeepMindProgress

import { Brain, Earth, Lightbulb, Plus, Send, ChevronDown, Bot, Rocket, Mountain, Moon, Sparkles } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

function AiInput({ setIsChatStarted, isChatStarted, promptInput, setpromptInput, isSendPrompt, setIsSendPrompt, selectedModel, setSelectedModel, isDeepMindEnabled, setIsDeepMindEnabled, isWebSearchEnabled, setIsWebSearchEnabled }) {

    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)

    const models = [
        { id: 'gpt-oss-120b', name: 'GPT-OSS 120B', Icon: Bot },
        { id: 'qwen-3-32b', name: 'QWEN 3 32B', Icon: Rocket },
        { id: 'llama-3.3-70b', name: 'LLAMA 3.3 70B', Icon: Mountain },
        { id: 'kimi-k2', name: 'KIMI K2', Icon: Moon }
    ]

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsModelDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleChatStatus = () => {
        setIsChatStarted(isChatStarted)
        setIsSendPrompt(true)
    }

    const handlepromptInput = (e) => {
        setpromptInput(e.target.value)
    }

    const handleModelSelect = (modelId) => {
        setSelectedModel(modelId)
        setIsModelDropdownOpen(false)
    }

    return (
        <div className="bg-secondary border-2 border-border w-[70%] h-32 rounded-2xl p-1.5 flex flex-col justify-between">
            <input type="text" value={promptInput} onChange={handlepromptInput} className="h-14 text-text placeholder:text-textLight outline-none px-4 bg-transparent" placeholder="Ask Anything" />
            <div className="w-full bg-primary flex p-1 justify-between rounded-2xl border-2 border-borderLight">
                <div className="flex gap-1">
                    <button className="bg-tertiary w-11 h-11 rounded-2xl  border-borderLight border-2 text-text flex justify-center items-center">
                        <Plus size={18} />
                    </button>

                    {/* Search Button (Hidden if DeepMind is Enabled) */}
                    <AnimatePresence mode="popLayout">
                        {!isDeepMindEnabled && (
                            <motion.button
                                key="search-btn"
                                initial={{ width: 0, opacity: 0, scale: 0.8 }}
                                animate={{
                                    width: isWebSearchEnabled ? 110 : 44,
                                    opacity: 1,
                                    scale: 1,
                                    borderColor: isWebSearchEnabled ? '#3b82f6' : '#191919'
                                }}
                                exit={{ width: 0, opacity: 0, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                                className={`bg-tertiary h-11 rounded-2xl border-2 flex justify-center items-center overflow-hidden cursor-pointer ${isWebSearchEnabled ? 'text-blue-400 px-3 gap-2' : 'text-text'
                                    }`}
                            >
                                <Earth size={18} className={isWebSearchEnabled ? 'shrink-0' : ''} />
                                <motion.span
                                    animate={{
                                        opacity: isWebSearchEnabled ? 1 : 0,
                                        width: isWebSearchEnabled ? 'auto' : 0
                                    }}
                                    transition={{ duration: 0.2 }}
                                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                                >
                                    Search
                                </motion.span>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* DeepMind Button (Hidden if Search is Enabled) */}
                    <AnimatePresence mode="popLayout">
                        {!isWebSearchEnabled && (
                            <motion.button
                                key="deepmind-btn"
                                initial={{ width: 0, opacity: 0, scale: 0.8 }}
                                animate={{
                                    width: isDeepMindEnabled ? 130 : 44,
                                    opacity: 1,
                                    scale: 1,
                                    borderColor: isDeepMindEnabled ? '#3b82f6' : '#191919'
                                }}
                                exit={{ width: 0, opacity: 0, scale: 0.8 }}
                                onClick={() => setIsDeepMindEnabled(!isDeepMindEnabled)}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className={`bg-tertiary h-11 rounded-2xl border-2 flex justify-center items-center overflow-hidden cursor-pointer ${isDeepMindEnabled ? 'text-blue-400 px-3 gap-2' : 'text-text'
                                    }`}
                            >
                                <Brain size={18} className={isDeepMindEnabled ? 'shrink-0' : ''} />
                                <motion.span
                                    animate={{
                                        opacity: isDeepMindEnabled ? 1 : 0,
                                        width: isDeepMindEnabled ? 'auto' : 0
                                    }}
                                    transition={{ duration: 0.2 }}
                                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                                >
                                    DeepMind
                                </motion.span>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Model Dropdown (Hidden if EITHER DeepMind OR Search is Enabled) */}
                    <AnimatePresence mode="popLayout">
                        {!isDeepMindEnabled && !isWebSearchEnabled && (
                            <motion.div
                                key="model-selector"
                                initial={{ width: 0, opacity: 0, scale: 0.8 }}
                                animate={{ width: "auto", opacity: 1, scale: 1 }}
                                exit={{ width: 0, opacity: 0, scale: 0.8 }}
                                className="relative"
                                ref={dropdownRef}
                            >
                                <button
                                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                    className="bg-tertiary h-11 rounded-2xl border-borderLight border-2 text-text flex gap-2 px-3 justify-center items-center hover:bg-secondary transition-colors cursor-pointer whitespace-nowrap"
                                >
                                    {(() => {
                                        const SelectedIcon = models.find(m => m.id === selectedModel)?.Icon || Bot
                                        return <SelectedIcon size={16} />
                                    })()}
                                    <span className="text-sm">{models.find(m => m.id === selectedModel)?.name || 'Select Model'}</span>
                                    <ChevronDown size={16} className={`transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {isModelDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute bottom-full mb-2 left-0 bg-secondary border-2 border-border rounded-xl overflow-hidden shadow-lg z-50 min-w-[200px]"
                                        >
                                            {models.map((model) => {
                                                const ModelIcon = model.Icon
                                                return (
                                                    <button
                                                        key={model.id}
                                                        onClick={() => handleModelSelect(model.id)}
                                                        className={`w-full px-4 py-3 text-left hover:bg-primary transition-colors flex items-center gap-2 cursor-pointer ${selectedModel === model.id ? 'bg-tertiary' : ''
                                                            }`}
                                                    >
                                                        <ModelIcon size={16} className="text-text" />
                                                        <span className="text-sm text-text">{model.name}</span>
                                                    </button>
                                                )
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <button
                    onClick={toggleChatStatus}
                    className="bg-tertiary w-11 h-11 rounded-2xl border-borderLight border-2 text-text flex justify-center items-center">
                    <Send size={18} />
                </button>
            </div>
        </div>
    )
}

export default AiInput
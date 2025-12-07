import { Brain, Earth, Lightbulb, Plus, Send, ChevronDown, Bot, Rocket, Mountain, Moon, Sparkles } from "lucide-react"
import { useState } from "react"
import { motion } from "framer-motion"

function AiInput({ setIsChatStarted, isChatStarted, promptInput, setpromptInput, isSendPrompt, setIsSendPrompt, selectedModel, setSelectedModel, isDeepMindEnabled, setIsDeepMindEnabled }) {

    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
    
    const models = [
        { id: 'gpt-oss-120b', name: 'GPT-OSS 120B', Icon: Bot },
        { id: 'qwen-3-32b', name: 'QWEN 3 32B', Icon: Rocket },
        { id: 'llama-3.3-70b', name: 'LLAMA 3.3 70B', Icon: Mountain },
        { id: 'kimi-k2', name: 'KIMI K2', Icon: Moon }
    ]

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
            <input type="text" value={promptInput} onChange={handlepromptInput} className="h-14 text-textLight outline-none px-4" placeholder="Ask Anything" />
            <div className="w-full bg-primary flex p-1 justify-between rounded-2xl border-2 border-borderLight">
                <div className="flex gap-1">
                    <button className="bg-tertiary w-11 h-11 rounded-2xl  border-borderLight border-2 text-text flex justify-center items-center">
                        <Plus size={18} />
                    </button>
                    <button className="bg-tertiary w-11 h-11 rounded-2xl border-borderLight border-2 text-text flex justify-center items-center">
                        <Earth size={18} />
                    </button>
                    <motion.button
                        onClick={() => setIsDeepMindEnabled(!isDeepMindEnabled)}
                        animate={{
                            width: isDeepMindEnabled ? 'auto' : '44px',
                            borderColor: isDeepMindEnabled ? '#3b82f6' : '#191919'
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                        className={`bg-tertiary h-11 rounded-2xl border-2 flex gap-2 px-3 justify-center items-center overflow-hidden transition-colors ${
                            isDeepMindEnabled ? 'text-blue-400' : 'text-text'
                        }`}
                    >
                        <Brain size={18} />
                        {isDeepMindEnabled && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-sm font-medium whitespace-nowrap"
                            >
                                DeepMind
                            </motion.span>
                        )}
                    </motion.button>
                    <div className="relative">
                        <button
                            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                            className="bg-tertiary h-11 rounded-2xl border-borderLight border-2 text-text flex gap-2 px-3 justify-center items-center hover:bg-secondary transition-colors"
                        >
                            {(() => {
                                const SelectedIcon = models.find(m => m.id === selectedModel)?.Icon || Bot
                                return <SelectedIcon size={16} />
                            })()}
                            <span className="text-sm">{models.find(m => m.id === selectedModel)?.name || 'Select Model'}</span>
                            <ChevronDown size={16} className={`transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isModelDropdownOpen && (
                            <div className="absolute bottom-full mb-2 left-0 bg-secondary border-2 border-border rounded-xl overflow-hidden shadow-lg z-50 min-w-[200px]">
                                {models.map((model) => {
                                    const ModelIcon = model.Icon
                                    return (
                                        <button
                                            key={model.id}
                                            onClick={() => handleModelSelect(model.id)}
                                            className={`w-full px-4 py-3 text-left hover:bg-tertiary transition-colors flex items-center gap-2 ${
                                                selectedModel === model.id ? 'bg-tertiary' : ''
                                            }`}
                                        >
                                            <ModelIcon size={16} className="text-text" />
                                            <span className="text-sm text-text">{model.name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
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
import { Brain, Earth, Lightbulb, Plus, Send, ChevronDown, Bot, Rocket, Mountain, Moon, Sparkles, Paperclip, X, FileText, Image as ImageIcon, Mic, Square } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import axios from "axios"

import { API_URL } from "../../config"

function AiInput({ setIsChatStarted, isChatStarted, promptInput, setpromptInput, isSendPrompt, setIsSendPrompt, selectedModel, setSelectedModel, isDeepMindEnabled, setIsDeepMindEnabled, toggleDeepMind, isWebSearchEnabled, setIsWebSearchEnabled, attachment, setAttachment, activeProject, handleSend, isStreaming, stopGeneration, className }) {

    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)
    const fileInputRef = useRef(null)

    // Voice Input State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const silenceTimerRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const maxDurationTimerRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Use audio/webm;codecs=opus for better compression
            const options = { mimeType: 'audio/webm;codecs=opus' };
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            // Max recording duration: 5 minutes (safety limit)
            maxDurationTimerRef.current = setTimeout(() => {
                console.log('[Voice] Auto-stopping: Max duration reached (5m)');
                stopRecording();
            }, 300000);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
                console.log(`[Voice] Recording size: ${(audioBlob.size / 1024).toFixed(2)} KB`);

                // Check if file is too large (Groq limit appears to be ~25MB)
                if (audioBlob.size > 25 * 1024 * 1024) {
                    alert('Recording too large. Please keep it shorter.');
                    setIsRecording(false);
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                const formData = new FormData();
                formData.append('file', audioBlob, 'recording.webm');

                setIsRecording(false);
                setpromptInput("Transcribing...");

                if (maxDurationTimerRef.current) {
                    clearTimeout(maxDurationTimerRef.current);
                    maxDurationTimerRef.current = null;
                }
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }

                try {
                    const response = await axios.post(`${API_URL}/transcribe`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    setpromptInput(response.data.text);
                } catch (error) {
                    console.error("Transcription error:", error);
                    setpromptInput("Error transcribing audio.");
                }

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone.");
        }
    };


    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

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
        if (setIsChatStarted) {
            setIsChatStarted(true)
        }
        if (handleSend) {
            handleSend()
        } else if (setIsSendPrompt) {
            setIsSendPrompt(true)
        }
    }

    const handlepromptInput = (e) => {
        setpromptInput(e.target.value)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            triggerSend();
        }
    }

    const triggerSend = () => {
        if (setIsChatStarted) {
            setIsChatStarted(true);
        }
        if (handleSend) {
            handleSend();
        } else if (setIsSendPrompt) {
            setIsSendPrompt(true);
        }
    }

    const handleModelSelect = (modelId) => {
        setSelectedModel(modelId)
        setIsModelDropdownOpen(false)
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limit size (e.g. 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert("File is too large using context injection. Please use a file smaller than 10MB.");
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            setAttachment({
                name: file.name,
                type: file.type,
                content: event.target.result // Base64 or Text
            });
        };

        // For simplicity, read everything as Data URL (Base64) and handle parsing on server/client
        // Images NEED Data URL. PDFs/Docs can be parsed from Data URL buffer on backend.
        reader.readAsDataURL(file);

        // Reset input value so same file can be selected again if needed
        e.target.value = null;
    };

    return (
        <div className={`bg-secondary border-2 border-border min-h-[110px] rounded-2xl p-1.5 flex flex-col justify-between relative ${className || 'w-[95%] md:w-[70%]'}`}>

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept=".txt,.js,.jsx,.py,.html,.css,.json,.md,.csv,.pdf,.docx,image/*"
            />

            {/* Attachment Preview Pill */}
            <AnimatePresence>
                {attachment && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute top-[-60px] left-0 bg-secondary/95 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3 shadow-xl z-10"
                    >
                        <div className={`p-2 rounded-lg ${attachment.type.startsWith('image/') ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {attachment.type.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-text max-w-[180px] truncate">{attachment.name}</span>
                            <span className="text-[10px] text-textLight uppercase tracking-wider">{attachment.type.split('/')[1] || 'FILE'}</span>
                        </div>
                        <button
                            onClick={() => setAttachment(null)}
                            className="ml-2 bg-white/5 hover:bg-red-500/20 rounded-full p-1 text-textLight hover:text-red-400 transition-all"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <input
                type="text"
                value={promptInput}
                onChange={handlepromptInput}
                onKeyDown={handleKeyDown}
                className="h-14 text-text placeholder:text-textLight outline-none px-4 bg-transparent"
                placeholder={attachment ? "Type a message to send with your file..." : "Ask Anything"}
            />
            <div className="w-full bg-primary flex p-1 justify-between rounded-2xl border-2 border-borderLight">
                <div className="flex gap-1">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-11 h-11 rounded-2xl border-2 flex justify-center items-center transition-colors ${attachment ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-tertiary border-borderLight text-text'}`}
                    >
                        {attachment ? <Paperclip size={18} /> : <Plus size={18} />}
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
                                onClick={() => toggleDeepMind ? toggleDeepMind() : setIsDeepMindEnabled(!isDeepMindEnabled)}
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

                    {/* Voice Input Button */}
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-11 h-11 rounded-2xl border-2 flex justify-center items-center transition-all ${isRecording
                            ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                            : 'bg-tertiary border-borderLight text-text'
                            }`}
                    >
                        {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
                    </button>

                </div>


                {/* Listening Overlay (Glassmorphism) */}
                <AnimatePresence>
                    {isRecording && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl rounded-2xl flex flex-col justify-center items-center z-50"
                        >
                            {/* Minimal Sine Wave Visualization */}
                            <div className="relative w-48 h-16 flex items-center justify-center">
                                <svg className="w-full h-full" viewBox="0 0 200 50" preserveAspectRatio="xMidYMid meet">
                                    {[0, 1].map((wave) => (
                                        <motion.path
                                            key={wave}
                                            d={`M 0 25 Q 50 15 100 25 T 200 25`}
                                            fill="none"
                                            stroke={wave === 0 ? '#fafafa' : '#71717a'} // White & Zinc-500
                                            strokeWidth={wave === 0 ? "2" : "1.5"}
                                            strokeLinecap="round"
                                            initial={{ opacity: 0 }}
                                            animate={{
                                                d: [
                                                    `M 0 25 Q 50 ${15 - wave * 5} 100 25 T 200 25`,
                                                    `M 0 25 Q 50 ${35 + wave * 5} 100 25 T 200 25`,
                                                    `M 0 25 Q 50 ${15 - wave * 5} 100 25 T 200 25`,
                                                ],
                                                opacity: [0.3, 0.8, 0.3]
                                            }}
                                            transition={{
                                                duration: 1.5 + wave * 0.2,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                            }}
                                        />
                                    ))}
                                </svg>
                            </div>

                            <button
                                onClick={stopRecording}
                                className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all backdrop-blur-md border border-red-500/50 shadow-lg z-50"
                            >
                                <Square fill="currentColor" size={18} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-2 relative">
                    {/* Model Selector - Hidden when in a project */}
                    {!activeProject && (
                        <div className="relative hidden md:block" ref={dropdownRef}>
                            <button
                                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                className="bg-tertiary h-11 rounded-2xl border-2 border-borderLight px-3 flex items-center gap-2 text-text text-sm cursor-pointer hover:bg-secondary transition-colors w-[140px] justify-between"
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {(() => {
                                        const ModelIcon = models.find(m => m.id === selectedModel)?.Icon || Bot;
                                        return <ModelIcon size={16} className="shrink-0" />;
                                    })()}
                                    <span className="truncate">{models.find(m => m.id === selectedModel)?.name}</span>
                                </div>
                                <ChevronDown size={14} className={`text-textLight transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isModelDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full mb-2 left-0 w-[180px] bg-secondary border border-border rounded-xl shadow-xl overflow-hidden py-1 z-50"
                                    >
                                        {models.map((model) => (
                                            <button
                                                key={model.id}
                                                onClick={() => handleModelSelect(model.id)}
                                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-tertiary transition-colors ${selectedModel === model.id ? 'text-blue-400 bg-blue-500/10' : 'text-text'
                                                    }`}
                                            >
                                                <model.Icon size={16} />
                                                {model.name}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                    <button
                        onClick={isStreaming ? stopGeneration : toggleChatStatus}
                        className={`w-11 h-11 rounded-2xl flex justify-center items-center transition-all ${isStreaming
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : isChatStarted || promptInput || attachment
                                ? 'bg-white text-black'
                                : 'bg-tertiary text-textLight cursor-not-allowed'
                            }`}
                        disabled={!isStreaming && !isChatStarted && !promptInput && !attachment}
                    >
                        {isStreaming ? <Square size={18} fill="currentColor" /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AiInput
import { PanelRightOpen } from "lucide-react"
import AiInput from "../components/ui/AiInput"
import MarkdownRenderer from "../components/ui/MarkdownRenderer"
import DeepMindProgress from "../components/ui/DeepMindProgress"
import SearchStatus from "../components/ui/SearchStatus"
import WeatherCard from "../components/ui/WeatherCard"
import { motion } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { nanoid } from "nanoid"

function ChatArea({ isPanelExpanded, setIsPanelExpanded }) {

    const [isChatStarted, setIsChatStarted] = useState(false)
    const [promptInput, setpromptInput] = useState('')
    const [isSendPrompt, setIsSendPrompt] = useState(true)
    const [context, setcontext] = useState([])
    const [isStreaming, setIsStreaming] = useState(false)
    const [selectedModel, setSelectedModel] = useState('gpt-oss-120b')
    const [isDeepMindEnabled, setIsDeepMindEnabled] = useState(false)
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false)
    const [deepMindPhase, setDeepMindPhase] = useState(0)
    const [deepMindData, setDeepMindData] = useState({})
    const [userId] = useState(() => nanoid()) // Persist userId for the session
    const previousModel = useRef('gpt-oss-120b')
    const streamingMessageRef = useRef("")
    const eventSourceRef = useRef(null)
    const messagesEndRef = useRef(null)

    const scrollContainerRef = useRef(null)
    const shouldAutoScrollRef = useRef(true)

    // Handle scroll events to detect if user has scrolled up
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // If user is within 100px of bottom, auto-scroll is enabled
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        shouldAutoScrollRef.current = isAtBottom;
    }

    // Auto-scroll logic
    useEffect(() => {
        if (shouldAutoScrollRef.current) {
            // Use 'auto' (instant) behavior during streaming to prevent stutter
            // Use 'smooth' only when not streaming (e.g. new message added)
            messagesEndRef.current?.scrollIntoView({
                behavior: isStreaming ? 'auto' : 'smooth',
                block: 'end'
            });
        }
    }, [context, isStreaming])

    // Detect model change and add separator
    useEffect(() => {
        if (previousModel.current !== selectedModel && context.length > 0) {
            setcontext(prev => [...prev, {
                role: "separator",
                content: `Model changed to ${selectedModel.toUpperCase().replace(/-/g, ' ')}`,
                model: selectedModel
            }]);
        }
        previousModel.current = selectedModel;
    }, [selectedModel]);

    // Save context to backend whenever it changes
    useEffect(() => {
        if (context.length > 0) {
            axios.post('http://localhost:5000/context/save', {
                userId,
                messages: context
            }).catch(error => console.error('Error saving context:', error));
        }
    }, [context, userId]);

    const completeDeepMindQuery = async () => {
        if (!promptInput || !promptInput.trim()) return;

        try {
            setIsChatStarted(true);
            setcontext(prev => [...prev, { role: "user", content: promptInput }]);
            const userPrompt = promptInput;
            setpromptInput("");

            // Prepare DeepMind session
            const prepareRes = await axios.post("http://localhost:5000/deepmind/prepare", {
                userId,
                message: userPrompt
            });

            const { sessionId, session } = prepareRes.data;

            // Initialize DeepMind progress data
            setDeepMindData({
                phase1Models: session.phase1Models,
                phase1Complete: [],
                phase2Models: [],
                phase2Complete: []
            });
            setDeepMindPhase(0);

            // Add DeepMind progress indicator to context
            const progressIndex = context.length + 1;
            setcontext(prev => [...prev, { role: "deepmind-progress", index: progressIndex }]);

            // Add empty message for final response
            setcontext(prev => [...prev, { role: "system", content: "" }]);
            setIsStreaming(true);
            streamingMessageRef.current = "";

            // Open EventSource
            eventSourceRef.current = new EventSource(`http://localhost:5000/deepmind/stream/${sessionId}`);

            eventSourceRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'phase') {
                    setDeepMindPhase(data.phase);
                    if (data.phase === 2 && data.models) {
                        setDeepMindData(prev => ({ ...prev, phase2Models: data.models }));
                    }
                }

                if (data.type === 'phase1_complete') {
                    setDeepMindData(prev => ({
                        ...prev,
                        phase1Complete: [...(prev.phase1Complete || []), data.model]
                    }));
                }

                if (data.type === 'phase2_complete') {
                    setDeepMindData(prev => ({
                        ...prev,
                        phase2Complete: [...(prev.phase2Complete || []), data.model]
                    }));
                }

                if (data.type === 'content') {
                    streamingMessageRef.current += data.content;
                    setcontext(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                            role: "system",
                            content: streamingMessageRef.current,
                            streaming: true
                        };
                        return updated;
                    });
                }

                if (data.type === 'done') {
                    eventSourceRef.current.close();
                    setIsStreaming(false);
                    setDeepMindPhase(4); // Mark as fully complete (phase 4)
                    // Mark final message as complete but keep progress indicator
                    setcontext(prev => {
                        const updated = [...prev];
                        if (updated.length > 0 && updated[updated.length - 1].role === 'system') {
                            updated[updated.length - 1].streaming = false;
                        }
                        // Mark progress as complete
                        const progressIndex = updated.findIndex(msg => msg.role === 'deepmind-progress');
                        if (progressIndex !== -1) {
                            updated[progressIndex] = { ...updated[progressIndex], complete: true };
                        }
                        return updated;
                    });
                }

                if (data.type === 'error') {
                    console.error("DeepMind error:", data.error);
                    eventSourceRef.current.close();
                    setIsStreaming(false);
                    setDeepMindPhase(0);
                    setDeepMindData({});
                    setcontext(prev => [
                        ...prev.filter(msg => msg.role !== 'deepmind-progress'),
                        {
                            role: 'system',
                            content: `DeepMind analysis failed: ${data.error}. Please try again.`,
                            streaming: false
                        }
                    ]);
                }
            };

            eventSourceRef.current.onerror = (error) => {
                console.error("EventSource error:", error);
                eventSourceRef.current.close();
                setIsStreaming(false);
                setDeepMindPhase(0);
                setDeepMindData({});
                // Remove progress message and add error message
                setcontext(prev => [
                    ...prev.filter(msg => msg.role !== 'deepmind-progress'),
                    {
                        role: 'system',
                        content: 'DeepMind analysis failed. Please try again or use standard mode.',
                        streaming: false
                    }
                ]);
            };

        } catch (error) {
            console.error("DeepMind query error:", error);
            setIsStreaming(false);
        }
    };

    const completeQuery = async () => {
        if (!promptInput || !promptInput.trim()) return;

        // Route to DeepMind if enabled
        if (isDeepMindEnabled) {
            return completeDeepMindQuery();
        }

        try {
            // Set chat as started
            setIsChatStarted(true);

            // Add user message to context
            setcontext(prev => [...prev, { role: "user", content: promptInput }]);
            setpromptInput("");

            // Step 1: Prepare stream with userId for context
            const response = await axios.post("http://localhost:5000/prepare-stream", {
                message: promptInput,
                userId: userId,
                model: selectedModel,
                isWebSearchEnabled: isWebSearchEnabled,
                messages: [{ role: "user", content: promptInput }]
            });

            const { streamId } = response.data;

            // Add empty system message for streaming
            setcontext(prev => [...prev, {
                role: "system",
                content: "",
                searchStatus: isWebSearchEnabled ? 'searching' : null,
                searchLogs: [],
                searchSources: []
            }]);
            setIsStreaming(true);
            streamingMessageRef.current = "";

            // Step 2: Open SSE connection
            eventSourceRef.current = new EventSource(`http://localhost:5000/stream/${streamId}`);

            eventSourceRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.done) {
                    eventSourceRef.current.close();
                    setIsStreaming(false);
                    // Mark search as done if it was active
                    setcontext(prev => {
                        const updated = [...prev];
                        if (updated.length > 0 && updated[updated.length - 1].searchStatus === 'searching') {
                            updated[updated.length - 1].searchStatus = 'done';
                        }
                        return updated;
                    });
                    return;
                }

                if (data.error) {
                    console.error("Streaming error:", data.error);
                    eventSourceRef.current.close();
                    setIsStreaming(false);
                    return;
                }

                // Handle Search Events
                if (data.type === 'search_start') {
                    setcontext(prev => {
                        const updated = [...prev];
                        const lastMsg = updated[updated.length - 1];
                        if (lastMsg.role === 'system') {
                            lastMsg.searchStatus = 'searching';
                            // If backend signals auto search, flag it
                            if (data.isAuto) lastMsg.isAutoSearch = true;
                        }
                        return updated;
                    });
                }

                if (data.type === 'search_progress') {
                    setcontext(prev => {
                        const updated = [...prev];
                        const lastMsg = updated[updated.length - 1];
                        if (lastMsg.role === 'system') {
                            lastMsg.searchLogs = [...(lastMsg.searchLogs || []), data.message];
                        }
                        return updated;
                    });
                }

                if (data.type === 'search_source') {
                    setcontext(prev => {
                        const updated = [...prev];
                        const lastMsg = updated[updated.length - 1];
                        if (lastMsg.role === 'system') {
                            lastMsg.searchSources = [...(lastMsg.searchSources || []), data.source];
                        }
                        return updated;
                    });
                }

                if (data.type === 'weather_data') {
                    setcontext(prev => {
                        const updated = [...prev];
                        const lastMsg = updated[updated.length - 1];
                        if (lastMsg.role === 'system') {
                            lastMsg.weatherData = data.data;
                        }
                        return updated;
                    });
                }

                if (data.type === 'weather_data') {
                    setcontext(prev => {
                        const updated = [...prev];
                        const lastMsg = updated[updated.length - 1];
                        if (lastMsg.role === 'system') {
                            lastMsg.weatherData = data.data;
                        }
                        return updated;
                    });
                }

                if (data.content || (data.type === 'content' && data.content)) {
                    // Handle both simple {content: "..."} and typed {type: "content", content: "..."}
                    const newContent = data.content || (data.type === 'content' ? data.content : "");
                    streamingMessageRef.current += newContent;

                    // Update the last message with streamed content in real-time
                    setcontext(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                            ...updated[updated.length - 1],
                            content: streamingMessageRef.current,
                            streaming: true,
                            // Ensure search status is done once content starts flowing
                            searchStatus: updated[updated.length - 1].searchStatus === 'searching' ? 'done' : updated[updated.length - 1].searchStatus
                        };
                        return updated;
                    });
                }
            };

            eventSourceRef.current.onerror = (error) => {
                console.error("EventSource error:", error);
                eventSourceRef.current.close();
                setIsStreaming(false);
            };

        } catch (error) {
            console.error("Error preparing stream:", error);
            setIsStreaming(false);
        }
    }

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    useEffect(() => {
        if (isSendPrompt) {
            completeQuery();
            setIsSendPrompt(false);
        }
    }, [isSendPrompt]);

    // useEffect(() => {
    //     const eventSource = new EventSource("http://localhost:7000/completion");
    //     setIsStreaming(true)
    //     streamingMessageRef.current = ""

    //     // Add initial empty message for streaming
    //     setcontext(prev => [...prev, { role: "system", content: "" }])

    //     eventSource.onmessage = (event) => {
    //         if (event.data === "[DONE]") {
    //             eventSource.close();
    //             setIsStreaming(false)
    //             return;
    //         }
    //         streamingMessageRef.current += event.data
    //         // Update the last message with streamed content
    //         setcontext(prev => {
    //             const updated = [...prev]
    //             updated[updated.length - 1] = {
    //                 role: "system",
    //                 content: streamingMessageRef.current
    //             }
    //             return updated
    //         })
    //     };

    //     return () => eventSource.close();
    // }, []);

    const togglePanel = () => {
        setIsPanelExpanded(!isPanelExpanded)
    }

    return (
        <motion.div
            animate={{ width: isPanelExpanded ? '80%' : '100%' }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 35,
                mass: 0.6
            }}
            className="bg-primary relative h-screen flex flex-col justify-center items-center"
        >
            {/* Panel Toggle Button */}
            <motion.button
                onClick={togglePanel}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-text bg-tertiary hover:bg-secondary cursor-pointer p-3 rounded-2xl border-2 border-border flex justify-center items-center absolute top-3 left-3"
            >
                <motion.div
                    animate={{ rotate: isPanelExpanded ? 0 : 180 }}
                    transition={{
                        type: "spring",
                        stiffness: 180,
                        damping: 25
                    }}
                >
                    <PanelRightOpen />
                </motion.div>
            </motion.button>

            {/* Message Bubble Area */}
            <motion.div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                animate={{
                    height: isChatStarted ? '80%' : '0%',
                    opacity: isChatStarted ? 1 : 0
                }}
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 35
                }}
                className="w-[70%] py-4 overflow-y-auto scrollbar-hide"
            >
                {
                    context.map((node, index) => {
                        // Render DeepMind progress
                        if (node.role === "deepmind-progress") {
                            return (
                                <DeepMindProgress
                                    key={index}
                                    phase={deepMindPhase}
                                    phaseData={deepMindData}
                                />
                            )
                        }

                        // Render separator for model changes
                        if (node.role === "separator") {
                            return (
                                <div key={index} className="flex items-center gap-3 my-6 w-full">
                                    <div className="flex-1 h-px bg-border"></div>
                                    <span className="text-xs text-textLight px-3 py-1 rounded-full bg-tertiary border border-border">
                                        {node.content}
                                    </span>
                                    <div className="flex-1 h-px bg-border"></div>
                                </div>
                            )
                        }

                        // Render regular messages
                        // Render regular messages
                        return (
                            <div key={index} className="flex flex-col w-full mb-4">
                                {/* Weather Card - Full Width */}
                                {node.weatherData && (
                                    <div className="w-full">
                                        <WeatherCard data={node.weatherData} />
                                    </div>
                                )}

                                {/* Search Status - Full Width */}
                                {node.searchStatus && (
                                    <div className="w-full mb-2">
                                        <SearchStatus
                                            status={node.searchStatus}
                                            logs={node.searchLogs || []}
                                            sources={node.searchSources || []}
                                            isAuto={node.isAutoSearch}
                                        />
                                    </div>
                                )}

                                <motion.div
                                    className={`text-text p-4 rounded-2xl ${node.role == "user"
                                        ? 'bg-secondary ml-auto w-fit max-w-[80%]'
                                        : 'mr-auto w-full'
                                        }`}
                                >
                                    {node.role === "user" ? (
                                        <p className="text-text whitespace-pre-wrap">{node.content}</p>
                                    ) : (
                                        <MarkdownRenderer content={node.content} streaming={node.streaming} />
                                    )}
                                </motion.div>
                            </div>
                        )
                    })
                }
                <div ref={messagesEndRef} />
            </motion.div>

            {/* Input Area */}
            <motion.div
                layout
                className="w-full flex justify-center items-center"
            >
                <AiInput
                    promptInput={promptInput}
                    setpromptInput={setpromptInput}
                    setIsChatStarted={setIsChatStarted}
                    isChatStarted={isChatStarted}
                    isSendPrompt={isSendPrompt}
                    setIsSendPrompt={setIsSendPrompt}
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    isDeepMindEnabled={isDeepMindEnabled}
                    setIsDeepMindEnabled={setIsDeepMindEnabled}
                    isWebSearchEnabled={isWebSearchEnabled}
                    setIsWebSearchEnabled={setIsWebSearchEnabled}
                />
            </motion.div>
        </motion.div>
    )
}

export default ChatArea
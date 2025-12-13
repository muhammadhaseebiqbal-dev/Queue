import { Copy, Sparkles, Image as ImageIcon, FileText, PanelRightOpen, X, ThumbsUp, ThumbsDown } from "lucide-react";
import AiInput from "../components/ui/AiInput"
import MarkdownRenderer from "../components/ui/MarkdownRenderer";
import DeepMindProgress from "../components/ui/DeepMindProgress"
import SearchStatus from "../components/ui/SearchStatus";
import WeatherCard from "../components/ui/WeatherCard";
import ImageGenCard from "../components/ui/ImageGenCard";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { nanoid } from "nanoid"

function ChatArea({ isPanelExpanded, setIsPanelExpanded, ...PanelInteractionVars }) {

    const [isChatStarted, setIsChatStarted] = useState(false)
    const [promptInput, setpromptInput] = useState('')
    const [isSendPrompt, setIsSendPrompt] = useState(true)
    const [context, setcontext] = useState([])
    const [isStreaming, setIsStreaming] = useState(false)
    const [selectedModel, setSelectedModel] = useState('gpt-oss-120b')
    const [isDeepMindEnabled, setIsDeepMindEnabled] = useState(false)
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false)
    const [attachment, setAttachment] = useState(null) // New Attachment State
    const [deepMindPhase, setDeepMindPhase] = useState(0)
    const [deepMindData, setDeepMindData] = useState({})

    // const [userId] = useState(() => nanoid()) // Removed: using shared userId from App
    const userId = PanelInteractionVars.userId;

    const previousModel = useRef('gpt-oss-120b')
    const streamingMessageRef = useRef("")
    const eventSourceRef = useRef(null)
    const messagesEndRef = useRef(null)

    const scrollContainerRef = useRef(null)
    const shouldAutoScrollRef = useRef(true)

    // Lightbox State
    const [previewImage, setPreviewImage] = useState(null);

    // Load or reset chat based on session ID changes
    useEffect(() => {
        const loadSession = async () => {
            if (PanelInteractionVars?.activeSessionId) {
                // Load existing session
                try {
                    const response = await axios.get(`http://localhost:5000/api/messages/${PanelInteractionVars.activeSessionId}`);
                    const loadedMessages = response.data.messages;

                    if (loadedMessages && loadedMessages.length > 0) {
                        // Transform DB messages to UI format
                        const formattedMessages = loadedMessages.map(msg => ({
                            role: msg.role,
                            content: msg.content,
                            generatedImage: msg.generatedImage, // Include generated image data
                            type: msg.type, // Include message type
                            model: msg.model,
                            mode: msg.mode,
                            attachment: msg.attachment // Include attachment data
                        }));

                        console.log(`[ChatArea] Loaded ${formattedMessages.length} messages for session ${PanelInteractionVars.activeSessionId}`);
                        console.log('[ChatArea] Sample message:', formattedMessages[0]);

                        setcontext(formattedMessages);
                        setIsChatStarted(true);

                        // CRITICAL: Tell backend which session is active
                        await axios.post('http://localhost:5000/api/session/activate', {
                            userId,
                            sessionId: PanelInteractionVars.activeSessionId
                        });
                    }
                } catch (error) {
                    console.error('[ChatArea] Failed to load session:', error);
                }
            } else {
                // Reset for new chat
                setIsChatStarted(false);
                setcontext([]);
                setpromptInput('');
                setDeepMindPhase(0);
                setDeepMindData({});

                // Reset backend state
                axios.post('http://localhost:5000/api/session/reset', { userId })
                    .catch(err => console.error("Failed to reset session:", err));
            }
        };

        loadSession();
    }, [PanelInteractionVars?.activeSessionId, userId, PanelInteractionVars?.activeProject])

    // Auto-select largest context model when in a project, reset to default otherwise
    useEffect(() => {
        if (PanelInteractionVars?.activeProject) {
            // llama-3.3-70b-versatile has 128k context window (largest)
            setSelectedModel('llama-3.3-70b-versatile');
        } else {
            // Reset to default model for standard chats
            setSelectedModel('gpt-oss-120b');
        }
    }, [PanelInteractionVars?.activeProject]);

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
                content: `Model changed to ${selectedModel.toUpperCase().replace(/-/g, ' ')} `,
                model: selectedModel
            }]);
        }
        previousModel.current = selectedModel;
    }, [selectedModel]);

    // Save context to backend whenever it changes (debounced)
    useEffect(() => {
        if (context.length > 0) {
            const saveTimeout = setTimeout(() => {
                axios.post('http://localhost:5000/context/save', {
                    userId,
                    messages: context,
                    projectId: PanelInteractionVars?.activeProject?._id // Include project ID if active
                })
                    .then((response) => {
                        // Only refresh sidebar if backend created a NEW session
                        if (response.data?.isNewSession && PanelInteractionVars.triggerSidebarRefresh) {
                            console.log('[ChatArea] New session detected, refreshing sidebar');
                            PanelInteractionVars.triggerSidebarRefresh();
                        }
                    })
                    .catch(error => console.error('Error saving context:', error));
            }, 300); // Wait 300ms before saving to batch rapid changes

            return () => clearTimeout(saveTimeout);
        }
    }, [context, userId]);

    const completeDeepMindQuery = async () => {
        if (!promptInput || !promptInput.trim()) return;

        try {
            setIsChatStarted(true);
            setcontext(prev => [...prev, { role: "user", content: promptInput, model: selectedModel, mode: 'deepmind' }]);
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
            setcontext(prev => [...prev, { role: "assistant", content: "", model: 'deepmind-consensus', mode: 'deepmind' }]);
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
                            role: "assistant",
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
        if ((!promptInput || !promptInput.trim()) && !attachment) return; // Allow sending if only attachment exists

        // Route to DeepMind if enabled
        if (isDeepMindEnabled) {
            return completeDeepMindQuery();
        }

        try {
            // Set chat as started
            setIsChatStarted(true);

            // Add user message to context (Show attachment name if present)
            setcontext(prev => [...prev, {
                role: "user",
                content: promptInput,
                attachment: attachment, // Store metadata for UI rendering
                model: selectedModel,
                mode: 'standard'
            }]);
            const messageToSend = promptInput;
            setpromptInput("");
            const attachmentToSend = attachment; // Capture current attachment
            setAttachment(null); // Reset attachment state immediately

            // Step 1: Prepare stream with userId for context
            const response = await axios.post("http://localhost:5000/prepare-stream", {
                message: messageToSend,
                userId: userId,
                model: selectedModel,
                isWebSearchEnabled: isWebSearchEnabled,
                attachment: attachmentToSend, // Pass attachment to backend
                projectId: PanelInteractionVars?.activeProject?._id, // Pass active project ID
                messages: [{ role: "user", content: messageToSend }]
            });

            const { streamId } = response.data;

            // Add empty system message for streaming
            setcontext(prev => [...prev, {
                role: "assistant",
                content: "",
                streaming: true,
                searchStatus: isWebSearchEnabled ? 'searching' : null,
                searchLogs: [],
                searchSources: [],
                model: selectedModel,
                mode: 'standard'
            }]);
            setIsStreaming(true);
            streamingMessageRef.current = "";

            // Step 2: Open SSE connection
            eventSourceRef.current = new EventSource(`http://localhost:5000/stream/${streamId}`);

            eventSourceRef.current.onmessage = (event) => {
                // Handle [DONE] signal
                if (event.data === '[DONE]') {
                    eventSourceRef.current.close();
                    setIsStreaming(false);
                    setcontext(prev => {
                        const updated = [...prev];
                        if (updated.length > 0) {
                            updated[updated.length - 1].streaming = false;
                        }
                        return updated;
                    });
                    return;
                }

                let data;
                try {
                    data = JSON.parse(event.data);
                    console.log('[Stream Event]', data.type || 'chunk');
                } catch (e) {
                    console.error('[Stream] JSON Parse Error:', e);
                    return; // Skip invalid chunks
                }

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
                        if (lastMsg.role === 'assistant') {
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
                        if (lastMsg.role === 'assistant') {
                            lastMsg.searchLogs = [...(lastMsg.searchLogs || []), data.message];
                        }
                        return updated;
                    });
                }

                if (data.type === 'search_source') {
                    setcontext(prev => {
                        const updated = [...prev];
                        const lastMsg = updated[updated.length - 1];
                        if (lastMsg.role === 'assistant') {
                            lastMsg.searchSources = [...(lastMsg.searchSources || []), data.source];
                        }
                        return updated;
                    });
                }

                if (data.type === 'weather_data') {
                    setcontext(prev => {
                        const updated = [...prev];
                        const lastMsg = updated[updated.length - 1];
                        if (lastMsg.role === 'assistant') {
                            lastMsg.weatherData = data.data;
                        }
                        return updated;
                    });
                }

                if (data.type === 'image_generated') {
                    console.log('[Stream] Received Image:', data.url);
                    setcontext(prev => {
                        const updated = [...prev];
                        const lastIndex = updated.length - 1;
                        if (updated[lastIndex].role === 'assistant') {
                            updated[lastIndex] = {
                                ...updated[lastIndex],
                                generatedImage: {
                                    url: data.url,
                                    prompt: data.prompt
                                },
                                type: 'image_generated'
                            };
                        }
                        return updated;
                    });
                }

                if (data.type === 'attachment_uploaded') {
                    console.log('[Stream] Attachment Uploaded:', data.url);
                    setcontext(prev => {
                        const updated = [...prev];
                        // Find the last user message
                        const lastUserMsgIndex = updated.map(m => m.role).lastIndexOf('user');

                        if (lastUserMsgIndex !== -1) {
                            const msg = updated[lastUserMsgIndex];
                            // Update attachment content from Base64 to URL
                            if (msg.attachment) {
                                const updatedMsg = {
                                    ...msg,
                                    attachment: {
                                        ...msg.attachment,
                                        content: data.url
                                    }
                                };
                                updated[lastUserMsgIndex] = updatedMsg;

                                // FORCE SAVE IMMEDIATELY to ensure URL is persisted before any chat switch
                                // (Using the latest updated context array logic)
                                axios.post('http://localhost:5000/context/save', {
                                    userId,
                                    messages: updated,
                                    projectId: PanelInteractionVars?.activeProject?._id
                                }).then(() => console.log('[Stream] Context saved with persistent Image URL'))
                                    .catch(e => console.error('Failed to save persistent image:', e));
                            }
                        }
                        return updated;
                    });
                }

                if (data.type === 'attachment_processed') {
                    setcontext(prev => {
                        const updated = [...prev];
                        // Find the last user message to attach the hidden content to
                        // It's usually the one before the current system message being streamed
                        // or the last message if streaming hasn't fully started yet
                        const lastUserMsgIndex = updated.map(m => m.role).lastIndexOf('user');

                        if (lastUserMsgIndex !== -1) {
                            updated[lastUserMsgIndex] = {
                                ...updated[lastUserMsgIndex],
                                hiddenContent: updated[lastUserMsgIndex].content + data.content
                            };
                        }
                        return updated;
                    });
                    return; // Stop processing this event
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
            className="bg-primary relative h-screen flex flex-col justify-center items-center flex-1 w-full"
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
                style={{
                    maskImage: 'linear-gradient(to bottom, transparent, black 20px, black calc(100% - 20px), transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20px, black calc(100% - 20px), transparent)'
                }}
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
                                {/* Attachment Card */}
                                {/* Attachment Card */}
                                {node.attachment && (
                                    <div className="flex justify-end mb-2">
                                        <div className="overflow-hidden rounded-xl bg-secondary/50 border border-white/10 w-fit max-w-[80%]">
                                            {node.attachment.type.startsWith('image/') && node.attachment.content ? (
                                                <div
                                                    className="relative group cursor-pointer"
                                                    onClick={() => setPreviewImage(node.attachment.content)}
                                                >
                                                    <img
                                                        src={node.attachment.content}
                                                        alt={node.attachment.name}
                                                        className="max-w-xs max-h-64 object-cover rounded-t-xl"
                                                    />
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-xs text-white truncate block">{node.attachment.name}</span>
                                                    </div>
                                                </div>
                                            ) : (

                                                <a
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleDownload(node.attachment.content, node.attachment.name);
                                                    }}
                                                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                                                >
                                                    <div className={`p-2 rounded-lg ${node.attachment.type.startsWith('image/') ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                        {node.attachment.type.startsWith('image/') ? <ImageIcon size={20} /> : <FileText size={20} />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-text">{node.attachment.name}</span>
                                                        <span className="text-xs text-textLight uppercase">{node.attachment.type.split('/')[1] || 'FILE'}</span>
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )
                                }
                                {/* Weather Card - Full Width */}
                                {
                                    node.weatherData && (
                                        <div className="w-full">
                                            <WeatherCard data={node.weatherData} />
                                        </div>
                                    )
                                }

                                {/* Search Status - Full Width */}
                                {
                                    node.searchStatus && (
                                        <div className="w-full mb-2">
                                            <SearchStatus
                                                status={node.searchStatus}
                                                logs={node.searchLogs || []}
                                                sources={node.searchSources || []}
                                                isAuto={node.isAutoSearch}
                                            />
                                        </div>
                                    )
                                }

                                {/* Image Generation Card */}
                                {
                                    node.generatedImage && (
                                        <div className="w-full flex justify-start mb-4">
                                            <div onClick={() => setPreviewImage(node.generatedImage.url)} className="cursor-pointer">
                                                <ImageGenCard
                                                    imageUrl={node.generatedImage.url}
                                                    prompt={node.generatedImage.prompt}
                                                />
                                            </div>
                                        </div>
                                    )
                                }

                                {/* Only show text bubble if it's NOT a system message with an image */}
                                {(!node.generatedImage || node.role === 'user') && (
                                    <motion.div
                                        className={`text-text p-4 rounded-2xl ${node.role == "user"
                                            ? 'bg-secondary ml-auto w-fit max-w-[80%]'
                                            : 'mr-auto w-full'
                                            }`}
                                    >
                                        {node.role === "user" ? (
                                            <p className="text-text whitespace-pre-wrap">{node.content}</p>
                                        ) : (
                                            <MarkdownRenderer
                                                content={node.content}
                                                streaming={node.streaming}
                                                sources={node.searchSources}
                                            />
                                        )}

                                        {/* Response Actions (Like, Dislike, Copy) for Assistant ONLY */}
                                        {node.role === 'assistant' && !node.streaming && (
                                            <div className="flex items-center gap-2 mt-3 px-1">
                                                <button className="p-1.5 text-textLight hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                                    <ThumbsUp size={14} />
                                                </button>
                                                <button className="p-1.5 text-textLight hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                                    <ThumbsDown size={14} />
                                                </button>
                                                <button
                                                    className="p-1.5 text-textLight hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-auto"
                                                    onClick={() => navigator.clipboard.writeText(node.content)}
                                                    title="Copy to clipboard"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
)
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
                    handleSend={completeQuery}
                    isDeepMindEnabled={isDeepMindEnabled}
                    toggleDeepMind={() => setIsDeepMindEnabled(!isDeepMindEnabled)}
                    isWebSearchEnabled={isWebSearchEnabled}
                    setIsWebSearchEnabled={setIsWebSearchEnabled}
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    isChatStarted={isChatStarted}
                    isStreaming={isStreaming}
                    stopRecording={() => eventSourceRef.current?.close()}
                    attachment={attachment}
                    setAttachment={setAttachment}
                    activeProject={PanelInteractionVars?.activeProject}
                />
            </motion.div>

            {/* Image Modal Lightbox */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPreviewImage(null)}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 cursor-pointer"
                    >
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()} // Prevent close on image click
                        />
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div >
    )
}

export default ChatArea
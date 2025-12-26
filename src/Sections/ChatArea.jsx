import { Copy, Sparkles, Image as ImageIcon, FileText, PanelRightOpen, X, ThumbsUp, ThumbsDown, Check, Bot, Rocket, Mountain, Moon, ChevronDown, Trash2 } from "lucide-react";
import AiInput from "../components/ui/AiInput"
import MarkdownRenderer from "../components/ui/MarkdownRenderer";
import DeepMindProgress from "../components/ui/DeepMindProgress"
import SearchStatus from "../components/ui/SearchStatus";
import WeatherCard from "../components/ui/WeatherCard";
import ImageGenCard from "../components/ui/ImageGenCard";
import ConfirmModal from "../components/ui/ConfirmModal";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { nanoid } from "nanoid"
import { API_URL } from "../config"

function ChatArea({ isPanelExpanded, setIsPanelExpanded, ...PanelInteractionVars }) {

    const [isChatStarted, setIsChatStarted] = useState(false)
    const [promptInput, setpromptInput] = useState('')
    const [isSendPrompt, setIsSendPrompt] = useState(false)
    const [context, setcontext] = useState([])
    const [isStreaming, setIsStreaming] = useState(false)
    const [selectedModel, setSelectedModel] = useState('gpt-oss-120b')
    const [isDeepMindEnabled, setIsDeepMindEnabled] = useState(false)
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false)
    const [attachment, setAttachment] = useState(null) // New Attachment State
    const [deepMindPhase, setDeepMindPhase] = useState(0)
    const [deepMindData, setDeepMindData] = useState({})
    const [isMobileModelDropdownOpen, setIsMobileModelDropdownOpen] = useState(false)
    const [showScrollButton, setShowScrollButton] = useState(false)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [showResetModal, setShowResetModal] = useState(false)

    const models = [
        { id: 'gpt-oss-120b', name: 'GPT-OSS 120B', Icon: Bot },
        { id: 'qwen-3-32b', name: 'QWEN 3 32B', Icon: Rocket },
        { id: 'llama-3.3-70b', name: 'LLAMA 3.3 70B', Icon: Mountain },
        { id: 'kimi-k2', name: 'KIMI K2', Icon: Moon }
    ]

    // const [userId] = useState(() => nanoid()) // Removed: using shared userId from App
    const userId = PanelInteractionVars.userId;

    const handleDownload = async (url, filename) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();

            // Infer extension from blob type if missing in filename
            let downloadName = filename || 'download';
            if (!downloadName.includes('.')) {
                const mimeType = blob.type;
                const extension = mimeType.split('/')[1];
                if (extension) {
                    downloadName = `${downloadName}.${extension}`;
                }
            }

            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = downloadName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed, falling back to new tab:", error);
            window.open(url, '_blank');
        }
    };

    const previousModel = useRef('gpt-oss-120b')
    const streamingMessageRef = useRef("")
    const eventSourceRef = useRef(null)
    const messagesEndRef = useRef(null)

    const scrollContainerRef = useRef(null)
    const shouldAutoScrollRef = useRef(true)

    // Lightbox State
    const [previewImage, setPreviewImage] = useState(null);

    // Message Actions State
    const [copiedIndex, setCopiedIndex] = useState(null);

    const handleCopy = (content, index) => {
        navigator.clipboard.writeText(content);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleFeedback = (index, type) => {
        setcontext(prev => {
            const updated = [...prev];
            const msg = updated[index];

            // Toggle logic
            if (msg.feedback === type) {
                msg.feedback = null;
            } else {
                msg.feedback = type;
            }
            return updated;
        });
    };

    // Track the last loaded session to prevent duplicate loads
    const loadedSessionRef = useRef(null);

    // Load or reset chat based on session ID changes
    useEffect(() => {
        const currentSessionId = PanelInteractionVars?.activeSessionId;

        // Skip if we've already loaded this exact session
        if (loadedSessionRef.current === currentSessionId && currentSessionId !== null) {
            return;
        }

        // Clear immediately to avoid stale state
        setcontext([]);
        setIsChatStarted(false);

        const loadSession = async () => {
            const currentSessionId = PanelInteractionVars?.activeSessionId;

            if (!currentSessionId) {

                setcontext([]);
                setIsChatStarted(false);
                setIsLoadingHistory(false);
                return;
            }


            setIsLoadingHistory(true); // Show skeleton

            if (currentSessionId) {
                // Load existing session
                try {
                    const response = await axios.get(`${API_URL}/api/messages/${currentSessionId}`);
                    const loadedMessages = response.data.messages;

                    if (loadedMessages && loadedMessages.length > 0) {
                        // Transform DB messages to UI format
                        const formattedMessages = loadedMessages.map(msg => ({
                            role: msg.role,
                            content: msg.content,
                            generatedImage: msg.generatedImage,
                            type: msg.type,
                            model: msg.model,
                            mode: msg.mode,
                            attachment: msg.attachment,
                            feedback: msg.feedback
                        }));



                        setcontext(formattedMessages);
                        setIsChatStarted(true);

                        // Mark this session as loaded
                        loadedSessionRef.current = currentSessionId;

                        // Tell backend which session is active
                        await axios.post(`${API_URL}/api/session/activate`, {
                            userId,
                            sessionId: currentSessionId
                        });
                    }
                } catch (error) {
                    console.error('[ChatArea] Failed to load session:', error);
                } finally {
                    setIsLoadingHistory(false); // Hide skeleton
                }
            } else {
                // Reset for new chat
                loadedSessionRef.current = null;
                setIsChatStarted(false);
                setcontext([]);
                setpromptInput('');
                setDeepMindPhase(0);
                setDeepMindData({});
                setIsLoadingHistory(false);

                // Reset backend state
                axios.post(`${API_URL}/api/session/reset`, { userId })
                    .catch(err => console.error("Failed to reset session:", err));
            }
        };

        loadSession();
    }, [PanelInteractionVars?.activeSessionId, userId])

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

    // Handle Persona Switching
    useEffect(() => {
        if (PanelInteractionVars?.activePersona) {
            // Clear current chat context when switching to a persona
            setcontext([]);
            setIsChatStarted(false);
            setpromptInput('');
        }
    }, [PanelInteractionVars?.activePersona]);


    const mobileDropdownRef = useRef(null)

    // Close mobile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target)) {
                setIsMobileModelDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Handle scroll events to detect if user has scrolled up
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // If user is within 100px of bottom, auto-scroll is enabled
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        shouldAutoScrollRef.current = isAtBottom;
        setShowScrollButton(!isAtBottom); // Show button when not at bottom
    }

    // Scroll to bottom function
    const scrollToBottom = () => {
        scrollContainerRef.current?.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth'
        });
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

    // Use a Ref to track activeSessionId synchronously to prevent race conditions during rapid updates
    const activeSessionIdRef = useRef(PanelInteractionVars?.activeSessionId);
    const isCreatingSessionRef = useRef(false); // Only prevent duplicate session creation, not saves

    useEffect(() => {
        activeSessionIdRef.current = PanelInteractionVars?.activeSessionId;
        // If we now have a session ID, we're no longer creating one
        if (PanelInteractionVars?.activeSessionId) {
            isCreatingSessionRef.current = false;
        }
    }, [PanelInteractionVars?.activeSessionId]);

    // Save context to backend whenever it changes (debounced)
    useEffect(() => {
        if (context.length > 0) {
            const saveTimeout = setTimeout(() => {
                // FORCE use the ref to get the absolute latest ID, even if React state hasn't re-rendered yet
                const currentSessionId = activeSessionIdRef.current || PanelInteractionVars?.activeSessionId;

                // Only block if we're creating a NEW session (no sessionId) AND already creating one
                if (!currentSessionId && isCreatingSessionRef.current) {

                    return;
                }

                // Mark that we're creating a session if we don't have one
                if (!currentSessionId) {
                    isCreatingSessionRef.current = true;
                }

                axios.post(`${API_URL}/context/save`, {
                    userId,
                    messages: context,
                    sessionId: currentSessionId,
                    projectId: PanelInteractionVars?.activeProject?._id,
                    personaId: PanelInteractionVars?.activePersona?.id,
                    persona: PanelInteractionVars?.activePersona
                })
                    .then((response) => {
                        // Only refresh sidebar if backend created a NEW session
                        if (response.data?.isNewSession) {
                            // IMMEDIATELY update the ref so the next debounce call sees it
                            if (response.data.sessionId) {
                                activeSessionIdRef.current = response.data.sessionId; // Sync Ref immediately
                                isCreatingSessionRef.current = false; // Session created, unlock

                                // DON'T call setActiveSessionId here - it would trigger a reload
                                // We're already in an active conversation with these messages
                                // Just update the ref silently and refresh the sidebar
                            }

                            if (PanelInteractionVars.triggerSidebarRefresh) {

                                PanelInteractionVars.triggerSidebarRefresh();
                                // Note: We intentionally don't call setActiveSessionId to avoid reloading
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Error saving context:', error);
                        // Release the lock on error
                        if (!currentSessionId) {
                            isCreatingSessionRef.current = false;
                        }
                    });
            }, 500); // 500ms debounce - longer to batch more updates together

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
            const prepareRes = await axios.post(`${API_URL}/deepmind/prepare`, {
                userId,
                message: userPrompt,
                projectId: PanelInteractionVars?.activeProject?._id // Pass Active Project ID
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
            eventSourceRef.current = new EventSource(`${API_URL}/deepmind/stream/${sessionId}`);


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
                        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
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

            setAttachment(null); // Clear attachment

            // --- PERSONA CHAT FLOW ---
            if (PanelInteractionVars?.activePersona) {
                // Add empty system message for persona
                setcontext(prev => [...prev, {
                    role: "assistant",
                    content: "",
                    streaming: true,
                    model: 'gemini-3-flash-preview',
                    mode: 'persona',
                    persona: PanelInteractionVars.activePersona
                }]);
                setIsStreaming(true);
                streamingMessageRef.current = "";

                // Stream from Personas Endpoint
                fetch(`${API_URL}/api/personas/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        personaId: PanelInteractionVars.activePersona.id,
                        message: messageToSend,
                        previousMessages: context // Send full history for persona context
                    })
                }).then(async response => {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();

                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            const chunk = decoder.decode(value);
                            const lines = chunk.split('\n\n');

                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const dataStr = line.slice(6);
                                    if (dataStr === '[DONE]') {
                                        setIsStreaming(false);
                                        setcontext(prev => {
                                            const updated = [...prev];
                                            if (updated.length > 0) updated[updated.length - 1].streaming = false;
                                            return updated;
                                        });
                                        break;
                                    }

                                    try {
                                        const parsed = JSON.parse(dataStr);
                                        if (parsed.content) {
                                            const textChunk = parsed.content;
                                            streamingMessageRef.current += textChunk;

                                            setcontext(prev => {
                                                const updated = [...prev];
                                                if (updated.length > 0) {
                                                    updated[updated.length - 1].content = streamingMessageRef.current;
                                                }
                                                return updated;
                                            });
                                        }
                                    } catch (e) { console.error('Error parsing persona stream:', e); }
                                }
                            }
                        }
                    } catch (err) {
                        console.error('Stream reading error:', err);
                        setIsStreaming(false);
                    }
                }).catch(err => {
                    console.error('Persona API Error:', err);
                    setIsStreaming(false);
                });

                return; // STOP HERE (Do not run standard flow)
            }

            // Step 1: Prepare stream with userId for context
            const response = await axios.post(`${API_URL}/prepare-stream`, {
                message: messageToSend,
                userId: userId,
                model: selectedModel,
                isWebSearchEnabled: isWebSearchEnabled,
                attachment: attachmentToSend, // Pass attachment to backend
                projectId: PanelInteractionVars?.activeProject?._id, // Pass active project ID
                sessionId: activeSessionIdRef.current || PanelInteractionVars?.activeSessionId, // Pass session ID for context loading
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
            eventSourceRef.current = new EventSource(`${API_URL}/stream/${streamId}`);


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
                        if (updated.length > 0) {
                            // Fix: Ensure we mark the specific message as not streaming
                            updated[updated.length - 1].streaming = false;

                            // Also mark search as done if needed
                            if (updated[updated.length - 1].searchStatus === 'searching') {
                                updated[updated.length - 1].searchStatus = 'done';
                            }
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
                                axios.post(`${API_URL}/context/save`, {
                                    userId,
                                    messages: updated,
                                    sessionId: PanelInteractionVars.activeSessionId, // Fix for correct session update
                                    projectId: PanelInteractionVars?.activeProject?._id
                                }).then(() => { })
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
                        const lastIndex = updated.length - 1;

                        // Safety check: ensure last message exists
                        if (lastIndex >= 0 && updated[lastIndex]) {
                            updated[lastIndex] = {
                                ...updated[lastIndex],
                                content: streamingMessageRef.current,
                                streaming: true,
                                // Ensure search status is done once content starts flowing
                                searchStatus: updated[lastIndex].searchStatus === 'searching' ? 'done' : updated[lastIndex].searchStatus
                            };
                        }
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            className={`bg-primary relative h-screen flex flex-col items-center flex-1 w-full overflow-hidden ${isChatStarted ? 'justify-end' : 'justify-center'}`}
        >
            {/* Panel Toggle Button */}
            {/* Panel Toggle Button - Hidden when panel is open on mobile to prevent double toggles/visual clutter if using panel's own controls, but explicit here for consistency */}
            <motion.button
                onClick={togglePanel}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`text-text cursor-pointer absolute top-3 left-3 z-[60] flex justify-center items-center 
                md:bg-tertiary md:hover:bg-secondary md:rounded-2xl md:border-2 md:border-border md:p-3 md:h-auto md:w-auto
                bg-tertiary/80 backdrop-blur-md rounded-full border border-border/50 h-10 w-10 p-0 shadow-lg
                ${isPanelExpanded && window.innerWidth < 768 ? 'hidden' : 'flex'}`}
            >
                <motion.div
                    animate={{ rotate: isPanelExpanded ? 0 : 180 }}
                    transition={{
                        type: "spring",
                        stiffness: 180,
                        damping: 25
                    }}
                >
                    <PanelRightOpen size={18} />
                </motion.div>
            </motion.button>

            {/* Mobile Model Switcher */}
            {!PanelInteractionVars?.activeProject && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 md:hidden z-50 flex flex-col items-center" ref={mobileDropdownRef}>
                    <button
                        onClick={() => setIsMobileModelDropdownOpen(!isMobileModelDropdownOpen)}
                        className="bg-tertiary/80 backdrop-blur-md h-10 rounded-full border border-border/50 px-4 flex items-center gap-2 text-text text-sm shadow-lg"
                    >
                        {(() => {
                            const ModelIcon = models.find(m => m.id === selectedModel)?.Icon || Bot;
                            return <ModelIcon size={14} className="shrink-0 text-textLight" />;
                        })()}
                        <span className="font-medium text-xs">{models.find(m => m.id === selectedModel)?.name}</span>
                        <ChevronDown size={12} className={`text-textLight transition-transform duration-200 ${isMobileModelDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isMobileModelDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute top-full mt-2 w-[180px] bg-secondary/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1"
                            >
                                {models.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            setSelectedModel(model.id);
                                            setIsMobileModelDropdownOpen(false);
                                        }}
                                        className={`w-full px-4 py-3 text-left text-xs flex items-center gap-3 active:bg-white/10 transition-colors ${selectedModel === model.id ? 'text-blue-400 bg-blue-500/10' : 'text-text'
                                            }`}
                                    >
                                        <model.Icon size={14} />
                                        {model.name}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Welcome Screen - Shows when no chat is started */}
            {!isChatStarted && !PanelInteractionVars?.activePersona && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[200%] pointer-events-none"
                >
                    <img src="/logo.svg" alt="QueueAI" className="w-24 h-24 md:w-32 md:h-32 opacity-40" />
                </motion.div>
            )}

            {/* Persona Greeting Screen */}
            {!isChatStarted && PanelInteractionVars?.activePersona && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full max-w-2xl px-4 text-center mb-8 z-10"
                >
                    <div className="text-6xl mb-4">{PanelInteractionVars.activePersona.emoji}</div>
                    <h2 className="text-3xl font-bold text-text mb-2">{PanelInteractionVars.activePersona.name}</h2>
                    <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs text-textLight uppercase tracking-wider mb-6">
                        {PanelInteractionVars.activePersona.role}
                    </div>
                    <p className="text-xl text-textLight italic max-w-lg mx-auto leading-relaxed">
                        "{PanelInteractionVars.activePersona.greeting}"
                    </p>
                </motion.div>
            )}

            {/* Message Bubble Area */}
            <motion.div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                style={{
                    maskImage: 'linear-gradient(to bottom, transparent, black 20px, black calc(100% - 20px), transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20px, black calc(100% - 20px), transparent)'
                }}
                animate={{
                    flexGrow: isChatStarted ? 1 : 0,
                    height: isChatStarted ? 'auto' : 0,
                    opacity: isChatStarted ? 1 : 0
                }}
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 35
                }}
                className="w-full md:w-[70%] px-4 md:px-0 pt-20 pb-4 md:py-4 overflow-y-auto scrollbar-hide"
            >
                {/* Skeleton Loader */}
                {isLoadingHistory && (
                    <div className="w-full space-y-4 px-4 py-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} w-full animate-pulse`}>
                                <div className={`${i % 2 === 0 ? 'bg-secondary rounded-l-2xl rounded-tr-2xl' : 'bg-white/5 rounded-r-2xl rounded-tl-2xl'} p-4 w-2/3 space-y-3`}>
                                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                                    <div className="h-4 bg-white/10 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Messages */}
                {!isLoadingHistory && context.map((node, index) => {
                    return (
                        <div key={index} className="w-full max-w-4xl mx-auto mb-6 px-4">
                            {node.role === 'system' && !node.content.includes("SEARCH RESULTS") && !node.content.includes("CURRENT WEATHER DATA") ? null : (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full flex flex-col items-start gap-2"
                                >

                                    {/* Render DeepMind progress */}
                                    {node.role === "deepmind-progress" && (
                                        <DeepMindProgress
                                            phase={deepMindPhase}
                                            phaseData={deepMindData}
                                        />
                                    )}

                                    {/* Render separator for model changes */}
                                    {node.role === "separator" && (
                                        <div className="flex items-center gap-3 my-6 w-full">
                                            <div className="flex-1 h-px bg-border"></div>
                                            <span className="text-xs text-textLight px-3 py-1 rounded-full bg-tertiary border border-border">
                                                {node.content}
                                            </span>
                                            <div className="flex-1 h-px bg-border"></div>
                                        </div>
                                    )}



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

                                    {/* Image Generation Card */}
                                    {node.generatedImage && (
                                        <div className="w-full flex justify-start mb-4">
                                            <div onClick={() => setPreviewImage(node.generatedImage.url)} className="cursor-pointer">
                                                <ImageGenCard
                                                    imageUrl={node.generatedImage.url}
                                                    prompt={node.generatedImage.prompt}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Only show text bubble if it's NOT a system message with an image */}
                                    {(!node.generatedImage || node.role === 'user') && (
                                        <motion.div
                                            className={`text-text p-4 rounded-2xl ${node.role?.toLowerCase() === "user"
                                                ? 'bg-secondary ml-auto w-fit max-w-[80%]'
                                                : 'mr-auto w-full'
                                                }`}
                                        >
                                            {/* Attachment Preview (Moved Inside Bubble) */}
                                            {node.attachment && (
                                                <div className="mb-3 overflow-hidden rounded-xl bg-black/20 border border-white/5 w-full">
                                                    {node.attachment.type.startsWith('image/') && node.attachment.content ? (
                                                        <div
                                                            className="relative group cursor-pointer"
                                                            onClick={() => setPreviewImage(node.attachment.content)}
                                                        >
                                                            <img
                                                                src={node.attachment.content}
                                                                alt={node.attachment.name}
                                                                className="w-full max-h-64 object-cover"
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
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="text-sm font-medium text-text truncate">{node.attachment.name}</span>
                                                                <span className="text-xs text-textLight uppercase">{node.attachment.type.split('/')[1] || 'FILE'}</span>
                                                            </div>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            {node.role?.toLowerCase() === "user" ? (
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
                                                    <motion.button
                                                        whileTap={{ scale: 0.8 }}
                                                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                                        onClick={() => handleFeedback(index, 'like')}
                                                        className={`p-1.5 rounded-lg transition-colors ${node.feedback === 'like' ? 'text-green-400 bg-white/10' : 'text-textLight hover:text-white hover:bg-white/10'}`}
                                                        title="Like"
                                                    >
                                                        <ThumbsUp size={14} fill={node.feedback === 'like' ? "currentColor" : "none"} />
                                                    </motion.button>
                                                    <motion.button
                                                        whileTap={{ scale: 0.8 }}
                                                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                                        onClick={() => handleFeedback(index, 'dislike')}
                                                        className={`p-1.5 rounded-lg transition-colors ${node.feedback === 'dislike' ? 'text-red-400 bg-white/10' : 'text-textLight hover:text-white hover:bg-white/10'}`}
                                                        title="Dislike"
                                                    >
                                                        <ThumbsDown size={14} fill={node.feedback === 'dislike' ? "currentColor" : "none"} />
                                                    </motion.button>
                                                    <div className="ml-auto flex items-center">
                                                        {copiedIndex === index && <span className="text-xs text-green-400 mr-2 animate-fade-in">Copied!</span>}
                                                        <button
                                                            className="p-1.5 text-textLight hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                            onClick={() => handleCopy(node.content, index)}
                                                            title="Copy to clipboard"
                                                        >
                                                            {copiedIndex === index ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />


            </motion.div>



            {/* Input Area */}
            <motion.div
                layout
                className="w-full flex justify-center items-center pb-6 pt-2 shrink-0 z-10"
            >
                <div className="w-[95%] md:w-[70%] relative flex flex-col">
                    <AnimatePresence>
                        {showScrollButton && isChatStarted && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={scrollToBottom}
                                className="absolute bottom-full mb-3 right-0 p-2.5 bg-tertiary/90 backdrop-blur-xl border border-white/10 text-text rounded-full shadow-lg hover:bg-white/10 transition-colors z-20 group"
                            >
                                {isStreaming ? (
                                    <img src="/anim.gif" alt="Generating" className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                    <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                                )}
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Active Persona Indicator */}
                    <AnimatePresence>
                        {PanelInteractionVars?.activePersona && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-full left-0 mb-3 flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-lg z-20"
                            >
                                <span className="text-lg">{PanelInteractionVars.activePersona.emoji}</span>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-text">{PanelInteractionVars.activePersona.name}</span>
                                    <span className="text-[10px] text-textLight uppercase tracking-wider">{PanelInteractionVars.activePersona.category}</span>
                                </div>
                                {/* Reset Chat History Button */}
                                {isChatStarted && (
                                    <button
                                        onClick={() => setShowResetModal(true)}
                                        className="ml-2 p-1 hover:bg-orange-500/20 rounded-full text-textLight hover:text-orange-400 transition-colors"
                                        title="Reset conversation"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                                <button
                                    onClick={() => PanelInteractionVars?.setActivePersona(null)}
                                    className="ml-1 p-1 hover:bg-white/10 rounded-full text-textLight hover:text-white transition-colors"
                                    title="Close persona"
                                >
                                    <X size={12} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
                        stopGeneration={() => {
                            if (eventSourceRef.current) eventSourceRef.current.close();
                            setIsStreaming(false);
                            setcontext(prev => {
                                const updated = [...prev];
                                if (updated.length > 0) updated[updated.length - 1].streaming = false;
                                return updated;
                            });
                        }}
                        attachment={attachment}
                        setAttachment={setAttachment}
                        activeProject={PanelInteractionVars?.activeProject}
                        activePersona={PanelInteractionVars?.activePersona}
                        className="w-full"
                    />
                </div>
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

            {/* Reset Persona Conversation Modal */}
            <ConfirmModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={async () => {
                    if (PanelInteractionVars?.activeSessionId) {
                        try {
                            await axios.delete(`${API_URL}/api/sessions/${PanelInteractionVars.activeSessionId}`);
                            // Clear local state
                            setcontext([]);
                            setIsChatStarted(false);
                            PanelInteractionVars.setActiveSessionId(null);
                            PanelInteractionVars.triggerSidebarRefresh?.();
                        } catch (error) {
                            console.error('Failed to reset persona chat:', error);
                        }
                    }
                }}
                title="Reset Conversation"
                message={`Are you sure you want to reset your conversation with ${PanelInteractionVars?.activePersona?.name}? This will permanently delete all messages.`}
                confirmText="Reset"
                cancelText="Cancel"
                danger={true}
            />

        </motion.div >
    )
}

export default ChatArea
import { PanelRightOpen } from "lucide-react"
import AiInput from "../components/ui/AiInput"
import { motion } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { nanoid } from "nanoid"

function ChatArea({ isPanelExpanded, setIsPanelExpanded }) {

    const [isChatStarted, setIsChatStarted] = useState(true)
    const [promptInput, setpromptInput] = useState()
    const [isSendPrompt, setIsSendPrompt] = useState(true)
    const [context, setcontext] = useState([
        {
            role: "system",
            content: "Hello!"
        },
        {
            role: "user",
            content: "Hello! introduce yourself"
        },
    ])
    const [isStreaming, setIsStreaming] = useState(false)
    const streamingMessageRef = useRef("")
    const userId = nanoid();

    const completeQuery = async () => {
        try {
            const response = axios.post("http://localhost:5000/prepareCompletion", {
                message: promptInput,
                userId: nanoid,
            }, {
                headers: { "Content-Type": "application/json" }
            })

            const streamID = await response.json();
        } catch (error) {
            console.error(error)
        }
    }

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
                    context.map((node, index) => (
                        <motion.div
                            key={index}
                            className={`text-text w-fit p-3 rounded-2xl mb-3 ${node.role == "system" ? 'bg-secondary ml-auto' : 'bg-tertiary mr-auto'}`}
                        >
                            {node.content}
                        </motion.div>
                    ))
                }
            </motion.div>

            {/* Input Area */}
            <motion.div
                layout
                className="w-full flex justify-center items-center"
            >
                <AiInput promptInput={promptInput} setpromptInput={setpromptInput} setIsChatStarted={setIsChatStarted} isChatStarted={isChatStarted} isSendPrompt={isSendPrompt} setIsSendPrompt={setIsSendPrompt} />
            </motion.div>
        </motion.div>
    )
}

export default ChatArea
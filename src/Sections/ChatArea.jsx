import { PanelRightOpen } from "lucide-react"
import AiInput from "../components/ui/AiInput"
import { motion } from "framer-motion"


function ChatArea({ isPanelExpanded, setIsPanelExpanded }) {
    const togglePanel = () => {
        setIsPanelExpanded(!isPanelExpanded)
        console.log(isPanelExpanded);
    }

    return (
        <motion.div 
            animate={{ width: isPanelExpanded ? '80%' : '100%' }}
            transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8
            }}
            className="bg-primary relative h-screen flex justify-center items-center"
        >
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
                        stiffness: 200,
                        damping: 20
                    }}
                >
                    <PanelRightOpen />
                </motion.div>
            </motion.button>
            <AiInput />
        </motion.div>
    )
}

export default ChatArea
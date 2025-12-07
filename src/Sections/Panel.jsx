import { motion } from "framer-motion"

function Panel({ isPanelExpanded, setIsPanelExpanded }) {
    return (
        <motion.div 
            className="bg-secondary border-2 border-border h-screen overflow-hidden"
            initial={false}
            animate={{ 
                width: isPanelExpanded ? '20%' : '0%',
                borderWidth: isPanelExpanded ? '2px' : '0px'
            }}
            transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8
            }}
        >
            <div className="w-[300px] h-full">
                Panel
            </div>
        </motion.div>
    )
}

export default Panel
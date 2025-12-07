import { motion } from "framer-motion"
import { Plus, FolderOpen, MessageSquare, Plug, ChevronRight, Trash2, Clock } from "lucide-react"
import { useState } from "react"

function Panel({ isPanelExpanded, setIsPanelExpanded }) {
    const [activeSection, setActiveSection] = useState('chats')
    const [projects, setProjects] = useState([
        { id: 1, name: 'My First Project', chats: 3 },
        { id: 2, name: 'Research Notes', chats: 5 }
    ])
    const [chats, setChats] = useState([
        { id: 1, title: 'Introduction to AI', timestamp: '2 hours ago' },
        { id: 2, title: 'Code Review Help', timestamp: '5 hours ago' },
        { id: 3, title: 'Math Problem Solving', timestamp: 'Yesterday' }
    ])
    const [connectors, setConnectors] = useState([
        { id: 1, name: 'Google Drive', status: 'disconnected' },
        { id: 2, name: 'GitHub', status: 'disconnected' }
    ])

    return (
        <motion.div 
            className="bg-secondary border-2 border-border h-screen overflow-hidden flex flex-col"
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
            <div className="w-[300px] h-full flex flex-col">
                {/* Header */}
                <div className="p-4 border-b-2 border-border">
                    <h2 className="text-lg font-bold text-text mb-4">QueueBot</h2>
                    <button className="w-full bg-tertiary hover:bg-primary transition-colors border-2 border-border rounded-xl p-3 flex items-center gap-2 text-text">
                        <Plus size={18} />
                        <span className="text-sm font-medium">New Chat</span>
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b-2 border-border">
                    <button
                        onClick={() => setActiveSection('chats')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeSection === 'chats' 
                                ? 'text-text border-b-2 border-text' 
                                : 'text-textLight hover:text-text'
                        }`}
                    >
                        Chats
                    </button>
                    <button
                        onClick={() => setActiveSection('projects')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeSection === 'projects' 
                                ? 'text-text border-b-2 border-text' 
                                : 'text-textLight hover:text-text'
                        }`}
                    >
                        Projects
                    </button>
                    <button
                        onClick={() => setActiveSection('connectors')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeSection === 'connectors' 
                                ? 'text-text border-b-2 border-text' 
                                : 'text-textLight hover:text-text'
                        }`}
                    >
                        Connect
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {/* Chats Section */}
                    {activeSection === 'chats' && (
                        <div className="p-2">
                            {chats.map((chat) => (
                                <div
                                    key={chat.id}
                                    className="w-full p-3 mb-2 rounded-xl hover:bg-tertiary transition-colors flex items-start gap-2 group cursor-pointer"
                                >
                                    <MessageSquare size={16} className="text-textLight mt-1 flex-shrink-0" />
                                    <div className="flex-1 text-left overflow-hidden">
                                        <p className="text-sm text-text truncate">{chat.title}</p>
                                        <p className="text-xs text-textLight mt-1">{chat.timestamp}</p>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={14} className="text-textLight hover:text-red-400" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Projects Section */}
                    {activeSection === 'projects' && (
                        <div className="p-2">
                            <div className="p-4 text-center">
                                <FolderOpen size={40} className="text-textLight mx-auto mb-3" />
                                <p className="text-sm text-textLight mb-4">Organize your chats into projects</p>
                                <button className="bg-tertiary hover:bg-primary transition-colors border-2 border-border rounded-xl px-4 py-2 text-sm text-text">
                                    Create Project
                                </button>
                            </div>
                            {projects.map((project) => (
                                <button
                                    key={project.id}
                                    className="w-full p-3 mb-2 rounded-xl hover:bg-tertiary transition-colors flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <FolderOpen size={16} className="text-textLight" />
                                        <span className="text-sm text-text">{project.name}</span>
                                    </div>
                                    <span className="text-xs text-textLight">{project.chats} chats</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Connectors Section */}
                    {activeSection === 'connectors' && (
                        <div className="p-2">
                            <div className="p-4 text-center mb-4">
                                <Plug size={40} className="text-textLight mx-auto mb-3" />
                                <p className="text-sm text-textLight">Connect external services for enhanced functionality</p>
                            </div>
                            {connectors.map((connector) => (
                                <div
                                    key={connector.id}
                                    className="p-3 mb-2 rounded-xl bg-tertiary border-2 border-border flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <Plug size={16} className="text-textLight" />
                                        <span className="text-sm text-text">{connector.name}</span>
                                    </div>
                                    <button className="text-xs px-3 py-1 rounded-lg bg-primary border border-border text-textLight hover:text-text transition-colors">
                                        {connector.status === 'connected' ? 'Connected' : 'Connect'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t-2 border-border">
                    <div className="flex items-center gap-2 text-textLight text-xs">
                        <Clock size={12} />
                        <span>Last synced: Just now</span>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

export default Panel
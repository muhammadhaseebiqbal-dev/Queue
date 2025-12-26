import { motion, AnimatePresence } from "framer-motion"
import { Plus, FolderOpen, MessageSquare, Plug, ChevronRight, Trash2, Clock } from "lucide-react"
import { useState, useEffect } from "react"
import axios from 'axios'
import { API_URL } from '../config'

function Panel({ isPanelExpanded, setIsPanelExpanded, ...PanelInteractionVars }) {
    const [activeSection, setActiveSection] = useState('chats')
    const [projects, setProjects] = useState([])
    const [chats, setChats] = useState([]) // Sessions
    const [connectors] = useState([
        { id: 1, name: 'Google Drive', status: 'disconnected' },
        { id: 2, name: 'GitHub', status: 'disconnected' }
    ])

    // Fetch Sidebar Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get userId from props
                const userId = PanelInteractionVars.userId;
                if (!userId) return; // Wait for userId to be available

                const response = await axios.get(`${API_URL}/api/sidebar/${userId}`);
                const { projects, sessions } = response.data;

                setProjects(projects);

                // Deduplicate and Map sessions
                const uniqueSessions = new Map();
                sessions.forEach(s => {
                    if (!uniqueSessions.has(s._id)) {
                        uniqueSessions.set(s._id, {
                            id: s._id,
                            title: s.title,
                            timestamp: new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        });
                    }
                });

                setChats(Array.from(uniqueSessions.values()));

            } catch (error) {
                console.error("Error fetching sidebar data:", error);
            }
        }

        if (isPanelExpanded) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPanelExpanded, PanelInteractionVars.sidebarRefreshKey]);

    const handleNewChat = () => {
        // Reset ChatArea state via parent
        if (PanelInteractionVars.setActiveSessionId) {
            PanelInteractionVars.setActiveSessionId(null);
        }
        // Clear active project for standard chats
        if (PanelInteractionVars.setActiveProject) {
            PanelInteractionVars.setActiveProject(null);
        }

        // Close panel on mobile for better UX
        if (window.innerWidth < 768 && setIsPanelExpanded) {
            setIsPanelExpanded(false);
        }
    }

    // Project creation state
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectColor, setNewProjectColor] = useState('#6366f1');
    const [newProjectEmoji, setNewProjectEmoji] = useState('📁');
    const [newProjectDescription, setNewProjectDescription] = useState('');

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;

        try {
            const response = await axios.post(`${API_URL}/api/projects`, {
                userId: PanelInteractionVars.userId,
                name: newProjectName,
                color: newProjectColor,
                emoji: newProjectEmoji,
                description: newProjectDescription
            });

            // Add to local state
            setProjects(prev => [response.data, ...prev]);

            // Reset and close modal
            setNewProjectName('');
            setNewProjectColor('#6366f1');
            setNewProjectEmoji('📁');
            setNewProjectDescription('');
            setShowProjectModal(false);
        } catch (error) {
            console.error('Failed to create project:', error);
        }
    }

    const handleDeleteChat = async (chatId, event) => {
        // Prevent triggering the chat selection
        event.stopPropagation();

        try {
            await axios.delete(`${API_URL}/api/session/${chatId}?userId=${PanelInteractionVars.userId}`);

            // Remove from local state
            setChats(prev => prev.filter(chat => chat.id !== chatId));

            // If this was the active chat, clear it
            if (PanelInteractionVars.activeSessionId === chatId) {
                PanelInteractionVars.setActiveSessionId(null);
            }

        } catch (error) {
            console.error('Failed to delete chat:', error);
        }
    }

    // Animation variants for tab content
    const tabVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
        exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
    };

    return (
        <>
            {/* Mobile Backdrop Overlay */}
            <AnimatePresence>
                {isPanelExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsPanelExpanded(false)}
                        className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
                    />
                )}
            </AnimatePresence>

            <motion.div
                className={`bg-secondary border-r-2 border-border h-screen overflow-hidden flex flex-col flex-shrink-0 
                fixed md:relative left-0 top-0 z-[100] md:z-auto shadow-2xl md:shadow-none`}
                initial={false}
                animate={{
                    width: isPanelExpanded ? (window.innerWidth < 768 ? '85%' : '280px') : '0px',
                    x: isPanelExpanded ? 0 : (window.innerWidth < 768 ? -20 : 0), // Slide out on mobile
                    opacity: isPanelExpanded ? 1 : (window.innerWidth < 768 ? 0 : 0)
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8
                }}
            >
                <div className="w-full h-full flex flex-col">
                    {/* Header */}
                    <div className="p-4 bg-secondary flex justify-between items-center">
                        <img src="/logo.svg" alt="QueueAI" className="h-8 w-auto" />
                        <button
                            onClick={() => setIsPanelExpanded(false)}
                            className="md:hidden p-2 text-textLight hover:text-text"
                        >
                            <ChevronRight size={20} className="rotate-180" />
                        </button>
                    </div>

                    <div className="px-4 pb-4 bg-secondary">
                        <button
                            onClick={handleNewChat}
                            className="w-full bg-tertiary hover:bg-primary transition-colors border-2 border-border rounded-xl p-3 flex items-center gap-2 text-text"
                        >
                            <Plus size={18} />
                            <span className="text-sm font-medium">New Chat</span>
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex border-b-2 border-border p-0 gap-0 mx-0 mt-0 rounded-none bg-secondary">
                        {['chats', 'projects', 'connectors'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveSection(tab)}
                                className={`flex-1 py-3 text-sm font-medium transition-colors rounded-none capitalize ${activeSection === tab
                                    ? 'text-text border-b-2 border-text bg-tertiary'
                                    : 'text-textLight hover:text-text hover:bg-tertiary'
                                    }`}
                            >
                                {tab === 'connectors' ? 'Apps' : tab}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide p-0 relative">
                        <AnimatePresence mode="wait">
                            {activeSection === 'chats' && (
                                <motion.div
                                    key="chats"
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={tabVariants}
                                    className="p-2 space-y-1 absolute w-full"
                                >
                                    {chats.map((chat) => (
                                        <div
                                            key={chat.id}
                                            onClick={() => {
                                                PanelInteractionVars.setActiveSessionId(chat.id);
                                                PanelInteractionVars.setActiveProject?.(null); // Clear project for regular chats
                                            }}
                                            className={`w-full p-3 rounded-xl transition-colors flex items-start gap-2 group cursor-pointer ${PanelInteractionVars?.activeSessionId === chat.id && !PanelInteractionVars?.activeProject
                                                ? 'bg-[#1a1a1a]' // Dark solid background for active chat
                                                : 'hover:bg-tertiary'
                                                }`}
                                        >
                                            <MessageSquare size={16} className="text-textLight mt-1 flex-shrink-0" />
                                            <div className="flex-1 text-left overflow-hidden">
                                                <p className="text-sm text-text truncate font-medium">{chat.title}</p>
                                                <p className="text-xs text-textLight mt-1">{chat.timestamp}</p>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteChat(chat.id, e)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={14} className="text-textLight hover:text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {activeSection === 'projects' && (
                                <motion.div
                                    key="projects"
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={tabVariants}
                                    className="p-2 space-y-2 absolute w-full"
                                >
                                    <div className="p-4 text-center border-2 border-dashed border-border rounded-xl m-2">
                                        <FolderOpen size={32} className="text-textLight mx-auto mb-3" />
                                        <p className="text-sm text-textLight mb-3">Group your research</p>
                                        <button
                                            onClick={() => setShowProjectModal(true)}
                                            className="bg-tertiary hover:bg-primary transition-colors border-2 border-border rounded-lg px-4 py-2 text-sm text-text font-medium"
                                        >
                                            + Create Project
                                        </button>
                                    </div>
                                    {projects.map((project) => (
                                        <button
                                            key={project._id || project.id}
                                            onClick={async () => {
                                                // Set active project
                                                PanelInteractionVars.setActiveProject(project);

                                                // Fetch sessions for this project to find the latest one
                                                try {
                                                    const response = await axios.get(`${API_URL}/api/project/${project._id}/sessions`);
                                                    const sessions = response.data.sessions;

                                                    if (sessions && sessions.length > 0) {
                                                        // Continuous Chat: Load the most recent session
                                                        PanelInteractionVars.setActiveSessionId(sessions[0]._id);
                                                    } else {
                                                        // No session exists, start clean (will create one on first message)
                                                        PanelInteractionVars.setActiveSessionId(null);
                                                    }
                                                } catch (error) {
                                                    console.error("Error fetching project sessions:", error);
                                                    PanelInteractionVars.setActiveSessionId(null);
                                                }
                                            }}
                                            className={`w-full p-3 rounded-xl transition-colors flex items-center justify-between group ${PanelInteractionVars?.activeProject?._id === project._id
                                                ? 'bg-[#1a1a1a]' // Dark solid background for active project
                                                : 'hover:bg-tertiary'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="text-lg flex-shrink-0"
                                                    style={{ filter: 'grayscale(1)' }}
                                                >
                                                    {project.emoji || '📁'}
                                                </span>
                                                <span className="text-sm text-text font-medium">{project.name}</span>
                                            </div>
                                            <span className="text-xs text-textLight bg-primary px-2 py-0.5 rounded-full border border-border">{project.chats || 0}</span>
                                        </button>
                                    ))}
                                </motion.div>
                            )}

                            {activeSection === 'connectors' && (
                                <motion.div
                                    key="connectors"
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={tabVariants}
                                    className="p-2 space-y-2 absolute w-full"
                                >
                                    {connectors.map((connector) => (
                                        <div
                                            key={connector.id}
                                            className="p-3 rounded-xl bg-tertiary border-2 border-border flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Plug size={16} className="text-textLight" />
                                                <span className="text-sm text-text font-medium">{connector.name}</span>
                                            </div>
                                            <div className={`text-xs px-2 py-1 rounded border border-border ${connector.status === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-primary text-textLight'}`}>
                                                {connector.status === 'connected' ? 'Connected' : 'Disconnected'}
                                            </div>
                                        </div>
                                    ))}
                                    <button className="w-full py-2.5 text-xs font-medium text-textLight hover:text-text border-2 border-dashed border-border rounded-xl hover:bg-tertiary transition-colors">
                                        + Add Connector
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t-2 border-border bg-secondary">
                        <div className="flex items-center gap-2 text-textLight text-xs">
                            <Clock size={12} />
                            <span>Synced</span>
                        </div>
                    </div>
                </div>

                {/* Project Creation Modal */}
                <AnimatePresence>
                    {showProjectModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                            onClick={() => setShowProjectModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-secondary border-2 border-border rounded-2xl p-6 w-96 shadow-2xl"
                            >
                                <h3 className="text-lg font-bold text-text mb-4">Create New Project</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-textLight mb-2 block">Project Name</label>
                                        <input
                                            type="text"
                                            value={newProjectName}
                                            onChange={(e) => setNewProjectName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                                            placeholder="e.g., Research Papers"
                                            className="w-full bg-primary border-2 border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-text transition-colors"
                                            autoFocus
                                        />
                                    </div>


                                    <div>
                                        <label className="text-sm text-textLight mb-2 block">Icon</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {['📁', '📚', '💼', '🎯', '🔬', '💡', '🎨', '⚡', '🚀', '📊', '🔧', '🌟'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => setNewProjectEmoji(emoji)}
                                                    className={`w-10 h-10 rounded-lg transition-all text-2xl grayscale hover:grayscale-0 ${newProjectEmoji === emoji
                                                        ? 'ring-2 ring-text ring-offset-2 ring-offset-secondary scale-110 grayscale-0'
                                                        : ''
                                                        }`}
                                                    style={{
                                                        backgroundColor: newProjectEmoji === emoji ? newProjectColor + '20' : 'transparent',
                                                        filter: newProjectEmoji === emoji ? 'none' : 'grayscale(1)'
                                                    }}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm text-textLight mb-2 block">Description (Context)</label>
                                        <textarea
                                            value={newProjectDescription}
                                            onChange={(e) => setNewProjectDescription(e.target.value)}
                                            placeholder="This context will be added to all chats in this project..."
                                            className="w-full bg-primary border-2 border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-text transition-colors resize-none"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-6">
                                    <button
                                        onClick={() => setShowProjectModal(false)}
                                        className="flex-1 bg-primary hover:bg-tertiary border-2 border-border rounded-lg px-4 py-2 text-sm text-text font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateProject}
                                        disabled={!newProjectName.trim()}
                                        className="flex-1 bg-text hover:bg-text/90 border-2 border-text rounded-lg px-4 py-2 text-sm text-primary font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Create
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    )

}

export default Panel
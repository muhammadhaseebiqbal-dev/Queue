import { motion, AnimatePresence } from "framer-motion"
import { Plus, FolderOpen, MessageSquare, Plug, ChevronRight, Trash2, Clock, Users, ChevronDown } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import axios from 'axios'
import { API_URL } from '../config'
import ConfirmModal from '../components/ui/ConfirmModal'

function Panel({ isPanelExpanded, setIsPanelExpanded, ...PanelInteractionVars }) {
    const [activeSection, setActiveSection] = useState('chats')
    const [projects, setProjects] = useState([])
    const [chats, setChats] = useState([]) // Sessions
    const [connectors, setConnectors] = useState([
        { id: 1, name: 'Google Drive', status: 'disconnected' },
        { id: 2, name: 'GitHub', status: 'disconnected' }
    ])

    const [isLoading, setIsLoading] = useState(false)
    const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false)
    const [projectToDelete, setProjectToDelete] = useState(null)

    // Fetch Sidebar Data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
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
                            timestamp: new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            personaId: s.personaId,
                            persona: s.persona
                        });
                    }
                });

                setChats(Array.from(uniqueSessions.values()));

            } catch (error) {
                console.error("Error fetching sidebar data:", error);
            } finally {
                setIsLoading(false);
            }
        }

        if (isPanelExpanded) {
            fetchData();
        }
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
    const [selectedFiles, setSelectedFiles] = useState([]); // State for file uploads

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;

        try {
            const formData = new FormData();
            formData.append('userId', PanelInteractionVars.userId);
            formData.append('name', newProjectName);
            formData.append('color', newProjectColor);
            formData.append('emoji', newProjectEmoji);
            formData.append('description', newProjectDescription);

            // Append each file
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            const response = await axios.post(`${API_URL}/api/projects`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Add to local state
            setProjects(prev => [response.data, ...prev]);

            // Reset and close modal
            setNewProjectName('');
            setNewProjectColor('#6366f1');
            setNewProjectEmoji('📁');
            setNewProjectDescription('');
            setSelectedFiles([]); // Reset files
            setShowProjectModal(false);
        } catch (error) {
            console.error('Failed to create project:', error);
        }
    }

    const handleDeleteChat = async (chatId, e) => {
        e.stopPropagation(); // Prevent triggering the parent onClick
        try {
            await axios.delete(`${API_URL}/api/sessions/${chatId}`);
            // Refresh sidebar
            if (PanelInteractionVars.triggerSidebarRefresh) {
                PanelInteractionVars.triggerSidebarRefresh();
            }
            // If the deleted chat was active, clear it
            if (PanelInteractionVars?.activeSessionId === chatId) {
                PanelInteractionVars.setActiveSessionId(null);
            }
        } catch (error) {
            console.error("Error deleting chat:", error);
        }
    };

    const handleDeleteProject = async (projectId, e) => {
        e.stopPropagation(); // Prevent triggering the parent onClick
        // Find the project to show its name in the modal
        const project = projects.find(p => p._id === projectId);
        setProjectToDelete(project);
        setShowDeleteProjectModal(true);
    };

    const confirmDeleteProject = async () => {
        if (!projectToDelete) return;

        try {
            await axios.delete(`${API_URL}/api/projects/${projectToDelete._id}`);
            // Refresh sidebar
            if (PanelInteractionVars.triggerSidebarRefresh) {
                PanelInteractionVars.triggerSidebarRefresh();
            }
            // If the deleted project was active, clear it
            if (PanelInteractionVars?.activeProject?._id === projectToDelete._id) {
                PanelInteractionVars.setActiveProject(null);
                PanelInteractionVars.setActiveSessionId(null);
            }
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    };

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
                        {['chats', 'projects', 'personas', 'connectors'].map((tab) => (
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
                            {activeSection === 'personas' && (
                                <motion.div
                                    key="personas"
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={tabVariants}
                                    className="p-2 space-y-2 absolute w-full"
                                >
                                    <PersonasView
                                        personaChats={chats.filter(chat => chat.personaId)}
                                        onSelect={async (persona) => {

                                            if (PanelInteractionVars.setActivePersona) {
                                                PanelInteractionVars.setActivePersona(persona);

                                                // Find existing session for this persona
                                                const existingPersonaSession = chats.find(chat => chat.personaId === persona.id);

                                                if (existingPersonaSession) {
                                                    // Continue existing conversation

                                                    PanelInteractionVars.setActiveSessionId(existingPersonaSession.id);
                                                } else {
                                                    // Start new conversation (will be created on first message)

                                                    PanelInteractionVars.setActiveSessionId(null);
                                                }

                                                PanelInteractionVars.setActiveProject && PanelInteractionVars.setActiveProject(null);
                                            }
                                        }} />
                                </motion.div>
                            )}

                            {activeSection === 'chats' && (
                                <motion.div
                                    key="chats"
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={tabVariants}
                                    className="absolute w-full h-full"
                                >
                                    {isLoading ? (
                                        // Skeleton Loader for Chat History
                                        <div className="space-y-4 px-2 py-3">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div key={i} className="flex gap-3 animate-pulse">
                                                    <div className="w-4 h-4 rounded-full bg-white/10 shrink-0 mt-1"></div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="w-3/4 h-3 rounded bg-white/10"></div>
                                                        <div className="w-1/2 h-2 rounded bg-white/5"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <ChatHistoryList
                                            chats={chats}
                                            PanelInteractionVars={PanelInteractionVars}
                                            handleDeleteChat={handleDeleteChat}
                                        />
                                    )}
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
                                            key={project._id}
                                            onClick={async () => {
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
                                                ? 'bg-[#1a1a1a]'
                                                : 'hover:bg-tertiary'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="text-xl"
                                                    style={{ filter: `drop-shadow(0 0 8px ${project.color}40)` }}
                                                >
                                                    {project.emoji || '📁'}
                                                </span>
                                                <span className="text-sm text-text font-medium">{project.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-textLight bg-primary px-2 py-0.5 rounded-full border border-border">{project.chats || 0}</span>
                                                <button
                                                    onClick={(e) => handleDeleteProject(project._id, e)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                                                >
                                                    <Trash2 size={14} className="text-textLight hover:text-red-400" />
                                                </button>
                                            </div>
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
                                            rows={2}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm text-textLight mb-2 block">Upload Context Documents (PDF, DOCX, TXT)</label>
                                        <div className="flex flex-col gap-2">
                                            <input
                                                type="file"
                                                multiple
                                                accept=".pdf,.docx,.txt"
                                                onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                                                className="block w-full text-sm text-textLight
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded-full file:border-0
                                                    file:text-xs file:font-semibold
                                                    file:bg-tertiary file:text-text
                                                    hover:file:bg-white/10"
                                            />
                                            {selectedFiles.length > 0 && (
                                                <div className="text-xs text-textLight">
                                                    {selectedFiles.length} file(s) selected: {selectedFiles.map(f => f.name).join(', ')}
                                                </div>
                                            )}
                                        </div>
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

                {/* Delete Project Confirmation Modal */}
                <ConfirmModal
                    isOpen={showDeleteProjectModal}
                    onClose={() => {
                        setShowDeleteProjectModal(false);
                        setProjectToDelete(null);
                    }}
                    onConfirm={confirmDeleteProject}
                    title="Delete Project"
                    message={`Are you sure you want to delete "${projectToDelete?.name}"? This will permanently delete the project and all associated chats.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    danger={true}
                />
            </motion.div>
        </>
    )

}

export default Panel

// Chat History List Component with Scroll-to-Bottom
function ChatHistoryList({ chats, PanelInteractionVars, handleDeleteChat }) {
    const [showScrollButton, setShowScrollButton] = useState(false);
    const scrollContainerRef = useRef(null);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShowScrollButton(!isNearBottom && scrollTop > 150);
        }
    };

    const scrollToBottom = () => {
        scrollContainerRef.current?.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth'
        });
    };

    const filteredChats = chats.filter(chat => !chat.personaId);

    return (
        <div className="relative h-full">
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="space-y-1 px-2 pt-2 pb-2 h-full overflow-y-auto"
            >
                {filteredChats.length === 0 ? (
                    <p className="text-xs text-textLight text-center py-4">No chats yet</p>
                ) : (
                    filteredChats.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => {
                                PanelInteractionVars.setActiveSessionId(chat.id);
                                PanelInteractionVars.setActiveProject?.(null);
                                PanelInteractionVars.setActivePersona?.(null);
                            }}
                            className={`w-full p-3 rounded-xl transition-colors flex items-start gap-2 group cursor-pointer ${PanelInteractionVars?.activeSessionId === chat.id && !PanelInteractionVars?.activeProject
                                ? 'bg-[#1a1a1a]'
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
                    ))
                )}
            </div>

            {/* Scroll to Bottom Button */}
            <AnimatePresence>
                {showScrollButton && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={scrollToBottom}
                        className="absolute bottom-2 right-2 p-2 bg-tertiary/90 backdrop-blur-xl border border-white/10 text-text rounded-full shadow-lg hover:bg-white/10 transition-colors z-20"
                    >
                        <ChevronDown size={16} />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}

function PersonasView({ onSelect, personaChats }) {
    const [personas, setPersonas] = useState([]);
    const [grouped, setGrouped] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPersonas = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/personas`);
                setPersonas(res.data.personas);

                // Group and sort personas
                const groupedData = res.data.grouped;
                const sortedGrouped = {};

                Object.keys(groupedData).forEach(category => {
                    // Sort: personas with chat history first
                    sortedGrouped[category] = groupedData[category].sort((a, b) => {
                        const aHasChat = personaChats?.some(chat => chat.personaId === a.id);
                        const bHasChat = personaChats?.some(chat => chat.personaId === b.id);
                        if (aHasChat && !bHasChat) return -1;
                        if (!aHasChat && bHasChat) return 1;
                        return 0;
                    });
                });

                setGrouped(sortedGrouped);
            } catch (err) {
                console.error("Failed to load personas:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPersonas();
    }, [personaChats]);

    if (loading) return <div className="p-4 text-center text-textLight">Loading Personas...</div>;

    return (
        <div className="space-y-6 pb-4">
            {Object.keys(grouped).map(category => (
                <div key={category}>
                    <h3 className="text-xs font-bold text-textLight uppercase tracking-wider mb-2 px-2">{category}</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {grouped[category].map(persona => {
                            const hasChat = personaChats?.some(chat => chat.personaId === persona.id);
                            return (
                                <button
                                    key={persona.id}
                                    onClick={() => onSelect(persona)}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a1a] hover:bg-tertiary transition-colors text-left group border border-white/5 relative"
                                >
                                    {/* Green indicator for active personas */}
                                    {hasChat && (
                                        <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                                    )}
                                    <span className="text-2xl">{persona.emoji}</span>
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="text-sm font-medium text-text truncate">{persona.name}</h4>
                                        <p className="text-xs text-textLight truncate">{persona.role}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-textLight opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
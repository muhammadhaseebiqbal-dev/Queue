import { motion, AnimatePresence } from "framer-motion"
import { Plus, FolderOpen, MessageSquare, Plug, ChevronRight, Trash2, Clock, Users, ChevronDown, Search, LayoutGrid, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import axios from 'axios'
import { API_URL } from '../config'
import ConfirmModal from '../components/ui/ConfirmModal'

function Panel({ isPanelExpanded, setIsPanelExpanded, ...PanelInteractionVars }) {
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
        // Force reset ChatArea state
        if (PanelInteractionVars.triggerChatReset) {
            PanelInteractionVars.triggerChatReset();
        }

        // Reset ChatArea state via parent
        if (PanelInteractionVars.setActiveSessionId) {
            PanelInteractionVars.setActiveSessionId(null);
        }

        // Clear active project
        if (PanelInteractionVars.setActiveProject) {
            PanelInteractionVars.setActiveProject(null);
        }

        // Clear active persona
        if (PanelInteractionVars.setActivePersona) {
            PanelInteractionVars.setActivePersona(null);
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

    // Sajid Password State
    const [showSajidModal, setShowSajidModal] = useState(false);
    const [sajidPassword, setSajidPassword] = useState('');
    const [pendingSajidPersona, setPendingSajidPersona] = useState(null);
    const [passwordError, setPasswordError] = useState(false);

    const handlePersonaActivation = async (persona) => {
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
    };

    const handleSajidUnlock = () => {
        if (sajidPassword === 'dipole') {
            handlePersonaActivation(pendingSajidPersona);
            setShowSajidModal(false);
            setSajidPassword('');
            setPendingSajidPersona(null);
            setPasswordError(false);
        } else {
            setPasswordError(true);
        }
    };

    // --- Search State ---
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAppsModal, setShowAppsModal] = useState(false);

    // --- Filtered Chats for Search ---
    const searchResults = chats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Hoist chats to parent for SearchModal
    useEffect(() => {
        if (PanelInteractionVars.setAvailableChats) {
            PanelInteractionVars.setAvailableChats(chats);
        }
    }, [chats, PanelInteractionVars.setAvailableChats]);

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
                fixed md:relative left-0 top-0 z-[100] md:z-auto shadow-2xl md:shadow-none font-sans`}
                initial={false}
                animate={{
                    width: isPanelExpanded ? (window.innerWidth < 768 ? '85%' : '280px') : '0px',
                    x: isPanelExpanded ? 0 : (window.innerWidth < 768 ? -20 : 0),
                    opacity: isPanelExpanded ? 1 : 0
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
            >
                <div className="w-full h-full flex flex-col relative">

                    {/* Header: Logo & Collapse */}
                    <div className="p-4 flex justify-between items-center shrink-0">
                        {/* Optional Logo or just spacing */}
                        <div className="w-8 h-8 md:hidden"></div>
                        <button
                            onClick={() => setIsPanelExpanded(false)}
                            className="md:hidden p-2 text-textLight hover:text-text"
                        >
                            <ChevronRight size={20} className="rotate-180" />
                        </button>
                    </div>

                    {/* Primary Actions (New Chat, Search, Apps) */}
                    <div className="px-3 pb-2 space-y-1 shrink-0">
                        {/* New Chat */}
                        <button
                            onClick={() => {
                                handleNewChat();
                                PanelInteractionVars.setViewMode?.('chat');
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-tertiary rounded-lg flex items-center gap-3 transition-colors group"
                        >
                            <div className="p-1 bg-white text-black rounded-lg group-hover:bg-white/90 transition-colors">
                                <Plus size={16} />
                            </div>
                            <span className="text-sm font-medium text-text">New chat</span>
                        </button>

                        {/* Search Chats (Triggers Central Modal) */}
                        <button
                            onClick={() => {
                                PanelInteractionVars.setShowSearchModal?.(true);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-tertiary rounded-lg flex items-center gap-3 transition-colors text-textLight hover:text-text"
                        >
                            <Search size={18} />
                            <span className="text-sm">Search chats</span>
                        </button>

                        {/* Apps / Connectors */}
                        <button
                            onClick={() => setShowAppsModal(true)}
                            className="w-full text-left px-3 py-2 hover:bg-tertiary rounded-lg flex items-center gap-3 transition-colors text-textLight hover:text-text"
                        >
                            <LayoutGrid size={18} />
                            <span className="text-sm">Apps</span>
                        </button>
                    </div>

                    {/* Scrollable Vertical Content */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-2 space-y-6">

                        {/* GPTs / Personas Section */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between px-2 mb-2">
                                <h3 className="text-xs font-medium text-textLight/70 uppercase tracking-wider">Assistants</h3>
                            </div>

                            <PersonasView
                                personaChats={chats}
                                onSelect={(persona) => {
                                    if (persona.id === 'sajid') {
                                        setPendingSajidPersona(persona);
                                        setShowSajidModal(true);
                                    } else {
                                        handlePersonaActivation(persona);
                                        PanelInteractionVars.setViewMode?.('chat');
                                    }
                                }}
                                isCompact={true}
                                limit={3} // Limit to top 3
                            />

                            {/* Explore GPTs Button */}
                            <button
                                onClick={() => PanelInteractionVars.setViewMode?.('explore')}
                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-tertiary transition-colors text-left group relative w-full mt-0.5"
                            >
                                <div className="w-5 h-5 rounded-full bg-secondary shadow-inner flex items-center justify-center text-sm ring-1 ring-border/20 text-textLight group-hover:text-text transition-colors">
                                    <LayoutGrid size={12} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="text-xs font-medium text-textLight group-hover:text-text truncate transition-colors">Explore more</h4>
                                </div>
                            </button>
                        </div>

                        {/* Projects Section */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center px-2 mb-1 group">
                                <h3 className="text-xs font-medium text-textLight/70 uppercase tracking-wider">Projects</h3>
                                <button onClick={() => setShowProjectModal(true)} className="text-textLight hover:text-text opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus size={14} />
                                </button>
                            </div>

                            {projects.map((project) => (
                                <button
                                    key={project._id}
                                    onClick={async () => {
                                        PanelInteractionVars.setActiveProject(project);
                                        try {
                                            const response = await axios.get(`${API_URL}/api/project/${project._id}/sessions`);
                                            const sessions = response.data.sessions;
                                            PanelInteractionVars.setActiveSessionId(sessions && sessions.length > 0 ? sessions[0]._id : null);
                                            PanelInteractionVars.setViewMode?.('chat');
                                        } catch (error) {
                                            console.error("Error fetching project sessions:", error);
                                            PanelInteractionVars.setActiveSessionId(null);
                                        }
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors group relative ${PanelInteractionVars?.activeProject?._id === project._id ? 'bg-tertiary text-text' : 'text-textLight hover:bg-tertiary hover:text-text'}`}
                                >
                                    <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-inner ring-1 ring-border/20"
                                        style={{ backgroundColor: project.color + '20', color: project.color }}
                                    >
                                        {project.emoji || '📁'}
                                    </div>
                                    <span className="text-xs font-medium truncate flex-1">{project.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Chat History Section */}
                        <div className="space-y-1">
                            <h3 className="px-2 text-xs font-medium text-textLight/70 uppercase tracking-wider mb-2">Your chats</h3>
                            {isLoading ? (
                                <div className="space-y-2 px-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-4 bg-white/5 rounded animate-pulse" />)}
                                </div>
                            ) : (
                                <ChatHistoryList
                                    chats={chats}
                                    PanelInteractionVars={PanelInteractionVars}
                                    handleDeleteChat={handleDeleteChat}
                                    onSelect={() => PanelInteractionVars.setViewMode?.('chat')}
                                />
                            )}
                        </div>
                    </div>

                    {/* Footer - Profile / Settings */}
                    <div className="p-3 mt-auto border-t border-border/50 shrink-0">
                        {/* Placeholder for User Profile if needed, or just keep it simple */}
                        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-tertiary cursor-pointer transition-colors">
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                {PanelInteractionVars.userId?.substring(0, 2).toUpperCase() || 'US'}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-text truncate">User</p>
                                <p className="text-xs text-textLight truncate">Free Plan</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- MODALS --- */}

                {/* Apps Modal */}
                <AnimatePresence>
                    {showAppsModal && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            onClick={() => setShowAppsModal(false)}
                            className="absolute left-full top-0 ml-2 z-50 w-72 bg-secondary border border-border rounded-xl shadow-2xl p-4"
                            style={{ top: '160px' }} // Position next to the button approx
                        >
                            <h3 className="text-sm font-bold text-text mb-3">Integrations</h3>
                            {connectors.map((connector) => (
                                <div key={connector.id} className="p-2 mb-2 rounded-lg bg-tertiary flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Plug size={14} className="text-textLight" />
                                        <span className="text-sm text-text">{connector.name}</span>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${connector.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>


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
                                className="bg-secondary border border-border rounded-xl p-6 w-[500px] shadow-2xl relative overflow-hidden"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-text">Create Project</h3>
                                    <button onClick={() => setShowProjectModal(false)} className="text-textLight hover:text-text">
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <label className="text-xs font-semibold text-textLight uppercase tracking-wider mb-1.5 block">Name</label>
                                            <input
                                                type="text"
                                                value={newProjectName}
                                                onChange={(e) => setNewProjectName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                                                placeholder="e.g., Q1 Marketing"
                                                className="w-full bg-primary border border-border rounded-lg px-3 py-2.5 text-text text-sm focus:outline-none focus:border-text/50 transition-colors placeholder:text-textLight/30"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-xs font-semibold text-textLight uppercase tracking-wider mb-1.5 block">Icon</label>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
                                                {['📁', '🚀', '💡', '🔥', '✨', '💎'].map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => setNewProjectEmoji(emoji)}
                                                        className={`w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center transition-all text-lg ${newProjectEmoji === emoji
                                                                ? 'bg-text text-primary scale-110 shadow-lg'
                                                                : 'bg-tertiary text-textLight hover:bg-tertiary/80 hover:text-text'
                                                            }`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-textLight uppercase tracking-wider mb-1.5 block">Description</label>
                                        <textarea
                                            value={newProjectDescription}
                                            onChange={(e) => setNewProjectDescription(e.target.value)}
                                            placeholder="What is this project about?"
                                            className="w-full bg-primary border border-border rounded-lg px-3 py-2.5 text-text text-sm focus:outline-none focus:border-text/50 transition-colors resize-none placeholder:text-textLight/30"
                                            rows={2}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-textLight uppercase tracking-wider mb-1.5 block">
                                            Context (PDF, DOCX)
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                multiple
                                                accept=".pdf,.docx,.txt"
                                                onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="bg-primary border border-dashed border-border group-hover:border-text/50 rounded-lg p-4 text-center transition-colors">
                                                {selectedFiles.length > 0 ? (
                                                    <div className="flex items-center justify-center gap-2 text-text text-sm">
                                                        <FolderOpen size={16} className="text-blue-500" />
                                                        <span>{selectedFiles.length} files selected</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1 text-textLight group-hover:text-text transition-colors">
                                                        <span className="text-sm font-medium">Click to upload files</span>
                                                        <span className="text-[10px] opacity-60">PDF, DOCX, TXT supported</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border/50">
                                    <button
                                        onClick={() => setShowProjectModal(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-textLight hover:text-text transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateProject}
                                        disabled={!newProjectName.trim()}
                                        className="px-6 py-2 bg-text text-primary rounded-lg text-sm font-bold hover:bg-text/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-text/10"
                                    >
                                        Create Project
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sajid Password Modal */}
                <AnimatePresence>
                    {showSajidModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110]"
                            onClick={() => {
                                setShowSajidModal(false);
                                setPasswordError(false);
                                setSajidPassword('');
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl p-8 w-80 shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>

                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                        <span className="text-3xl">🔒</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">Restricted Persona</h3>
                                    <p className="text-xs text-zinc-400">Security Clearance Required</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-mono text-indigo-400 mb-2 block uppercase tracking-widest">Passcode</label>
                                        <input
                                            type="password"
                                            value={sajidPassword}
                                            onChange={(e) => {
                                                setSajidPassword(e.target.value);
                                                setPasswordError(false);
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSajidUnlock()}
                                            placeholder="Enter secret code..."
                                            className={`w-full bg-black/50 border-2 ${passwordError ? 'border-red-500 animate-shake' : 'border-zinc-700'} rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono tracking-widest text-center`}
                                            autoFocus
                                        />
                                        {passwordError && (
                                            <p className="text-red-500 text-xs mt-2 text-center font-bold">⚠️ ACCESS DENIED</p>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleSajidUnlock}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <span className="uppercase tracking-wide text-xs">Unlock Persona</span>
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

export default Panel;

// Chat History List Component with Scroll-to-Bottom
function ChatHistoryList({ chats, PanelInteractionVars, handleDeleteChat, onSelect }) {
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
            {/* Scrollable list */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="space-y-1 px-2 pt-2 pb-2 h-full overflow-y-auto scrollbar-hide"
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
                                if (onSelect) onSelect();
                            }}
                            className={`w-full p-2 rounded-lg transition-colors flex items-center gap-1 group cursor-pointer ${PanelInteractionVars?.activeSessionId === chat.id && !PanelInteractionVars?.activeProject
                                ? 'bg-[#1a1a1a]'
                                : 'hover:bg-tertiary'
                                }`}
                        >
                            <div className="flex-1 text-left overflow-hidden">
                                <p className="text-sm text-text truncate font-normal">{chat.title}</p>
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

function PersonasView({ onSelect, personaChats, isCompact, limit }) {
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

    if (loading) return <div className="p-4 text-center text-xs text-textLight">Loading...</div>;

    // Flatten and limit if needed
    let displayList = [];
    if (limit) {
        // If limiting, just show the top personas across all categories (or just flattening them)
        // Prioritize 'featured' or just take the first N from the sorted groups
        Object.values(grouped).forEach(list => displayList.push(...list));
        displayList = displayList.slice(0, limit);
    }

    return (
        <div className={`space-y-4 ${isCompact ? 'space-y-1' : ''}`}>
            {limit ? (
                // Limited Flat View
                <div className="grid grid-cols-1 gap-0.5">
                    {displayList.map(persona => {
                        const hasChat = personaChats?.some(chat => chat.personaId === persona.id);
                        return (
                            <button
                                key={persona.id}
                                onClick={() => onSelect(persona)}
                                className={`flex items-center gap-2 p-1.5 rounded-lg hover:bg-tertiary transition-colors text-left group relative ${hasChat ? 'bg-tertiary/50' : ''}`}
                            >
                                <div className="w-5 h-5 rounded-full bg-secondary shadow-inner flex items-center justify-center text-sm ring-1 ring-border/20">
                                    {persona.emoji}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="text-xs font-medium text-text truncate">{persona.name}</h4>
                                    {!isCompact && <p className="text-[10px] text-textLight truncate">{persona.role}</p>}
                                </div>
                                {hasChat && (
                                    <div className="w-1 h-1 bg-green-500 rounded-full mr-1"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            ) : (
                // Full Grouped View
                Object.keys(grouped).map(category => (
                    <div key={category}>
                        {!isCompact && <h3 className="text-xs font-bold text-textLight uppercase tracking-wider mb-2 px-2">{category}</h3>}
                        <div className="grid grid-cols-1 gap-1">
                            {grouped[category].map(persona => {
                                const hasChat = personaChats?.some(chat => chat.personaId === persona.id);
                                return (
                                    <button
                                        key={persona.id}
                                        onClick={() => onSelect(persona)}
                                        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-tertiary transition-colors text-left group relative ${hasChat ? 'bg-tertiary/50' : ''}`}
                                    >
                                        <span className="text-xl">{persona.emoji}</span>
                                        <div className="flex-1 overflow-hidden">
                                            <h4 className="text-sm font-normal text-text truncate">{persona.name}</h4>
                                            {!isCompact && <p className="text-xs text-textLight truncate">{persona.role}</p>}
                                        </div>
                                        {hasChat && (
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

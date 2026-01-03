import { useState } from "react";
import { Helmet } from 'react-helmet-async';
import AiInput from "./components/ui/AiInput";
import ChatArea from "./Sections/ChatArea";
import Drawer from "./Sections/Panel";
import CanvasPanel from "./Sections/CanvasPanel";
import ExploreGpts from "./Sections/ExploreGpts";
import SearchChatModal from "./components/ui/SearchChatModal";
import { nanoid } from "nanoid";

function Workspace() {
    const [isPanelExpanded, setIsPanelExpanded] = useState(() => window.innerWidth > 768)
    const [activeSessionId, setActiveSessionId] = useState(null)
    const [userId] = useState(() => {
        // Try to get from localStorage first for persistence across reloads
        const saved = localStorage.getItem("queuebot_userid");
        if (saved) return saved;
        const newId = nanoid();
        localStorage.setItem("queuebot_userid", newId);
        return newId;
    })

    const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)
    const [chatResetToken, setChatResetToken] = useState(0)
    const [activeProject, setActiveProject] = useState(null)
    const [activePersona, setActivePersona] = useState(null)
    const [isSideBySideMode, setIsSideBySideMode] = useState(false)

    // View Mode State
    const [viewMode, setViewMode] = useState('chat'); // 'chat' | 'explore'
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [availableChats, setAvailableChats] = useState([]); // Hoisted state to pass to SearchModal

    // Canvas State
    const [showCanvas, setShowCanvas] = useState(false);
    const [canvasData, setCanvasData] = useState(null); // { type, content, title }
    const [canvasVersions, setCanvasVersions] = useState([]);
    const [isCanvasStreaming, setIsCanvasStreaming] = useState(false);

    const triggerCanvas = (type, content, title, versions = [], isStreaming = false) => {
        setCanvasData({ type, content, title });
        if (versions.length > 0) setCanvasVersions(versions);
        setIsCanvasStreaming(isStreaming);
        setShowCanvas(true);
    };

    const [externalPrompt, setExternalPrompt] = useState(null);

    const PanelInteractionVars = {
        isPanelExpanded: isPanelExpanded,
        setIsPanelExpanded,
        activeSessionId,
        setActiveSessionId,
        userId,
        sidebarRefreshKey,
        triggerSidebarRefresh: () => setSidebarRefreshKey(prev => prev + 1),
        chatResetToken,
        triggerChatReset: () => setChatResetToken(prev => prev + 1),
        activeProject,
        setActiveProject,
        activePersona,
        setActivePersona,
        isSideBySideMode,
        setIsSideBySideMode,
        triggerCanvas,
        showCanvas,
        setShowCanvas,
        isCanvasStreaming,
        setIsCanvasStreaming,
        externalPrompt,          // Pass down
        setExternalPrompt,       // Pass down

        // Navigation & View State
        viewMode,
        setViewMode,
        showSearchModal,
        setShowSearchModal,
        setAvailableChats // Allow Panel to hoist chats up
    }

    return (
        <div className="w-full h-screen flex overflow-hidden bg-primary relative">
            <Helmet>
                <title>QueueAI - AI Workspace</title>
                <meta name="description" content="Chat with advanced AI models including Llama 3.3 and DeepMind for free. Your personal AI workspace for coding, writing, and analysis." />
            </Helmet>
            <Drawer {...PanelInteractionVars} />
            <div className="flex-1 flex flex-col min-w-0 relative">
                {viewMode === 'explore' ? (
                    <ExploreGpts
                        onSelectPersona={(persona) => {
                            setActivePersona(persona);
                            // Also need to clear active session? Maybe not immediately, just let ChatArea handle it
                        }}
                        setViewMode={setViewMode}
                    />
                ) : (
                    <ChatArea {...PanelInteractionVars} />
                )}
            </div>

            <CanvasPanel
                isOpen={showCanvas}
                onClose={() => setShowCanvas(false)}
                canvasData={canvasData}
                versions={canvasVersions}
                onSelectVersion={(versionContent) => setCanvasData(prev => ({ ...prev, content: versionContent }))}
                isStreaming={isCanvasStreaming}
                onFixRequest={(errorMessage) => setExternalPrompt(`The HTML artifact crashed with this error:\n\`${errorMessage}\`\n\nPlease check the code and fix the issue.`)}
            />

            {/* Global Search Modal */}
            <SearchChatModal
                isOpen={showSearchModal}
                onClose={() => setShowSearchModal(false)}
                chats={availableChats}
                onSelectChat={(chat) => {
                    setActiveSessionId(chat.id);
                    setViewMode('chat');
                    // Reset others
                    setActiveProject(null);
                    setActivePersona(null);
                }}
                onNewChat={() => {
                    setActiveSessionId(null);
                    setChatResetToken(prev => prev + 1);
                    setViewMode('chat');
                }}
            />
        </div>
    );
}

export default Workspace

import { useState } from "react";
import AiInput from "./components/ui/AiInput";
import ChatArea from "./Sections/ChatArea";
import Drawer from "./Sections/Panel";
import { nanoid } from "nanoid";

function Workspace() {
    const [isPanelExpanded, setIsPanelExpanded] = useState(true)
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
    const [activeProject, setActiveProject] = useState(null)

    const PanelInteractionVars = {
        isPanelExpanded: isPanelExpanded,
        setIsPanelExpanded,
        activeSessionId,
        setActiveSessionId,
        userId,
        sidebarRefreshKey,
        triggerSidebarRefresh: () => setSidebarRefreshKey(prev => prev + 1),
        activeProject,
        setActiveProject
    }

    return (
        <div className="w-full h-screen flex overflow-hidden bg-primary">
            <Drawer {...PanelInteractionVars} />
            <ChatArea {...PanelInteractionVars} />
        </div>
    )
}

export default Workspace

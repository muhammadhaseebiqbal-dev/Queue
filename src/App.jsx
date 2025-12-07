import { useState } from "react";
import AiInput from "./components/ui/AiInput";
import ChatArea from "./Sections/ChatArea";
import Drawer from "./Sections/Panel";

function App() {
  const [isPanelExpanded, setIsPanelExpanded] = useState(true)

  const PanelInteractionVars = {
    isPanelExpanded: isPanelExpanded,
    setIsPanelExpanded
  }

  return (
    <div className="w-full h-screen flex overflow-hidden">
      <Drawer {...PanelInteractionVars} />
      <ChatArea {...PanelInteractionVars} />
    </div>
  )
}

export default App

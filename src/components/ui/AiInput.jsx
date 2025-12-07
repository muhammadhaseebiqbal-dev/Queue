import { Brain, Earth, Lightbulb, Plus, Send } from "lucide-react"

function AiInput() {
    return (
        <div className="bg-secondary border-2 border-border w-[70%] h-32 rounded-2xl p-1.5 flex flex-col justify-between">
            <input type="text" className="h-14 text-textLight outline-none px-4" placeholder="Ask Anything" />
            <div className="w-full bg-primary flex p-1 justify-between rounded-2xl border-2 border-borderLight">
                <div className="flex gap-1">
                    <button className="bg-tertiary w-11 h-11 rounded-2xl  border-borderLight border-2 text-text flex justify-center items-center">
                        <Plus size={18} />
                    </button>
                    <button className="bg-tertiary w-11 h-11 rounded-2xl border-borderLight border-2 text-text flex justify-center items-center">
                        <Earth size={18} />
                    </button>
                    <button className="bg-tertiary w-11 h-11 rounded-2xl border-borderLight border-2 text-text flex justify-center items-center">
                        <Brain size={18} />
                    </button>
                    <select className="bg-tertiary w-fit h-11 rounded-2xl border-borderLight border-2 text-text flex gap-1 px-3 justify-center items-center">
                        <option value="gpt4o">🤖 GPT-4o</option>
                        <option value="claude">🧠 Claude</option>
                        <option value="gemini">✨ Gemini</option>
                        <option value="llama">🦙 Llama</option>
                        <option value="mistral">🌪️ Mistral</option>
                    </select>
                </div>
                <button className="bg-tertiary w-11 h-11 rounded-2xl border-borderLight border-2 text-text flex justify-center items-center">
                        <Send size={18} />
                </button>
            </div>
        </div>
    )
}

export default AiInput
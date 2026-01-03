import { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, Plus, Clock, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function SearchChatModal({ isOpen, onClose, chats, onSelectChat, onNewChat }) {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);

    // Reset input on open
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const filteredChats = chats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Grouping Logic
    const groupedChats = {
        'Today': [],
        'Yesterday': [],
        'Previous 7 Days': []
    };

    filteredChats.forEach(chat => {
        // Simple mock grouping logic - primarily just dumping everything in "Today" or "Yesterday" for demo
        // In real app, parse `chat.createdAt`
        groupedChats['Today'].push(chat);
    });

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="w-full max-w-2xl bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[60vh]"
                    >
                        {/* Header / Search Input */}
                        <div className="p-3 border-b border-white/5 flex items-center gap-3">
                            <Search size={18} className="text-zinc-400 ml-2" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search chats..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-zinc-500 text-base h-10"
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') onClose();
                                }}
                            />
                            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content List */}
                        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                            {/* New Chat Action */}
                            <button
                                onClick={() => {
                                    onNewChat();
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors group mb-2"
                            >
                                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white group-hover:bg-white/20 transition-colors">
                                    <Plus size={18} />
                                </div>
                                <span className="text-white text-sm font-medium">New chat</span>
                            </button>

                            {/* Grouped Lists */}
                            {filteredChats.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500 text-sm">No chats found</div>
                            ) : (
                                Object.entries(groupedChats).map(([group, list]) => (
                                    list.length > 0 && (
                                        <div key={group} className="mb-4">
                                            <h3 className="px-3 text-xs font-semibold text-zinc-500 mb-2 mt-2">{group}</h3>
                                            <div className="space-y-0.5">
                                                {list.map(chat => (
                                                    <button
                                                        key={chat.id}
                                                        onClick={() => {
                                                            onSelectChat(chat);
                                                            onClose();
                                                        }}
                                                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#2d2d2d] transition-colors group text-left"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <MessageSquare size={16} className="text-zinc-400 group-hover:text-white shrink-0" />
                                                            <span className="text-zinc-300 text-sm group-hover:text-white truncate font-normal">
                                                                {chat.title || "Untitled Chat"}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-xs text-zinc-500">Jump to</span>
                                                            <ChevronRight size={14} className="text-zinc-500" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))
                            )}
                        </div>

                        {/* Footer (Optional hints) */}
                        <div className="px-4 py-2 bg-[#1a1a1a] border-t border-white/5 text-[10px] text-zinc-500 flex justify-end gap-3">
                            <span><kbd className="bg-white/10 px-1 rounded text-zinc-400">↑↓</kbd> navigate</span>
                            <span><kbd className="bg-white/10 px-1 rounded text-zinc-400">enter</kbd> select</span>
                            <span><kbd className="bg-white/10 px-1 rounded text-zinc-400">esc</kbd> close</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default SearchChatModal;

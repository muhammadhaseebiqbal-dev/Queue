import { useState, useEffect } from 'react';
import { Search, Globe, Zap, ImageIcon, Code, PenTool, BookOpen, Music, Video, Star, Rocket, Edit3 } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion'; // Assuming framer-motion is installed

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORIES = [
    { id: 'all', label: 'All', icon: Rocket },
    { id: 'writing', label: 'Writing', icon: Edit3 },
    { id: 'productivity', label: 'Productivity', icon: Zap },
    { id: 'programming', label: 'Programming', icon: Code },
    { id: 'education', label: 'Education', icon: BookOpen },
];

function ExploreGpts({ onSelectPersona, setViewMode }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPersonas = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/personas`);
                setPersonas(res.data.personas);
            } catch (err) {
                console.error("Failed to load personas:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPersonas();
    }, []);

    // Filter Logic
    const filteredPersonas = personas.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.role.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesCategory = true;
        if (activeCategory === 'all') {
            matchesCategory = true;
        } else if (activeCategory === 'top-picks') {
            matchesCategory = p.featured === true;
        } else {
            matchesCategory = p.category === activeCategory;
        }

        return matchesSearch && matchesCategory;
    });

    return (
        <div className="flex flex-col h-full bg-primary overflow-y-auto">
            {/* Header Section */}
            <div className="pt-12 pb-8 px-4 text-center max-w-4xl mx-auto w-full">
                <h1 className="text-4xl md:text-5xl font-bold text-text mb-4 tracking-tight">
                    Explore Assistants
                </h1>
                <p className="text-lg text-textLight max-w-2xl mx-auto mb-8">
                    Discover specialized AI assistants tailored for your needs.
                </p>

                {/* Search Bar */}
                <div className="relative max-w-2xl mx-auto mb-8">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="text-textLight" size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search assistants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-full py-3 pl-12 pr-4 text-text focus:outline-none focus:border-text/50 transition-colors shadow-lg placeholder:text-textLight/50"
                    />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {CATEGORIES.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === category.id
                                ? 'bg-text text-primary shadow-lg scale-105'
                                : 'bg-secondary text-textLight hover:bg-tertiary hover:text-text border border-border'
                                }`}
                        >
                            <category.icon size={14} />
                            {category.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid Section */}
            <div className="flex-1 px-4 md:px-8 pb-12 max-w-7xl mx-auto w-full">
                {activeCategory === 'top-picks' && !searchQuery && (
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-text mb-1">Featured</h2>
                        <p className="text-sm text-textLight">Curated top picks for you</p>
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-32 bg-secondary rounded-xl animate-pulse border border-border/50"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredPersonas.map(persona => (
                            <motion.button
                                key={persona.id}
                                layoutId={`persona-${persona.id}`}
                                onClick={() => {
                                    onSelectPersona(persona);
                                    setViewMode('chat');
                                }}
                                className="flex items-start p-4 rounded-xl bg-secondary hover:bg-tertiary border border-border/50 hover:border-text/20 transition-all group text-left h-full"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.02 }}
                            >
                                <div className="text-4xl mr-4 p-2 bg-primary/50 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                    {persona.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-text text-lg truncate pr-2 group-hover:text-blue-400 transition-colors">
                                            {persona.name}
                                        </h3>
                                        {persona.featured && (
                                            <span className="bg-yellow-500/10 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded border border-yellow-500/20 font-bold uppercase tracking-wider">
                                                New
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-textLight line-clamp-2 mt-1 mb-3 h-10">
                                        {persona.role}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-textLight/60">
                                        <div className="flex text-yellow-400">
                                            <Star size={12} fill="currentColor" />
                                            <span className="ml-1 text-textLight">4.8</span>
                                        </div>
                                        <span>•</span>
                                        <span>10K+ chats</span>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExploreGpts;

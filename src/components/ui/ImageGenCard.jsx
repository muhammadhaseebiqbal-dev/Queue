import { motion } from 'framer-motion';
import { Download, Sparkles } from 'lucide-react';
import { useState } from 'react';
import LazyImage from './LazyImage';

const ImageGenCard = ({ imageUrl, prompt }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="group relative w-full max-w-lg bg-secondary border border-border rounded-2xl overflow-hidden shadow-lg my-4"
        >
            {/* Header */}
            <div className="flex items-center gap-3 p-3 border-b border-border bg-tertiary/50">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                    <Sparkles size={14} />
                </div>
                <span className="text-xs font-medium text-textLight tracking-wide uppercase">Generated Image</span>
                <div className="ml-auto">
                    <a
                        href={imageUrl}
                        download="generated-image.jpg"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-border text-textLight hover:text-text transition-colors flex items-center justify-center"
                        title="Download"
                    >
                        <Download size={14} />
                    </a>
                </div>
            </div>

            {/* Image Container */}
            <div className="relative aspect-square w-full bg-primary flex items-center justify-center overflow-hidden">
                <LazyImage
                    src={imageUrl}
                    alt={prompt}
                    className="w-full h-full object-cover"
                    onLoad={() => setIsLoaded(true)}
                />
            </div>

            {/* Prompt Footer - Minimal */}
            <div className="p-4 bg-secondary">
                <p className="text-sm text-text/80 leading-relaxed line-clamp-2 font-light">
                    {prompt}
                </p>
            </div>
        </motion.div>
    );
};

export default ImageGenCard;

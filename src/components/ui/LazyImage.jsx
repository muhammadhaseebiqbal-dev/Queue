import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';

const LazyImage = ({ src, alt, className = "", onClick, style = {} }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    return (
        <div
            className={`relative overflow-hidden bg-secondary/30 ${className}`}
            style={style}
            onClick={onClick}
        >
            {/* Skeleton Loading State */}
            <AnimatePresence>
                {!isLoaded && !hasError && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 flex items-center justify-center bg-muted/20 animate-pulse z-10"
                    >
                        <ImageIcon className="w-8 h-8 text-textLight/20" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error State */}
            {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-secondary text-textLight">
                    <span className="text-xs">Failed to load image</span>
                </div>
            )}

            {/* Actual Image */}
            <motion.img
                src={src}
                alt={alt}
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoaded ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                className={`w-full h-full object-cover ${className}`}
                loading="lazy"
            />
        </div>
    );
};

export default LazyImage;

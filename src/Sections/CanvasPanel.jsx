import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, Download, Copy, Check, Code, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import { LiveProvider, LiveError, LivePreview } from 'react-live';
import html2pdf from 'html2pdf.js';

const CanvasPanel = ({ isOpen, onClose, canvasData, versions = [], onSelectVersion, isStreaming }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('code'); // Default to Code as requested
    const [mermaidSvg, setMermaidSvg] = useState('');
    const [copied, setCopied] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [isMobile, setIsMobile] = useState(false);

    // Track previous streaming state to detect transitions
    const prevStreamingRef = useRef(isStreaming);

    // Auto-Switch Logic: Only trigger on State CHANGE to prevent flickering
    useEffect(() => {
        if (isStreaming && !prevStreamingRef.current) {
            // Started streaming -> Switch to Code
            setActiveTab('code');
        } else if (!isStreaming && prevStreamingRef.current && canvasData) {
            // Stopped streaming -> Switch to Preview
            setActiveTab('preview');
        } else if (isStreaming && activeTab !== 'code') {
            // Optional: Enforce code tab while streaming if user hasn't manually switched?
            // For now, let's strictly enforce on transition only to allow manual navigation if needed,
            // but the user complaint suggests it was jumping around. 
            // Setting it once on start is cleaner.
        }
        prevStreamingRef.current = isStreaming;
    }, [isStreaming, canvasData]);

    // Cleanup zoom on close/change
    useEffect(() => {
        if (!isOpen) setZoom(1);
    }, [isOpen]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (canvasData?.type === 'mermaid') {
            renderMermaid();
        }
    }, [canvasData, activeTab]);

    const renderMermaid = async () => {
        try {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'dark',
                securityLevel: 'loose',
                suppressErrorRendering: true,
            });
            // FIX: Aggressive parsing to handle "leaked" text
            // 1. Try to extract content INSIDE markdown code fences first
            const fenceMatch = canvasData.content.match(/```mermaid\n([\s\S]*?)\n```/);
            let cleanContent = fenceMatch ? fenceMatch[1] : canvasData.content;

            // 2. Cleanup remaining artifacts if no fences were found or if fences were messy
            cleanContent = cleanContent
                .replace(/```mermaid\n?|```/g, '') // Strip remaining fences
                .replace(/<\/canvas-content>[\s\S]*$/i, '') // Standard closing tag
                .replace(/<\/?canvas(?:-content)?(?:[^>]+)?$/i, '') // Partial tag at end of stream
                .trim();

            cleanContent = cleanContent
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&');

            try {
                if (await mermaid.parse(cleanContent)) {
                    const { svg } = await mermaid.render(`mermaid-${Date.now()}`, cleanContent);
                    setMermaidSvg(svg);
                }
            } catch (parseError) {
                return;
            }
        } catch (err) {
            console.error('Mermaid Render Error:', err);
        }
    };

    const handleDownloadPDF = () => {
        const element = document.getElementById('canvas-content-area');
        const opt = {
            margin: 0.5,
            filename: `${canvasData?.title || 'artifact'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(canvasData?.content || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWheelZoom = (e) => {
        if (activeTab !== 'preview') return;
        if (e.deltaY !== 0) {
            const delta = e.deltaY * -0.001;
            setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
        }
    };

    const cleanCode = (content) => {
        if (!content) return '';
        const match = content.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
        return match ? match[1] : content;
    };

    const prepareReactCode = (rawContent) => {
        let code = cleanCode(rawContent);
        // Remove known React boilerplate that react-live handles implicitly or doesn't support
        code = code.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');
        code = code.replace(/export\s+default\s+/g, '');
        code = code.replace(/interface\s+\w+\s+{[\s\S]*?}/g, '');
        code = code.replace(/import\s+{[\s\S]*?}\s+from\s+['"].*?['"];?/g, ''); // Remove destructured imports

        // If 'render' is not explicitly called, try to inject it
        if (!code.includes('render(')) {
            // Look for the last functional component or variable decl that looks like a component
            const componentMatches = [...code.matchAll(/(?:function|const|class)\s+([A-Z]\w+)/g)];
            if (componentMatches.length > 0) {
                const lastComponent = componentMatches[componentMatches.length - 1][1];
                code += `\n\nrender(<${lastComponent} />);`;
            }
        }
        return code.trim();
    };

    if (!canvasData) return null;

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 
                ${activeTab === id
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
            <Icon size={14} />
            {label}
        </button>
    );

    const isOverlay = isMobile || isExpanded;

    return (
        <motion.div
            initial={isOverlay ? { x: '100%' } : { width: 0, opacity: 0 }}
            animate={
                isOverlay
                    ? { x: isOpen ? 0 : '100%', width: isExpanded ? '90vw' : '100%' }
                    : { width: isOpen ? 600 : 0, opacity: isOpen ? 1 : 0 }
            }
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`bg-[#111] border-l border-[#222] shadow-2xl flex flex-col font-sans z-50
                ${isOverlay ? 'fixed right-0 top-0 h-full' : 'relative h-full shrink-0 overflow-hidden'}
            `}
        >
            <div className={`flex flex-col h-full ${!isOverlay ? 'w-[600px]' : 'w-full'}`}>
                {/* ZEN HEADER */}
                <div className="flex items-center justify-between px-4 h-14 border-b border-[#222] bg-[#111] shrink-0 gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        <h3 className="text-zinc-200 font-medium text-sm truncate max-w-[150px]">
                            {canvasData.title || 'Untitled Artifact'}
                        </h3>

                        {versions.length > 1 && (
                            <div className="flex items-center gap-1 bg-[#222] rounded-full p-1">
                                {versions.map((v, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onSelectVersion && onSelectVersion(v.content)}
                                        className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all
                                            ${v.content === canvasData.content
                                                ? 'bg-blue-500 text-white shadow-lg scale-110'
                                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#333]'}`}
                                        title={`Version ${idx + 1}`}
                                    >
                                        v{idx + 1}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="h-4 w-px bg-[#333]"></div>
                        <div className="flex">
                            <TabButton id="code" label="Code" icon={Code} />
                            <TabButton id="preview" label="Preview" icon={Eye} />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={handleDownloadPDF} className="p-2 text-zinc-500 hover:text-zinc-200 rounded-md transition-colors" title="Download PDF">
                            <Download size={16} />
                        </button>
                        <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-zinc-500 hover:text-zinc-200 rounded-md transition-colors hidden md:block" title="Expand">
                            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-200 rounded-md transition-colors" title="Close">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden bg-[#0a0a0a] relative flex flex-col" id="canvas-content-area">
                    <AnimatePresence mode="wait">
                        {activeTab === 'preview' ? (
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1 w-full h-full overflow-hidden relative"
                                onWheel={handleWheelZoom}
                            >
                                <div className="absolute top-2 right-2 z-10 bg-black/50 px-2 py-1 rounded text-xs text-zinc-400 pointer-events-none">
                                    Scroll to Zoom: {Math.round(zoom * 100)}%
                                </div>
                                <div className="w-full h-full overflow-auto custom-scrollbar p-4">
                                    <div
                                        style={{
                                            transform: `scale(${zoom})`,
                                            transformOrigin: 'top center',
                                            width: '100%',
                                            minHeight: '100%'
                                        }}
                                        className="transition-transform duration-100 ease-out"
                                    >
                                        {canvasData.type === 'mermaid' && (
                                            <div className="flex justify-center opacity-90 p-8">
                                                <div dangerouslySetInnerHTML={{ __html: mermaidSvg }} className="w-full flex justify-center" />
                                            </div>
                                        )}

                                        {canvasData.type === 'html' && (
                                            <iframe
                                                srcDoc={cleanCode(canvasData.content)}
                                                title="preview"
                                                className="w-full min-h-[600px] border-none bg-white rounded-lg shadow-lg"
                                                sandbox="allow-scripts"
                                            />
                                        )}

                                        {canvasData.type === 'react' && (
                                            <LiveProvider
                                                code={prepareReactCode(canvasData.content)}
                                                noInline={true}
                                                scope={{ React, useState, useEffect, motion, Check, X, Copy }}
                                            >
                                                <div className="bg-white text-black p-4 rounded-lg shadow-lg min-h-[400px] border border-zinc-800">
                                                    <LivePreview />
                                                    <LiveError className="text-red-500 text-sm p-4 font-mono bg-red-50 mt-4 rounded border border-red-200" />
                                                </div>
                                            </LiveProvider>
                                        )}

                                        {canvasData.type === 'markdown' && (
                                            <div className="p-8 max-w-3xl mx-auto prose prose-invert prose-zinc text-zinc-300 prose-headings:text-zinc-100 prose-strong:text-zinc-100 prose-a:text-blue-400 prose-code:text-pink-400 prose-pre:bg-[#1a1a1a] bg-[#111] rounded-lg border border-[#222]">
                                                <ReactMarkdown>{canvasData.content}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="code"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                                className="relative h-full flex flex-col"
                            >
                                <div className="absolute top-4 right-4 z-10">
                                    <button
                                        onClick={handleCopyCode}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors border border-[#333]
                                            ${copied ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-[#1a1a1a] text-zinc-400 hover:text-white hover:border-[#444]'}`}
                                    >
                                        {copied ? <Check size={12} /> : <Copy size={12} />}
                                        {copied ? 'Copied' : 'Copy Code'}
                                    </button>
                                </div>
                                <SyntaxHighlighter
                                    language={canvasData.type === 'react' || canvasData.type === 'html' ? 'javascript' : 'markdown'}
                                    style={vscDarkPlus}
                                    customStyle={{ margin: 0, padding: '2rem', height: '100%', borderRadius: 0, fontSize: '13px', backgroundColor: '#0a0a0a' }}
                                    showLineNumbers={true}
                                >
                                    {canvasData.content}
                                </SyntaxHighlighter>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

export default CanvasPanel;

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, Download, Copy, Check, Code, Eye, AlertTriangle, Wand2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import { LiveProvider, LiveError, LivePreview } from 'react-live';
import html2pdf from 'html2pdf.js';

const CanvasPanel = ({ isOpen, onClose, canvasData, versions = [], onSelectVersion, isStreaming, onFixRequest }) => {
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
    }, [isStreaming]);

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

    const handleDownloadMermaidPNG = () => {
        const svgContainer = document.querySelector('#canvas-content-area svg');
        if (!svgContainer) return;

        const svgData = new XMLSerializer().serializeToString(svgContainer);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.fillStyle = '#0a0a0a'; // Dark background
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const a = document.createElement('a');
            a.download = `${canvasData?.title || 'diagram'}.png`;
            a.href = canvas.toDataURL('image/png');
            a.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(canvasData?.content || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWheelZoom = (e) => {
        // Only allow zoom for Visual types (Mermaid, maybe Image if added later)
        // Explicitly disabled for Code/HTML previews as per user request
        if (activeTab !== 'preview' || canvasData.type !== 'mermaid') return;

        if (e.deltaY !== 0) {
            const delta = e.deltaY * -0.001;
            setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
        }
    };

    const [iframeError, setIframeError] = useState(null);

    // Listen for Iframe Errors
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data?.type === 'iframe_error') {
                console.log("Canvas Error Caught:", event.data.message);
                setIframeError(event.data.message);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

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

    // INTELLIGENT UI: Determine capabilities based on type
    let normalizedType = canvasData.type?.toLowerCase() || 'code';

    // Auto-detect HTML if type is generic 'code' but content looks like HTML
    if (normalizedType === 'code' && canvasData.content) {
        if (canvasData.content.includes('<!DOCTYPE html>') ||
            canvasData.content.includes('<html') ||
            canvasData.content.includes('</script>')) {
            normalizedType = 'html';
        }
    }

    const isPreviewable = ['html', 'react', 'markdown', 'mermaid'].includes(normalizedType);
    const isDownloadable = ['markdown', 'mermaid'].includes(normalizedType);

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
                            {isPreviewable && <TabButton id="preview" label="Preview" icon={Eye} />}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        {/* Manual Fix Button */}
                        <button
                            onClick={() => onFixRequest("The preview looks broken or empty. Please check the code for syntax errors, missing tags, or logic issues and fix it immediately.")}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                            title="Fix Code with AI"
                        >
                            <Wand2 size={16} />
                        </button>

                        {isDownloadable && (
                            <button
                                onClick={canvasData.type === 'mermaid' ? handleDownloadMermaidPNG : handleDownloadPDF}
                                className="p-2 text-zinc-500 hover:text-zinc-200 rounded-md transition-colors"
                                title={canvasData.type === 'mermaid' ? "Download PNG" : "Download PDF"}
                            >
                                <Download size={16} />
                            </button>
                        )}
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
                        {activeTab === 'preview' && isPreviewable ? (
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1 w-full h-full overflow-hidden relative"
                                onWheel={handleWheelZoom}
                            >
                                {canvasData.type === 'mermaid' && (
                                    <div className="absolute top-2 right-2 z-10 bg-black/50 px-2 py-1 rounded text-xs text-zinc-400 pointer-events-none">
                                        Scroll to Zoom: {Math.round(zoom * 100)}%
                                    </div>
                                )}
                                <div
                                    className={`w-full h-full ${normalizedType === 'html' ? 'overflow-hidden' : 'overflow-auto custom-scrollbar p-4'}`}
                                >
                                    <div
                                        style={normalizedType === 'mermaid' ? {
                                            transform: `scale(${zoom})`,
                                            transformOrigin: 'top center',
                                            width: '100%',
                                            minHeight: '100%'
                                        } : { width: '100%', height: normalizedType === 'html' ? '100%' : 'auto', minHeight: '100%' }}
                                        className={`transition-transform duration-100 ease-out ${normalizedType === 'html' ? 'flex flex-col' : ''}`}
                                    >
                                        {normalizedType === 'mermaid' && (
                                            <div className="flex justify-center opacity-90 p-8">
                                                <div dangerouslySetInnerHTML={{ __html: mermaidSvg }} className="w-full flex justify-center" />
                                            </div>
                                        )}

                                        {normalizedType === 'html' && (
                                            <div className="relative w-full h-full">
                                                {/* Error Overlay */}
                                                {iframeError && (
                                                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
                                                        <div className="bg-[#1a1a1a] border border-red-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden group">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50"></div>
                                                            <div className="flex items-start gap-4 mb-4">
                                                                <div className="p-3 rounded-full bg-red-500/10 text-red-500 shrink-0">
                                                                    <AlertTriangle size={24} />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-lg font-bold text-red-100">Application Crashed</h3>
                                                                    <p className="text-zinc-400 text-sm mt-1">
                                                                        An runtime error occurred in the preview.
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-red-300 border border-red-500/10 mb-6 overflow-x-auto">
                                                                {iframeError}
                                                            </div>

                                                            <div className="flex gap-3">
                                                                <button
                                                                    onClick={() => setIframeError(null)}
                                                                    className="flex-1 py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                                                                >
                                                                    Dismiss
                                                                </button>
                                                                <button
                                                                    onClick={() => onFixRequest && onFixRequest(iframeError)}
                                                                    className="flex-1 py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                                                                >
                                                                    <Wand2 size={14} />
                                                                    Fix with AI
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <iframe
                                                    srcDoc={(() => {
                                                        const original = cleanCode(canvasData.content);
                                                        // Inject Error Catching Script
                                                        const script = `
                                                            <script>
                                                                window.onerror = function(msg, url, line, col, error) {
                                                                    window.parent.postMessage({ type: 'iframe_error', message: msg + ' (Line ' + line + ')' }, '*');
                                                                    return false;
                                                                };
                                                                window.addEventListener('unhandledrejection', function(event) {
                                                                    window.parent.postMessage({ type: 'iframe_error', message: 'Unhandled Promise Rejection: ' + event.reason }, '*');
                                                                });
                                                            </script>
                                                        `;
                                                        // Inject right after <head> or <body>, or just prepend if neither found
                                                        if (original.includes('<head>')) return original.replace('<head>', '<head>' + script);
                                                        if (original.includes('<body>')) return original.replace('<body>', '<body>' + script);
                                                        return script + original;
                                                    })()}
                                                    title="preview"
                                                    className="w-full h-full border-none bg-white"
                                                    sandbox="allow-scripts allow-forms allow-same-origin"
                                                />
                                            </div>
                                        )}

                                        {normalizedType === 'react' && (
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

                                        {normalizedType === 'markdown' && (
                                            <div className="markdown-body p-8 max-w-3xl mx-auto bg-[#0d1117] rounded-lg border border-[#30363d] text-[#c9d1d9] font-sans leading-relaxed">
                                                {/* GitHub-like Markdown Styles injected manually to avoid deps */}
                                                <style>{`
                                                    .markdown-body h1, .markdown-body h2, .markdown-body h3 { border-bottom: 1px solid #21262d; padding-bottom: .3em; margin-bottom: 1em; margin-top: 24px; color: #e6edf3; font-weight: 600; }
                                                    .markdown-body h1 { font-size: 2em; }
                                                    .markdown-body h2 { font-size: 1.5em; }
                                                    .markdown-body p { margin-bottom: 16px; line-height: 1.6; }
                                                    .markdown-body a { color: #4493f8; text-decoration: none; }
                                                    .markdown-body a:hover { text-decoration: underline; }
                                                    .markdown-body code { padding: .2em .4em; margin: 0; font-size: 85%; background-color: #161b22; border-radius: 6px; font-family: ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,Liberation Mono,monospace; }
                                                    .markdown-body pre { padding: 16px; overflow: auto; font-size: 85%; line-height: 1.45; background-color: #161b22; border-radius: 6px; margin-bottom: 16px; }
                                                    .markdown-body pre code { padding: 0; background-color: transparent; }
                                                    .markdown-body ul, .markdown-body ol { padding-left: 2em; margin-bottom: 16px; }
                                                    .markdown-body li { margin-bottom: 4px; }
                                                    .markdown-body blockquote { padding: 0 1em; color: #8b949e; border-left: 0.25em solid #30363d; margin: 0 0 16px 0; }
                                                    .markdown-body table { border-spacing: 0; border-collapse: collapse; margin-bottom: 16px; width: 100%; }
                                                    .markdown-body table th, .markdown-body table td { padding: 6px 13px; border: 1px solid #30363d; }
                                                    .markdown-body table tr { background-color: #0d1117; border-top: 1px solid #21262d; }
                                                    .markdown-body table tr:nth-child(2n) { background-color: #161b22; }
                                                    .markdown-body img { max-width: 100%; box-sizing: content-box; background-color: #0d1117; }
                                                    .markdown-body hr { height: .25em; padding: 0; margin: 24px 0; background-color: #30363d; border: 0; }
                                                `}</style>
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
                                    language={normalizedType === 'react' || normalizedType === 'html' ? 'javascript' : 'markdown'}
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

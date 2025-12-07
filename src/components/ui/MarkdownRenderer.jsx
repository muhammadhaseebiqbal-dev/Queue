import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import ThinkingBlock from './ThinkingBlock'
import 'highlight.js/styles/github-dark.css'
import 'katex/dist/katex.min.css'

function MarkdownRenderer({ content, streaming = false }) {
    // Extract thinking blocks - handle both complete and incomplete tags during streaming
    const thinkingRegex = /<think>([\s\S]*?)(<\/think>|$)/g
    const parts = []
    let lastIndex = 0
    let match
    
    while ((match = thinkingRegex.exec(content)) !== null) {
        // Add content before thinking block
        if (match.index > lastIndex) {
            parts.push({
                type: 'markdown',
                content: content.slice(lastIndex, match.index)
            })
        }
        
        // Check if thinking block is complete or still streaming
        const isComplete = match[2] === '</think>'
        const thinkingContent = match[1].trim()
        
        // Only add thinking block if it has content
        if (thinkingContent) {
            parts.push({
                type: 'thinking',
                content: thinkingContent,
                complete: isComplete,
                streaming: !isComplete && streaming
            })
        }
        
        lastIndex = match.index + match[0].length
    }
    
    // Add remaining content
    if (lastIndex < content.length) {
        const remainingContent = content.slice(lastIndex)
        if (remainingContent.trim()) {
            parts.push({
                type: 'markdown',
                content: remainingContent
            })
        }
    }
    
    // If no parts found, treat entire content as markdown
    if (parts.length === 0) {
        parts.push({
            type: 'markdown',
            content: content
        })
    }

    return (
        <div className="markdown-content">{parts.map((part, index) => {
                if (part.type === 'thinking') {
                    return <ThinkingBlock key={index} content={part.content} streaming={part.streaming} />
                }
                return (
                    <ReactMarkdown
                        key={index}
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeHighlight, rehypeKatex]}
                components={{
                    h1: ({ node, ...props }) => (
                        <h1 className="text-3xl font-bold mb-4 mt-6 text-text" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                        <h2 className="text-2xl font-bold mb-3 mt-5 text-text" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                        <h3 className="text-xl font-semibold mb-2 mt-4 text-text" {...props} />
                    ),
                    h4: ({ node, ...props }) => (
                        <h4 className="text-lg font-semibold mb-2 mt-3 text-text" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                        <p className="mb-4 text-text leading-7" {...props} />
                    ),
                    code: ({ node, inline, className, children, ...props }) => {
                        if (inline) {
                            return (
                                <code
                                    className="bg-black/50 px-1.5 py-0.5 rounded text-sm font-mono text-text"
                                    {...props}
                                >
                                    {children}
                                </code>
                            )
                        }
                        return (
                            <code
                                className={`${className} text-sm font-mono`}
                                {...props}
                            >
                                {children}
                            </code>
                        )
                    },
                    pre: ({ node, children, ...props }) => (
                        <pre className="bg-[#0d1117] rounded-lg p-4 my-4 overflow-x-auto border border-border" {...props}>
                            {children}
                        </pre>
                    ),
                    ul: ({ node, ...props }) => (
                        <ul className="list-disc list-outside mb-4 ml-6 space-y-1 text-text" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-outside mb-4 ml-6 space-y-1 text-text" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                        <li className="text-text leading-7" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-border pl-4 my-4 text-textLight italic" {...props} />
                    ),
                    a: ({ node, ...props }) => (
                        <a className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer" {...props} />
                    ),
                    table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-border" {...props} />
                        </div>
                    ),
                    thead: ({ node, ...props }) => (
                        <thead className="bg-secondary" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                        <th className="border border-border px-4 py-2 text-text font-semibold text-left" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                        <td className="border border-border px-4 py-2 text-text" {...props} />
                    ),
                    hr: ({ node, ...props }) => (
                        <hr className="border-t border-border my-6" {...props} />
                    ),
                    img: ({ node, ...props }) => (
                        <img className="max-w-full h-auto rounded-lg my-4" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                        <strong className="font-bold text-text" {...props} />
                    ),
                    em: ({ node, ...props }) => (
                        <em className="italic text-text" {...props} />
                    ),
                }}
            >
                {part.content}
            </ReactMarkdown>
                )
            })}
        </div>
    )
}

export default MarkdownRenderer

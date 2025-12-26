import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Calendar, User, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { blogPosts } from "./data/blogPosts";
import { Helmet } from "react-helmet-async";

function BlogPost() {
    const { slug } = useParams();
    const post = blogPosts.find(p => p.slug === slug);

    if (!post) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-indigo-500/30">
            <Helmet>
                <title>{post.title} | QueueAI Blog</title>
                <meta name="description" content={post.excerpt} />
                <meta property="og:title" content={post.title} />
                <meta property="og:description" content={post.excerpt} />
                <meta property="og:type" content="article" />
                <link rel="canonical" href={`https://queueai.app/blog/${post.slug}`} />
                <script type="application/ld+json">
                    {`
                    {
                      "@context": "https://schema.org",
                      "@type": "BlogPosting",
                      "headline": "${post.title}",
                      "image": "https://queueai.app/pwa-512x512.png",  
                      "author": {
                        "@type": "Organization",
                        "name": "${post.author}"
                      },
                      "publisher": {
                        "@type": "Organization",
                        "name": "QueueAI",
                        "logo": {
                          "@type": "ImageObject",
                          "url": "https://queueai.app/logo.svg"
                        }
                      },
                      "datePublished": "2025-12-18",
                      "description": "${post.excerpt}"
                    }
                    `}
                </script>
            </Helmet>

            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={18} />
                        <span className="text-sm">Back to Home</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <img src="/logo.svg" alt="QueueAI" className="h-8 w-8" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <article
                className="pt-32 pb-20 px-6 max-w-3xl mx-auto"
            >
                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 mb-8 uppercase tracking-wider font-medium">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {post.date}</span>
                    <span className="flex items-center gap-1"><User size={14} /> {post.author}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {post.readTime}</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">{post.title}</h1>

                <div className="prose prose-invert prose-lg max-w-none text-zinc-300">
                    <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>

                <div className="mt-16 pt-8 border-t border-white/10 flex justify-between items-center">
                    <Link to="/" className="text-sm text-zinc-500 hover:text-white transition-colors">
                        &larr; Back to Landing Page
                    </Link>
                    <Link to="/app" className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-colors text-sm">
                        Try QueueAI Now
                    </Link>
                </div>
            </article>
        </div>
    );
}

export default BlogPost;

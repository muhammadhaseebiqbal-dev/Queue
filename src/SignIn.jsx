import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from './context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Mail, Lock, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from './config';

function SignIn() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleGoogleSuccess = async (tokenResponse) => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API_URL}/api/auth/google`, {
                accessToken: tokenResponse.access_token
            });

            login(res.data.user, res.data.token);
            navigate('/app');
        } catch (err) {
            console.error("Auth failed:", err);
            setError("Login Failed. Please try again.");
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: handleGoogleSuccess,
        onError: () => setError("Google Login Failed"),
    });

    const handleMagicLinkSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await axios.post(`${API_URL}/api/auth/magic-link`, { email });
            // Navigate to success page instead of inline message
            navigate('/email-sent', { state: { email } });
        } catch (err) {
            console.error("Magic Link failed:", err);
            setError(err.response?.data?.error || "Failed to send login link.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[#0A0A0A] font-sans overflow-hidden">

            {/* Left Side: Form */}
            <div className="w-full md:w-1/2 flex flex-col p-8 md:p-16 justify-center relative z-10">
                <Link to="/" className="absolute top-8 left-8 md:left-16 inline-flex items-center text-zinc-500 hover:text-white transition-colors text-sm">
                    <ArrowLeft size={16} className="mr-2" /> Back
                </Link>

                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="max-w-md w-full mx-auto"
                >
                    <div className="mb-10">
                        <div className="w-12 h-12 flex items-center justify-center mb-6  p-2">
                            <img src="/logo.svg" alt="QueueAI" className="h-8 w-auto" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                        <p className="text-zinc-500">Sign in with Google or your email.</p>
                    </div>

                    {/* Google Sign In */}
                    <button
                        onClick={() => googleLogin()}
                        disabled={loading}
                        className="w-full bg-white text-black font-semibold h-12 rounded-lg flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors mb-6 disabled:opacity-70 border border-transparent"
                    >
                        {loading ? <Loader2 className="animate-spin" /> :
                            <>
                                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                Continue with Google
                            </>
                        }
                    </button>

                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase tracking-widest">
                            <span className="px-2 bg-[#0A0A0A] text-zinc-600">Or use email</span>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm text-center">
                            {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400 ml-1">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-10 py-3 text-sm focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors text-white"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-zinc-800 text-white font-medium h-12 rounded-lg hover:bg-zinc-700 transition-colors border border-white/5 mt-2"
                        >
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Continue"}
                        </button>

                        <p className="text-center text-xs text-zinc-600 mt-6">
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </form>
                </motion.div>
            </div>

            {/* Right Side: Artistic Visual */}
            <div className="hidden md:flex w-1/2 bg-zinc-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-transparent to-zinc-900 z-10" />

                {/* Abstract Image */}
                <img
                    src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
                    alt="Abstract Art"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                />

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-16 z-20">
                    <div className="max-w-md">
                        <div className="w-16 h-1 bg-white mb-8"></div>
                        <h3 className="text-3xl font-light text-white mb-4 leading-tight">
                            "The artifacts of intelligence are not just answers, but new questions."
                        </h3>
                        <p className="text-zinc-400 text-sm">
                            Exploring the symbiosis of human intent and synthetic execution.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SignIn;

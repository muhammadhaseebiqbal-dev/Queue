import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from './context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Mail, Lock, Loader2 } from 'lucide-react';
import axios from 'axios';

function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleGoogleSuccess = async (tokenResponse) => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('http://localhost:5000/api/auth/google', {
                accessToken: tokenResponse.access_token
            });

            login(res.data.user, res.data.token);
            navigate('/app');
        } catch (err) {
            console.error("Auth failed:", err);
            setError("Login Failed. Please try again.");
            setLoading(false);
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: handleGoogleSuccess,
        onError: () => {
            setError("Google Login Failed");
            setLoading(false);
        }
    });

    const handleEmailSignIn = async (e) => {
        e.preventDefault();
        // For now, email is not implemented securely without Firebase or custom implementation
        alert("Please use Google Sign In for now (Native implementation in progress)");
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 text-white font-sans relative overflow-hidden">

            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                <Link to="/" className="inline-flex items-center text-zinc-500 hover:text-white mb-8 transition-colors">
                    <ArrowLeft size={16} className="mr-2" /> Back to Home
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/50 border border-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl"
                >
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Sparkles size={24} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Welcome Back</h2>
                        <p className="text-zinc-500 text-sm mt-2">Sign in to continue to your workspace</p>
                    </div>

                    {/* Google Sign In */}
                    <button
                        onClick={() => googleLogin()}
                        disabled={loading}
                        className="w-full bg-white text-black font-semibold h-12 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-100 transition-colors mb-6 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" /> :
                            <>
                                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                Continue with Google
                            </>
                        }
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-2 bg-[#0A0A0A] text-zinc-500 bg-opacity-0 backdrop-blur-none bg-zinc-900">Or continue with email</span>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailSignIn} className="space-y-4">
                        <div className="relative">
                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-10 py-3 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-10 py-3 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white font-semibold h-12 rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Sign In"}
                        </button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}

export default SignIn;

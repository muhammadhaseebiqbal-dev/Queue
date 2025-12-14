import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './context/AuthContext';
import { API_URL } from './config';
import { Loader2 } from 'lucide-react';

function VerifyMagicLink() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [status, setStatus] = useState('Verifying your magic link...');
    const [error, setError] = useState(null);
    const hasVerified = useRef(false);

    useEffect(() => {
        const verify = async () => {
            if (hasVerified.current) return;
            hasVerified.current = true;

            const token = searchParams.get('token');
            const email = searchParams.get('email');

            if (!token || !email) {
                setError('Invalid link parameters.');
                return;
            }

            try {
                const response = await axios.post(`${API_URL}/api/auth/verify-magic-link`, {
                    email,
                    token
                });

                if (response.data.success) {
                    setStatus('Successfully verified!');
                    login(response.data.user, response.data.token);

                    // Small delay to let user see success message before redirect
                    setTimeout(() => {
                        navigate('/app', { replace: true });
                    }, 1000);
                }
            } catch (err) {
                console.error("Verification failed:", err);
                setError(err.response?.data?.error || 'Verification failed. The link may have expired.');
            }
        };

        verify();
    }, [searchParams, navigate, login]);

    return (
        <div className="min-h-screen w-full bg-[#0A0A0A] text-white flex justify-center pt-[100px]">
            <div className="text-center w-full max-w-md px-4 space-y-6">

                {error ? (
                    <div className="space-y-4">
                        <p className="text-red-500 font-medium">{error}</p>
                        <Link to="/signin" className="text-sm text-zinc-500 hover:text-white underline">
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold tracking-tight">{status}</h2>

                        {status.includes('Verifying') && (
                            <Loader2 className="animate-spin mx-auto text-zinc-500 h-6 w-6" />
                        )}

                        <p className="text-sm text-zinc-500">
                            If the page does not automatically go to the dashboard,{' '}
                            <Link to="/app" className="text-white hover:underline">
                                click here
                            </Link>{' '}
                            to manually redirect.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VerifyMagicLink;

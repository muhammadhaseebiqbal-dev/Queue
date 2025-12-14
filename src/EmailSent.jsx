import { useLocation, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function EmailSent() {
    const location = useLocation();
    const email = location.state?.email || '';

    return (
        <div className="min-h-screen w-full bg-[#0A0A0A] text-white flex justify-center">
            {/* Content positioned 5px from top relative to container padding or margin */}
            <div className="mt-[50px] text-center w-full max-w-md px-4">
                <p className="text-lg text-zinc-300 font-medium tracking-wide">
                    Email sent to <span className="text-white font-bold">{email}</span>
                </p>
                <p className="text-sm text-zinc-500 mt-2">
                    Check your email client to sign in.
                </p>

                <Link to="/signin" className="mt-8 inline-flex items-center text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
                    <ArrowLeft size={14} className="mr-2" /> Back to Login
                </Link>
            </div>
        </div>
    );
}

export default EmailSent;

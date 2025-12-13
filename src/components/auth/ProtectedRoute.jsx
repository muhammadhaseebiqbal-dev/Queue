import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
    const { token, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#0A0A0A] text-white">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    return token ? <Outlet /> : <Navigate to="/signin" replace />;
};

export default ProtectedRoute;

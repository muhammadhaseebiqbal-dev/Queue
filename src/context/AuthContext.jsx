import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let timeoutId;
        if (token) {
            // Configure Axios default header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            timeoutId = setTimeout(() => setLoading(false), 0);
        } else {
            delete axios.defaults.headers.common['Authorization'];
            timeoutId = setTimeout(() => setLoading(false), 0);
        }
        return () => clearTimeout(timeoutId);
    }, [token]);

    const login = (userData, authToken) => {
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('queuebot_userid', userData.userId);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('queuebot_userid');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

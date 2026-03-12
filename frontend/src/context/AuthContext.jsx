import { createContext, useState, useContext } from 'react';
import API from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                return JSON.parse(userInfo);
            } catch (err) {
                console.error('Invalid user session data found', err);
                localStorage.removeItem('userInfo');
            }
        }
        return null;
    });
    const [loading] = useState(false);

    const login = async (email, password) => {
        const { data } = await API.post('/users/login', { email, password });
        setUser(data);
        localStorage.setItem('userInfo', JSON.stringify(data));
        return data;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('userInfo');
    };

    const updateUser = (data) => {
        setUser(data);
        localStorage.setItem('userInfo', JSON.stringify(data));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

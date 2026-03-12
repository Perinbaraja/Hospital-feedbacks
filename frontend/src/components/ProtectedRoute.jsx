import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ element, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles) {
        const userRoleLower = user.role.toLowerCase();
        const isAllowed = allowedRoles.some(role => role.toLowerCase() === userRoleLower);

        if (!isAllowed) {
            console.warn(`[ProtectedRoute] Access denied for role: ${user.role}. Allowed: ${allowedRoles.join(', ')}`);
            return <Navigate to="/login" replace />;
        }
    }

    return element || <Outlet />;
};

export default ProtectedRoute;

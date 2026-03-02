import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, LogOut, Settings, UserPlus } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const Sidebar = () => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
    };

    return (
        <div style={{
            width: '250px',
            backgroundColor: '#1F2937',
            color: 'white',
            padding: '2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        }}>
            <div>
                <h2 style={{ paddingLeft: '1rem', marginBottom: '2rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutDashboard size={24} /> Dashboard
                </h2>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {user?.role === 'Admin' ? (
                        <>
                            <Link to="/admin" style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', color: '#D1D5DB', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Users size={20} /> All Feedback
                            </Link>
                            <Link to="/admin/staff" style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', color: '#D1D5DB', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <UserPlus size={20} /> Manage Staff
                            </Link>
                            <Link to="/admin/settings" style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', color: '#D1D5DB', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Settings size={20} /> Hospital Settings
                            </Link>
                        </>
                    ) : (
                        <Link to="/dept" style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', color: '#D1D5DB', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Users size={20} /> Dept Tasks
                        </Link>
                    )}
                </nav>
            </div>

            <div style={{ borderTop: '1px solid #374151', paddingTop: '1rem' }}>
                <p style={{ padding: '0 1rem', fontSize: '0.875rem', marginBottom: '1rem', color: '#9CA3AF' }}>
                    Logged in as <b>{user?.name}</b> <br />({user?.role})
                </p>
                <button onClick={handleLogout} style={{ width: '100%', padding: '0.75rem 1rem', color: '#EF4444', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', transition: 'var(--transitions)' }}>
                    <LogOut size={20} /> Logout
                </button>
            </div>
        </div>
    );
};

const DashboardLayout = ({ allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="layout-container">
            <Toaster position="top-right" />
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;

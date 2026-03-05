import { useState, useEffect } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import { LayoutDashboard, Users, LogOut, Settings, UserPlus } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const Sidebar = () => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
    };

    const linkStyle = {
        padding: '0.875rem 1rem',
        borderRadius: '0.75rem',
        color: 'rgba(255, 255, 255, 0.8)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        fontWeight: '500',
        fontSize: '0.925rem'
    };

    const activeLinkStyle = {
        ...linkStyle,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        color: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    };

    return (
        <div style={{
            width: '280px',
            background: 'var(--grad-header)',
            color: 'white',
            padding: '2.5rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
            zIndex: 100
        }}>
            <div>
                <div style={{ paddingLeft: '0.75rem', marginBottom: '3rem' }}>
                    <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                        <div style={{ background: 'white', padding: '6px', borderRadius: '10px', display: 'flex' }}>
                            <LayoutDashboard size={24} color="var(--primary)" />
                        </div>
                        HOSPITAL
                    </h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {['Admin', 'Super_Admin'].includes(user?.role) ? (
                        <>
                            <Link to="/admin" style={linkStyle}>
                                <Users size={20} /> All Feedback
                            </Link>
                            <Link to="/admin/staff" style={linkStyle}>
                                <UserPlus size={20} /> Manage Staff
                            </Link>
                            <Link to="/admin/settings" style={linkStyle}>
                                <Settings size={20} /> Settings
                            </Link>
                        </>
                    ) : (
                        <Link to="/dept" style={linkStyle}>
                            <Users size={20} /> Dept Tasks
                        </Link>
                    )}
                </nav>
            </div>

            <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '1.5rem',
                borderRadius: '1.25rem',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Account</p>
                    <p style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'white' }}>{user?.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>{user?.role}</p>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ff8080',
                        borderRadius: '0.75rem',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        transition: 'all 0.2s',
                        fontWeight: '600'
                    }}
                >
                    <LogOut size={18} /> Logout
                </button>
            </div>
        </div>
    );
};

const DashboardLayout = ({ allowedRoles }) => {
    const { user, loading } = useAuth();
    const [themeLoading, setThemeLoading] = useState(true);

    useEffect(() => {
        const fetchTheme = async () => {
            try {
                const { data } = await API.get('/hospital');
                if (data && data.themeColor) {
                    document.documentElement.style.setProperty('--primary', data.themeColor);
                }
            } catch (error) {
                console.error('Failed to load theme', error);
            } finally {
                setThemeLoading(false);
            }
        };
        fetchTheme();
    }, []);

    if (loading || themeLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
            <div className="spinner"></div>
            <p style={{ marginLeft: '12px', fontWeight: 600, color: '#4338ca' }}>Connecting to node...</p>
        </div>
    );

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

import { useEffect, useState } from 'react';
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import { LayoutDashboard, Users, LogOut, Settings, UserPlus, ClipboardList, ChevronLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const Sidebar = ({ hospital }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const hospitalId = params.get('hospitalId');
    const hQuery = hospitalId ? `?hospitalId=${hospitalId}` : '';

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
    };

    const getLinkStyle = ({ isActive }) => ({
        padding: '0.875rem 1rem',
        borderRadius: '0.75rem',
        color: isActive ? 'white' : 'rgba(255, 255, 255, 0.8)',
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        fontWeight: isActive ? '700' : '500',
        fontSize: '0.925rem',
        boxShadow: isActive ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
    });

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
                    <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                        <div style={{ background: 'white', padding: '6px', borderRadius: '10px', display: 'flex', width: '40px', height: '40px', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {hospital?.logoUrl ? (
                                <img src={hospital.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                                <LayoutDashboard size={24} color="var(--primary)" />
                            )}
                        </div>
                        {hospital?.name || 'HOSPITAL'}
                    </h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {['Admin', 'hospital_admin'].includes(user?.role) && (
                        <>
                            <NavLink to={`/admin${hQuery}`} style={getLinkStyle} end>
                                <LayoutDashboard size={20} /> Dashboard
                            </NavLink>
                            <NavLink to={`/admin/feedbacks${hQuery}`} style={getLinkStyle}>
                                <ClipboardList size={20} /> All Feedback
                            </NavLink>
                            <NavLink to={`/admin/staff${hQuery}`} style={getLinkStyle}>
                                <UserPlus size={20} /> Manage Staff
                            </NavLink>
                            <NavLink to={`/admin/settings${hQuery}`} style={getLinkStyle}>
                                <Settings size={20} /> Settings
                            </NavLink>
                        </>
                    )}

                    {['Super_Admin', 'super_admin'].includes(user?.role) && (
                        <>
                            <NavLink to={`/admin/staff${hQuery}`} style={getLinkStyle}>
                                <UserPlus size={20} /> Manage Staff
                            </NavLink>
                            <NavLink to={`/admin/settings${hQuery}`} style={getLinkStyle}>
                                <Settings size={20} /> Hospital Settings
                            </NavLink>
                            <NavLink to="/super-admin" style={getLinkStyle}>
                                <ChevronLeft size={20} /> Return to Network
                            </NavLink>
                        </>
                    )}

                    {['Dept_Head', 'dept_head'].includes(user?.role) && (
                        <NavLink to="/dept" style={getLinkStyle}>
                            <Users size={20} /> Dept Tasks
                        </NavLink>
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

    const [hospital, setHospital] = useState(null);
    const hospitalId = new URLSearchParams(useLocation().search).get('hospitalId');

    useEffect(() => {
        const fetchHospital = async () => {
            try {
                const hIdParam = hospitalId ? `?hospitalId=${hospitalId}` : '';
                const { data } = await API.get(`/hospital${hIdParam}`);
                setHospital(data);
                if (data && data.themeColor) {
                    document.documentElement.style.setProperty('--primary', data.themeColor);
                }
            } catch (error) {
                console.error('Failed to load hospital data', error);
            }
        };
        fetchHospital();
    }, [hospitalId]);

    if (loading) return null;

    const isAllowed = !allowedRoles || allowedRoles.some(role => role.toLowerCase() === user?.role?.toLowerCase());

    if (!user || !isAllowed) {
        if (user) {
            console.warn(`[DashboardLayout] Unauthorized role: ${user.role}. Required one of: ${allowedRoles.join(', ')}`);
        }
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="layout-container">
            <Toaster position="top-right" />
            <Sidebar hospital={hospital} />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;

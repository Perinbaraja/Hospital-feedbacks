import { useEffect, useState } from 'react';
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../api';
import { LayoutDashboard, Users, LogOut, Settings, UserPlus, ClipboardList, ChevronLeft, Monitor, Menu } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { getHospitalConfig } from '../services/hospitalConfig';
import useIsMobile from '../hooks/useIsMobile';

const normalizeRole = (role) => {
    return (role || '').toLowerCase().replace(/[^a-z]/g, '');
};

const Sidebar = ({ hospital, isCollapsed, onToggle, isMobile, isOpen, onClose }) => {
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
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: isCollapsed ? '0' : '12px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        fontWeight: isActive ? '700' : '500',
        fontSize: '0.925rem',
        boxShadow: isActive ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        width: '100%',
        position: 'relative'
    });

    return (
        <div style={{
            width: isMobile ? 'min(86vw, 320px)' : (isCollapsed ? '80px' : '280px'),
            minWidth: isMobile ? 'min(86vw, 320px)' : (isCollapsed ? '80px' : '280px'),
            background: 'var(--grad-header)',
            color: 'white',
            padding: isCollapsed ? '2.5rem 0.75rem' : '2.5rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
            zIndex: 100,
            alignSelf: isMobile ? 'auto' : 'stretch',
            minHeight: isMobile ? '100vh' : '100%',
            position: isMobile ? 'fixed' : 'relative',
            top: 0,
            left: 0,
            height: isMobile ? '100vh' : 'auto',
            transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
            transition: isMobile ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
            <button 
                onClick={onToggle}
                style={{
                    display: isMobile ? 'none' : 'flex',
                    position: 'absolute',
                    right: '-12px',
                    top: '32px',
                    background: 'white',
                    color: 'var(--primary)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    zIndex: 110,
                    cursor: 'pointer',
                    transform: isCollapsed ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.3s'
                }}
            >
                <ChevronLeft size={16} />
            </button>
            <div>
                <div style={{ paddingLeft: isCollapsed ? '0' : '0.75rem', marginBottom: '3rem', display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                    <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', overflow: 'hidden' }}>
                        <div style={{ background: 'white', padding: '6px', borderRadius: '10px', display: 'flex', width: '40px', height: '40px', minWidth: '40px', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {hospital?.logoUrl ? (
                                <img src={getAssetUrl(hospital.logoUrl)} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                                <LayoutDashboard size={24} color="var(--primary)" />
                            )}
                        </div>
                        {!isCollapsed && (hospital?.name || 'HOSPITAL')}
                    </h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {['admin', 'hospitaladmin'].includes(normalizeRole(user?.role)) && (
                        <>
                            <NavLink title="Dashboard" to={`/admin${hQuery}`} style={getLinkStyle} end>
                                <LayoutDashboard size={20} style={{ minWidth: '20px' }} /> {!isCollapsed && 'Dashboard'}
                            </NavLink>
                            <NavLink title="All Feedback" to={`/admin/feedbacks${hQuery}`} style={getLinkStyle}>
                                <ClipboardList size={20} style={{ minWidth: '20px' }} /> {!isCollapsed && 'Feedback'}
                            </NavLink>
                            <NavLink title="Staff" to={`/admin/staff${hQuery}`} style={getLinkStyle}>
                                <UserPlus size={20} style={{ minWidth: '20px' }} /> {!isCollapsed && 'Staff'}
                            </NavLink>
                            <NavLink title="TV Monitor" to={`/admin/tv-monitor${hQuery}`} style={getLinkStyle}>
                                <Monitor size={20} style={{ minWidth: '20px' }} /> {!isCollapsed && 'TV'}
                            </NavLink>
                            <NavLink title="Settings" to={`/admin/settings${hQuery}`} style={getLinkStyle}>
                                <Settings size={20} style={{ minWidth: '20px' }} /> {!isCollapsed && 'Settings'}
                            </NavLink>
                        </>
                    )}

                    {normalizeRole(user?.role) === 'superadmin' && (
                        <>
                            <NavLink title="Hospital Settings" to={`/admin/settings${hQuery}`} style={getLinkStyle}>
                                <Settings size={20} style={{ minWidth: '20px' }} /> {!isCollapsed && 'Hospital Settings'}
                            </NavLink>
                            <NavLink title="Return to Network" to="/super-admin" style={getLinkStyle}>
                                <ChevronLeft size={20} style={{ minWidth: '20px' }} /> {!isCollapsed && 'Return'}
                            </NavLink>
                        </>
                    )}

                    {normalizeRole(user?.role) === 'depthead' && (
                        <NavLink title="Dept Tasks" to="/dept" style={getLinkStyle}>
                            <Users size={20} style={{ minWidth: '20px' }} /> {!isCollapsed && 'Dept Tasks'}
                        </NavLink>
                    )}
                </nav>
            </div>

            <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                padding: isCollapsed ? '1rem 0.5rem' : '1.5rem',
                borderRadius: isCollapsed ? '0.75rem' : '1.25rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isCollapsed ? 'center' : 'stretch'
            }}>
                {!isCollapsed && (
                    <div style={{ marginBottom: '1.25rem' }}>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Account</p>
                        <p style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'white' }}>{user?.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>{user?.role}</p>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    title="Logout"
                    style={{
                        width: 'auto',
                        height: 'auto',
                        padding: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ff8080',
                        borderRadius: '0.75rem',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        transition: 'all 0.2s',
                        fontWeight: '600'
                    }}
                >
                    <LogOut size={18} /> {!isCollapsed && 'Logout'}
                </button>
            </div>
        </div>
    );
};

const DashboardLayout = ({ allowedRoles }) => {
    const { user, loading } = useAuth();
    const isMobile = useIsMobile(900);
    const location = useLocation();

    const [hospital, setHospital] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const queryHospitalId = new URLSearchParams(location.search).get('hospitalId');
    const hospitalId = (queryHospitalId || user?.hospitalId || user?.hospital?._id || '').trim();

    const toggleSidebar = () => {
        if (isMobile) {
            setMobileSidebarOpen((prev) => !prev);
            return;
        }
        const next = !isCollapsed;
        setIsCollapsed(next);
        localStorage.setItem('sidebar_collapsed', next);
    };

    useEffect(() => {
        if (!isMobile) {
            setMobileSidebarOpen(false);
        }
    }, [isMobile]);

    useEffect(() => {
        const fetchHospital = async () => {
            try {
                if (!hospitalId) return;
                const data = await getHospitalConfig({ hospitalId });
                setHospital(data);
            } catch (error) {
                console.error('Failed to load hospital data', error);
            }
        };
        fetchHospital();
    }, [hospitalId]);

    if (loading) return null;

    const normalizedUserRole = normalizeRole(user?.role);
    const isAllowed = !allowedRoles || allowedRoles.some(role => normalizeRole(role) === normalizedUserRole);

    if (!user || !isAllowed) {
        if (user) {
            console.warn(`[DashboardLayout] Unauthorized role: ${user.role}. Required one of: ${allowedRoles.join(', ')}`);
        }
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="layout-container" style={{ display: 'flex', minHeight: '100vh' }}>
            <Toaster position="top-right" />
            {isMobile && mobileSidebarOpen && (
                <button
                    type="button"
                    aria-label="Close menu"
                    className="responsive-sidebar-backdrop"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}
            <Sidebar
                hospital={hospital}
                isCollapsed={isMobile ? false : isCollapsed}
                onToggle={toggleSidebar}
                isMobile={isMobile}
                isOpen={mobileSidebarOpen}
                onClose={() => setMobileSidebarOpen(false)}
            />
            <main className="main-content" style={{ flex: 1, padding: isMobile ? '1rem' : (isCollapsed ? '2rem 3rem' : '2rem') }}>
                {isMobile && (
                    <button type="button" className="mobile-nav-toggle" onClick={() => setMobileSidebarOpen(true)}>
                        <Menu size={18} />
                        Menu
                    </button>
                )}
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;

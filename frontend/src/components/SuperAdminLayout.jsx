import { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Building2, ShieldCheck, LogOut, Settings, BarChart3, Plus } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const SuperSidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        toast.success('Super Admin session ended');
    };

    const linkStyle = (isActive) => ({
        padding: '0.875rem 1.25rem',
        borderRadius: '0.8rem',
        color: isActive ? 'white' : 'rgba(255, 255, 255, 0.6)',
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.3s ease',
        fontWeight: '600',
        fontSize: '0.95rem',
        border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent'
    });

    return (
        <div style={{
            width: '280px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: 'white',
            padding: '2.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '8px 0 30px rgba(0, 0, 0, 0.2)',
            height: '100vh',
            position: 'sticky',
            top: 0
        }}>
            <div>
                <div style={{ marginBottom: '3.5rem', padding: '0 0.5rem' }}>
                    <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '1.25rem', fontWeight: '800', letterSpacing: '0.05em' }}>
                        <div style={{ background: 'white', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                            <ShieldCheck size={24} color="#4338ca" />
                        </div>
                        SUPER ADMIN
                    </h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link to="/super-admin" style={linkStyle(location.pathname === '/super-admin')}>
                        <Building2 size={20} /> Hospital Network
                    </Link>

                    {/* Add Hospital Quick Action */}
                    <Link
                        to="/super-admin/add-hospital"
                        style={linkStyle(location.pathname === '/super-admin/add-hospital')}
                    >
                        Add New Hospital
                    </Link>
                </nav>
            </div>

            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '1.5rem',
                borderRadius: '1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            SA
                        </div>
                        <div>
                            <p style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', marginBottom: '2px' }}>{user?.name}</p>
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Root Admin</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        padding: '0.875rem',
                        background: 'rgba(244, 63, 94, 0.1)',
                        color: '#fb7185',
                        borderRadius: '0.8rem',
                        border: '1px solid rgba(244, 63, 94, 0.2)',
                        transition: 'all 0.2s',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <LogOut size={18} /> Logout Session
                </button>
            </div>
        </div >
    );
};

const SuperAdminLayout = () => {
    const { user, loading } = useAuth();

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <div className="spinner"></div>
    </div>;

    if (!user || user.role !== 'Super_Admin') {
        return <Navigate to="/login" replace />;
    }

    return (
        <div style={{ display: 'flex', background: '#f8fafc', minHeight: '100vh' }}>
            <Toaster position="top-right" />
            <SuperSidebar />
            <main style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default SuperAdminLayout;

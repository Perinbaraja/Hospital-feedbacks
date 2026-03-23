import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/feedbacks', icon: '💬', label: 'All Feedbacks' },
    { to: '/create-form', icon: '📝', label: 'Create Form' },
  ];

  const W = collapsed ? '72px' : '248px';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#EEF2F7' }}>
      {/* Sidebar */}
      <aside style={{
        width: W, flexShrink: 0,
        background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-mid) 100%)',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '72px' }}>
          <div style={{ width: '38px', height: '38px', flexShrink: 0, background: 'linear-gradient(135deg, var(--teal), var(--teal-light))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏥</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>MediCare</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin Portal</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '11px 12px', borderRadius: '10px', marginBottom: '4px',
                color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(13,148,136,0.28)' : 'transparent',
                borderLeft: `3px solid ${isActive ? 'var(--teal-light)' : 'transparent'}`,
                textDecoration: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap', overflow: 'hidden'
              })}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {!collapsed && (
            <div style={{ padding: '10px 12px', marginBottom: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || 'Admin'}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{user.role || 'admin'}</div>
            </div>
          )}
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
            padding: '10px 12px', borderRadius: '10px', border: 'none',
            background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', cursor: 'pointer',
            fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', transition: 'all 0.2s'
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>🚪</span>
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main style={{ flex: 1, marginLeft: W, transition: 'margin-left 0.3s ease', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header style={{
          background: 'white', height: '64px', padding: '0 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: 'var(--shadow-xs)', position: 'sticky', top: 0, zIndex: 50
        }}>
          <button onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '6px', borderRadius: '8px', color: 'var(--gray-500)' }}>
            {collapsed ? '▶' : '◀'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, var(--teal), var(--teal-light))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
              {(user.name || 'A')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>Welcome, {user.name || 'Admin'}</div>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, padding: '28px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
